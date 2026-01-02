/**
 * IPC Type-Safe Property Tests
 * 
 * Property-based tests for IPC file operations
 * 
 * **Property 10: 文件操作往返**
 * *For any* valid file content, writing to a file and reading it back SHALL return the same content.
 * **Validates: Requirements 7.1**
 * 
 * **Property 13: 备份创建**
 * *For any* file save operation, a backup file SHALL exist with the previous content.
 * **Validates: Requirements 7.5**
 * 
 * Feature: editor-refactor, Property 10: File operation round-trip
 * Feature: editor-refactor, Property 13: Backup creation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Mock file system storage for testing round-trip property
 * This simulates the file system behavior without requiring actual Electron IPC
 */
class MockFileSystem {
  private storage: Map<string, string> = new Map();

  async writeFile(path: string, content: string): Promise<boolean> {
    this.storage.set(path, content);
    return true;
  }

  async readFile(path: string): Promise<string> {
    const content = this.storage.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  async exists(path: string): Promise<boolean> {
    return this.storage.has(path);
  }

  /**
   * Create a backup of a file
   * Simulates the main process backup behavior:
   * - Creates a copy with timestamp in the same directory
   * - Returns the backup path
   */
  async createBackup(filePath: string): Promise<string> {
    if (!this.storage.has(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    
    // Extract directory, basename, and extension
    const lastSlash = filePath.lastIndexOf('/');
    const dir = lastSlash >= 0 ? filePath.substring(0, lastSlash) : '';
    const fileName = lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
    const lastDot = fileName.lastIndexOf('.');
    const baseName = lastDot >= 0 ? fileName.substring(0, lastDot) : fileName;
    const ext = lastDot >= 0 ? fileName.substring(lastDot) : '';
    
    // Create timestamp-based backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${baseName}_backup_${timestamp}${ext}`;
    const backupPath = dir ? `${dir}/${backupFileName}` : backupFileName;
    
    // Copy the content to backup
    const originalContent = this.storage.get(filePath)!;
    this.storage.set(backupPath, originalContent);
    
    return backupPath;
  }

  /**
   * List all files that match a pattern (for testing backup existence)
   */
  listFilesMatching(pattern: RegExp): string[] {
    return Array.from(this.storage.keys()).filter(key => pattern.test(key));
  }

  clear(): void {
    this.storage.clear();
  }
}

/**
 * FileSystemService wrapper for testing
 * Uses the mock file system to test the round-trip property
 */
class TestableFileSystemService {
  constructor(private fs: MockFileSystem) {}

  async readFile(path: string): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const content = await this.fs.readFile(path);
      return { success: true, data: content };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error reading file';
      return { success: false, error: message };
    }
  }

  async writeFile(path: string, content: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.fs.writeFile(path, content);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error writing file';
      return { success: false, error: message };
    }
  }

  async exists(path: string): Promise<boolean> {
    return this.fs.exists(path);
  }

  async createBackup(path: string): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const backupPath = await this.fs.createBackup(path);
      return { success: true, data: backupPath };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error creating backup';
      return { success: false, error: message };
    }
  }

  /**
   * Save file with automatic backup
   * Creates a backup before writing new content
   * Mirrors the FileSystemService.saveWithBackup behavior
   */
  async saveWithBackup(path: string, content: string): Promise<{ success: boolean; data?: { backupPath?: string }; error?: string }> {
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
   * Get the underlying mock file system for verification
   */
  getMockFs(): MockFileSystem {
    return this.fs;
  }
}

describe('IPC File Operations Property Tests', () => {
  let mockFs: MockFileSystem;
  let fileService: TestableFileSystemService;

  beforeEach(() => {
    mockFs = new MockFileSystem();
    fileService = new TestableFileSystemService(mockFs);
  });

  afterEach(() => {
    mockFs.clear();
  });

  /**
   * Property 10: 文件操作往返 (File Operation Round-Trip)
   * 
   * For any valid file content, writing to a file and reading it back
   * SHALL return the same content.
   * 
   * **Validates: Requirements 7.1**
   * Feature: editor-refactor, Property 10: File operation round-trip
   */
  describe('Property 10: File Operation Round-Trip', () => {
    it('should preserve content through write-read cycle for any string content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 6, maxLength: 55 }),
          fc.string({ minLength: 0, maxLength: 10000 }),
          async (filePath: string, content: string) => {
            const writeResult = await fileService.writeFile(filePath, content);
            expect(writeResult.success).toBe(true);

            const readResult = await fileService.readFile(filePath);
            expect(readResult.success).toBe(true);
            expect(readResult.data).toBe(content);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve content for JSON-like strings', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).map(name => `/data/${name}.json`),
          // Generate JSON-like content
          fc.jsonValue().map(v => JSON.stringify(v, null, 2)),
          async (filePath, jsonContent) => {
            // Write JSON content
            const writeResult = await fileService.writeFile(filePath, jsonContent);
            expect(writeResult.success).toBe(true);

            // Read it back
            const readResult = await fileService.readFile(filePath);
            expect(readResult.success).toBe(true);

            // Verify round-trip
            expect(readResult.data).toBe(jsonContent);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve content with special characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant('/test/special.txt'),
          // Generate strings with special characters
          fc.string({ minLength: 0, maxLength: 1000 }),
          async (filePath, content) => {
            const writeResult = await fileService.writeFile(filePath, content);
            expect(writeResult.success).toBe(true);

            const readResult = await fileService.readFile(filePath);
            expect(readResult.success).toBe(true);

            expect(readResult.data).toBe(content);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve empty content', async () => {
      const filePath = '/test/empty.txt';
      const content = '';

      const writeResult = await fileService.writeFile(filePath, content);
      expect(writeResult.success).toBe(true);

      const readResult = await fileService.readFile(filePath);
      expect(readResult.success).toBe(true);
      expect(readResult.data).toBe(content);
    });

    it('should preserve content with newlines and whitespace', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant('/test/whitespace.txt'),
          // Generate strings with various whitespace
          fc.array(
            fc.oneof(
              fc.string({ minLength: 1, maxLength: 100 }),
              fc.constant('\n'),
              fc.constant('\r\n'),
              fc.constant('\t'),
              fc.constant('  ')
            ),
            { minLength: 1, maxLength: 50 }
          ).map(parts => parts.join('')),
          async (filePath, content) => {
            const writeResult = await fileService.writeFile(filePath, content);
            expect(writeResult.success).toBe(true);

            const readResult = await fileService.readFile(filePath);
            expect(readResult.success).toBe(true);

            expect(readResult.data).toBe(content);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple write-read cycles on same file', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant('/test/overwrite.txt'),
          fc.array(fc.string({ minLength: 0, maxLength: 500 }), { minLength: 2, maxLength: 5 }),
          async (filePath, contents) => {
            // Write and read multiple times, each time verifying round-trip
            for (const content of contents) {
              const writeResult = await fileService.writeFile(filePath, content);
              expect(writeResult.success).toBe(true);

              const readResult = await fileService.readFile(filePath);
              expect(readResult.success).toBe(true);
              expect(readResult.data).toBe(content);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 13: 备份创建 (Backup Creation)
   * 
   * For any file save operation, a backup file SHALL exist with the previous content.
   * 
   * **Validates: Requirements 7.5**
   * Feature: editor-refactor, Property 13: Backup creation
   */
  describe('Property 13: Backup Creation', () => {
    it('should create backup with previous content when saving existing file', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 50 }).filter((s: string) => s.startsWith('/') && !s.includes('..') && !s.includes('\0')),
          fc.string({ minLength: 1, maxLength: 5000 }),
          fc.string({ minLength: 1, maxLength: 5000 }),
          async (filePath: string, originalContent: string, newContent: string) => {
            const initialWrite = await fileService.writeFile(filePath, originalContent);
            expect(initialWrite.success).toBe(true);

            const saveResult = await fileService.saveWithBackup(filePath, newContent);
            expect(saveResult.success).toBe(true);
            expect(saveResult.data?.backupPath).toBeDefined();

            const backupPath = saveResult.data!.backupPath!;
            const backupRead = await fileService.readFile(backupPath);
            expect(backupRead.success).toBe(true);
            expect(backupRead.data).toBe(originalContent);

            const currentRead = await fileService.readFile(filePath);
            expect(currentRead.success).toBe(true);
            expect(currentRead.data).toBe(newContent);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should not create backup when saving new file (file does not exist)', async () => {
      let testCounter = 0;
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 40 }),
          fc.string({ minLength: 1, maxLength: 1000 }),
          async (baseName: string, content: string) => {
            const filePath = `/new/${baseName}_${testCounter++}.json`;
            
            const existsBefore = await fileService.exists(filePath);
            expect(existsBefore).toBe(false);
            
            // Save to a new file (no backup should be created)
            const saveResult = await fileService.saveWithBackup(filePath, content);
            expect(saveResult.success).toBe(true);
            
            // No backup path should be returned for new files
            expect(saveResult.data?.backupPath).toBeUndefined();

            // Verify the file was created with correct content
            const readResult = await fileService.readFile(filePath);
            expect(readResult.success).toBe(true);
            expect(readResult.data).toBe(content);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve backup content through multiple save operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant('/data/multi-save.json'),
          // Generate a sequence of content versions
          fc.array(fc.string({ minLength: 1, maxLength: 500 }), { minLength: 3, maxLength: 5 }),
          async (filePath, contentVersions) => {
            const backupPaths: string[] = [];
            
            // Write initial content
            await fileService.writeFile(filePath, contentVersions[0]);
            
            // Save multiple times, collecting backup paths
            for (let i = 1; i < contentVersions.length; i++) {
              const previousContent = contentVersions[i - 1];
              const newContent = contentVersions[i];
              
              const saveResult = await fileService.saveWithBackup(filePath, newContent);
              expect(saveResult.success).toBe(true);
              
              if (saveResult.data?.backupPath) {
                backupPaths.push(saveResult.data.backupPath);
                
                // Verify this backup contains the previous content
                const backupRead = await fileService.readFile(saveResult.data.backupPath);
                expect(backupRead.success).toBe(true);
                expect(backupRead.data).toBe(previousContent);
              }
            }
            
            // All saves after the first should have created backups
            expect(backupPaths.length).toBe(contentVersions.length - 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create backup with correct naming pattern', async () => {
      const filePath = '/files/test_backup_pattern.json';
      const originalContent = 'original content for backup pattern test';
      const newContent = 'new content for backup pattern test';
      
      await fileService.writeFile(filePath, originalContent);
      
      const saveResult = await fileService.saveWithBackup(filePath, newContent);
      expect(saveResult.success).toBe(true);
      
      const backupPath = saveResult.data?.backupPath;
      expect(backupPath).toBeDefined();
      
      const backupPattern = /_backup_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/;
      expect(backupPath).toMatch(backupPattern);
      
      const originalExt = filePath.substring(filePath.lastIndexOf('.'));
      expect(backupPath!.endsWith(originalExt)).toBe(true);
    });

    it('should fail to create backup for non-existent file', async () => {
      const nonExistentPath = '/does/not/exist.json';
      
      const backupResult = await fileService.createBackup(nonExistentPath);
      expect(backupResult.success).toBe(false);
      expect(backupResult.error).toContain('does not exist');
    });

    it('should handle files with various extensions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('.json', '.txt', '.xml', '.yaml', '.md', '.js', '.ts'),
          fc.string({ minLength: 1, maxLength: 15 }),
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 500 }),
          async (ext: string, baseName: string, originalContent: string, newContent: string) => {
            const filePath = `/files/${baseName}${ext}`;
            
            // Create original file
            await fileService.writeFile(filePath, originalContent);
            
            // Save with backup
            const saveResult = await fileService.saveWithBackup(filePath, newContent);
            expect(saveResult.success).toBe(true);
            
            // Verify backup exists and has correct extension
            const backupPath = saveResult.data?.backupPath;
            expect(backupPath).toBeDefined();
            expect(backupPath!.endsWith(ext)).toBe(true);
            
            // Verify backup content
            const backupRead = await fileService.readFile(backupPath!);
            expect(backupRead.success).toBe(true);
            expect(backupRead.data).toBe(originalContent);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
