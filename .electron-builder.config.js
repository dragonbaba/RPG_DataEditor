module.exports = async function () {
    return {
        appId: 'com.ZaunPlugin.game',
        asar: true,
        afterPack: './afterPack/afterPack.js',
        directories: {
            output: 'dist-electron'
        },
        win: {
            target: [
                {
                    target: 'nsis',
                    arch: ['x64']
                }
            ],
            icon: 'icon/icon.png'
        },
        nsis: {
            oneClick: false,
            perMachine: true,
            allowToChangeInstallationDirectory: true,
            deleteAppDataOnUninstall: true,
            createDesktopShortcut: true,
            createStartMenuShortcut: true,
            shortcutName: 'Mental Max Fantasy World'
        },
        mac: {
            target: [
                {
                    target: 'dmg',
                    arch: ['x64', 'arm64']
                }
            ],
            category: 'Games',
            icon: 'icon/icon.png'
        },
        linux: {
            target: [
                {
                    target: 'AppImage',
                    arch: ['x64']
                }
            ],
            category: 'Game',
            icon: 'icon/icon.png'
        }
    };
};
