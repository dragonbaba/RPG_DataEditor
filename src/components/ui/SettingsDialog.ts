
import { fileSystemService } from '../../services/FileSystemService';
import { EventSystem } from '../../core/EventSystem';
import { ipc } from '../../services/ipc';
import { logger } from '../../services/logger';

export class SettingsDialog {
  private dialog: HTMLDialogElement | null = null;

  private dataPathInput: HTMLInputElement | null = null;
  private scriptPathInput: HTMLInputElement | null = null;
  private imagePathInput: HTMLInputElement | null = null;
  private workspacePathInput: HTMLInputElement | null = null;

  private saveBtn: HTMLButtonElement | null = null;
  private cancelBtn: HTMLButtonElement | null = null;

  constructor() {
    this.createDialog();
    // this.bindEvents(); // Moved to explicit call in main.ts
  }

  private createDialog() {
    // Create dialog HTML
    const dialogHTML = `
      <dialog id="settings-dialog" class="p-0 rounded-lg shadow-xl bg-slate-800 text-slate-200 w-[600px] border border-slate-700 backdrop-blur-sm">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 class="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Path Settings</h2>
          <button id="settings-close-x" class="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="p-6 space-y-6">
          <!-- Data Path -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-slate-400">Data Directory (JSON)</label>
            <div class="flex gap-2">
              <input type="text" id="settings-data-path" readonly 
                class="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none transition-colors"
                placeholder="Select data directory...">
              <button id="settings-data-browse" class="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm transition-colors border border-slate-600">
                Browse
              </button>
            </div>
          </div>

          <!-- Script Path -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-slate-400">Script Directory</label>
            <div class="flex gap-2">
              <input type="text" id="settings-script-path" readonly 
                class="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none transition-colors"
                placeholder="Select script directory...">
              <button id="settings-script-browse" class="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm transition-colors border border-slate-600">
                Browse
              </button>
            </div>
          </div>

          <!-- Image Path -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-slate-400">Image Directory (img/sv_actors, etc)</label>
            <div class="flex gap-2">
              <input type="text" id="settings-image-path" readonly 
                class="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none transition-colors"
                placeholder="Select image directory...">
              <button id="settings-image-browse" class="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm transition-colors border border-slate-600">
                Browse
              </button>
            </div>
          </div>

           <!-- Workspace Path -->
           <div class="space-y-2">
            <label class="block text-sm font-medium text-slate-400">Workspace Directory</label>
            <div class="flex gap-2">
              <input type="text" id="settings-workspace-path" readonly 
                class="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none transition-colors"
                placeholder="Select workspace directory...">
              <button id="settings-workspace-browse" class="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm transition-colors border border-slate-600">
                Browse
              </button>
            </div>
          </div>

          <!-- Error Message -->
          <div id="settings-error" class="hidden p-3 bg-red-400 bg-opacity-10 border border-red-500 rounded text-red-500 text-sm">
            Please configure all paths before saving.
          </div>
        </div>

        <div class="flex items-center justify-end px-6 py-4 border-t border-slate-700 bg-slate-800/50 gap-3">
          <button id="settings-cancel" class="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
          <button id="settings-save" class="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded shadow-lg shadow-cyan-500/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            Save Settings
          </button>
        </div>
      </dialog>
    `;

    // Append to body if not exists
    if (!document.getElementById('settings-container')) {
      const container = document.createElement('div');
      container.id = 'settings-container';
      container.innerHTML = dialogHTML;
      document.body.appendChild(container);
    }

    this.dialog = document.getElementById('settings-dialog') as HTMLDialogElement;
    this.dataPathInput = document.getElementById('settings-data-path') as HTMLInputElement;
    this.scriptPathInput = document.getElementById('settings-script-path') as HTMLInputElement;
    this.imagePathInput = document.getElementById('settings-image-path') as HTMLInputElement;
    this.workspacePathInput = document.getElementById('settings-workspace-path') as HTMLInputElement;
    this.saveBtn = document.getElementById('settings-save') as HTMLButtonElement;
    this.cancelBtn = document.getElementById('settings-cancel') as HTMLButtonElement;

    const closeX = document.getElementById('settings-close-x');
    if (closeX) closeX.addEventListener('click', () => this.hide());
  }

  public bindEvents() {
    this.bindBrowse('settings-data-browse', this.dataPathInput);
    this.bindBrowse('settings-script-browse', this.scriptPathInput);
    this.bindBrowse('settings-image-browse', this.imagePathInput);
    this.bindBrowse('settings-workspace-browse', this.workspacePathInput);

    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', () => this.save());
    }

    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', () => this.hide());
    }

    // Listen for main process command
    ipc.on('open-path-settings', () => {
      this.show();
    });
  }

  private bindBrowse(btnId: string, input: HTMLInputElement | null) {
    const btn = document.getElementById(btnId);
    if (btn && input) {
      btn.addEventListener('click', async () => {
        const path = await fileSystemService.selectDirectory();
        if (path) {
          input.value = path;
          this.validate();
        }
      });
    }
  }

  private validate(): boolean {
    const dataPath = this.dataPathInput?.value.trim();
    const scriptPath = this.scriptPathInput?.value.trim();
    const imagePath = this.imagePathInput?.value.trim();

    // Check if paths are valid (basic check)
    const isValid = !!(dataPath && scriptPath && imagePath);

    const errorMsg = document.getElementById('settings-error');
    if (errorMsg) {
      if (!isValid) {
        errorMsg.classList.remove('hidden');
        errorMsg.textContent = 'Data, Script, and Image paths are required.';
      } else {
        errorMsg.classList.add('hidden');
      }
    }

    if (this.saveBtn) {
      this.saveBtn.disabled = !isValid;
    }

    return isValid;
  }

  public async show() {
    if (!this.dialog) return;

    // Load current settings
    try {
      const config = await ipc.config.load();
      if (this.dataPathInput) this.dataPathInput.value = config.dataPath || '';
      if (this.scriptPathInput) this.scriptPathInput.value = config.scriptPath || '';
      if (this.imagePathInput) this.imagePathInput.value = config.imagePath || '';
      if (this.workspacePathInput) this.workspacePathInput.value = config.workspacePath || ''; // Optional

      this.validate();
      this.dialog.showModal();
    } catch (error) {
      logger.error('Failed to load settings', { error });
    }
  }

  public hide() {
    if (this.dialog) {
      this.dialog.close();
    }
  }

  private async save() {
    if (!this.validate()) return;

    const config = {
      dataPath: this.dataPathInput?.value.trim(),
      scriptPath: this.scriptPathInput?.value.trim(),
      imagePath: this.imagePathInput?.value.trim(),
      workspacePath: this.workspacePathInput?.value.trim(),
    };


    try {
      await ipc.config.save(config);

      // Notify other components
      ipc.app.reload(); // Simple way to refresh everything with new config? Or emit events?
      // Better to emit events or just let them pick it up next time. 
      // For now, let's just close and maybe show a toast.

      this.hide();
      EventSystem.emit('toast:success', 'Settings saved successfully');

      // If we need to trigger reloads of data:
      if (config.dataPath) EventSystem.emit('config:data-path-changed', config.dataPath);

    } catch (error) {
      logger.error('Failed to save settings', { error });
      EventSystem.emit('toast:error', 'Failed to save settings');
    }
  }
}

// Singleton instance
export const settingsDialog = new SettingsDialog();
