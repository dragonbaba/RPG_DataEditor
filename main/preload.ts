import { contextBridge, ipcRenderer } from 'electron';

interface ElectronAPI {
    minimizeWindow: () => Promise<void>;
    maximizeWindow: () => Promise<void>;
    closeWindow: () => Promise<void>;
    openDevTools: () => Promise<void>;
    getAppInfo: () => Promise<any>;
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<boolean>;
    deleteFile: (filePath: string) => Promise<boolean>;
    selectFile: () => Promise<string | null>;
    selectDirectory: () => Promise<string | null>;
    showMessageBox: (options: any) => Promise<any>;
    showOpenDialog: (options: any) => Promise<any>;
    showSaveDialog: (options: any) => Promise<any>;
    getSystemInfo: () => Promise<any>;
    getPlatform: () => string;
    getArch: () => string;
    reloadPage: () => Promise<void>;
    processArgv: () => Promise<string>;
    readConfig: () => Promise<any>;
    writeConfig: (config: any) => Promise<boolean>;
    setMode: (mode: string) => void;
    versions: {
        node: string;
        chrome: string;
        electron: string;
    };
}
const versions = process.versions;
// Define the API that will be exposed to the renderer process
const electronAPI: ElectronAPI = {
    // Window control APIs
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    openDevTools: () => ipcRenderer.invoke('open-dev-tools'),

    // App info API
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),

    // File system APIs
    readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('write-file', filePath, content),
    deleteFile: (filePath: string) => ipcRenderer.invoke('delete-file', filePath),
    selectFile: () => ipcRenderer.invoke('select-file'),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),

    // Dialog APIs
    showMessageBox: (options: any) => ipcRenderer.invoke('show-message-box', options),
    showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
    showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),

    // System info APIs
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    getPlatform: () => process.platform,
    getArch: () => process.arch,
    reloadPage: () => ipcRenderer.invoke('reload-page'),
    processArgv: () => ipcRenderer.invoke("process-argv"),
    // Config APIs
    readConfig: () => ipcRenderer.invoke('read-config'),
    writeConfig: (config: any) => ipcRenderer.invoke('write-config', config),
    setMode: (mode: string) => ipcRenderer.send('mode-changed', mode),

    // Version info
    versions: {
        node: versions.node,
        chrome: versions.chrome,
        electron: versions.electron
    }
};
const validChannels = [
    'file-loaded',
    'set-data-path',
    'set-script-path',
    'save-settings',
    'switch-mode',
    'show-history-files',
];

//优化：缓存已注册的监听器，避免重复注册
const registeredListeners = new Map<string, Function>();

// 暴露 IPC 监听方法（用于接收主进程消息）
contextBridge.exposeInMainWorld('ipcOn', (channel: string, callback: Function) => {
    if (validChannels.includes(channel)) {
        //检查是否已经注册过此通道
        if (registeredListeners.has(channel)) {
            console.log('[Preload] 监听器已存在，跳过重复注册:', channel);
            return;
        }
        console.log('[Preload] 注册监听器:', channel);
        //定义监听器处理函数
        const listener = (_event: any, data: any) => {
            console.log('[Preload] 接收到 IPC 消息:', channel);
            callback(data);
        }
        //缓存监听器函数，以便后续可以移除
        registeredListeners.set(channel, listener);
        //只注册一次
        ipcRenderer.on(channel, listener);
    } else {
        console.warn('[Preload] 无效的通道:', channel);
    }
});
// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);