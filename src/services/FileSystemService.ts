/**
 * FileSystemService
 * 
 * Provides a high-level API for file system operations in the renderer process.
 * All operations are performed via IPC to the main process for security.
 * 
 * Requirements: 7.1, 7.5
 */

import { ipc } from './ipc';
import type { FileFilter } from '../types/ipc';

/**
 * Result type for file operations that may fail
 */
export interface FileOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * FileSystemService class
 * Provides secure file system operations via IPC
 */
export class FileSystemService {
  /**
   * Read file content as string
   * @param path - File path to read
   * @returns File content or error
   */
  async readFile(path: string): Promise<FileOperationResult<string>> {
    try {
      const content = await ipc.file.read(path);
      return { success: true, data: content };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error reading file';
      return { success: false, error: message };
    }
  }

  /**
   * Write content to a file
   * @param path - File path to write
   * @param content - Content to write
   * @returns Success status
   */
  async writeFile(path: string, content: string): Promise<FileOperationResult<void>> {
    try {
      await ipc.file.write(path, content);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error writing file';
      return { success: false, error: message };
    }
  }

  /**
   * Delete a file
   * @param path - File path to delete
   * @returns Success status
   */
  async deleteFile(path: string): Promise<FileOperationResult<void>> {
    try {
      await ipc.file.delete(path);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error deleting file';
      return { success: false, error: message };
    }
  }

  /**
   * Open file selection dialog
   * @param filters - Optional file type filters
   * @returns Selected file path or null if cancelled
   */
  async selectFile(filters?: FileFilter[]): Promise<string | null> {
    try {
      return await ipc.file.select(filters);
    } catch (error) {
      console.error('Error selecting file:', error);
      return null;
    }
  }

  /**
   * Open directory selection dialog
   * @returns Selected directory path or null if cancelled
   */
  async selectDirectory(): Promise<string | null> {
    try {
      return await ipc.file.selectDirectory();
    } catch (error) {
      console.error('Error selecting directory:', error);
      return null;
    }
  }

  /**
   * Create a backup of a file
   * Creates a copy with timestamp in the same directory
   * @param path - File path to backup
   * @returns Backup file path or error
   * 
   * Requirements: 7.5
   */
  async createBackup(path: string): Promise<FileOperationResult<string>> {
    try {
      const backupPath = await ipc.file.createBackup(path);
      return { success: true, data: backupPath };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error creating backup';
      return { success: false, error: message };
    }
  }

  /**
   * List files in a directory
   * @param path - Directory path
   * @returns Array of file/folder names or error
   */
  async listDirectory(path: string): Promise<FileOperationResult<string[]>> {
    try {
      const entries = await ipc.file.listDirectory(path);
      return { success: true, data: entries };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error listing directory';
      return { success: false, error: message };
    }
  }

  /**
   * Check if a file exists
   * @param path - File path to check
   * @returns True if file exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      return await ipc.file.exists(path);
    } catch {
      return false;
    }
  }

  /**
   * Read and parse a JSON file
   * @param path - File path to read
   * @returns Parsed JSON data or error
   */
  async readJSON<T>(path: string): Promise<FileOperationResult<T>> {
    const result = await this.readFile(path);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    try {
      const data = JSON.parse(result.data) as T;
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON';
      return { success: false, error: `Failed to parse JSON: ${message}` };
    }
  }

  /**
   * Write data as JSON to a file
   * @param path - File path to write
   * @param data - Data to serialize
   * @param pretty - Whether to pretty-print (default: true)
   * @returns Success status
   */
  async writeJSON<T>(path: string, data: T, pretty = true): Promise<FileOperationResult<void>> {
    try {
      const content = pretty 
        ? JSON.stringify(data, null, 2) 
        : JSON.stringify(data);
      return await this.writeFile(path, content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to serialize JSON';
      return { success: false, error: message };
    }
  }

  /**
   * Save file with automatic backup
   * Creates a backup before writing new content
   * @param path - File path to save
   * @param content - Content to write
   * @returns Success status with backup path
   * 
   * Requirements: 7.5
   */
  async saveWithBackup(path: string, content: string): Promise<FileOperationResult<{ backupPath?: string }>> {
    // Check if file exists to create backup
    const fileExists = await this.exists(path);
    let backupPath: string | undefined;

    if (fileExists) {
      const backupResult = await this.createBackup(path);
      if (!backupResult.success) {
        // Log warning but continue with save
        console.warn('Failed to create backup:', backupResult.error);
      } else {
        backupPath = backupResult.data;
      }
    }

    // Write the new content
    const writeResult = await this.writeFile(path, content);
    if (!writeResult.success) {
      return { success: false, error: writeResult.error };
    }

    return { success: true, data: { backupPath } };
  }

  /**
   * Save JSON data with automatic backup
   * @param path - File path to save
   * @param data - Data to serialize and save
   * @param pretty - Whether to pretty-print (default: true)
   * @returns Success status with backup path
   */
  async saveJSONWithBackup<T>(
    path: string, 
    data: T, 
    pretty = true
  ): Promise<FileOperationResult<{ backupPath?: string }>> {
    try {
      const content = pretty 
        ? JSON.stringify(data, null, 2) 
        : JSON.stringify(data);
      return await this.saveWithBackup(path, content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to serialize JSON';
      return { success: false, error: message };
    }
  }
}

// Export singleton instance
export const fileSystemService = new FileSystemService();

export default fileSystemService;
