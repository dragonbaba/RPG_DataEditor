# 自动更新功能说明

## 概述

RPG数据拓展编辑器支持自动更新功能，当有新版本发布时，应用会自动检测并提示用户更新。

## 工作原理

1. **检测更新**: 应用启动时会检查 GitHub Releases 是否有新版本
2. **下载更新**: 用户确认后，应用会在后台下载更新包
3. **安装更新**: 下载完成后，用户可以选择立即重启安装或稍后安装

## 更新频率设置

用户可以在设置中选择更新检查频率：
- **启动时检查** (默认): 每次启动应用时检查
- **每日检查**: 每天检查一次
- **每周检查**: 每周检查一次  
- **手动检查**: 只有手动点击"检查更新"时才检查

## 发布流程

### 开发者发布新版本

1. **准备发布**:
   ```bash
   # 确保代码已提交
   git status
   
   # 运行测试
   npm run test
   npm run typecheck
   ```

2. **创建发布**:
   ```bash
   # 使用发布脚本 (推荐)
   node scripts/release.js 1.0.3
   
   # 或手动创建
   npm version 1.0.3
   git push origin main
   git push origin v1.0.3
   ```

3. **GitHub Actions 自动构建**:
   - 推送 tag 后，GitHub Actions 会自动构建所有平台的安装包
   - 构建完成后会自动创建 GitHub Release
   - 生成的 `latest.yml` 文件用于自动更新检测

### 文件说明

发布后会生成以下文件：

**Windows**:
- `RPG数据拓展编辑器-1.0.3-win-x64.exe` - 安装程序
- `RPG数据拓展编辑器-1.0.3-win-x64.exe.blockmap` - 增量更新文件
- `latest.yml` - 更新信息文件

**macOS**:
- `RPG数据拓展编辑器-1.0.3-mac-x64.dmg` - Intel Mac 安装包
- `RPG数据拓展编辑器-1.0.3-mac-arm64.dmg` - Apple Silicon Mac 安装包
- `latest-mac.yml` - 更新信息文件

**Linux**:
- `RPG数据拓展编辑器-1.0.3-linux-x64.AppImage` - AppImage 格式
- `RPG数据拓展编辑器-1.0.3-linux-x64.deb` - Debian 包
- `RPG数据拓展编辑器-1.0.3-linux-x64.rpm` - RPM 包
- `latest-linux.yml` - 更新信息文件

## 技术实现

### electron-updater 配置

```javascript
// electron-builder 配置
publish: {
  provider: 'github',
  owner: 'dragonbaba',
  repo: 'RPG_DataEditor',
  releaseType: 'release',
}
```

### 自动更新服务

位于 `electron/autoUpdater.ts`，提供以下功能：
- 检查更新
- 下载更新
- 安装更新
- 更新进度显示
- 错误处理

### IPC 通信

主进程和渲染进程通过以下 IPC 通道通信：
- `update:check` - 检查更新
- `update:download` - 下载更新
- `update:install` - 安装更新
- `update:available` - 有更新可用
- `update:progress` - 下载进度
- `update:downloaded` - 下载完成
- `update:error` - 更新错误

## 故障排除

### 更新检查失败
- 检查网络连接
- 确认 GitHub 仓库访问权限
- 查看控制台错误信息

### 下载失败
- 检查磁盘空间
- 确认防火墙设置
- 尝试手动下载安装

### 安装失败
- 以管理员权限运行
- 关闭杀毒软件临时保护
- 手动下载最新版本安装

## 开发调试

### 测试自动更新

1. **本地测试**:
   ```bash
   # 设置环境变量强制检查更新
   set ELECTRON_IS_DEV=false
   npm run electron:dev
   ```

2. **发布测试版本**:
   ```bash
   # 创建预发布版本
   git tag v1.0.3-beta.1
   git push origin v1.0.3-beta.1
   ```

### 调试信息

自动更新服务会在控制台输出详细日志：
```
[AutoUpdater] Checking for updates...
[AutoUpdater] Update available: 1.0.3
[AutoUpdater] Download progress: 45.2%
[AutoUpdater] Update downloaded: 1.0.3
```