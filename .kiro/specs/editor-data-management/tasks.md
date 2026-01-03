# Implementation Plan: Editor Data Management

## Overview

实现弹道编辑器和任务编辑器的数据管理功能增强，包括统一的CRUD操作、索引修复、名称同步和奖励模块修复。

## Tasks

- [x] 1. Fix Quest Data List Index Display
  - [x] 1.1 Update ItemList.ts to fix quest index calculation
    - 修改 `renderListItems` 函数中的索引显示逻辑
    - 对于quest类型，使用 `i` 而不是 `itemId` 作为显示索引
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 1.2 Write property test for quest index display
    - **Property 3: Quest Index Display Consistency**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 2. Fix Quest Reward Switch/Variable Display
  - [x] 2.1 Update buildRewardFields function in QuestPanel.ts
    - 修改开关类型(type=6)的选择框生成，使用 `fillDataSelect` 正确填充开关名称
    - 修改变量类型(type=7)的选择框生成，使用 `fillDataSelect` 正确填充变量名称
    - 确保使用 `state.questSystem.switches` 和 `state.questSystem.variables` 数据
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 2.2 Write property test for reward select formatting
    - **Property 6: Reward Select Option Formatting**
    - **Validates: Requirements 5.1, 5.2**
  - [x] 2.3 Write property test for reward selection persistence
    - **Property 7: Reward Selection Persistence**
    - **Validates: Requirements 5.5**

- [x] 3. Checkpoint - Verify bug fixes
  - All tests pass.

- [x] 4. Add Projectile Editor Data Management
  - [x] 4.1 Add name input field to ProjectilePanel
    - 在弹道编辑器面板添加名称输入框
    - 位于新建数据按钮下方
    - 添加 `handleNameChange` 函数处理名称变更
    - _Requirements: 3.1, 3.4_
  - [x] 4.2 Implement name change synchronization for projectile
    - 监听名称输入框的 `input` 事件
    - 更新当前弹道数据的 `name` 字段
    - 触发 `StateManager.setState` 刷新列表
    - _Requirements: 3.2_
  - [x] 4.3 Implement projectile new/save/delete functions
    - 实现 `newProjectile()` 创建默认弹道数据
    - 实现 `saveProjectileFile()` 保存当前弹道到文件
    - 实现 `deleteProjectile()` 将当前弹道设为null并保存
    - _Requirements: 1.1, 1.3, 1.4, 1.5_
  - [x] 4.4 Write property test for new item
    - **Property 1: New Item Increases Data Length**
    - **Validates: Requirements 1.3**
  - [x] 4.5 Write property test for delete item
    - **Property 2: Delete Sets Entry to Null**
    - **Validates: Requirements 1.5, 1.6**

- [x] 5. Add Quest Editor Data Management Buttons
  - [x] 5.1 Add toolbar buttons to QuestPanel
    - 添加新建、保存、删除按钮到HTML和DOMManager
    - 绑定 `newQuest`, `saveQuestFile`, `deleteQuest` 函数
    - _Requirements: 1.2_
  - [x] 5.2 Implement quest title change synchronization
    - 监听标题输入框的 `input` 事件
    - 实时更新数据列表中的标题显示
    - _Requirements: 4.1, 4.2_
  - [x] 5.3 Write property test for name synchronization
    - **Property 4: Name Change Synchronization**
    - **Validates: Requirements 3.2, 4.1**

- [x] 6. Implement Data Save Round-Trip
  - [x] 6.1 Ensure projectile name is included in save
    - `saveProjectileFile` 已确保 `name` 字段被保存
    - _Requirements: 3.3_
  - [x] 6.2 Write property test for save round-trip
    - **Property 5: Data Save Round-Trip**
    - **Validates: Requirements 1.4, 3.3, 4.2**

- [x] 7. Final Checkpoint - Ensure all tests pass
  - All 32 tests pass (4 test files).

- [x] 8. Bug Fixes (User Reported)
  - [x] 8.1 Fix newQuest not syncing to data list
    - 修改 `newQuest()` 函数，同时更新 `currentData` 和 `quests`
    - 新任务现在会正确显示在左侧数据列表中
    - _Requirements: 1.2_
  - [x] 8.2 Fix first item not rendered after loading quest file
    - 修改 `loadQuestFile()` 函数，加载后调用 `StateManager.selectItem(1)` 选择第一个有效项
    - 确保加载后第一个任务被正确渲染
    - _Requirements: 2.1_
  - [x] 8.3 Verify projectile template section visibility
    - 确认 HTML 结构正确，名称输入框和按钮在 `projectile-template-section` 中
    - 用户可能需要向下滚动查看模板编辑区域
    - 代码已正确绑定事件处理器

## Notes

- All tasks are required for complete implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases

## Implementation Summary

### Files Modified:
- `src/panels/ProjectilePanel.ts` - Added data management functions (new/save/delete), name change handler
- `src/panels/QuestPanel.ts` - Fixed deleteQuest to set null instead of splice, added title change handler, bound buttons, fixed newQuest to sync currentData, fixed loadQuestFile to select first item
- `src/core/DOMManager.ts` - Added projectileDeleteTemplateBtn, questCreateBtn, questSaveBtn, questDeleteBtn
- `index.html` - Added delete button for projectile, added toolbar section for quest

### Files Created:
- `src/panels/__tests__/ProjectilePanel.property.ts` - Property tests for projectile data management

### Test Results:
- 32 tests passing across 4 test files
- Property tests cover: new item, delete item, name sync, save round-trip

### Bug Fixes (User Reported):
1. **新建任务没有同步数据列表** - Fixed by updating `newQuest()` to also update `currentData` in StateManager
2. **加载数据后没有正确渲染第一个数据** - Fixed by emitting `item:selected` event in `loadQuestFile()` after calling `StateManager.selectItem(1)`
3. **弹道面板模板区域需要简化** - Simplified the projectile template section: removed "弹道模板" header, moved name input inline with buttons
4. **新建任务创建两个任务** - Fixed by adding `buttonsBound` flag to prevent duplicate event listener bindings
5. **任务标题不同步到数据列表** - Fixed `handleQuestTitleChange()` to match projectile panel logic: directly update `currentData[dataIndex]` and trigger StateManager refresh
6. **删除任务没有同步currentData** - Fixed `deleteQuest()` to also set `currentData[currentQuestIndex + 1]` to null when deleting
