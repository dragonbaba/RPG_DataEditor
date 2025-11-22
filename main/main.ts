import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

let mainWindow: Electron.BrowserWindow | null;
const isDev = !app.isPackaged;
function getResourcePath(...paths: string[]): string {
    if (isDev) {
        // 开发环境: 从 outputjs 向上一级到项目根目录
        return path.join(__dirname, '..', ...paths);
    } else {
        // 生产环境: 直接从 app.asar 根目录
        return path.join(app.getAppPath(), ...paths);
    }
}
//使用统一的路径函数
const mainPath = getResourcePath('html/renderer.html');
const iconPath = getResourcePath('icon/icon.png');
const preloadPath = getResourcePath('outputjs/preload.js');
const isMac = process.platform === 'darwin';
const configDir = path.join(app.getPath('userData'), 'editorSave');
const configPath = path.join(configDir, 'config.json');

async function createWindow(): Promise<void> {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        maximizable: false,
        resizable: false,
        useContentSize: true,
        webPreferences: {
            contextIsolation: true,
            preload: preloadPath
        },
        icon: iconPath
    });
    mainWindow.once('closed', () => {
        mainWindow = null;
    });
    const webContents = mainWindow!.webContents;

    mainWindow.once('ready-to-show', () => {
        mainWindow!.show();
    });

    webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: 'deny' };
    });
    return mainWindow.loadFile(mainPath);
}

function checkBrowserWindow(): void | Promise<void> {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length === 0) {
        return createWindow();
    }
}

// 显示历史文件对话框
function handleShowHistoryFiles() {
    if (mainWindow) {
        mainWindow.webContents.send('show-history-files');
    }
}
// 处理打开文件对话框
async function openFileDialog(window: Electron.BrowserWindow) {
    try {
        // 读取配置获取数据路径
        let defaultPath = '';
        try {
            if (fs.existsSync(configPath)) {
                const configContent = await fs.promises.readFile(configPath, 'utf-8');
                const config = JSON.parse(configContent);
                defaultPath = config.dataPath || '';
            }
        } catch (e) {
            // 配置读取失败，使用默认路径
        }
        const result = await dialog.showOpenDialog(window, {
            defaultPath: defaultPath,
            properties: ['openFile'],
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            try {
                const content = await fs.promises.readFile(filePath, 'utf-8');
                const fileName = path.basename(filePath);
                window.webContents.send('file-loaded', {
                    fileName: fileName,
                    filePath: filePath,
                    content: content
                });
            } catch (error: any) {
                dialog.showMessageBox(window, {
                    type: 'error',
                    title: '错误',
                    message: `读取文件失败: ${error.message}`
                });
            }
        }
    } catch (error: any) {
        dialog.showMessageBox(window, {
            type: 'error',
            title: '错误',
            message: `打开文件失败: ${error.message}`
        });
    }
}

// 创建应用菜单
function createMenu() {
    const template: any[] = [
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
                    }
                },
                {
                    label: '历史文件',
                    click: handleShowHistoryFiles
                },
                { type: 'separator' },
                {
                    label: '设置数据目录',
                    click: async () => {
                        if (mainWindow) {
                            const result = await dialog.showOpenDialog(mainWindow, {
                                properties: ['openDirectory'],
                                title: '选择数据文件目录'
                            });
                            if (!result.canceled && result.filePaths.length > 0) {
                                mainWindow.webContents.send('set-data-path', result.filePaths[0]);
                            }
                        }
                    }
                },
                {
                    label: '设置脚本目录',
                    click: async () => {
                        if (mainWindow) {
                            const result = await dialog.showOpenDialog(mainWindow, {
                                properties: ['openDirectory'],
                                title: '选择脚本保存目录'
                            });
                            if (!result.canceled && result.filePaths.length > 0) {
                                mainWindow.webContents.send('set-script-path', result.filePaths[0]);
                            }
                        }
                    }
                },
                {
                    label: '保存设置',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('save-settings');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: '退出',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
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
                    }
                },
                {
                    label: '属性',
                    id: 'mode-property',
                    type: 'radio',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('switch-mode', 'property');
                        }
                    }
                },
                {
                    label: '备注',
                    id: 'mode-note',
                    type: 'radio',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('switch-mode', 'note');
                        }
                    }
                },
                {
                    label: '弹道',
                    id: 'mode-projectile',
                    type: 'radio',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('switch-mode', 'projectile');
                        }
                    }
                }
            ]
        },
        {
            label: '视图',
            submenu: [
                { role: 'reload', label: '刷新' },
                { role: 'forceReload', label: '强制刷新' },
                { role: 'toggleDevTools', label: '开发者工具', enabled: isDev }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于',
                    click: () => {
                        dialog.showMessageBox(mainWindow!, {
                            type: 'info',
                            title: '关于 RM数据拓展编辑器',
                            message: 'RM数据拓展编辑器 v1.0.0',
                            detail: '功能强大的JSON编辑工具，支持代码生成和自动链接管理'
                        });
                    }
                }
            ]
        }
    ];
    if (isMac) {
        template.unshift({
            label: 'RM数据拓展编辑器',
            submenu: [
                { role: 'about', label: '关于' },
                { type: 'separator' },
                { role: 'quit', label: '退出' }
            ]
        });
    }
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}
// 初始化菜单
app.on('ready', createMenu);

app.whenReady()
    .then(async () => {
        await checkBrowserWindow();
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
app.on('second-instance', (_event, _path) => {
    createWindow();
});
ipcMain.handle('get-app-info', () => {
    return {
        version: app.getVersion(),
        platform: process.platform,
        arch: process.arch
    };
});

ipcMain.handle('minimize-window', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
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
    if (mainWindow) {
        mainWindow.close();
    }
});

ipcMain.handle('open-dev-tools', () => {
    if (mainWindow) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
});
ipcMain.handle("process-argv", () => {
    return process.argv[2] ?? '';
})

// 读取配置
ipcMain.handle('read-config', async () => {
    try {
        if (fs.existsSync(configPath)) {
            const content = await fs.promises.readFile(configPath, 'utf-8');
            return JSON.parse(content);
        }
        return { dataPath: '' };
    } catch (error: any) {
        return { dataPath: '' };
    }
});

// 写入配置
ipcMain.handle('write-config', async (_event, config) => {
    try {
        if (!fs.existsSync(configDir)) {
            await fs.promises.mkdir(configDir, { recursive: true });
        }
        await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
        return true;
    } catch (error: any) {
        throw new Error(`Failed to write config: ${error.message}`);
    }
});


ipcMain.handle('read-file', async (_event, filePath) => {
    try {
        return await fs.promises.readFile(filePath, 'utf-8');
    } catch (error: any) {
        throw new Error(`Failed to read file: ${error.message}`);
    }
});

ipcMain.handle('write-file', async (_event, filePath, content) => {
    try {
        // 确保文件夹存在
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            await fs.promises.mkdir(dir, { recursive: true });
        }
        await fs.promises.writeFile(filePath, content, 'utf-8');
        return true;
    } catch (error: any) {
        throw new Error(`Failed to write file: ${error.message}`);
    }
});

ipcMain.handle('delete-file', async (_event, filePath) => {
    try {
        await fs.promises.unlink(filePath);
        return true;
    } catch (error: any) {
        throw new Error(`Failed to delete file: ${error.message}`);
    }
});

ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openFile']
    });
    return result.filePaths[0] || null;
});

ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory']
    });
    return result.filePaths[0] || null;
});

ipcMain.handle('show-message-box', async (_event, options) => {
    return await dialog.showMessageBox(mainWindow!, options);
});

ipcMain.handle('show-open-dialog', async (_event, options) => {
    return await dialog.showOpenDialog(mainWindow!, options);
});

ipcMain.handle('show-save-dialog', async (_event, options) => {
    return await dialog.showSaveDialog(mainWindow!, options);
});

ipcMain.handle('reload-page', () => {
    if (mainWindow) {
        mainWindow.webContents.reloadIgnoringCache();
    }
});

// System info handler
ipcMain.handle('get-system-info', () => {
    return {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        userInfo: os.userInfo()
    };
});