const EMPTY_STRING = '';

let overlayElement: HTMLElement | null = null;
let messageElement: HTMLElement | null = null;
let stackElement: HTMLElement | null = null;
let copyButton: HTMLButtonElement | null = null;
let reloadButton: HTMLButtonElement | null = null;
let copyBuffer: HTMLTextAreaElement | null = null;

function ensureCopyBuffer(): HTMLTextAreaElement | null {
  if (copyBuffer) return copyBuffer;
  const buffer = document.createElement('textarea');
  buffer.setAttribute('readonly', 'true');
  buffer.style.position = 'fixed';
  buffer.style.opacity = '0';
  buffer.style.pointerEvents = 'none';
  buffer.style.left = '-9999px';
  buffer.style.top = '0';
  document.body.appendChild(buffer);
  copyBuffer = buffer;
  return copyBuffer;
}

function copyStackToClipboard(): void {
  if (!stackElement) return;
  const text = stackElement.textContent || EMPTY_STRING;
  if (!text) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    void navigator.clipboard.writeText(text);
    return;
  }

  const buffer = ensureCopyBuffer();
  if (!buffer) return;
  buffer.value = text;
  buffer.select();
  document.execCommand('copy');
}

function reloadPage(): void {
  window.location.reload();
}

export function initErrorOverlay(): void {
  overlayElement = document.getElementById('errorOverlay');
  messageElement = document.getElementById('errorOverlayMessage');
  stackElement = document.getElementById('errorOverlayStack');
  copyButton = document.getElementById('errorOverlayCopy') as HTMLButtonElement | null;
  reloadButton = document.getElementById('errorOverlayReload') as HTMLButtonElement | null;

  if (copyButton) {
    copyButton.addEventListener('click', copyStackToClipboard);
  }
  if (reloadButton) {
    reloadButton.addEventListener('click', reloadPage);
  }
}

export function showErrorOverlay(message: string, stack?: string): void {
  if (!overlayElement) {
    initErrorOverlay();
  }
  if (!overlayElement || !messageElement || !stackElement) return;

  messageElement.textContent = message || EMPTY_STRING;
  stackElement.textContent = stack || EMPTY_STRING;
  overlayElement.classList.remove('hidden');
}

export function hideErrorOverlay(): void {
  if (!overlayElement) return;
  overlayElement.classList.add('hidden');
}
