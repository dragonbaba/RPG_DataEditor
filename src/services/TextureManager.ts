import * as PIXI from 'pixi.js';
import { StateManager } from '../core/StateManager';
import { ipc } from './ipc';
import { logger } from './logger';

export class TextureManager {
    private static instance: TextureManager;
    private textureCache: Map<string, PIXI.Texture> = new Map();
    private loadingPromises: Map<string, Promise<PIXI.Texture>> = new Map();

    private constructor() { }

    public static getInstance(): TextureManager {
        if (!TextureManager.instance) {
            TextureManager.instance = new TextureManager();
        }
        return TextureManager.instance;
    }

    /**
     * Load an enemy texture (full image)
     * Path pattern: {imagePath}/sv_enemies/{battlerName}.png
     */
    public async loadEnemyTexture(battlerName: string): Promise<PIXI.Texture> {
        if (!battlerName) return PIXI.Texture.EMPTY;

        const config = StateManager.getState().config;
        if (!config.imagePath) {
            logger.warn('Image path not configured', undefined, 'TextureManager');
            return PIXI.Texture.EMPTY;
        }

        // Construct path. Note: We use forward slashes for URL compatibility if needed, 
        // but since we read via Nodefs (in main) or file protocol, we need to be careful.
        // The editor runs in Electron, so we can use file:// protocol or base64.
        // Actually, PIXI in Electron might need a direct file path or a blob.
        // Let's assume we read the file content via IPC and create a texture from base64/blob 
        // OR use file:// protocol if security policy allows.

        // Strategy: Use IPC to read file as base64 to avoid file:// access issues if strictly sandboxed,
        // but our main.ts allows access. Let's try file URL first.
        // Actually, reading via IPC is safer and we already have `ipc.file.read`.
        // But `ipc.file.read` returns string (utf-8). We need binary or base64.
        // Let's assume we can construct a file:// URL.
        const imagePath = config.imagePath; // Use original path with backslashes if on Windows, IPC handles it
        const fullPath = `${imagePath}/sv_enemies/${battlerName}.png`.replace(/\//g, '\\'); // Ensure correct separators for fs

        try {
            const base64Data = await ipc.file.readImage(fullPath);
            return this.loadTextureFromData(base64Data, battlerName);
        } catch (error) {
            logger.error(`Failed to load enemy texture: ${battlerName}`, { error }, 'TextureManager');
            return PIXI.Texture.EMPTY;
        }
    }

    /**
     * Load an actor texture (cropped 1/9 width, 1/6 height)
     * Path pattern: {imagePath}/sv_actors/{battlerName}.png
     */
    public async loadActorTexture(battlerName: string): Promise<PIXI.Texture> {
        if (!battlerName) return PIXI.Texture.EMPTY;

        const config = StateManager.getState().config;
        if (!config.imagePath) {
            logger.warn('Image path not configured', undefined, 'TextureManager');
            return PIXI.Texture.EMPTY;
        }

        const imagePath = config.imagePath;
        const fullPath = `${imagePath}/sv_actors/${battlerName}.png`.replace(/\//g, '\\');
        const cacheKey = `actor:${battlerName}`;

        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!;
        }

        try {
            const base64Data = await ipc.file.readImage(fullPath);
            const baseTexture = PIXI.BaseTexture.from(base64Data);

            // Wait for base texture to load
            if (!baseTexture.valid) {
                await new Promise((resolve) => {
                    baseTexture.once('loaded', resolve);
                });
            }

            // Create cropped texture
            // Actors are typically 9x6 layout
            const frameWidth = baseTexture.width / 9;
            const frameHeight = baseTexture.height / 6;

            // We want the first frame (TOP-LEFT) usually? Or SV_Actors standard?
            // SV_Actors standard: 3x2 chunks of 3x4 patterns?
            // Actually usually it's 9 columns, 6 rows.
            // Let's crop 0,0 for standing pose.
            const rect = new PIXI.Rectangle(0, 0, frameWidth, frameHeight);
            const texture = new PIXI.Texture(baseTexture, rect);

            this.textureCache.set(cacheKey, texture);
            return texture;
        } catch (error) {
            logger.error(`Failed to load actor texture: ${battlerName}`, { error }, 'TextureManager');
            return PIXI.Texture.EMPTY;
        }
    }

    private async loadTextureFromData(base64Data: string, key: string): Promise<PIXI.Texture> {
        if (this.textureCache.has(key)) {
            return this.textureCache.get(key)!;
        }

        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key)!;
        }

        const promise = (async () => {
            try {
                const texture = PIXI.Texture.from(base64Data);

                // Wait for texture to be ready
                if (!texture.baseTexture.valid) {
                    await new Promise((resolve) => {
                        texture.baseTexture.once('loaded', resolve);
                    });
                }

                this.textureCache.set(key, texture);
                this.loadingPromises.delete(key);
                return texture;
            } catch (error) {
                logger.error(`Failed to load texture from data for key: ${key}`, { error }, 'TextureManager');
                this.loadingPromises.delete(key);
                return PIXI.Texture.EMPTY;
            }
        })();

        this.loadingPromises.set(key, promise);
        return promise;
    }

    public releaseTextures() {
        // Destroy all cached textures to free memory
        for (const texture of this.textureCache.values()) {
            texture.destroy(true); // true = destroy base texture as well if possible? 
            // destroying base texture might affect others if shared, but here we load unique files mainly.
            // For safety, maybe just destroy the texture wrapper.
            // Actually, for Actors, we share BaseTexture.
        }
        this.textureCache.clear();
        this.loadingPromises.clear();
        PIXI.utils.clearTextureCache(); // Clear global cache too if we used fromURL
    }
}

export const textureManager = TextureManager.getInstance();
