/**
 * Electron Builder Configuration
 * Requirements: 14.4 - 生产环境构建和多平台打包
 */

module.exports = async function () {
    return {
        appId: 'com.ZaunPlugin.RPGDataEditor',
        productName: 'RPG数据拓展编辑器',
        copyright: 'Copyright © 2025 Zaun',
        
        // ASAR packaging for security and performance
        asar: true,
        asarUnpack: [
            // Unpack native modules if needed
            '**/*.node',
            '**/node_modules/sharp/**/*',
        ],
        
        // Post-pack hook
        afterPack: './afterPack/afterPack.cjs',
        
        // Output directory
        directories: {
            output: 'release',
            buildResources: 'icon',
        },
        
        // Files to include in the package
        files: [
            'dist/**/*',
            'dist-electron/**/*',
            'js/**/*',
            'data/**/*',
            'icon/**/*',
            'plugins/**/*',
            'node_modules/**/*',
            '!src/**/*',
            '!.kiro/**/*',
            '!.git/**/*',
            '!.vscode/**/*',
            '!*.md',
            '!*.log',
        ],
        
        // Extra resources to include
        extraResources: [
            {
                from: 'js',
                to: 'js',
                filter: ['**/*'],
            },
            {
                from: 'plugins',
                to: 'plugins',
                filter: ['**/*'],
            },
        ],
        
        // Windows configuration
        win: {
            target: [
                {
                    target: 'nsis',
                    arch: ['x64', 'ia32'],
                },
        {
            target: 'portable',
            arch: ['x64'],
        },
    ],
    icon: 'icon/icon.png',
    artifactName: 'rpg-data-editor-setup-${version}-${arch}.${ext}',
            // Sign the application (requires certificate)
            // certificateFile: 'path/to/certificate.pfx',
            // certificatePassword: process.env.WIN_CSC_KEY_PASSWORD,
        },
        
        // NSIS installer configuration
        nsis: {
            oneClick: false,
            perMachine: true,
            allowToChangeInstallationDirectory: true,
            deleteAppDataOnUninstall: true,
            createDesktopShortcut: true,
            createStartMenuShortcut: true,
            shortcutName: 'RPG数据拓展编辑器',
            // Note: NSIS requires .ico format for icons
            // installerIcon: 'icon/icon.ico',
            // uninstallerIcon: 'icon/icon.ico',
            // installerHeaderIcon: 'icon/icon.ico',
            license: 'LICENSE',
            // Multi-language support
            installerLanguages: ['zh_CN', 'en_US'],
        },
        
        // macOS configuration
        mac: {
            target: [
                {
                    target: 'dmg',
                    arch: ['x64', 'arm64'],
                },
                {
                    target: 'zip',
                    arch: ['x64', 'arm64'],
                },
            ],
            category: 'public.app-category.developer-tools',
            icon: 'icon/icon.png',
            artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
            // Code signing (requires Apple Developer certificate)
            // identity: 'Developer ID Application: Your Name (XXXXXXXXXX)',
            hardenedRuntime: true,
            gatekeeperAssess: false,
            entitlements: 'build/entitlements.mac.plist',
            entitlementsInherit: 'build/entitlements.mac.plist',
        },
        
        // DMG configuration
        dmg: {
            contents: [
                {
                    x: 130,
                    y: 220,
                },
                {
                    x: 410,
                    y: 220,
                    type: 'link',
                    path: '/Applications',
                },
            ],
            window: {
                width: 540,
                height: 380,
            },
        },
        
        // Linux configuration
        linux: {
            target: [
                {
                    target: 'AppImage',
                    arch: ['x64'],
                },
                {
                    target: 'deb',
                    arch: ['x64'],
                },
                {
                    target: 'rpm',
                    arch: ['x64'],
                },
            ],
            category: 'Development',
            icon: 'icon/icon.png',
            artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
            desktop: {
                entry: {
                    Name: 'RPG数据拓展编辑器',
                    Comment: 'RPG Maker Data Extension Editor',
                    Categories: 'Development;IDE;',
                    Keywords: 'rpg;maker;editor;json;',
                }
            },
        },
        
        // Auto-update configuration (Requirements: 14.1, 14.2)
        publish: {
            provider: 'github',
            owner: 'dragonbaba',
            repo: 'RPG_DataEditor',
            releaseType: 'release',
        },
        
        // Generate latest.yml for auto-update
        generateUpdatesFilesForAllChannels: true,
    };
};
