import { app, BrowserWindow, ipcMain, dialog, shell, Menu, clipboard, protocol, net } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath, pathToFileURL } from 'url';
import { autoUpdaterService, registerAutoUpdaterIPC } from './autoUpdater.js';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
const isDev = !app.isPackaged;

// Register custom protocol as privileged
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-resource',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true
    }
  }
]);

function getResourcePath(...paths: string[]): string {
  if (isDev) {
    // 开发环境: 从 dist-electron 向上一级到项目根目录
    return path.join(__dirname, '..', ...paths);
  } else {
    // 生产环境: 直接从 app.asar 根目录
    return path.join(app.getAppPath(), ...paths);
  }
}

// 使用统一的路径函数
const iconPath = getResourcePath('icon/icon.png');

// Preload 脚本路径配置
// 开发环境: __dirname 是 dist-electron，preload.cjs 在同目录
// 生产环境: 需要从 app.asar 根目录定位到 dist-electron/preload.cjs
// 注意: preload 脚本必须使用 CommonJS 格式 (.cjs)，因为 package.json 中 "type": "module"
let preloadPath: string;
if (isDev) {
  preloadPath = path.join(__dirname, 'preload.cjs');
} else {
  // 生产环境: 尝试多种路径
  // 方法1: 使用 __dirname (如果它指向 app.asar/dist-electron)
  const preloadPath1 = path.join(__dirname, 'preload.cjs');
  // 方法2: 使用 app.getAppPath() + dist-electron
  const preloadPath2 = path.join(app.getAppPath(), 'dist-electron', 'preload.cjs');

  // 检查哪个路径存在
  if (fs.existsSync(preloadPath1)) {
    preloadPath = preloadPath1;
  } else if (fs.existsSync(preloadPath2)) {
    preloadPath = preloadPath2;
  } else {
    // 默认使用方法2
    preloadPath = preloadPath2;
  }
}

// 详细的调试日志 - 帮助诊断preload加载问题
console.log('='.repeat(60));
console.log('[Main] Preload Script Path Configuration');
console.log('='.repeat(60));
console.log('[Main] Environment:', isDev ? 'Development' : 'Production');
console.log('[Main] app.isPackaged:', app.isPackaged);
console.log('[Main] __dirname:', __dirname);
console.log('[Main] app.getAppPath():', app.getAppPath());
console.log('[Main] Computed preloadPath:', preloadPath);

// 检查preload文件是否存在
const preloadExists = fs.existsSync(preloadPath);
console.log('[Main] Preload file exists:', preloadExists);

// 如果preload文件不存在，输出详细错误信息
if (!preloadExists) {
  console.error('='.repeat(60));
  console.error('[Main] ERROR: Preload script not found!');
  console.error('[Main] Expected path:', preloadPath);
  console.error('[Main] This will cause IPC communication to fail.');
  console.error('[Main] Please ensure the preload script is compiled and in the correct location.');
  console.error('='.repeat(60));

  // 尝试列出可能的preload位置以帮助调试
  const possiblePaths = [
    path.join(__dirname, 'preload.cjs'),
    path.join(app.getAppPath(), 'preload.cjs'),
    path.join(app.getAppPath(), 'dist-electron', 'preload.cjs'),
    path.join(app.getAppPath(), 'electron', 'preload.cjs'),
  ];

  console.log('[Main] Checking alternative paths:');
  possiblePaths.forEach(p => {
    console.log(`  ${p}: ${fs.existsSync(p) ? 'EXISTS' : 'NOT FOUND'}`);
  });
}
console.log('='.repeat(60));

const isMac = process.platform === 'darwin';
const configDir = path.join(app.getPath('userData'), 'editorSave');
const configPath = path.join(configDir, 'config.json');

async function createWindow(): Promise<void> {
  // 记录BrowserWindow配置信息
  console.log('[Main] Creating BrowserWindow with webPreferences:');
  console.log('[Main]   contextIsolation: true');
  console.log('[Main]   nodeIntegration: false');
  console.log('[Main]   sandbox: false (allows preload to access Node.js API)');
  console.log('[Main]   preload:', preloadPath);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: preloadPath,
    },
    icon: iconPath,
  });

  mainWindow.once('closed', () => {
    mainWindow = null;
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Listen for fullscreen state changes
  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('fullscreen-changed', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('fullscreen-changed', false);
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Load the app
  if (isDev) {
    // Development: load from Vite dev server
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Production: load from built files
    const indexPath = getResourcePath('dist/index.html');
    await mainWindow.loadFile(indexPath);
  }
}

function checkBrowserWindow(): void | Promise<void> {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0) {
    return createWindow();
  }
}

function handleShowHistoryFiles(): void {
  if (mainWindow) {
    mainWindow.webContents.send('show-history-files');
  }
}

async function openFileDialog(window: BrowserWindow): Promise<void> {
  try {
    let defaultPath = '';
    try {
      if (fs.existsSync(configPath)) {
        const configContent = await fs.promises.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        defaultPath = config.dataPath || '';
      }
    } catch {
      // Config read failed, use default path
    }

    const result = await dialog.showOpenDialog(window, {
      defaultPath: defaultPath,
      properties: ['openFile'],
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const fileName = path.basename(filePath);
        window.webContents.send('file-loaded', {
          fileName: fileName,
          filePath: filePath,
          content: content,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        dialog.showMessageBox(window, {
          type: 'error',
          title: '错误',
          message: `读取文件失败: ${message}`,
        });
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    dialog.showMessageBox(window, {
      type: 'error',
      title: '错误',
      message: `打开文件失败: ${message}`,
    });
  }
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开文件',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (mainWindow) {
              await openFileDialog(mainWindow);
            }
          },
        },
        {
          label: '历史文件',
          click: handleShowHistoryFiles,
        },
        { type: 'separator' },
        {
          label: '路径设置',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('open-path-settings');
            }
          },
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: '模式',
      submenu: [
        {
          label: '脚本',
          id: 'mode-script',
          type: 'radio',
          checked: true,
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('switch-mode', 'script');
            }
          },
        },
        {
          label: '属性',
          id: 'mode-property',
          type: 'radio',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('switch-mode', 'property');
            }
          },
        },
        {
          label: '备注',
          id: 'mode-note',
          type: 'radio',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('switch-mode', 'note');
            }
          },
        },
        {
          label: '弹道',
          id: 'mode-projectile',
          type: 'radio',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('switch-mode', 'projectile');
            }
          },
        },
        {
          label: '任务',
          id: 'mode-quest',
          type: 'radio',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('switch-mode', 'quest');
            }
          },
        },
      ],
    },
    {
      label: '视图',
      submenu: [
        {
          label: '切换侧边栏',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('toggle-sidebar');
            }
          },
        },
        {
          label: '主题设置',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('toggle-theme-settings');
            }
          },
        },
        { type: 'separator' },
        { role: 'reload', label: '刷新' },
        { role: 'forceReload', label: '强制刷新' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: '开发者工具' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '检查更新',
          click: async () => {
            if (mainWindow) {
              try {
                const updateInfo = await autoUpdaterService.checkForUpdates(true);
                if (!updateInfo) {
                  dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: '检查更新',
                    message: '当前已是最新版本',
                    detail: `当前版本: v${app.getVersion()}`,
                  });
                }
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                dialog.showMessageBox(mainWindow, {
                  type: 'error',
                  title: '检查更新失败',
                  message: '无法检查更新',
                  detail: message,
                });
              }
            }
          },
        },
        { type: 'separator' },
        {
          label: '关于',
          click: () => {
            if (mainWindow) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: '关于 RM数据拓展编辑器',
                message: 'RM数据拓展编辑器 v1.0.4',
                detail: '功能强大的JSON编辑工具，支持代码生成和自动链接管理',
              });
            }
          },
        },
        {
          label: '交流',
          click: async () => {
            if (!mainWindow) return;
            const result = await dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '交流',
              message: '请选择交流方式',
              detail: '由于QQ版本差异，无法自动跳转\n请手动选择交流方式',
              buttons: ['添加qq群', '添加qq好友', '取消添加'],
              defaultId: 0,
              cancelId: 2,
            });
            const response = result.response;
            if (response === 0) {
              clipboard.writeText('910724852');
            } else if (response === 1) {
              clipboard.writeText('2311993475');
            }
            if (response !== 2) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: '交流',
                message: '已经复制到剪贴板，请手动添加',
                detail: '已经复制到剪贴板，请手动添加',
              });
            }
          },
        },
      ],
    },
  ];

  if (isMac) {
    template.unshift({
      label: 'RM数据拓展编辑器',
      submenu: [
        { role: 'about', label: '关于' },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Initialize menu
app.on('ready', createMenu);

app.whenReady().then(async () => {
  // Register auto-updater IPC handlers
  registerAutoUpdaterIPC();

  // Handle local-resource protocol
  protocol.handle('local-resource', (request) => {
    try {
      const requestUrl = new URL(request.url);

      let filePath = '';
      if (requestUrl.hostname) {
        // Case: local-resource://D:/path -> hostname is D:
        filePath = requestUrl.hostname + requestUrl.pathname;
      } else {
        // Case: local-resource:///D:/path -> pathname is /D:/path
        filePath = requestUrl.pathname;
        if (process.platform === 'win32' && filePath.startsWith('/')) {
          filePath = filePath.slice(1);
        }
      }

      const decodedPath = decodeURIComponent(filePath);
      const fileUrl = pathToFileURL(decodedPath).toString();

      return net.fetch(fileUrl);
    } catch (error) {
      console.error('[Main] Failed to handle local-resource protocol:', error);
      return new Response('Not Found', { status: 404 });
    }
  });

  await checkBrowserWindow();

  // Set main window for auto-updater after window is created
  if (mainWindow) {
    autoUpdaterService.setMainWindow(mainWindow);

    // Check for updates on startup (respects frequency setting)
    setTimeout(async () => {
      try {
        await autoUpdaterService.checkForUpdates();
      } catch (error) {
        console.error('[Main] Auto-update check failed:', error);
      }
    }, 3000); // Delay to let the app fully load
  }
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

if (isMac) {
  app.on('activate', async () => {
    await checkBrowserWindow();
  });
}

const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.focus();
    return;
  }
  checkBrowserWindow();
});

// IPC Handlers
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
  };
});

ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('close-window', () => {
  mainWindow?.close();
});

ipcMain.handle('open-dev-tools', () => {
  mainWindow?.webContents.openDevTools({ mode: 'detach' });
});

ipcMain.handle('process-argv', () => {
  return process.argv[2] ?? '';
});

ipcMain.handle('read-config', async () => {
  try {
    if (fs.existsSync(configPath)) {
      const content = await fs.promises.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    }
    return { dataPath: '' };
  } catch {
    return { dataPath: '' };
  }
});

ipcMain.handle('write-config', async (_event, config) => {
  try {
    if (!fs.existsSync(configDir)) {
      await fs.promises.mkdir(configDir, { recursive: true });
    }
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to write config: ${message}`);
  }
});

ipcMain.handle('read-file', async (_event, filePath: string) => {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to read file: ${message}`);
  }
});

ipcMain.handle('write-file', async (_event, filePath: string, content: string) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to write file: ${message}`);
  }
});

ipcMain.handle('delete-file', async (_event, filePath: string) => {
  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to delete file: ${message}`);
  }
});

ipcMain.handle('read-image-data', async (_event, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    const buffer = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to read image data: ${message}`);
  }
});

ipcMain.handle('select-file', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('pick-workspace', async () => {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: '请选择代码工作区',
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});

ipcMain.handle('list-dts-files', async (_event, workspaceRoot: string) => {
  const results: string[] = [];
  const maxDepth = 6;

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
  }

  if (workspaceRoot && fs.existsSync(workspaceRoot)) {
    await walk(workspaceRoot, 0);
  }
  return results;
});

ipcMain.handle('show-message-box', async (_event, options) => {
  if (!mainWindow) return null;
  return await dialog.showMessageBox(mainWindow, options);
});

ipcMain.handle('show-open-dialog', async (_event, options) => {
  if (!mainWindow) return null;
  return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('show-save-dialog', async (_event, options) => {
  if (!mainWindow) return null;
  return await dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('reload-page', () => {
  mainWindow?.webContents.reloadIgnoringCache();
});

ipcMain.handle('get-system-info', () => {
  return {
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    userInfo: os.userInfo(),
  };
});

// File system extended operations
ipcMain.handle('create-backup', async (_event, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${baseName}_backup_${timestamp}${ext}`;
    const backupPath = path.join(dir, backupFileName);

    await fs.promises.copyFile(filePath, backupPath);
    return backupPath;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to create backup: ${message}`);
  }
});

ipcMain.handle('list-directory', async (_event, dirPath: string) => {
  try {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Directory does not exist: ${dirPath}`);
    }

    const entries = await fs.promises.readdir(dirPath);
    return entries;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to list directory: ${message}`);
  }
});

ipcMain.handle('file-exists', async (_event, filePath: string) => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
});

// Window fullscreen operations
ipcMain.handle('is-fullscreen', () => {
  return mainWindow?.isFullScreen() ?? false;
});

ipcMain.handle('set-fullscreen', (_event, fullscreen: boolean) => {
  mainWindow?.setFullScreen(fullscreen);
});

ipcMain.handle('toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

ipcMain.handle('set-minimum-size', (_event, width: number, height: number) => {
  mainWindow?.setMinimumSize(width, height);
});
