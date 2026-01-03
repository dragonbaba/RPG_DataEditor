import type { UpdateInfo } from '../../types/ipc';
import { formatBytes, formatSpeed } from '../../utils/formatBytes';
import { logger } from '../../services/logger';

interface ProgressInfo {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

type DialogState = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error' | 'no-update';

interface UpdateProgressState {
  visible: boolean;
  state: DialogState;
  progress: ProgressInfo;
  updateInfo: UpdateInfo | null;
  message: string | null;
}
const titles: Record<DialogState, string> = {
  idle: '更新检查',
  available: '发现新版本',
  downloading: '正在下载更新',
  downloaded: '更新已下载',
  error: '更新失败',
  'no-update': '已是最新版本',
};
export class UpdateProgressDialog {
  private state: UpdateProgressState = {
    visible: false,
    state: 'idle',
    progress: { percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 },
    updateInfo: null,
    message: null,
  };

  private container: HTMLDivElement | null = null;
  private titleEl: HTMLElement | null = null;
  private versionEl: HTMLElement | null = null;
  private notesEl: HTMLElement | null = null;
  private messageEl: HTMLElement | null = null;
  private progressBarEl: HTMLElement | null = null;
  private percentEl: HTMLElement | null = null;
  private speedEl: HTMLElement | null = null;
  private sizeEl: HTMLElement | null = null;
  private progressSectionEl: HTMLElement | null = null;

  private downloadBtn: HTMLButtonElement | null = null;
  private retryBtn: HTMLButtonElement | null = null;
  private installBtn: HTMLButtonElement | null = null;
  private laterBtn: HTMLButtonElement | null = null;
  private closeBtn: HTMLButtonElement | null = null;

  constructor() {
    this.createDialog();
    this.bindEvents();
    this.registerIpcListeners();
  }

  private createDialog(): void {
    if (document.getElementById('update-progress-dialog')) {
      this.cacheElements();
      return;
    }

    const container = document.createElement('div');
    container.id = 'update-progress-dialog';
    container.className = 'hidden fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
    container.innerHTML = `
      <div class="bg-gray-800 rounded-lg shadow-xl w-[520px] border border-gray-700 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <h3 id="update-dialog-title" class="text-lg font-semibold text-cyan-400">更新检查</h3>
          <button id="update-dialog-close-x" class="text-gray-400 hover:text-gray-200 text-xl leading-none">×</button>
        </div>
        <div class="px-5 py-4 space-y-3">
          <div>
            <div class="text-sm text-gray-400">版本</div>
            <div id="update-dialog-version" class="text-base text-gray-200">-</div>
          </div>
          <div>
            <div class="text-sm text-gray-400">更新说明</div>
            <div id="update-dialog-notes" class="text-sm text-gray-300 whitespace-pre-line">-</div>
          </div>
          <div id="update-dialog-message" class="text-sm text-gray-300 hidden"></div>
          <div id="update-dialog-progress" class="space-y-2 hidden">
            <div class="w-full h-2 bg-gray-700 rounded overflow-hidden">
              <div id="update-dialog-progress-bar" class="h-full bg-cyan-500 transition-all duration-300 ease-out" style="width: 0%"></div>
            </div>
            <div class="flex justify-between text-xs text-gray-400">
              <span id="update-dialog-percent">0%</span>
              <span id="update-dialog-speed">0 B/s</span>
              <span id="update-dialog-size">0 B / 0 B</span>
            </div>
          </div>
        </div>
        <div class="px-5 py-4 border-t border-gray-700 flex justify-end gap-2">
          <button id="update-dialog-retry" class="hidden px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded">重试</button>
          <button id="update-dialog-download" class="hidden px-4 py-2 text-sm bg-cyan-700 hover:bg-cyan-600 rounded text-white">下载更新</button>
          <button id="update-dialog-install" class="hidden px-4 py-2 text-sm bg-green-700 hover:bg-green-600 rounded text-white">立即重启</button>
          <button id="update-dialog-later" class="hidden px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded">稍后重启</button>
          <button id="update-dialog-close" class="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded">关闭</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    this.cacheElements();
  }

  private cacheElements(): void {
    this.container = document.getElementById('update-progress-dialog') as HTMLDivElement | null;
    this.titleEl = document.getElementById('update-dialog-title');
    this.versionEl = document.getElementById('update-dialog-version');
    this.notesEl = document.getElementById('update-dialog-notes');
    this.messageEl = document.getElementById('update-dialog-message');
    this.progressBarEl = document.getElementById('update-dialog-progress-bar');
    this.percentEl = document.getElementById('update-dialog-percent');
    this.speedEl = document.getElementById('update-dialog-speed');
    this.sizeEl = document.getElementById('update-dialog-size');
    this.progressSectionEl = document.getElementById('update-dialog-progress');

    this.downloadBtn = document.getElementById('update-dialog-download') as HTMLButtonElement | null;
    this.retryBtn = document.getElementById('update-dialog-retry') as HTMLButtonElement | null;
    this.installBtn = document.getElementById('update-dialog-install') as HTMLButtonElement | null;
    this.laterBtn = document.getElementById('update-dialog-later') as HTMLButtonElement | null;
    this.closeBtn = document.getElementById('update-dialog-close') as HTMLButtonElement | null;

    const closeX = document.getElementById('update-dialog-close-x');
    closeX?.addEventListener('click', () => this.hide());
  }

  private bindEvents(): void {
    this.downloadBtn?.addEventListener('click', () => this.startDownload());
    this.retryBtn?.addEventListener('click', () => this.startDownload());
    this.installBtn?.addEventListener('click', () => this.installUpdate());
    this.laterBtn?.addEventListener('click', () => this.hide());
    this.closeBtn?.addEventListener('click', () => this.hide());
  }

  private registerIpcListeners(): void {
    if (typeof window === 'undefined' || typeof window.ipcOn !== 'function') {
      return;
    }

    window.ipcOn('update:available', (info) => {
      this.show(info as UpdateInfo);
    });

    window.ipcOn('update:progress', (progress) => {
      this.updateProgress(progress as ProgressInfo);
    });

    window.ipcOn('update:downloaded', () => {
      this.showDownloaded();
    });

    window.ipcOn('update:error', (error) => {
      this.showError(typeof error === 'string' ? error : '更新失败');
    });

    window.ipcOn('update:no-update-available', (info) => {
      const currentVersion = (info as { currentVersion?: string })?.currentVersion ?? '';
      const message = currentVersion ? `当前已是最新版本 (v${currentVersion})` : '当前已是最新版本';
      this.showNoUpdate(message, currentVersion || undefined);
    });
  }

  show(updateInfo: UpdateInfo): void {
    this.state.updateInfo = updateInfo;
    this.state.message = null;
    this.state.state = 'available';
    this.state.visible = true;
    this.render();
  }

  hide(): void {
    this.state.visible = false;
    this.render();
  }

  startDownload(): void {
    if (!window.electronAPI) {
      this.showError('electronAPI 不可用，无法下载更新');
      return;
    }

    this.state.state = 'downloading';
    this.state.message = '正在下载更新...';
    this.state.progress = { percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 };
    this.render();

    window.electronAPI.downloadUpdate().catch((error) => {
      const message = error instanceof Error ? error.message : '下载更新失败';
      logger.error('Update download failed', { error }, 'UpdateProgressDialog');
      this.showError(message);
    });
  }

  updateProgress(progress: ProgressInfo): void {
    const percent = Math.max(0, Math.min(100, progress.percent || 0));
    this.state.progress = {
      percent,
      bytesPerSecond: Math.max(0, progress.bytesPerSecond || 0),
      transferred: Math.max(0, progress.transferred || 0),
      total: Math.max(0, progress.total || 0),
    };
    this.state.state = 'downloading';
    this.state.visible = true;
    this.render();
  }

  showDownloaded(): void {
    this.state.state = 'downloaded';
    this.state.message = '下载完成，可以重启应用以安装更新。';
    this.render();
  }

  showError(message: string): void {
    this.state.state = 'error';
    this.state.message = message;
    this.state.visible = true;
    this.render();
  }

  private showNoUpdate(message: string, currentVersion?: string): void {
    this.state.state = 'no-update';
    this.state.message = message;
    this.state.updateInfo = currentVersion
      ? { version: currentVersion, releaseNotes: '', releaseDate: '', downloadUrl: '' }
      : null;
    this.state.visible = true;
    this.render();
  }

  private installUpdate(): void {
    if (!window.electronAPI) {
      this.showError('electronAPI 不可用，无法安装更新');
      return;
    }

    window.electronAPI.installUpdate().catch((error) => {
      const message = error instanceof Error ? error.message : '安装更新失败';
      logger.error('Update install failed', { error }, 'UpdateProgressDialog');
      this.showError(message);
    });
  }

  private render(): void {
    if (!this.container) return;
    this.container.classList.toggle('hidden', !this.state.visible);

    const info = this.state.updateInfo;
    if (this.versionEl) {
      this.versionEl.textContent = info ? `v${info.version}` : '-';
    }
    if (this.notesEl) {
      this.notesEl.textContent = info?.releaseNotes || '-';
    }

    if (this.titleEl) {
      this.titleEl.textContent = titles[this.state.state];
    }
    const showProgress = this.state.state === 'downloading' || this.state.state === 'downloaded';
    this.progressSectionEl?.classList.toggle('hidden', !showProgress);

    if (this.messageEl) {
      if (this.state.message) {
        this.messageEl.textContent = this.state.message;
        this.messageEl.classList.remove('hidden');
        this.messageEl.classList.toggle('text-red-400', this.state.state === 'error');
      } else {
        this.messageEl.textContent = '';
        this.messageEl.classList.add('hidden');
      }
    }

    if (this.progressBarEl) {
      this.progressBarEl.style.width = `${this.state.progress.percent.toFixed(1)}%`;
    }
    if (this.percentEl) {
      this.percentEl.textContent = `${this.state.progress.percent.toFixed(1)}%`;
    }
    if (this.speedEl) {
      this.speedEl.textContent = formatSpeed(this.state.progress.bytesPerSecond);
    }
    if (this.sizeEl) {
      const transferred = formatBytes(this.state.progress.transferred);
      const total = formatBytes(this.state.progress.total);
      this.sizeEl.textContent = `${transferred} / ${total}`;
    }

    const isAvailable = this.state.state === 'available';
    const isDownloading = this.state.state === 'downloading';
    const isDownloaded = this.state.state === 'downloaded';
    const isError = this.state.state === 'error';
    const isNoUpdate = this.state.state === 'no-update';

    this.downloadBtn?.classList.toggle('hidden', !isAvailable);
    if (this.downloadBtn) {
      this.downloadBtn.disabled = isDownloading;
    }
    this.retryBtn?.classList.toggle('hidden', !isError);
    this.installBtn?.classList.toggle('hidden', !isDownloaded);
    this.laterBtn?.classList.toggle('hidden', !isDownloaded);
    this.closeBtn?.classList.toggle('hidden', !(isNoUpdate || isError || isAvailable || isDownloading || isDownloaded));
  }
}

export const updateProgressDialog = new UpdateProgressDialog();
