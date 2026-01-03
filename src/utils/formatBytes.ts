/**
 * 字节格式化工具函数
 * 用于将字节数转换为人类可读的格式
 */

/**
 * 将字节数转换为人类可读格式
 * @param bytes 字节数
 * @param decimals 小数位数，默认为2
 * @returns 格式化后的字符串，如 "1.5 MB"
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

  return `${size} ${sizes[i]}`;
}

/**
 * 将字节/秒转换为人类可读的速度格式
 * @param bytesPerSecond 每秒字节数
 * @returns 格式化后的字符串，如 "1.5 MB/s"
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';
  if (bytesPerSecond < 0) return '0 B/s';

  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s', 'PB/s', 'EB/s', 'ZB/s', 'YB/s'];

  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  // Ensure we don't exceed the sizes array
  const sizeIndex = Math.min(i, sizes.length - 1);
  const speed = parseFloat((bytesPerSecond / Math.pow(k, sizeIndex)).toFixed(2));

  return `${speed} ${sizes[sizeIndex]}`;
}