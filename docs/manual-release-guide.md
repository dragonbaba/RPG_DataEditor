# 手动发布指南

当 GitHub Actions 不可用时，你可以使用本地构建来创建发布版本。

## 🚨 GitHub Actions 问题解决

### 问题原因
GitHub Actions 因计费问题被锁定，通常是因为：
- 超出了免费账户的 2000 分钟/月限制
- 私有仓库的使用限制
- 未设置付款方式

### 解决方案

#### 方案 1: 解决计费问题（推荐）
1. 访问 [GitHub 计费设置](https://github.com/settings/billing)
2. 检查使用情况和未付费用
3. 添加付款方式或升级计划
4. 等待账户解锁（通常几分钟内）

#### 方案 2: 将仓库设为公开
1. 进入仓库设置：https://github.com/dragonbaba/RPG_DataEditor/settings
2. 滚动到底部的 "Danger Zone"
3. 点击 "Change repository visibility"
4. 选择 "Make public"
5. 公开仓库有无限的 GitHub Actions 分钟数

#### 方案 3: 本地构建（立即可用）
使用我们提供的本地构建脚本

## 🏗️ 本地构建发布

### 快速开始

```bash
# 构建当前平台
npm run build-release

# 构建特定平台
npm run build-release:win     # Windows
npm run build-release:mac     # macOS  
npm run build-release:linux   # Linux
npm run build-release:all     # 所有平台
```

### 详细步骤

1. **确保环境准备就绪**：
   ```bash
   node --version  # 应该是 v18+ 
   npm --version   # 应该是 v8+
   ```

2. **运行本地构建**：
   ```bash
   npm run build-release
   ```

3. **构建过程包括**：
   - ✅ 检查先决条件
   - 🧹 清理之前的构建
   - 📦 安装依赖
   - 🧪 运行测试
   - 🔍 类型检查
   - 🏗️ 构建渲染进程 (Vite)
   - ⚡ 编译 Electron 主进程
   - 📱 打包 Electron 应用

4. **查看构建结果**：
   ```bash
   ls release/
   ```

### 构建输出

构建完成后，你会在 `release/` 目录中找到：

**Windows**:
- `RPG数据拓展编辑器-1.0.3-win-x64.exe` - 安装程序
- `RPG数据拓展编辑器-1.0.3-win-x64.exe.blockmap` - 增量更新文件

**macOS** (如果在 Mac 上构建):
- `RPG数据拓展编辑器-1.0.3-mac-x64.dmg` - DMG 安装包
- `RPG数据拓展编辑器-1.0.3-mac-x64.dmg.blockmap` - 增量更新文件

**Linux**:
- `RPG数据拓展编辑器-1.0.3-linux-x64.AppImage` - AppImage 格式
- `RPG数据拓展编辑器-1.0.3-linux-x64.deb` - Debian 包
- `RPG数据拓展编辑器-1.0.3-linux-x64.rpm` - RPM 包

## 📤 手动创建 GitHub Release

1. **上传构建文件**：
   - 访问：https://github.com/dragonbaba/RPG_DataEditor/releases
   - 点击 "Create a new release"
   - 选择标签：`v1.0.3`
   - 填写发布标题：`RPG数据拓展编辑器 v1.0.3`

2. **添加发布说明**：
   ```markdown
   ## 新功能 (New Features)
   - 完整的主题设置系统，支持多种预设和自定义选项
   - 自动更新功能配置完成

   ## 改进 (Improvements)  
   - 修复字体大小选择器显示问题
   - 完善主题设置CSS样式和视觉效果
   - 优化主题切换的用户体验

   ## 修复 (Bug Fixes)
   - 修复主题设置中的所有功能问题
   - 修复TypeScript类型错误
   - 修复PropertyPanel测试文件问题

   ## 技术更新 (Technical Updates)
   - 配置GitHub Actions自动发布工作流
   - 添加完整的主题设置测试覆盖
   - 优化构建和发布流程
   ```

3. **上传文件**：
   - 将 `release/` 目录中的所有文件拖拽到发布页面
   - 确保包含所有平台的安装包

4. **发布**：
   - 点击 "Publish release"

## 🔄 自动更新配置

### 生成更新文件
本地构建会自动生成自动更新所需的文件：
- `latest.yml` (Windows)
- `latest-mac.yml` (macOS)  
- `latest-linux.yml` (Linux)

### 手动创建更新文件
如果自动生成失败，可以手动创建：

**latest.yml** (Windows):
```yaml
version: 1.0.3
files:
  - url: RPG数据拓展编辑器-1.0.3-win-x64.exe
    sha512: [文件的SHA512哈希]
    size: [文件大小字节数]
path: RPG数据拓展编辑器-1.0.3-win-x64.exe
sha512: [文件的SHA512哈希]
releaseDate: '2026-01-02T14:30:00.000Z'
```

### 获取文件哈希
```bash
# Windows (PowerShell)
Get-FileHash -Algorithm SHA512 "release/RPG数据拓展编辑器-1.0.3-win-x64.exe"

# macOS/Linux
shasum -a 512 "release/RPG数据拓展编辑器-1.0.3-mac-x64.dmg"
```

## 🎯 发布检查清单

- [ ] 代码已提交并推送到 GitHub
- [ ] 版本号已更新 (package.json)
- [ ] 本地构建成功完成
- [ ] 所有测试通过
- [ ] 构建文件已生成在 release/ 目录
- [ ] GitHub Release 已创建
- [ ] 安装包已上传到 Release
- [ ] 发布说明已填写
- [ ] 自动更新文件已包含

## 🚀 下次发布

一旦 GitHub Actions 问题解决，你就可以继续使用自动发布：

```bash
npm run release 1.0.4
```

这会自动触发 GitHub Actions 构建和发布流程。

## 📞 需要帮助？

如果遇到问题：
1. 检查 Node.js 和 npm 版本
2. 确保所有依赖已安装：`npm ci`
3. 清理并重新构建：`npm run clean && npm run build-release`
4. 查看构建日志中的错误信息