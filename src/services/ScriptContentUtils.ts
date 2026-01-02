export const SCRIPT_TIMESTAMP_REGEXP = /^\/\/\s*保存时间:\s*.+$/m;

export function extractScriptCode(fileContent: string): string {
  if (!fileContent) return '';
  const lines = fileContent.split('\n');
  let codeStartIndex = 0;
  const length = lines.length;
  for (let i = 0; i < length; i++) {
    if (SCRIPT_TIMESTAMP_REGEXP.test(lines[i])) {
      codeStartIndex = i + 1;
      while (codeStartIndex < length && lines[codeStartIndex].trim() === '') {
        codeStartIndex++;
      }
      break;
    }
  }
  return lines.slice(codeStartIndex).join('\n');
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function buildTimestampLine(date: Date): string {
  return `// 保存时间: ${formatTimestamp(date)}`;
}

export default {
  extractScriptCode,
  buildTimestampLine,
  formatTimestamp,
  SCRIPT_TIMESTAMP_REGEXP,
};
