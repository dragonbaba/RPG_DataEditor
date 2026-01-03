# Requirements Document

## Introduction

本文档定义了弹道编辑器和任务编辑器的数据管理功能增强需求，包括统一的新建、保存、删除数据功能，数据列表索引修复，名称同步功能，以及任务奖励模块中开关和变量选项框的显示修复。

## Glossary

- **Projectile_Editor**: 弹道编辑器面板，用于编辑弹道模板配置
- **Quest_Editor**: 任务编辑器面板，用于编辑任务数据
- **Data_List**: 数据列表组件，显示当前文件中的所有数据项
- **Item_Index**: 数据项在列表中的显示索引
- **Switch_Select**: 开关选择下拉框，用于选择游戏中的开关
- **Variable_Select**: 变量选择下拉框，用于选择游戏中的变量
- **System_Data**: 系统数据文件(System.json)，包含开关和变量的名称定义
- **Name_Input**: 名称输入框，用于编辑数据项的名称/标题

## Requirements

### Requirement 1: Unified Data Management Buttons

**User Story:** As a developer, I want unified new, save, and delete buttons for both Projectile Editor and Quest Editor, so that I can manage data consistently across different editor modes.

#### Acceptance Criteria

1. WHEN the Projectile_Editor is displayed, THE System SHALL show new, save, and delete buttons in the toolbar area
2. WHEN the Quest_Editor is displayed, THE System SHALL show new, save, and delete buttons in the toolbar area
3. WHEN the user clicks the new button, THE System SHALL create a new data entry with default values and add it to the data list
4. WHEN the user clicks the save button, THE System SHALL persist the current data to the file system
5. WHEN the user clicks the delete button, THE System SHALL set the current data entry to null in the data array and save the file
6. WHEN a data entry is deleted, THE Data_List SHALL display an empty template placeholder at that index position

### Requirement 2: Quest Data List Index Fix

**User Story:** As a developer, I want the quest data list to display correct indices starting from 1, so that the indices match the actual data positions.

#### Acceptance Criteria

1. WHEN the Quest_Editor data list is rendered, THE System SHALL display item indices starting from 1 (not 2)
2. WHEN a quest item is displayed in the list, THE Item_Index SHALL match the actual position in the data array (index 1 in array shows as #1)
3. FOR ALL quest items in the data list, THE displayed index SHALL equal the array index

### Requirement 3: Projectile Name Input Field

**User Story:** As a developer, I want a name input field in the Projectile Editor, so that I can name my projectile templates and have them sync with the data list.

#### Acceptance Criteria

1. WHEN the Projectile_Editor is displayed, THE System SHALL show a name input field below the new data button
2. WHEN the user changes the projectile name in the Name_Input, THE Data_List SHALL update to reflect the new name immediately
3. WHEN the user saves the projectile data, THE System SHALL include the updated name in the saved data
4. WHEN a projectile is loaded, THE Name_Input SHALL display the current projectile's name

### Requirement 4: Quest Title Sync with Data List

**User Story:** As a developer, I want the quest title input to sync with the data list, so that name changes are reflected immediately.

#### Acceptance Criteria

1. WHEN the user changes the quest title in the title input field, THE Data_List SHALL update to reflect the new title immediately
2. WHEN the quest data is saved, THE System SHALL include the updated title in the saved data

### Requirement 5: Quest Reward Switch and Variable Display Fix

**User Story:** As a developer, I want the switch and variable select boxes in the quest reward section to display correct names, so that I can identify which switch or variable I am selecting.

#### Acceptance Criteria

1. WHEN the Quest_Editor reward section displays a switch select, THE Switch_Select SHALL show the switch name from System_Data (format: "ID : Name")
2. WHEN the Quest_Editor reward section displays a variable select, THE Variable_Select SHALL show the variable name from System_Data (format: "ID : Name")
3. WHEN System_Data is not loaded, THE Switch_Select SHALL display "未加载开关" as placeholder
4. WHEN System_Data is not loaded, THE Variable_Select SHALL display "未加载变量" as placeholder
5. WHEN a switch or variable is selected in the reward section, THE System SHALL correctly save the selected ID to the quest data
