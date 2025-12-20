!function IIFE() {
    // ===== 应用状态管理 =====
    const DateFormatter = Zaun.Core.DateSystem.dateFormatter;
    const { PoolSystem, AnimationSystem, EventSystem } = Zaun.Core;
    const { GlobalMotion } = AnimationSystem;
    const { GlobalEvent } = EventSystem;
    const { PoolCache } = PoolSystem;
    // ===== 全局常量 =====
    const TRANSFORM_REGEXP = /[\\/]+$/;
    const BACKSLASH_REGEXP = /\\/g;
    const LEADING_DOT_SLASH_REGEXP = /^\.\/+/;
    const LEADING_SLASH_REGEXP = /^\/+/;
    const WINDOWS_DRIVE_REGEXP = /^[a-zA-Z]:[\\/]/;
    const HTTP_PROTOCOL_REGEXP = /^(https?:)?\/\//i;

    class AppState {
        constructor() {
            // 文件和数据相关
            this.isProjectileFileLoaded = true;
            this.currentData = null;
            this.currentFile = "";
            this.currentFilePath = "";
            // 项目相关
            this.currentItemIndex = 0;
            this.currentItem = null;
            // 脚本相关
            this.currentScriptKey = "";
            // 编辑器和配置
            this.codeEditor = null;
            this.config = { dataPath: '', scriptSavePath: '', workspaceRoot: '' };
            this.configDirty = false;
            // UI 模式
            this.uiMode = '';
            // 属性输入缓存
            this.attributeInputs = {};
            this.attributeFloatInputs = {};
            // UI 元素引用
            this.propertyPanelElement = null;
            this.customPropertyList = null;
            this.propertyStatusElement = null;
            this.scriptListKeyListener = null;
            this.projectileTemplates = [];
            this.projectileFilePath = "";
            this.projectileCustomFiles = Object.create(null);
            // 记录各数据类型对应的已加载文件路径，用于复用 FileCacheManager 缓存
            this.projectileDataPaths = Object.create(null);
            this.projectileSelectedTemplateIndex = 1;
            this.projectileSegments = [];
            this.projectilePreviewSprite = null;
        }
        // 重置数据状态
        resetData() {
            this.currentData = null;
            this.currentFile = null;
            this.currentFilePath = null;
            this.currentItemIndex = null;
            this.currentItem = null;
            this.currentScriptKey = null;
        }
        // 重置脚本状态
        resetScript() {
            this.currentScriptKey = null;
            this.attributeInputs = {};
            this.attributeFloatInputs = {};
        }
        // 切换 UI 模式
        setMode(mode) {
            this.uiMode = mode;
        }
    }

    //全局应用状态实例
    const appState = new AppState();

    // ===== 基础属性配置 =====
    const baseAttributes = [
        { key: 'mhp', label: '最大生命值' },
        { key: 'mmp', label: '最大魔法值' },
        { key: 'atk', label: '攻击力' },
        { key: 'def', label: '防御力' },
        { key: 'mat', label: '魔法攻击力' },
        { key: 'mdf', label: '魔法防御力' },
        { key: 'agi', label: '速度' },
        { key: 'luk', label: '幸运' }
    ];

    // ✅ 优化：缓存常用 DOM 元素
    const DOM = {
        // 对话框
        inputDialog: null,
        inputDialogTitle: null,
        inputDialogMessage: null,
        inputDialogInput: null,
        inputDialogConfirm: null,
        inputDialogCancel: null,

        // 主要面板
        itemList: null,
        scriptList: null,
        scriptPanel: null,
        metaDataPanel: null,
        metaDataList: null,
        codeEditorContainer: null,
        propertyModePanel: null,
        propertyBaseGrid: null,
        customAttributeList: null,
        noteModePanel: null,
        noteEditor: null,
        noteModeSubtitle: null,
        noteDescription: null,
        saveDescriptionBtn: null,
        emptyStatePanel: null,
        saveCustomPropertyBtn: null,

        // 状态栏
        statusText: null,
        characterCount: null,
        lineCount: null,

        // 文件信息
        codeFilePath: null,

        // 按钮
        savePropertiesBtn: null,
        addCustomPropertyBtn: null,
        saveCodeBtn: null,
        clearCodeBtn: null,
        saveNoteBtn: null,

        // 加载指示
        loadingIndicator: null,
        loadingText: null,
        propertyModeSubtitle: null,

        // 初始化缓存
        init() {
            this.inputDialog = document.getElementById('inputDialog');
            this.inputDialogTitle = document.getElementById('inputDialogTitle');
            this.inputDialogMessage = document.getElementById('inputDialogMessage');
            this.inputDialogInput = document.getElementById('inputDialogInput');
            this.inputDialogConfirm = document.getElementById('inputDialogConfirm');
            this.inputDialogCancel = document.getElementById('inputDialogCancel');

            this.itemList = document.getElementById('itemList');
            this.scriptList = document.getElementById('scriptList');
            this.scriptPanel = document.getElementById('scriptPanel');
            this.metaDataPanel = document.getElementById('metaDataPanel');
            this.metaDataList = document.getElementById('metaDataList');
            this.codeEditorContainer = document.getElementById('codeEditorContainer');
            this.propertyModePanel = document.getElementById('propertyModePanel');
            this.propertyBaseGrid = document.getElementById('propertyBaseGrid');
            this.customAttributeList = document.getElementById('customAttributeList');
            this.noteModePanel = document.getElementById('noteModePanel');
            this.noteEditor = document.getElementById('noteEditor');
            this.noteModeSubtitle = document.getElementById('noteModeSubtitle');
            this.noteDescription = document.getElementById('noteDescription');
            this.saveDescriptionBtn = document.getElementById('saveDescriptionBtn');

            this.statusText = document.getElementById('statusText');
            this.characterCount = document.getElementById('characterCount');
            this.lineCount = document.getElementById('lineCount');

            this.codeFilePath = document.getElementById('codeFilePath');

            this.savePropertiesBtn = document.getElementById('savePropertiesBtn');
            this.saveCustomPropertyBtn = document.getElementById('saveCustomPropertyBtn');
            this.addCustomPropertyBtn = document.getElementById('addCustomPropertyBtn');
            this.saveCodeBtn = document.getElementById('saveCodeBtn');
            this.clearCodeBtn = document.getElementById('clearCodeBtn');
            this.saveNoteBtn = document.getElementById('saveNoteBtn');

            this.loadingIndicator = document.getElementById('loadingIndicator');
            this.loadingText = document.getElementById('loadingText');
            this.propertyModeSubtitle = document.getElementById('propertyModeSubtitle');
            this.emptyStatePanel = document.getElementById('emptyStatePanel');
            this.historyFilesDialog = document.getElementById('historyFilesDialog');
            this.historyFilesList = document.getElementById('historyFilesList');
            this.historyFilesDialogClose = document.getElementById('historyFilesDialogClose');
            this.projectileModePanel = document.getElementById('projectileModePanel');
            this.projectileAnimationFileSelect = document.getElementById('projectileAnimationFileSelect');
            this.projectileEnemyFileSelect = document.getElementById('projectileEnemyFileSelect');
            this.projectileActorFileSelect = document.getElementById('projectileActorFileSelect');
            this.projectileWeaponFileSelect = document.getElementById('projectileWeaponFileSelect');
            this.projectileAnimationLoadBtn = document.getElementById('projectileAnimationLoadBtn');
            this.projectileEnemyLoadBtn = document.getElementById('projectileEnemyLoadBtn');
            this.projectileActorLoadBtn = document.getElementById('projectileActorLoadBtn');
            this.projectileWeaponLoadBtn = document.getElementById('projectileWeaponLoadBtn');
            this.projectileAnimationPickBtn = document.getElementById('projectileAnimationPickBtn');
            this.projectileEnemyPickBtn = document.getElementById('projectileEnemyPickBtn');
            this.projectileActorPickBtn = document.getElementById('projectileActorPickBtn');
            this.projectileWeaponPickBtn = document.getElementById('projectileWeaponPickBtn');
            this.projectileAnimationStatus = document.getElementById('projectileAnimationStatus');
            this.projectileEnemyStatus = document.getElementById('projectileEnemyStatus');
            this.projectileActorStatus = document.getElementById('projectileActorStatus');
            this.projectileWeaponStatus = document.getElementById('projectileWeaponStatus');
            this.projectileCreateTemplateBtn = document.getElementById('projectileCreateTemplateBtn');
            this.projectileTemplateName = document.getElementById('projectileTemplateName');
            this.projectileStartAnimationSelect = document.getElementById('projectileStartAnimationSelect');
            this.projectileLaunchAnimationSelect = document.getElementById('projectileLaunchAnimationSelect');
            this.projectileEndAnimationSelect = document.getElementById('projectileEndAnimationSelect');
            this.projectileSaveTemplateBtn = document.getElementById('projectileSaveTemplateBtn');
            this.projectilePreviewContainer = document.getElementById('projectilePreviewContainer');
            this.projectilePlayTestBtn = document.getElementById('projectilePlayTestBtn');
            this.projectileSkillFileSelect = document.getElementById('projectileSkillFileSelect');
            this.projectileSkillLoadBtn = document.getElementById('projectileSkillLoadBtn');
            this.projectileSkillPickBtn = document.getElementById('projectileSkillPickBtn');
            this.projectileSkillStatus = document.getElementById('projectileSkillStatus');
            this.projectileActorSelect = document.getElementById('projectileActorSelect');
            this.projectileWeaponOffsetSelect = document.getElementById('projectileWeaponOffsetSelect');
            this.projectileActorOffsetX = document.getElementById('projectileActorOffsetX');
            this.projectileActorOffsetY = document.getElementById('projectileActorOffsetY');
            this.projectileActorOffsetSaveBtn = document.getElementById('projectileActorOffsetSaveBtn');
            this.projectileEnemySelect = document.getElementById('projectileEnemySelect');
            this.projectileSkillSelect = document.getElementById('projectileSkillSelect');
            this.projectileEnemyOffsetX = document.getElementById('projectileEnemyOffsetX');
            this.projectileEnemyOffsetY = document.getElementById('projectileEnemyOffsetY');
            this.projectileEnemyOffsetSaveBtn = document.getElementById('projectileEnemyOffsetSaveBtn');
            this.projectileEmitterRoleSelect = document.getElementById('projectileEmitterRoleSelect');
            this.projectileEmitterCharacterSelect = document.getElementById('projectileEmitterCharacterSelect');
            this.projectileTargetRoleSelect = document.getElementById('projectileTargetRoleSelect');
            this.projectileTargetCharacterSelect = document.getElementById('projectileTargetCharacterSelect');
            this.projectileSegmentList = document.getElementById('projectileSegmentList');
            this.projectileAddSegmentBtn = document.getElementById('projectileAddSegmentBtn');
            this.projectileClearSegmentsBtn = document.getElementById('projectileClearSegmentsBtn');
            this.questModePanel = document.getElementById('questModePanel');
            this.itemNewBtn = document.getElementById('itemNewBtn');
            this.itemCopyBtn = document.getElementById('itemCopyBtn');
            this.itemDeleteBtn = document.getElementById('itemDeleteBtn');
            this.itemSaveBtn = document.getElementById('itemSaveBtn');
            this.projectActions = document.getElementById('projectActions');
        }
    };

    const PROJECTILE_EASE_OPTIONS = [
        { label: '线性移动', value: 'linear' },
        { label: '二次方缓入', value: 'easeInQuad' },
        { label: '二次方缓出', value: 'easeOutQuad' },
        { label: '二次方缓入缓出', value: 'easeInOutQuad' },
        { label: '三次方缓入', value: 'easeInCubic' },
        { label: '三次方缓出', value: 'easeOutCubic' },
        { label: '三次方缓入缓出', value: 'easeInOutCubic' },
        { label: '四次方缓入', value: 'easeInQuart' },
        { label: '四次方缓出', value: 'easeOutQuart' },
        { label: '四次方缓入缓出', value: 'easeInOutQuart' },
        { label: '正弦曲线缓入', value: 'easeInSine' },
        { label: '正弦曲线缓出', value: 'easeOutSine' },
        { label: '正弦曲线缓入缓出', value: 'easeInOutSine' },
        { label: '指数曲线缓入', value: 'easeInExpo' },
        { label: '指数曲线缓出', value: 'easeOutExpo' },
        { label: '指数曲线缓入缓出', value: 'easeInOutExpo' },
        { label: '圆形缓入', value: 'easeInCirc' },
        { label: '圆形缓出', value: 'easeOutCirc' },
        { label: '圆形缓入缓出', value: 'easeInOutCirc' },
        { label: '弹跳缓入', value: 'easeInElastic' },
        { label: '弹跳缓出', value: 'easeOutElastic' },
        { label: '弹跳缓入缓出', value: 'easeInOutElastic' },
        { label: '超过缓入', value: 'easeInBack' },
        { label: '超过缓出', value: 'easeOutBack' },
        { label: '超过缓入缓出', value: 'easeInOutBack' },
        { label: '弹跳超过缓入', value: 'easeInBounce' },
        { label: '弹跳超过缓出', value: 'easeOutBounce' },
        { label: '弹跳超过缓入缓出', value: 'easeInOutBounce' }
    ];

    // 弹道依赖数据文件名映射（用于从通用加载登记状态）
    const PROJECTILE_DATA_FILE_MAP = {
        animation: 'animations.json',
        enemy: 'enemies.json',
        skill: 'skills.json',
        actor: 'actors.json',
        weapon: 'weapons.json'
    };

    const PROJECTILE_DATA_CONFIG = {
        animation: {
            label: '动画数据',
            defaultFile: 'Animations.json',
            selectRef: 'projectileAnimationFileSelect',
            loadBtnRef: 'projectileAnimationLoadBtn',
            pickBtnRef: 'projectileAnimationPickBtn',
            statusRef: 'projectileAnimationStatus'
        },
        enemy: {
            label: '敌人数据',
            defaultFile: 'Enemies.json',
            selectRef: 'projectileEnemyFileSelect',
            loadBtnRef: 'projectileEnemyLoadBtn',
            pickBtnRef: 'projectileEnemyPickBtn',
            statusRef: 'projectileEnemyStatus'
        },
        skill: {
            label: '技能数据',
            defaultFile: 'Skills.json',
            selectRef: 'projectileSkillFileSelect',
            loadBtnRef: 'projectileSkillLoadBtn',
            pickBtnRef: 'projectileSkillPickBtn',
            statusRef: 'projectileSkillStatus'
        },
        actor: {
            label: '玩家数据',
            defaultFile: 'Actors.json',
            selectRef: 'projectileActorFileSelect',
            loadBtnRef: 'projectileActorLoadBtn',
            pickBtnRef: 'projectileActorPickBtn',
            statusRef: 'projectileActorStatus'
        },
        weapon: {
            label: '武器数据',
            defaultFile: 'Weapons.json',
            selectRef: 'projectileWeaponFileSelect',
            loadBtnRef: 'projectileWeaponLoadBtn',
            pickBtnRef: 'projectileWeaponPickBtn',
            statusRef: 'projectileWeaponStatus'
        }
    };

    const PROJECTILE_DEFAULT_SEGMENT = {
        targetX: 0,
        targetY: -120,
        duration: 60,
        easeX: 'linear',
        easeY: 'linear'
    };

    const DEFAULT_PROJECTILE_TEMPLATES = [
        null,
        {
            name: '基础弹道',
            startAnimationId: 1,
            launchAnimation: {
                animationId: 1,
                segments: [{ ...PROJECTILE_DEFAULT_SEGMENT }]
            },
            endAnimationId: 1
        }
    ];

    const PROJECTILE_PREVIEW_POSITIONS = {
        actor: { x: 80, y: 180 },
        enemy: { x: 340, y: 160 }
    };

    // ===================== Quest Editor Inline =====================
    const NL_REGEXP = /\r?\n/;

    const QuestEditor = (() => {
        // 使用全局 DOM.questEditor 作为缓存容器，避免局部 dom 失效
        const dom = DOM.questEditor || (DOM.questEditor = {});
        const state = {
            quests: [],
            currentIndex: -1,
            system: {
                switches: [],
                variables: [],
                items: [],
                weapons: [],
                armors: [],
                enemies: [],
                actors: []
            },
            dataPath: '',
            questFilePath: '',
            questDataPaths: Object.create(null),
        };
        let eventsBound = false;

        function fillQuestDifficulty() {
            if (!dom.difficulty) return;
            fillOptions(dom.difficulty, QUEST_DIFFICULTIES);
            if (!dom.difficulty.value) {
                dom.difficulty.value = 1;
            }
        }

        function updateQuestDataStatus() {
            const statusEl = document.getElementById('questDataStatus');
            if (statusEl) {
                const fileName = state.questFilePath?.split(TRANSFORM_REGEXP).pop() || '未选择';
                const count = Math.max(state.quests.length, 0);
                statusEl.textContent = `${fileName} · ${count} 条`;
            }
        }

        function cacheDom(container) {
            dom.container = container;
            dom.title = container.querySelector('#questTitleInput');
            dom.giver = container.querySelector('#questGiverInput');
            dom.category = container.querySelector('#questCategoryInput');
            dom.repeatable = container.querySelector('#questRepeatableInput');
            dom.difficulty = container.querySelector('#questDifficultySelect');
            dom.description = container.querySelector('#questDescriptionInput');
            dom.startSwitchList = container.querySelector('#questStartSwitchList');
            dom.finishSwitchList = container.querySelector('#questFinishSwitchList');
            dom.startVariableList = container.querySelector('#questStartVariableList');
            dom.finishVariableList = container.querySelector('#questFinishVariableList');
            dom.requirementList = container.querySelector('#questRequirementList');
            dom.objectiveList = container.querySelector('#questObjectiveList');
            dom.rewardList = container.querySelector('#questRewardList');
            dom.addReqBtn = container.querySelector('#questAddRequirementBtn');
            dom.addObjBtn = container.querySelector('#questAddObjectiveBtn');
            dom.addRewBtn = container.querySelector('#questAddRewardBtn');
            dom.addStartSwitchBtn = container.querySelector('#questAddStartSwitchBtn');
            dom.addFinishSwitchBtn = container.querySelector('#questAddFinishSwitchBtn');
            dom.addStartVariableBtn = container.querySelector('#questAddStartVariableBtn');
            dom.addFinishVariableBtn = container.querySelector('#questAddFinishVariableBtn');
            dom.copyDialog = container.querySelector('#questCopyDialog');
            dom.copyDialogList = container.querySelector('#questCopyDialogList');
            dom.copyDialogClose = container.querySelector('#questCopyDialogClose');
            dom.copyDialogCancel = container.querySelector('#questCopyDialogCancel');
            dom.copyDialogConfirm = container.querySelector('#questCopyDialogConfirm');
            dom.questSystemFileSelect = container.querySelector('#questSystemFileSelect');
            dom.questSystemLoadBtn = container.querySelector('#questSystemLoadBtn');
            dom.questSystemPickBtn = container.querySelector('#questSystemPickBtn');
            dom.questItemFileSelect = container.querySelector('#questItemFileSelect');
            dom.questItemLoadBtn = container.querySelector('#questItemLoadBtn');
            dom.questItemPickBtn = container.querySelector('#questItemPickBtn');
            dom.questWeaponFileSelect = container.querySelector('#questWeaponFileSelect');
            dom.questWeaponLoadBtn = container.querySelector('#questWeaponLoadBtn');
            dom.questWeaponPickBtn = container.querySelector('#questWeaponPickBtn');
            dom.questArmorFileSelect = container.querySelector('#questArmorFileSelect');
            dom.questArmorLoadBtn = container.querySelector('#questArmorLoadBtn');
            dom.questArmorPickBtn = container.querySelector('#questArmorPickBtn');
            dom.questEnemyFileSelect = container.querySelector('#questEnemyFileSelect');
            dom.questEnemyLoadBtn = container.querySelector('#questEnemyLoadBtn');
            dom.questEnemyPickBtn = container.querySelector('#questEnemyPickBtn');
            dom.questActorFileSelect = container.querySelector('#questActorFileSelect');
            dom.questActorLoadBtn = container.querySelector('#questActorLoadBtn');
            dom.questActorPickBtn = container.querySelector('#questActorPickBtn');
            dom.switchRow = container.querySelector('#quest-switch-row');
            dom.variableRow = container.querySelector('#quest-variable-row');
            dom.reqCard = container.querySelector('#quest-requirement-card');
            dom.objCard = container.querySelector('#quest-objective-card');
            dom.rewCard = container.querySelector('#quest-reward-card');
            // 暴露关键节点到全局 DOM，便于全局刷新
            DOM.questObjectiveList = dom.objectiveList;
        }

        function refreshSelectSources() {
            updateMiniSelectOptions(dom.startSwitchList, state.system.switches);
            updateMiniSelectOptions(dom.finishSwitchList, state.system.switches);
            updateMiniSelectOptions(dom.startVariableList, state.system.variables);
            updateMiniSelectOptions(dom.finishVariableList, state.system.variables);
            updateObjectiveActionSelects();
            const quest = getCurrentQuest();
            if (quest) bindQuestToForm(quest);
        }

        function fillOptions(select, list) {
            if (!select || !Array.isArray(list)) return;
            recycleOptions(select);
            const pool = getOptionPool();
            const frag = document.createDocumentFragment();
            for (let i = 0; i < list.length; i++) {
                const opt = list[i];
                if (!opt) continue;
                const optionObj = pool.get();
                bindPoolItem(optionObj.element, optionObj);
                optionObj.element.value = `${opt.value}`;
                optionObj.element.textContent = opt.label || '';
                frag.appendChild(optionObj.element);
            }
            select.appendChild(frag);
        }

        function shouldUpdateMiniSelect(select) {
            const field = select.dataset.switchField || select.dataset.variableField || '';
            const isIdField = field === 'switchId' || field === 'variableId';
            const isValueOrOp = field === 'value' || field === 'op';
            const hasClassMatch = select.classList.contains('switch-select') || select.classList.contains('variable-select');
            return !isValueOrOp && (hasClassMatch || isIdField);
        }

        function fillMiniSelectOptions(select, options, pool) {
            const current = select.value;
            recycleOptions(select);
            const frag = document.createDocumentFragment();
            for (let j = 1; j < options.length; j++) {
                const o = options[j];
                if (!o) continue;
                const optionObj = pool.get();
                bindPoolItem(optionObj.element, optionObj);
                optionObj.element.value = `${j}`;
                optionObj.element.textContent = typeof o === 'string' ? o : (o.name || o.label || `${j}`);
                frag.appendChild(optionObj.element);
            }
            select.appendChild(frag);
            if (current) {
                select.value = current;
            }
        }

        function updateMiniSelectOptions(target, options) {
            if (!target || !Array.isArray(options)) return;
            const pool = getOptionPool();
            const selects = target.tagName === 'SELECT' ? [target] : target.querySelectorAll('select');
            for (let i = 0; i < selects.length; i++) {
                const select = selects[i];
                if (shouldUpdateMiniSelect(select)) {
                    fillMiniSelectOptions(select, options, pool);
                }
            }
        }

        function updateObjectiveActionSelects() {
            if (!dom.objectiveList) return;
            const switchSelects = dom.objectiveList.querySelectorAll('.obj-switch-list .switch-select');
            for (let i = 0; i < switchSelects.length; i++) {
                updateMiniSelectOptions(switchSelects[i], state.system.switches);
            }
            const variableSelects = dom.objectiveList.querySelectorAll('.obj-variable-list .variable-select');
            for (let i = 0; i < variableSelects.length; i++) {
                updateMiniSelectOptions(variableSelects[i], state.system.variables);
            }
        }

        function fillQuestSelectOptions(select, quests) {
            if (!select) return;
            recycleOptions(select);
            const pool = getOptionPool();
            const frag = document.createDocumentFragment();
            const list = Array.isArray(quests) ? quests : [];
            for (let i = 0; i < list.length; i++) {
                const quest = list[i];
                const optionObj = pool.get();
                bindPoolItem(optionObj.element, optionObj);
                optionObj.element.value = `${i}`;
                optionObj.element.textContent = quest ? (quest.title || `任务${i}`) : `任务${i}`;
                frag.appendChild(optionObj.element);
            }
            select.appendChild(frag);
        }

        function renderQuestList() {
            // 不再使用独立左侧列表，改由通用 itemList 显示
            syncQuestToCommonList();
        }

        function bindQuestToForm(quest) {
            dom.title.value = quest.title || '';
            dom.giver.value = quest.giver || '';
            dom.category.checked = !!quest.category;
            dom.repeatable.checked = !!quest.repeatable;
            dom.difficulty.value = quest.difficulty || 1;
            dom.description.value = Array.isArray(quest.description) ? quest.description.join('\n') : (quest.description || '');
            renderSwitchList(dom.startSwitchList, quest.startSwitches, 'startSwitches');
            renderSwitchList(dom.finishSwitchList, quest.switches, 'switches');
            renderVariableList(dom.startVariableList, quest.startVariables, 'startVariables');
            renderVariableList(dom.finishVariableList, quest.variables, 'variables');
            renderRequirementList(quest.requirements || []);
            renderObjectiveList(quest.objectives || []);
            renderRewardList(quest.rewards || []);
        }

        function selectQuest(index) {
            state.currentIndex = index;
            const quest = state.quests[index];
            if (!quest) return;
            bindQuestToForm(quest);
            markItemListActive(index + 1); // 通用列表首位是占位
        }

        function renderSwitchList(container, data, key) {
            if (!container) return;
            if (key) {
                container.dataset.questList = key;
            }
            recyclePoolTree(container);
            const tpl = dom.switchRow;
            const frag = document.createDocumentFragment();
            const switches = state.system.switches;
            for (let idx = 0; idx < data.length; idx++) {
                const row = data[idx];
                const node = tpl.content.firstElementChild.cloneNode(true);
                node.dataset.index = idx;
                const select = node.querySelector('.switch-select');
                const valueSelect = node.querySelector('.switch-value');
                select.dataset.questList = key || container.dataset.questList || '';
                valueSelect.dataset.questList = key || container.dataset.questList || '';
                recycleOptions(valueSelect);
                const boolPool = getOptionPool();
                const boolFrag = document.createDocumentFragment();
                const trueOpt = boolPool.get();
                bindPoolItem(trueOpt.element, trueOpt);
                trueOpt.element.value = 'true';
                trueOpt.element.textContent = '开启';
                boolFrag.appendChild(trueOpt.element);
                const falseOpt = boolPool.get();
                bindPoolItem(falseOpt.element, falseOpt);
                falseOpt.element.value = 'false';
                falseOpt.element.textContent = '关闭';
                boolFrag.appendChild(falseOpt.element);
                valueSelect.appendChild(boolFrag);
                recycleOptions(select);
                const pool = getOptionPool();
                const optionFrag = document.createDocumentFragment();
                for (let i = 1; i < switches.length; i++) {
                    const s = switches[i];
                    if (!s) continue;
                    const optionObj = pool.get();
                    bindPoolItem(optionObj.element, optionObj);
                    optionObj.element.value = `${i}`;
                    optionObj.element.textContent = typeof s === 'string' ? s : (s.name || s.label || `开关${i}`);
                    optionFrag.appendChild(optionObj.element);
                }
                select.appendChild(optionFrag);
                const fallbackId = switches.length > 1 ? 1 : 0;
                select.value = row.switchId != null ? row.switchId : fallbackId;
                valueSelect.value = row.value != null ? `${row.value}` : 'true';
                select.dataset.switchField = 'switchId';
                valueSelect.dataset.switchField = 'value';
                frag.appendChild(node);
            }
            container.appendChild(frag);
        }

        const ops = ['+', '-', '*', '/', '='];
        function renderVariableList(container, data, key) {
            if (!container) return;
            if (key) {
                container.dataset.questList = key;
            }
            recyclePoolTree(container);
            const tpl = dom.variableRow;
            const frag = document.createDocumentFragment();
            const variables = state.system.variables;
            for (let idx = 0; idx < data.length; idx++) {
                const row = data[idx];
                const node = tpl.content.firstElementChild.cloneNode(true);
                node.dataset.index = idx;
                const select = node.querySelector('.variable-select');
                const valueInput = node.querySelector('.variable-value');
                const opContainer = node.querySelector('.variable-op-container');
                select.dataset.questList = key || container.dataset.questList || '';
                valueInput.dataset.questList = key || container.dataset.questList || '';
                const opSelectObj = getSelectPool().get();
                const opSelect = opSelectObj.element;
                bindPoolItem(opSelect, opSelectObj);
                opSelect.className = 'theme-select variable-op';
                opSelect.dataset.variableField = 'op';
                recycleOptions(opSelect);
                const opPool = getOptionPool();
                const opFrag = document.createDocumentFragment();
                for (let i = 0; i < ops.length; i++) {
                    const optionObj = opPool.get();
                    bindPoolItem(optionObj.element, optionObj);
                    optionObj.element.value = ops[i];
                    optionObj.element.textContent = ops[i];
                    opFrag.appendChild(optionObj.element);
                }
                opSelect.appendChild(opFrag);
                opSelect.value = row.op || '+';
                if (opContainer) {
                    opContainer.appendChild(opSelect);
                } else {
                    valueInput.parentNode.insertBefore(opSelect, valueInput);
                }
                recycleOptions(select);
                const pool = getOptionPool();
                const optionFrag = document.createDocumentFragment();
                for (let i = 1; i < variables.length; i++) {
                    const v = variables[i];
                    if (!v) continue;
                    const optionObj = pool.get();
                    bindPoolItem(optionObj.element, optionObj);
                    optionObj.element.value = `${i}`;
                    optionObj.element.textContent = v || `变量${i}`;
                    optionFrag.appendChild(optionObj.element);
                }
                select.appendChild(optionFrag);
                const fallbackId = variables.length > 1 ? 1 : 0;
                select.value = row.variableId != null ? row.variableId : fallbackId;
                valueInput.value = row.value != null ? row.value : 0;
                select.dataset.variableField = 'variableId';
                valueInput.dataset.variableField = 'value';
                frag.appendChild(node);
            }
            container.appendChild(frag);
        }

        function renderObjectiveSwitchList(container, obj, objIdx) {
            if (!container || !obj) return;
            container.dataset.objList = 'switches';
            container.dataset.objIndex = objIdx;
            recyclePoolTree(container);
            const tpl = dom.switchRow;
            const frag = document.createDocumentFragment();
            const sys = state.system.switches;
            const data = Array.isArray(obj.switches) ? obj.switches : [];
            for (let idx = 0; idx < data.length; idx++) {
                const row = data[idx];
                const node = tpl.content.firstElementChild.cloneNode(true);
                node.dataset.index = idx;
                node.dataset.objIndex = objIdx;
                node.dataset.objList = 'switches';
                const select = node.querySelector('.switch-select');
                const valueSelect = node.querySelector('.switch-value');
                select.dataset.objSwitchField = 'switchId';
                valueSelect.dataset.objSwitchField = 'value';
                recycleOptions(valueSelect);
                const boolPool = getOptionPool();
                const boolFrag = document.createDocumentFragment();
                const trueOpt = boolPool.get();
                bindPoolItem(trueOpt.element, trueOpt);
                trueOpt.element.value = 'true';
                trueOpt.element.textContent = '开启';
                boolFrag.appendChild(trueOpt.element);
                const falseOpt = boolPool.get();
                bindPoolItem(falseOpt.element, falseOpt);
                falseOpt.element.value = 'false';
                falseOpt.element.textContent = '关闭';
                boolFrag.appendChild(falseOpt.element);
                valueSelect.appendChild(boolFrag);
                recycleOptions(select);
                const pool = getOptionPool();
                const optionFrag = document.createDocumentFragment();
                for (let i = 1; i < sys.length; i++) {
                    const s = sys[i];
                    if (!s) continue;
                    const optionObj = pool.get();
                    bindPoolItem(optionObj.element, optionObj);
                    optionObj.element.value = `${i}`;
                    optionObj.element.textContent = typeof s === 'string' ? s : (s.name || s.label || `开关${i}`);
                    optionFrag.appendChild(optionObj.element);
                }
                select.appendChild(optionFrag);
                const fallbackId = sys.length > 1 ? 1 : 0;
                select.value = row.switchId != null ? row.switchId : fallbackId;
                valueSelect.value = `${row.value != null ? row.value : false}`;
                frag.appendChild(node);
            }
            container.appendChild(frag);
        }

        function renderObjectiveVariableList(container, obj, objIdx) {
            if (!container || !obj) return;
            container.dataset.objList = 'variables';
            container.dataset.objIndex = objIdx;
            recyclePoolTree(container);
            const tpl = dom.variableRow;
            const frag = document.createDocumentFragment();
            const sys = state.system.variables;
            const data = Array.isArray(obj.variables) ? obj.variables : [];
            for (let idx = 0; idx < data.length; idx++) {
                const row = data[idx];
                const node = tpl.content.firstElementChild.cloneNode(true);
                node.dataset.index = idx;
                node.dataset.objIndex = objIdx;
                node.dataset.objList = 'variables';
                const select = node.querySelector('.variable-select');
                const valueInput = node.querySelector('.variable-value');
                const opContainer = node.querySelector('.variable-op-container');
                select.dataset.objVariableField = 'variableId';
                valueInput.dataset.objVariableField = 'value';
                const opSelectObj = getSelectPool().get();
                const opSelect = opSelectObj.element;
                bindPoolItem(opSelect, opSelectObj);
                opSelect.className = 'theme-select variable-op';
                opSelect.dataset.objVariableField = 'op';
                recycleOptions(opSelect);
                const opPool = getOptionPool();
                const opFrag = document.createDocumentFragment();
                for (let i = 0; i < ops.length; i++) {
                    const optionObj = opPool.get();
                    bindPoolItem(optionObj.element, optionObj);
                    optionObj.element.value = ops[i];
                    optionObj.element.textContent = ops[i];
                    opFrag.appendChild(optionObj.element);
                }
                opSelect.appendChild(opFrag);
                opSelect.value = row.op || '+';
                if (opContainer) {
                    opContainer.appendChild(opSelect);
                } else {
                    valueInput.parentNode.insertBefore(opSelect, valueInput);
                }
                recycleOptions(select);
                const pool = getOptionPool();
                const optionFrag = document.createDocumentFragment();
                for (let i = 1; i < sys.length; i++) {
                    const v = sys[i];
                    if (!v) continue;
                    const optionObj = pool.get();
                    bindPoolItem(optionObj.element, optionObj);
                    optionObj.element.value = `${i}`;
                    optionObj.element.textContent = typeof v === 'string' ? v : (v.name || v.label || `变量${i}`);
                    optionFrag.appendChild(optionObj.element);
                }
                select.appendChild(optionFrag);
                const fallbackId = sys.length > 1 ? 1 : 0;
                select.value = row.variableId != null ? row.variableId : fallbackId;
                valueInput.value = row.value != null ? row.value : 0;
                frag.appendChild(node);
            }
            container.appendChild(frag);
        }

        function renderObjectiveActions(card, obj, objIdx) {
            if (!card) return;
            renderObjectiveSwitchList(card.querySelector('.obj-switch-list'), obj, objIdx);
            renderObjectiveVariableList(card.querySelector('.obj-variable-list'), obj, objIdx);
        }

        function refreshObjectiveActionsView() {
            const quest = getCurrentQuest();
            if (!quest || !quest.objectives) return;
            renderObjectiveList(quest.objectives);
        }

        function renderRequirementList(list) {
            recyclePoolTree(dom.requirementList);
            const frag = document.createDocumentFragment();
            for (let idx = 0; idx < list.length; idx++) {
                const req = list[idx];
                const card = dom.reqCard.content.firstElementChild.cloneNode(true);
                card.dataset.index = idx;
                const typeSelect = card.querySelector('.req-type');
                fillOptions(typeSelect, QUEST_REQUIREMENT_TYPES);
                typeSelect.value = req.type ?? 0;
                typeSelect.dataset.index = idx;
                typeSelect.dataset.reqField = 'type';
                buildRequirementFields(card.querySelector('.req-grid'), req);
                frag.appendChild(card);
            }
            dom.requirementList.appendChild(frag);
        }

        function renderObjectiveList(list) {
            recyclePoolTree(dom.objectiveList);
            const frag = document.createDocumentFragment();
            for (let idx = 0; idx < list.length; idx++) {
                const obj = list[idx];
                if (!Array.isArray(obj.switches)) obj.switches = [];
                if (!Array.isArray(obj.variables)) obj.variables = [];
                const card = dom.objCard.content.firstElementChild.cloneNode(true);
                card.dataset.index = idx;
                const typeSelect = card.querySelector('.obj-type');
                const calcCheckbox = card.querySelector('.obj-calc-type');
                fillOptions(typeSelect, QUEST_OBJECTIVE_TYPES);
                typeSelect.value = obj.type ?? 1;
                calcCheckbox.checked = obj.calculateType !== false;
                typeSelect.dataset.index = idx;
                typeSelect.dataset.objField = 'type';
                calcCheckbox.dataset.index = idx;
                calcCheckbox.dataset.objField = 'calculateType';
                buildObjectiveFields(card.querySelector('.obj-grid'), obj);
                renderObjectiveActions(card, obj, idx);
                frag.appendChild(card);
            }
            dom.objectiveList.appendChild(frag);
            updateObjectiveActionSelects();
        }

        function renderRewardList(list) {
            recyclePoolTree(dom.rewardList);
            const frag = document.createDocumentFragment();
            for (let idx = 0; idx < list.length; idx++) {
                const rew = list[idx];
                const card = dom.rewCard.content.firstElementChild.cloneNode(true);
                card.dataset.index = idx;
                const typeSelect = card.querySelector('.rew-type');
                fillOptions(typeSelect, QUEST_REWARD_TYPES);
                typeSelect.value = rew.type ?? 1;
                typeSelect.dataset.index = idx;
                typeSelect.dataset.rewField = 'type';
                buildRewardFields(card.querySelector('.rew-grid'), rew);
                frag.appendChild(card);
            }
            dom.rewardList.appendChild(frag);
        }

        function bindListDelegates() {
            dom.requirementList && dom.requirementList.addEventListener('click', handleRequirementClick);
            dom.requirementList && dom.requirementList.addEventListener('change', handleRequirementChange);
            dom.objectiveList && dom.objectiveList.addEventListener('click', handleObjectiveClick);
            dom.objectiveList && dom.objectiveList.addEventListener('change', handleObjectiveChange);
            dom.rewardList && dom.rewardList.addEventListener('click', handleRewardClick);
            dom.rewardList && dom.rewardList.addEventListener('change', handleRewardChange);
        }

        function handleRequirementClick(e) {
            const remove = e.target.closest('.remove-card');
            if (remove) {
                const idx = Number(remove.closest('.quest-card')?.dataset.index);
                if (Number.isInteger(idx) && idx >= 0 && state.quests[state.currentIndex]?.requirements) {
                    state.quests[state.currentIndex].requirements.splice(idx, 1);
                    renderRequirementList(state.quests[state.currentIndex].requirements);
                }
            }
        }

        function handleRequirementChange(e) {
            const quest = getCurrentQuest();
            if (!quest || !quest.requirements) return;
            const typeSelect = e.target.closest('.req-type');
            if (typeSelect) {
                const idx = Number(typeSelect.dataset.index);
                if (!Number.isInteger(idx) || idx < 0 || idx >= quest.requirements.length) return;
                const req = quest.requirements[idx];
                req.type = Number(typeSelect.value);
                const card = typeSelect.closest('.quest-card');
                if (card) {
                    buildRequirementFields(card.querySelector('.req-grid'), req);
                }
            }
        }

        function handleObjectiveClick(e) {
            const miniRemove = e.target.closest('.mini-row-remove');
            if (miniRemove) {
                if (removeObjectiveActionRow(miniRemove)) return;
            }
            const remove = e.target.closest('.remove-card');
            if (remove) {
                const idx = Number(remove.closest('.quest-card')?.dataset.index);
                if (Number.isInteger(idx) && idx >= 0 && state.quests[state.currentIndex]?.objectives) {
                    state.quests[state.currentIndex].objectives.splice(idx, 1);
                    renderObjectiveList(state.quests[state.currentIndex].objectives);
                }
                return;
            }
            const addSwitch = e.target.closest('.obj-switch-add');
            if (addSwitch) {
                const idx = Number(addSwitch.closest('.quest-card')?.dataset.index);
                addObjectiveAction(idx, 'switches');
                return;
            }
            const addVar = e.target.closest('.obj-variable-add');
            if (addVar) {
                const idx = Number(addVar.closest('.quest-card')?.dataset.index);
                addObjectiveAction(idx, 'variables');
            }
        }

        function handleObjectiveChange(e) {
            const quest = getCurrentQuest();
            if (!quest || !quest.objectives) return;
            const typeSelect = e.target.closest('.obj-type');
            if (typeSelect) {
                const idx = Number(typeSelect.dataset.index);
                if (!Number.isInteger(idx) || idx < 0 || idx >= quest.objectives.length) return;
                const obj = quest.objectives[idx];
                obj.type = Number(typeSelect.value);
                const card = typeSelect.closest('.quest-card');
                if (card) {
                    buildObjectiveFields(card.querySelector('.obj-grid'), obj);
                }
            }
            const calc = e.target.closest('.obj-calc-type');
            if (calc) {
                const idx = Number(calc.dataset.index);
                if (!Number.isInteger(idx) || idx < 0 || idx >= quest.objectives.length) return;
                quest.objectives[idx].calculateType = calc.checked;
            }
        }

        function handleRewardClick(e) {
            const remove = e.target.closest('.remove-card');
            if (remove) {
                const idx = Number(remove.closest('.quest-card')?.dataset.index);
                if (Number.isInteger(idx) && idx >= 0 && state.quests[state.currentIndex]?.rewards) {
                    state.quests[state.currentIndex].rewards.splice(idx, 1);
                    renderRewardList(state.quests[state.currentIndex].rewards);
                }
            }
        }

        function handleRewardChange(e) {
            const quest = getCurrentQuest();
            if (!quest || !quest.rewards) return;
            const typeSelect = e.target.closest('.rew-type');
            if (typeSelect) {
                const idx = Number(typeSelect.dataset.index);
                if (!Number.isInteger(idx) || idx < 0 || idx >= quest.rewards.length) return;
                const rew = quest.rewards[idx];
                rew.type = Number(typeSelect.value);
                const card = typeSelect.closest('.quest-card');
                if (card) {
                    buildRewardFields(card.querySelector('.rew-grid'), rew);
                }
            }
        }

        function buildRequirementFields(grid, req) {
            recyclePoolTree(grid);
            const type = req.type ?? 0;
            const opSelect = createSelect(QUEST_OPERATORS, req.operator || '>=');
            opSelect.dataset.reqField = 'operator';
            if (type === 1) {
                appendQuestField(grid, '目标等级', createNumberInput(req.targetValue ?? 1, 'targetValue', 'req'), 'reqField', 'targetValue');
                appendQuestField(grid, '角色ID', createNumberInput(req.actorId ?? 1, 'actorId', 'req'), 'reqField', 'actorId');
                appendQuestField(grid, '比较符', opSelect, 'reqField', 'operator');
            } else if (type === 2) {
                const selectObj = getSelectPool().get();
                const questSelect = selectObj.element;
                bindPoolItem(questSelect, selectObj);
                questSelect.className = 'theme-select';
                recycleOptions(questSelect);
                fillQuestSelectOptions(questSelect, state.quests);
                questSelect.value = req.questId ?? 0;
                appendQuestField(grid, '前置任务', questSelect, 'reqField', 'questId');
            } else if (type === 3) {
                const itemId = ensureDataId(req, 'itemId', state.system.items);
                appendQuestField(grid, '物品', createDataSelect(state.system.items, itemId, 'itemId', 'req'), 'reqField', 'itemId');
                appendQuestField(grid, '数量/值', createNumberInput(req.targetValue ?? 1, 'targetValue', 'req'), 'reqField', 'targetValue');
                appendQuestField(grid, '比较符', opSelect, 'reqField', 'operator');
            } else if (type === 4) {
                const weaponId = ensureDataId(req, 'weaponId', state.system.weapons);
                appendQuestField(grid, '武器', createDataSelect(state.system.weapons, weaponId, 'weaponId', 'req'), 'reqField', 'weaponId');
                appendQuestField(grid, '数量/值', createNumberInput(req.targetValue ?? 1, 'targetValue', 'req'), 'reqField', 'targetValue');
                appendQuestField(grid, '比较符', opSelect, 'reqField', 'operator');
            } else if (type === 5) {
                const armorId = ensureDataId(req, 'armorId', state.system.armors);
                appendQuestField(grid, '防具', createDataSelect(state.system.armors, armorId, 'armorId', 'req'), 'reqField', 'armorId');
                appendQuestField(grid, '数量/值', createNumberInput(req.targetValue ?? 1, 'targetValue', 'req'), 'reqField', 'targetValue');
                appendQuestField(grid, '比较符', opSelect, 'reqField', 'operator');
            } else if (type === 6) {
                const switchId = ensureDataId(req, 'switchId', state.system.switches);
                appendQuestField(grid, '开关', createDataSelect(state.system.switches, switchId, 'switchId', 'req'), 'reqField', 'switchId');
                const boolSelect = createBoolSelect(ensureBoolValue(req, 'targetValue', true), 'reqField', 'targetValue');
                appendQuestField(grid, '目标值', boolSelect, 'reqField', 'targetValue');
            } else if (type === 7) {
                const variableId = ensureDataId(req, 'variableId', state.system.variables);
                appendQuestField(grid, '变量', createDataSelect(state.system.variables, variableId, 'variableId', 'req'), 'reqField', 'variableId');
                appendQuestField(grid, '目标值', createNumberInput(req.targetValue ?? 1, 'targetValue', 'req'), 'reqField', 'targetValue');
                appendQuestField(grid, '比较符', opSelect, 'reqField', 'operator');
            } else if (type === 8) {
                appendQuestField(grid, '金币', createNumberInput(req.targetValue ?? 1, 'targetValue', 'req'), 'reqField', 'targetValue');
                appendQuestField(grid, '比较符', opSelect, 'reqField', 'operator');
            }
            appendQuestField(grid, '描述', createTextInput(req.description || '', 'description', 'req'), 'reqField', 'description');
        }

        function buildObjectiveFields(grid, obj) {
            recyclePoolTree(grid);
            if (!Array.isArray(obj.switches)) obj.switches = [];
            if (!Array.isArray(obj.variables)) obj.variables = [];
            const type = obj.type ?? 1;
            const opSelect = createSelect(QUEST_OPERATORS, obj.operator || '>=');
            opSelect.dataset.objField = 'operator';
            if (type === 1) {
                const enemyId = ensureDataId(obj, 'enemyId', state.system.enemies);
                appendQuestField(grid, '敌人', createDataSelect(state.system.enemies, enemyId, 'enemyId', 'obj'), 'objField', 'enemyId');
            } else if (type === 2) {
                const itemId = ensureDataId(obj, 'itemId', state.system.items);
                appendQuestField(grid, '物品', createDataSelect(state.system.items, itemId, 'itemId', 'obj'), 'objField', 'itemId');
            } else if (type === 3) {
                const weaponId = ensureDataId(obj, 'weaponId', state.system.weapons);
                appendQuestField(grid, '武器', createDataSelect(state.system.weapons, weaponId, 'weaponId', 'obj'), 'objField', 'weaponId');
            } else if (type === 4) {
                const armorId = ensureDataId(obj, 'armorId', state.system.armors);
                appendQuestField(grid, '防具', createDataSelect(state.system.armors, armorId, 'armorId', 'obj'), 'objField', 'armorId');
            } else if (type === 5) {
                const switchId = ensureDataId(obj, 'switchId', state.system.switches);
                const switchSelect = createSwitchSelect(state.system.switches, switchId, 'switchId', 'obj');
                const boolSelect = createBoolSelect(ensureBoolValue(obj, 'targetValue', true), 'objField', 'targetValue');
                appendQuestField(grid, '开关', switchSelect, 'objField', 'switchId');
                appendQuestField(grid, '目标值', boolSelect, 'objField', 'targetValue');
            } else if (type === 6) {
                const variableId = ensureDataId(obj, 'variableId', state.system.variables);
                appendQuestField(grid, '变量', createDataSelect(state.system.variables, variableId, 'variableId', 'obj'), 'objField', 'variableId');
            }
            if (type !== 5) {
                appendQuestField(grid, '目标值', createNumberInput(obj.targetValue ?? 1, 'targetValue', 'obj'), 'objField', 'targetValue');
            }
            appendQuestField(grid, '比较符', opSelect, 'objField', 'operator');
            appendQuestField(grid, '描述', createTextInput(obj.description || '', 'description', 'obj'), 'objField', 'description');
        }

        function buildRewardFields(grid, rew) {
            recyclePoolTree(grid);
            const type = rew.type ?? 1;
            if (type === 1) {
                const itemId = ensureDataId(rew, 'itemId', state.system.items);
                appendQuestField(grid, '物品', createDataSelect(state.system.items, itemId, 'itemId', 'rew'), 'rewField', 'itemId');
            } else if (type === 2) {
                const weaponId = ensureDataId(rew, 'weaponId', state.system.weapons);
                appendQuestField(grid, '武器', createDataSelect(state.system.weapons, weaponId, 'weaponId', 'rew'), 'rewField', 'weaponId');
            } else if (type === 3) {
                const armorId = ensureDataId(rew, 'armorId', state.system.armors);
                appendQuestField(grid, '防具', createDataSelect(state.system.armors, armorId, 'armorId', 'rew'), 'rewField', 'armorId');
            } else if (type === 6) {
                const switchId = ensureDataId(rew, 'switchId', state.system.switches);
                const switchSelect = createSwitchSelect(state.system.switches, switchId, 'switchId', 'rew');
                const boolSelect = createBoolSelect(ensureBoolValue(rew, 'targetValue', true), 'rewField', 'targetValue');
                appendQuestField(grid, '开关', switchSelect, 'rewField', 'switchId');
                appendQuestField(grid, '值', boolSelect, 'rewField', 'targetValue');
            } else if (type === 7) {
                const variableId = ensureDataId(rew, 'variableId', state.system.variables);
                appendQuestField(grid, '变量', createDataSelect(state.system.variables, variableId, 'variableId', 'rew'), 'rewField', 'variableId');
                if (!rew.op) rew.op = '=';
                const opSelect = createOperatorSelect(rew.op);
                appendQuestField(grid, '运算', opSelect, 'rewField', 'op');
            }
            if (type !== 6 || type === 7) {
                appendQuestField(grid, '数量/值', createNumberInput(rew.targetValue ?? 1, 'targetValue', 'rew'), 'rewField', 'targetValue');
            }
            appendQuestField(grid, '描述', createTextInput(rew.description || '', 'description', 'rew'), 'rewField', 'description');
        }

        function createSelect(options, value) {
            const selectObj = getSelectPool().get();
            const sel = selectObj.element;
            bindPoolItem(sel, selectObj);
            sel.className = 'theme-select';
            recycleOptions(sel);
            const pool = getOptionPool();
            const frag = document.createDocumentFragment();
            for (let i = 0; i < options.length; i++) {
                const opt = options[i];
                if (!opt) continue;
                const optionObj = pool.get();
                bindPoolItem(optionObj.element, optionObj);
                if (typeof opt === 'string') {
                    optionObj.element.value = opt;
                    optionObj.element.textContent = opt;
                } else {
                    optionObj.element.value = `${opt.value}`;
                    optionObj.element.textContent = opt.label || '';
                }
                frag.appendChild(optionObj.element);
            }
            sel.appendChild(frag);
            sel.value = value;
            return sel;
        }

        function createDataSelect(data, value, field, scope) {
            const selectObj = getSelectPool().get();
            const sel = selectObj.element;
            bindPoolItem(sel, selectObj);
            sel.className = 'theme-select';
            if (field) {
                sel.dataset[`${scope}Field`] = field;
            } else {
                delete sel.dataset[`${scope}Field`];
            }
            recycleOptions(sel);
            const pool = getOptionPool();
            const frag = document.createDocumentFragment();
            for (let i = 1; i < data.length; i++) {
                const d = data[i];
                if (!d) continue;
                const optionObj = pool.get();
                bindPoolItem(optionObj.element, optionObj);
                optionObj.element.value = `${i}`;
                optionObj.element.textContent = typeof d === 'string' ? d : (d.name || d.label || `${i}`);
                frag.appendChild(optionObj.element);
            }
            sel.appendChild(frag);
            sel.value = value;
            return sel;
        }

        function ensureDataId(holder, key, list) {
            if (holder[key] == null) {
                holder[key] = list && list.length > 1 ? 1 : 0;
            }
            return holder[key];
        }

        function ensureBoolValue(holder, key, fallback) {
            if (holder[key] == null) {
                holder[key] = fallback;
            }
            return holder[key];
        }

        function createSwitchSelect(list, value, field, scope) {
            const select = createDataSelect(list, value, field, scope);
            return select;
        }

        function createBoolSelect(current, datasetKey, fieldName) {
            const selectObj = getSelectPool().get();
            const sel = selectObj.element;
            bindPoolItem(sel, selectObj);
            sel.className = 'theme-select';
            if (datasetKey && fieldName) {
                sel.dataset[datasetKey] = fieldName;
            }
            recycleOptions(sel);
            const pool = getOptionPool();
            const frag = document.createDocumentFragment();
            const trueOpt = pool.get();
            bindPoolItem(trueOpt.element, trueOpt);
            trueOpt.element.value = 'true';
            trueOpt.element.textContent = '开启';
            frag.appendChild(trueOpt.element);
            const falseOpt = pool.get();
            bindPoolItem(falseOpt.element, falseOpt);
            falseOpt.element.value = 'false';
            falseOpt.element.textContent = '关闭';
            frag.appendChild(falseOpt.element);
            sel.appendChild(frag);
            sel.value = current != null ? `${current}` : 'true';
            return sel;
        }
        function createOperatorSelect(value) {
            const selectObj = getSelectPool().get();
            const sel = selectObj.element;
            bindPoolItem(sel, selectObj);
            sel.className = 'theme-select variable-op';
            recycleOptions(sel);
            const pool = getOptionPool();
            const frag = document.createDocumentFragment();
            for (let i = 0; i < ops.length; i++) {
                const optionObj = pool.get();
                bindPoolItem(optionObj.element, optionObj);
                optionObj.element.value = ops[i];
                optionObj.element.textContent = ops[i];
                frag.appendChild(optionObj.element);
            }
            sel.appendChild(frag);
            sel.value = value || '=';
            return sel;
        }

        function createNumberInput(value, field, scope) {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'theme-input';
            if (field) {
                input.dataset[`${scope}Field`] = field;
            }
            input.value = value ?? 0;
            return input;
        }

        function createTextInput(value, field, scope) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'theme-input';
            if (field) {
                input.dataset[`${scope}Field`] = field;
            }
            input.value = value || '';
            return input;
        }

        function appendQuestField(grid, label, node, datasetKey, fieldName) {
            const wrap = document.createElement('label');
            wrap.textContent = label;
            if (datasetKey && fieldName) {
                node.dataset[datasetKey] = fieldName;
            }
            wrap.appendChild(node);
            grid.appendChild(wrap);
        }

        function initQuestDataSelect() {
            const configs = QUEST_DATA_CONFIG;
            for (const key in configs) {
                const cfg = configs[key];
                const select = dom[cfg.selectRef.replace('#', '')] || dom[cfg.selectRef];
                if (!select) continue;
                recycleOptions(select);
                const pool = getOptionPool();
                const frag = document.createDocumentFragment();
                const opt = pool.get();
                bindPoolItem(opt.element, opt);
                opt.element.value = cfg.defaultFile;
                opt.element.textContent = cfg.defaultFile;
                frag.appendChild(opt.element);
                if (state.questDataPaths?.[key]) {
                    const custom = pool.get();
                    bindPoolItem(custom.element, custom);
                    custom.element.value = state.questDataPaths[key];
                    custom.element.textContent = state.questDataPaths[key].split(TRANSFORM_REGEXP).pop() || state.questDataPaths[key];
                    frag.appendChild(custom.element);
                    select.value = state.questDataPaths[key];
                } else {
                    select.value = cfg.defaultFile;
                }
                select.appendChild(frag);
            }
            updateQuestDataStatus();
        }

        function resolveQuestFilePath(value) {
            if (!value) return null;
            const trimmed = value.trim();
            if (!trimmed) return null;
            const normalized = isAbsolutePath(trimmed)
                ? normalizeSlashes(trimmed.replace(TRANSFORM_REGEXP, ''))
                : null;
            if (normalized) return normalized;
            const dir = state.dataPath || getDataDirectory();
            if (!dir) return null;
            return normalizeSlashes(`${dir}/${trimmed}`.replace(TRANSFORM_REGEXP, ''));
        }

        async function loadDataResource(type, fileValue, defaultName = null) {
            const cfg = QUEST_DATA_CONFIG[type];
            if (!cfg) return;
            const filePath = resolveQuestFilePath(fileValue || cfg.defaultFile);
            if (!filePath) {
                return;
            }
            try {
                const raw = await electronAPI.readFile(filePath, 'utf-8');
                const parsed = JSON.parse(raw);
                const statusEl = document.getElementById(cfg.statusRef);
                const fileName = defaultName || fileValue || filePath.split(TRANSFORM_REGEXP).pop() || filePath;
                FileCacheManager.cache(filePath, fileName, parsed);
                if (statusEl) statusEl.textContent = `${fileName} · ${(parsed?.length ?? 0)} 条`;
                state.questDataPaths[type] = filePath;
                registerProjectileDataFile(fileName, filePath);
                applyLoadedQuestData(type, parsed);
                refreshSelectSources();
            } catch (err) {
                console.error(err);
            }
        }

        function applyLoadedQuestData(type, data) {
            const sys = state.system;
            if (!data) return;
            if (type === 'system') {
                sys.switches = data.switches;
                sys.variables = data.variables;
                refreshObjectiveActionsView();
                return;
            } else if (type === 'item') {
                sys.items = data;
                return;
            } else if (type === 'weapon') {
                sys.weapons = data;
                return;
            } else if (type === 'armor') {
                sys.armors = data;
                return;
            } else if (type === 'enemy') {
                sys.enemies = data;
                return;
            } else if (type === 'actor') {
                sys.actors = data;
                return;
            }
        }

        function bindDataLoaders() {
            for (const [type, cfg] of Object.entries(QUEST_DATA_CONFIG)) {
                const loadBtn = dom[cfg.loadRef.replace('#', '')] || dom[cfg.loadRef];
                const pickBtn = dom[cfg.pickRef.replace('#', '')] || dom[cfg.pickRef];
                const select = dom[cfg.selectRef.replace('#', '')] || dom[cfg.selectRef];
                if (loadBtn) {
                    loadBtn.dataset.questResource = type;
                    loadBtn.dataset.questAction = 'load';
                }
                if (pickBtn) {
                    pickBtn.dataset.questResource = type;
                    pickBtn.dataset.questAction = 'pick';
                }
                if (select) {
                    select.dataset.questResource = type;
                }
                const statusEl = document.getElementById(cfg.statusRef);
                if (statusEl) statusEl.textContent = '尚未加载';
            }
        }

        function getQuestDataSelect(type) {
            const cfg = QUEST_DATA_CONFIG[type];
            if (!cfg) return null;
            return dom[cfg.selectRef.replace('#', '')] || dom[cfg.selectRef] || null;
        }

        function handleQuestResourceAction(type, action) {
            const cfg = QUEST_DATA_CONFIG[type];
            if (!cfg) return;
            const select = getQuestDataSelect(type);
            if (action === 'load') {
                const value = select ? select.value : cfg.defaultFile;
                loadDataResource(type, value || cfg.defaultFile);
            } else if (action === 'pick') {
                handlePickDataFile(type, cfg, select);
            }
        }

        async function handlePickDataFile(type, cfg, select) {
            try {
                const result = await electronAPI.showOpenDialog({
                    properties: ['openFile'],
                    filters: [{ name: 'JSON 文件', extensions: ['json'] }],
                    title: `选择${cfg.label}`
                });
                if (result?.canceled || !result.filePaths.length) return;
                const filePath = result.filePaths[0];
                if (select) {
                    select.value = filePath;
                }
                await loadDataResource(type, filePath, cfg.defaultFile);
            } catch (err) {
                console.error(err);
            }
        }

        function bindEvents() {
            if (eventsBound) return;
            eventsBound = true;
            if (dom.container) {
                dom.container.addEventListener('click', handleQuestPanelClick);
                dom.container.addEventListener('change', handleQuestPanelChange);
                dom.container.addEventListener('input', handleQuestPanelInput);
            }
        }

        function handleQuestPanelClick(e) {
            const target = e.target;
            if (!target) return;
            if (target.closest('#questAddRequirementBtn')) {
                addRequirement();
                return;
            }
            if (target.closest('#questAddObjectiveBtn')) {
                addObjective();
                return;
            }
            if (target.closest('#questAddRewardBtn')) {
                addReward();
                return;
            }
            if (target.closest('#questAddStartSwitchBtn')) {
                onAddStartSwitch();
                return;
            }
            if (target.closest('#questAddFinishSwitchBtn')) {
                onAddFinishSwitch();
                return;
            }
            if (target.closest('#questAddStartVariableBtn')) {
                onAddStartVariable();
                return;
            }
            if (target.closest('#questAddFinishVariableBtn')) {
                onAddFinishVariable();
                return;
            }
            const resourceBtn = target.closest('[data-quest-resource][data-quest-action]');
            if (resourceBtn) {
                const type = resourceBtn.dataset.questResource;
                const action = resourceBtn.dataset.questAction;
                handleQuestResourceAction(type, action);
                return;
            }
            if (target.closest('#questRequirementList')) {
                handleRequirementClick(e);
                return;
            }
            if (target.closest('#questObjectiveList')) {
                handleObjectiveClick(e);
                return;
            }
            if (target.closest('#questRewardList')) {
                handleRewardClick(e);
                return;
            }
            const remove = target.closest('.mini-row-remove');
            if (remove) {
                removeMiniRow(remove);
            }
        }

        function handleQuestPanelChange(e) {
            const target = e.target;
            if (!target) return;
            if (target.closest('#questRequirementList') && target.dataset.reqField) {
                applyRequirementField(target);
                return;
            }
            if (target.closest('#questObjectiveList') && (target.dataset.objField || target.classList.contains('obj-type'))) {
                applyObjectiveField(target);
                return;
            }
            if (target.closest('#questObjectiveList') && target.dataset.objSwitchField) {
                applyObjectiveSwitchField(target);
                return;
            }
            if (target.closest('#questObjectiveList') && target.dataset.objVariableField) {
                applyObjectiveVariableField(target);
                return;
            }
            if (target.closest('#questRewardList') && (target.dataset.rewField || target.classList.contains('rew-type'))) {
                applyRewardField(target);
                return;
            }
            if (target.classList.contains('switch-select') || target.classList.contains('switch-value')) {
                applySwitchField(target);
                return;
            }
            if (target.classList.contains('variable-select') || target.classList.contains('variable-value')) {
                applyVariableField(target);
                return;
            }
            if (target.dataset.questResource && target.dataset.questAction === 'load') {
                handleQuestResourceAction(target.dataset.questResource, 'load');
                return;
            }
            if (target === dom.category || target === dom.repeatable || target === dom.difficulty) {
                collectFormToQuest();
            }
        }

        function handleQuestPanelInput(e) {
            const target = e.target;
            if (!target) return;
            if (target === dom.title || target === dom.giver || target === dom.description) {
                collectFormToQuest();
                return;
            }
            if (target.closest('#questRequirementList') && target.dataset.reqField) {
                applyRequirementField(target);
                return;
            }
            if (target.closest('#questObjectiveList') && target.dataset.objField) {
                applyObjectiveField(target);
                return;
            }
            if (target.closest('#questObjectiveList') && target.dataset.objVariableField) {
                applyObjectiveVariableField(target);
                return;
            }
            if (target.closest('#questRewardList') && target.dataset.rewField) {
                applyRewardField(target);
                return;
            }
            if (target.classList.contains('variable-value')) {
                applyVariableField(target);
            }
        }

        function parseBoolValue(value) {
            return value === true || value === 'true' || value === '1';
        }

        function applyRequirementField(target) {
            const quest = getCurrentQuest();
            if (!quest || !quest.requirements) return;
            const cardIdx = Number(target.closest('.quest-card')?.dataset.index);
            if (!Number.isInteger(cardIdx) || cardIdx < 0 || cardIdx >= quest.requirements.length) return;
            const req = quest.requirements[cardIdx];
            const field = target.dataset.reqField;
            if (!field) return;
            if (field === 'type') {
                const newType = Number(target.value || 0);
                if (req.type !== newType) {
                    req.type = newType;
                    const grid = target.closest('.quest-card')?.querySelector('.req-grid');
                    if (grid) {
                        buildRequirementFields(grid, req);
                    }
                }
                return;
            }
            if (field === 'description' || field === 'operator') {
                req[field] = target.value ?? '';
                return;
            }
            if (field === 'targetValue' && target.tagName === 'SELECT') {
                req.targetValue = parseBoolValue(target.value);
                return;
            }
            const num = Number(target.value || 0);
            req[field] = Number.isNaN(num) ? 0 : num;
        }

        function applyObjectiveField(target) {
            const quest = getCurrentQuest();
            if (!quest || !quest.objectives) return;
            const cardIdx = Number(target.closest('.quest-card')?.dataset.index);
            if (!Number.isInteger(cardIdx) || cardIdx < 0 || cardIdx >= quest.objectives.length) return;
            const obj = quest.objectives[cardIdx];
            const field = target.dataset.objField || (target.classList.contains('obj-type') ? 'type' : null);
            if (!field) return;
            if (field === 'type') {
                const newType = Number(target.value || 1);
                if (obj.type !== newType) {
                    obj.type = newType;
                    const grid = target.closest('.quest-card')?.querySelector('.obj-grid');
                    if (grid) {
                        buildObjectiveFields(grid, obj);
                    }
                }
                return;
            }
            if (field === 'calculateType') {
                obj.calculateType = !!target.checked;
                return;
            }
            if (field === 'operator' || field === 'description') {
                obj[field] = target.value ?? '';
                return;
            }
            if (field === 'targetValue' && target.tagName === 'SELECT') {
                obj.targetValue = parseBoolValue(target.value);
                return;
            }
            const num = Number(target.value || 0);
            obj[field] = Number.isNaN(num) ? 0 : num;
        }

        function applyObjectiveSwitchField(target) {
            const quest = getCurrentQuest();
            if (!quest || !quest.objectives) return;
            const cardIdx = Number(target.closest('.quest-card')?.dataset.index);
            if (!Number.isInteger(cardIdx) || cardIdx < 0 || cardIdx >= quest.objectives.length) return;
            const obj = quest.objectives[cardIdx];
            if (!Array.isArray(obj.switches)) obj.switches = [];
            const idx = Number(target.closest('[data-index]')?.dataset.index);
            if (!Number.isInteger(idx) || idx < 0 || idx >= obj.switches.length) return;
            const row = obj.switches[idx];
            const field = target.dataset.objSwitchField;
            if (!field) return;
            if (field === 'value') {
                row.value = target.value === 'true';
                return;
            }
            row.switchId = Number(target.value || 0);
        }

        function applyObjectiveVariableField(target) {
            const quest = getCurrentQuest();
            if (!quest || !quest.objectives) return;
            const cardIdx = Number(target.closest('.quest-card')?.dataset.index);
            if (!Number.isInteger(cardIdx) || cardIdx < 0 || cardIdx >= quest.objectives.length) return;
            const obj = quest.objectives[cardIdx];
            if (!Array.isArray(obj.variables)) obj.variables = [];
            const idx = Number(target.closest('[data-index]')?.dataset.index);
            if (!Number.isInteger(idx) || idx < 0 || idx >= obj.variables.length) return;
            const row = obj.variables[idx];
            const field = target.dataset.objVariableField;
            if (!field) return;
            if (field === 'op') {
                row.op = target.value || '+';
                return;
            }
            const num = Number(target.value || 0);
            if (field === 'value') {
                row.value = Number.isNaN(num) ? 0 : num;
                return;
            }
            row.variableId = Number.isNaN(num) ? 0 : num;
        }

        function applyRewardField(target) {
            const quest = getCurrentQuest();
            if (!quest || !quest.rewards) return;
            const cardIdx = Number(target.closest('.quest-card')?.dataset.index);
            if (!Number.isInteger(cardIdx) || cardIdx < 0 || cardIdx >= quest.rewards.length) return;
            const rew = quest.rewards[cardIdx];
            const field = target.dataset.rewField || (target.classList.contains('rew-type') ? 'type' : null);
            if (!field) return;
            if (field === 'type') {
                const newType = Number(target.value || 1);
                if (rew.type !== newType) {
                    rew.type = newType;
                    const grid = target.closest('.quest-card')?.querySelector('.rew-grid');
                    if (grid) {
                        buildRewardFields(grid, rew);
                    }
                }
                return;
            }
            if (field === 'operator' || field === 'description') {
                rew[field] = target.value ?? '';
                return;
            }
            if (field === 'op') {
                rew.op = target.value || '=';
                return;
            }
            if (field === 'targetValue' && target.tagName === 'SELECT') {
                rew.targetValue = parseBoolValue(target.value);
                return;
            }
            const num = Number(target.value || 0);
            rew[field] = Number.isNaN(num) ? 0 : num;
        }

        function getQuestListKeyFromElement(el) {
            if (!el) return null;
            const list = el.closest('[data-quest-list]');
            return list ? list.dataset.questList : null;
        }

        function getObjectiveListKeyFromElement(el) {
            if (!el) return null;
            const list = el.closest('[data-obj-list]');
            return list ? list.dataset.objList : null;
        }

        function getListArrayByKey(quest, key) {
            if (!quest) return null;
            if (key === 'startSwitches') return quest.startSwitches;
            if (key === 'switches') return quest.switches;
            if (key === 'startVariables') return quest.startVariables;
            if (key === 'variables') return quest.variables;
            return null;
        }

        function removeObjectiveActionRow(target) {
            const quest = getCurrentQuest();
            if (!quest || !quest.objectives) return false;
            const listKey = getObjectiveListKeyFromElement(target);
            if (!listKey) return false;
            const objIdx = Number(target.closest('.quest-card')?.dataset.index);
            if (!Number.isInteger(objIdx) || objIdx < 0 || objIdx >= quest.objectives.length) return false;
            const obj = quest.objectives[objIdx];
            const list = listKey === 'switches' ? obj.switches : obj.variables;
            if (!Array.isArray(list)) return false;
            const idx = Number(target.closest('[data-index]')?.dataset.index);
            if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) return false;
            list.splice(idx, 1);
            const card = target.closest('.quest-card');
            renderObjectiveActions(card, obj, objIdx);
            return true;
        }

        function applySwitchField(target) {
            const quest = getCurrentQuest();
            if (!quest) return;
            const key = getQuestListKeyFromElement(target);
            const list = getListArrayByKey(quest, key);
            if (!Array.isArray(list)) return;
            const idx = Number(target.closest('[data-index]')?.dataset.index);
            if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) return;
            const row = list[idx];
            const field = target.dataset.switchField;
            if (!field) return;
            if (field === 'value') {
                row.value = target.value === 'true';
                return;
            }
            row[field] = Number(target.value || 0);
        }

        function applyVariableField(target) {
            const quest = getCurrentQuest();
            if (!quest) return;
            const key = getQuestListKeyFromElement(target);
            const list = getListArrayByKey(quest, key);
            if (!Array.isArray(list)) return;
            const idx = Number(target.closest('[data-index]')?.dataset.index);
            if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) return;
            const row = list[idx];
            const field = target.dataset.variableField;
            if (!field) return;
            if (field === 'op') {
                row.op = target.value || '+';
                return;
            }
            if (field === 'value') {
                row.value = Number(target.value || 0);
                return;
            }
            row[field] = Number(target.value || 0);
        }

        function removeMiniRow(target) {
            const quest = getCurrentQuest();
            if (!quest) return;
            if (removeObjectiveActionRow(target)) return;
            const key = getQuestListKeyFromElement(target);
            const list = getListArrayByKey(quest, key);
            if (!Array.isArray(list)) return;
            const idx = Number(target.closest('[data-index]')?.dataset.index);
            if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) return;
            list.splice(idx, 1);
            if (key === 'startSwitches' || key === 'switches') {
                renderSwitchList(target.closest('[data-quest-list]'), list, key);
            } else if (key === 'startVariables' || key === 'variables') {
                renderVariableList(target.closest('[data-quest-list]'), list, key);
            }
        }

        function addObjectiveAction(objIdx, listKey) {
            const quest = getCurrentQuest();
            if (!quest || !quest.objectives || !Array.isArray(quest.objectives)) return;
            if (!Number.isInteger(objIdx) || objIdx < 0 || objIdx >= quest.objectives.length) return;
            const obj = quest.objectives[objIdx];
            if (!Array.isArray(obj.switches)) obj.switches = [];
            if (!Array.isArray(obj.variables)) obj.variables = [];
            if (listKey === 'switches') {
                const defaultId = state.system.switches.length > 1 ? 1 : 0;
                obj.switches.push({ switchId: defaultId, value: true });
            } else if (listKey === 'variables') {
                const defaultId = state.system.variables.length > 1 ? 1 : 0;
                obj.variables.push({ variableId: defaultId, value: 0, op: '+' });
            }
            const card = dom.objectiveList?.querySelector(`.quest-card[data-index="${objIdx}"]`);
            if (card) {
                renderObjectiveActions(card, obj, objIdx);
            }
            updateObjectiveActionSelects();
        }

        function onAddStartSwitch() {
            addSwitch('startSwitches');
        }
        function onAddFinishSwitch() {
            addSwitch('switches');
        }
        function onAddStartVariable() {
            addVariable('startVariables');
        }
        function onAddFinishVariable() {
            addVariable('variables');
        }

        function collectFormToQuest() {
            const quest = state.currentIndex >= 0 ? state.quests[state.currentIndex] : null;
            if (!quest) return;
            quest.title = dom.title.value.trim() || '未命名任务';
            quest.giver = dom.giver.value.trim() || 'NPC';
            quest.category = dom.category.checked;
            quest.repeatable = dom.repeatable.checked;
            quest.difficulty = Number(dom.difficulty.value || 1);
            quest.description = collectDescription(dom.description ? dom.description.value : '');
        }

        function collectDescription(text) {
            const parts = text ? text.split(NL_REGEXP) : [];
            const arr = [];
            for (let i = 0; i < parts.length; i++) {
                const t = parts[i];
                if (!t) continue;
                const trimmed = t.trim();
                if (trimmed) arr.push(trimmed);
            }
            return arr;
        }

        function addRequirement() {
            const quest = getCurrentQuest();
            quest.requirements = quest.requirements || [];
            quest.requirements.push({ type: 0, description: '' });
            renderRequirementList(quest.requirements);
        }

        function addObjective() {
            const quest = getCurrentQuest();
            quest.objectives = quest.objectives || [];
            quest.objectives.push({ type: 1, enemyId: 1, targetValue: 1, calculateType: true, operator: '>=', description: '', switches: [], variables: [] });
            renderObjectiveList(quest.objectives);
        }

        function addReward() {
            const quest = getCurrentQuest();
            quest.rewards = quest.rewards || [];
            quest.rewards.push({ type: 4, targetValue: 100, description: '' });
            renderRewardList(quest.rewards);
        }

        function addSwitch(target) {
            const quest = getCurrentQuest();
            quest[target] = quest[target] || [];
            const defaultId = state.system.switches.length > 1 ? 1 : 0;
            quest[target].push({ switchId: defaultId, value: true });
            renderSwitchList(target === 'startSwitches' ? dom.startSwitchList : dom.finishSwitchList, quest[target]);
        }

        function addVariable(target) {
            const quest = getCurrentQuest();
            quest[target] = quest[target] || [];
            const defaultId = state.system.variables.length > 1 ? 1 : 0;
            quest[target].push({ variableId: defaultId, value: 0, op: '+' });
            renderVariableList(target === 'startVariables' ? dom.startVariableList : dom.finishVariableList, quest[target]);
        }

        function getCurrentQuest() {
            if (state.currentIndex < 0) return null;
            return state.quests[state.currentIndex];
        }

        function newQuest() {
            collectFormToQuest();
            const quest = DEFAULT_QUEST();
            state.quests.push(quest);
            state.currentIndex = state.quests.length - 1;
            renderQuestList();
            selectQuest(state.currentIndex);
        }

        async function deleteQuest() {
            if (state.currentIndex < 0) return;
            collectFormToQuest();
            const list = state.quests;
            list.splice(state.currentIndex, 1);
            state.currentIndex = Math.max(0, state.currentIndex - 1);
            renderQuestList();
            const quest = list[state.currentIndex];
            if (quest) bindQuestToForm(quest);
            await saveQuestFile();
        }

        async function saveQuestFile() {
            if (!state.questFilePath) return;
            const payload = [null, ...state.quests];
            await electronAPI.writeFile(state.questFilePath, JSON.stringify(payload, null, 2), 'utf-8');
            FileCacheManager.cache(state.questFilePath, state.questFilePath.split(TRANSFORM_REGEXP).pop() || 'Quests.json', payload);
            updateQuestDataStatus();
            syncQuestToCommonList();
        }

        async function loadQuestFile(filePath) {
            if (!filePath) return;
            try {
                const raw = await electronAPI.readFile(filePath, 'utf-8');
                const data = JSON.parse(raw);
                let quests = Array.isArray(data) ? data.slice(1) : [];
                if (!quests.length) quests = [DEFAULT_QUEST()];
                state.quests = quests;
                state.currentIndex = 0;
                renderQuestList();
                selectQuest(0);
                state.questFilePath = filePath;
                FileCacheManager.cache(filePath, filePath.split(TRANSFORM_REGEXP).pop() || 'Quests.json', data);
                updateQuestDataStatus();
                syncQuestToCommonList();
            } catch (err) {
                console.error(err)
            }
        }

        async function init(options) {
            state.dataPath = options.getDataDirectory?.() || options.dataPath || '';
            state.questFilePath = options.questFilePath !== undefined ? options.questFilePath : (state.dataPath ? `${state.dataPath}/Quests.json` : '');
            cacheDom(options.container);
            fillQuestDifficulty();
            bindEvents();
            bindDataLoaders();
            initQuestDataSelect();
            if (state.questFilePath) {
                await loadQuestFile(state.questFilePath);
            } else {
                renderQuestList();
            }
        }

        function syncQuestToCommonList() {
            // 将任务数据同步到通用列表（itemList），首位留空占位，与通用结构保持一致
            appState.currentData = [null, ...state.quests];
            appState.currentFileType = 'quest';
            displayItemList();
            markItemListActive(state.currentIndex + 1);
        }

        function handleCommonListSelect(idx) {
            // 通用列表首位为占位，实际数据从 1 开始
            const questIndex = idx - 1;
            if (questIndex < 0 || questIndex >= state.quests.length) return;
            selectQuest(questIndex);
        }
        const map = { enemy: 'enemy', actor: 'actor', weapon: 'weapon' };
        function onExternalDataLoaded(type, filePath) {
            const questKey = map[type];
            if (!questKey || !filePath) return;
            const cfg = QUEST_DATA_CONFIG[questKey];
            const cached = FileCacheManager.get(filePath);
            if (!cached || !cfg) return;
            state.questDataPaths[questKey] = filePath;
            applyLoadedQuestData(questKey, cached.data);
            const statusEl = document.getElementById(cfg.statusRef);
            if (statusEl) {
                const count = Math.max((cached.data?.length || 0) - 1, 0);
                const name = cached.fileName || filePath.split(TRANSFORM_REGEXP).pop() || filePath;
                statusEl.textContent = `${name} · ${count} 条`;
            }
            refreshSelectSources();
        }

        return {
            init,
            refreshSelectSources,
            loadQuestFile,
            handleCommonListSelect,
            syncQuestToCommonList,
            newQuest,
            deleteQuest,
            saveQuestFile,
            onExternalDataLoaded
        };
    })();
    // ===================== Quest Editor Inline End =====================

    // ===================== 任务编辑器状态与配置 =====================
    const QUEST_REQUIREMENT_TYPES = [
        { value: 0, label: '无要求' },
        { value: 1, label: '等级要求' },
        { value: 2, label: '前置任务' },
        { value: 3, label: '物品' },
        { value: 4, label: '武器' },
        { value: 5, label: '防具' },
        { value: 6, label: '开关' },
        { value: 7, label: '变量' },
        { value: 8, label: '金币' }
    ];
    const QUEST_OBJECTIVE_TYPES = [
        { value: 1, label: '击杀敌人' },
        { value: 2, label: '收集物品' },
        { value: 3, label: '收集武器' },
        { value: 4, label: '收集防具' },
        { value: 5, label: '开关值' },
        { value: 6, label: '变量值' },
        { value: 7, label: '收集金币' }
    ];
    const QUEST_REWARD_TYPES = [
        { value: 1, label: '物品' },
        { value: 2, label: '武器' },
        { value: 3, label: '防具' },
        { value: 4, label: '金币' },
        { value: 5, label: '经验值' },
        { value: 6, label: '开关' },
        { value: 7, label: '变量' }
    ];
    const QUEST_DIFFICULTIES = [
        { value: 1, label: '简单' },
        { value: 2, label: '普通' },
        { value: 3, label: '困难' },
        { value: 4, label: '专家' },
        { value: 5, label: '大师' }
    ];
    const QUEST_OPERATORS = ['>', '>=', '<', '<=', '===', '!=='];

    const DEFAULT_QUEST = () => ({
        title: '新的任务',
        giver: 'NPC',
        category: true,
        repeatable: false,
        startSwitches: [],
        startVariables: [],
        switches: [],
        variables: [],
        difficulty: 1,
        description: ['任务简介'],
        requirements: [],
        objectives: [
            { type: 1, enemyId: 1, targetValue: 1, calculateType: true, operator: '>=', description: '击败1个敌人', switches: [], variables: [] }
        ],
        rewards: [{ type: 4, targetValue: 100, description: '获得100金币' }]
    });
    const QUEST_DATA_CONFIG = {
        system: { label: '系统数据', defaultFile: 'System.json', statusRef: 'questSystemStatus', selectRef: 'questSystemFileSelect', loadRef: 'questSystemLoadBtn', pickRef: 'questSystemPickBtn' },
        item: { label: '物品数据', defaultFile: 'Items.json', statusRef: 'questItemStatus', selectRef: 'questItemFileSelect', loadRef: 'questItemLoadBtn', pickRef: 'questItemPickBtn' },
        weapon: { label: '武器数据', defaultFile: 'Weapons.json', statusRef: 'questWeaponStatus', selectRef: 'questWeaponFileSelect', loadRef: 'questWeaponLoadBtn', pickRef: 'questWeaponPickBtn' },
        armor: { label: '防具数据', defaultFile: 'Armors.json', statusRef: 'questArmorStatus', selectRef: 'questArmorFileSelect', loadRef: 'questArmorLoadBtn', pickRef: 'questArmorPickBtn' },
        enemy: { label: '敌人数据', defaultFile: 'Enemies.json', statusRef: 'questEnemyStatus', selectRef: 'questEnemyFileSelect', loadRef: 'questEnemyLoadBtn', pickRef: 'questEnemyPickBtn' },
        actor: { label: '角色数据', defaultFile: 'Actors.json', statusRef: 'questActorStatus', selectRef: 'questActorFileSelect', loadRef: 'questActorLoadBtn', pickRef: 'questActorPickBtn' }
    };

    //全局禁用管理器
    const DisabledManager = (() => {
        const disabledClass = 'ui-disabled';
        function apply(element, disabled) {
            if (!element) return;
            if ('disabled' in element) {
                element.disabled = disabled;
            }
            element.classList.toggle(disabledClass, disabled);
            element.style.cursor = disabled ? 'not-allowed' : '';
        }
        function applyBatch(nodeList, disabled) {
            if (!nodeList) return;
            const elements = Array.isArray(nodeList) ? nodeList : Array.from(nodeList);
            for (let i = 0; i < elements.length; i++) {
                apply(elements[i], disabled);
            }
        }
        return { apply, applyBatch };
    })();

    //统一编辑器状态管理器
    const EditorStateManager = (() => {
        const disabledClass = 'code-editor-disabled';
        const updateOptions = {
            readOnly: false,
            renderLineHighlight: 'all',
        }
        /**
         * 应用编辑器禁用状态
         * @param {monaco.editor.IStandaloneCodeEditor} editor - Monaco 编辑器实例
         * @param {boolean} readOnly - 是否只读
         * @param {HTMLElement} container - 可选的容器元素
         */
        function applyEditorState(editor, readOnly, container = null) {
            if (!editor) return;
            // 设置只读模式及光标显示
            updateOptions.readOnly = readOnly;
            updateOptions.renderLineHighlight = readOnly ? 'none' : 'all';
            editor.updateOptions(updateOptions);
            // 获取编辑器容器
            const domNode = editor.getDomNode();
            // domNode 是 .monaco-editor 元素，我们需要控制它的父容器或者它本身
            const wrapper = domNode ? domNode.parentElement : null;
            if (wrapper) {
                wrapper.classList.toggle(disabledClass, readOnly);
                // 移除内联样式，通过 CSS 类控制 overlay 和 pointer-events
                wrapper.style.pointerEvents = '';
                wrapper.style.opacity = '';
            }
            // 如果提供了额外容器，也应用样式
            if (container) {
                container.classList.toggle(disabledClass, readOnly);
            }
        }
        /**
         * 批量应用编辑器状态
         * @param {Array<{editor: any, container?: HTMLElement}>} editors - 编辑器配置数组
         * @param {boolean} readOnly - 是否只读
         */
        function applyBatch(editors, readOnly) {
            if (!Array.isArray(editors)) return;
            for (let i = 0; i < editors.length; i++) {
                const { editor, container } = editors[i];
                applyEditorState(editor, readOnly, container);
            }
        }
        return { apply: applyEditorState, applyBatch };
    })();

    // 文件缓存管理器
    const FileCacheManager = (() => {
        const MAX_CACHE_SIZE = 50; // 最大缓存文件数
        const cache = new Map(); // 存储缓存数据
        //使用双向链表实现 LRU,而不是数组
        class LRUNode {
            constructor() {
                this.reset();
            }
            init(key) {
                this.key = key;
            }
            reset() {
                this.key = null;
                this.prev = null;
                this.next = null;
            }
        }
        class PathDataItem {
            constructor() {
                this.reset();
            }
            reset() {
                this.path = String.empty;
                this.fileName = String.empty;
                this.timestamp = 0;
                this.data = null;
            }
            init(path, fileName, timestamp, data) {
                this.path = path;
                this.fileName = fileName;
                this.timestamp = timestamp;
                this.data = data;
            }
        }
        const Pool = Zaun.Core.PoolSystem.createPool('LRUNode', LRUNode, 100);
        const PathItemPool = Zaun.Core.PoolSystem.createPool('PathItem', PathDataItem, 100);
        //LRU 链表管理器
        const lru = {
            head: null,  // 最旧的项
            tail: null,  // 最新的项
            nodeMap: new Map(),  // key -> node 映射,O(1) 查找
            // 添加到尾部(最新)
            list: [],
            add(key) {
                const node = Pool.get();
                node.init(key);
                this.nodeMap.set(key, node);
                if (!this.tail) {
                    // 第一个节点
                    this.head = this.tail = node;
                } else {
                    // 添加到尾部
                    this.tail.next = node;
                    node.prev = this.tail;
                    this.tail = node;
                }
                return node;
            },
            // 移除节点
            remove(key) {
                const node = this.nodeMap.get(key);
                if (!node) return;
                if (node.prev) node.prev.next = node.next;
                if (node.next) node.next.prev = node.prev;
                if (node === this.head) this.head = node.next;
                if (node === this.tail) this.tail = node.prev;
                this.nodeMap.delete(key);
                Pool.return(node);
            },
            // 移动到尾部(标记为最新访问)
            moveToTail(key) {
                this.remove(key);
                this.add(key);
            },
            // 移除头部(最旧的项)
            removeHead() {
                if (!this.head) return null;
                const key = this.head.key;
                this.remove(key);
                return key;
            },
            // 获取所有 key(从新到旧)
            getAllKeys() {
                const keys = this.list.clear();
                let current = this.tail;
                let i = 0;
                while (current) {
                    keys[i++] = current.key;
                    current = current.prev;
                }
                return keys;
            },
            // 清空
            clear() {
                this.head = null;
                this.tail = null;
                const map = this.nodeMap;
                map.forEach(this.onForEach);
                this.nodeMap.clear();
            },
            onForEach(node) {
                Pool.return(node);
            }
        };
        /**
         * 缓存文件数据
         * @param {string} filePath - 文件路径（作为键）
         * @param {string} fileName - 文件名
         * @param {Array} data - 文件数据
         */
        function cacheFile(filePath, fileName, data) {
            if (!filePath || !data) return;
            // 如果已存在,更新访问顺序
            if (cache.has(filePath)) {
                lru.moveToTail(filePath);  //O(1) 操作
                const old = cache.get(filePath);
                old.init(filePath, fileName, Date.now(), data);
                return;
            }
            // 如果缓存已满,移除最久未访问的项
            if (cache.size >= MAX_CACHE_SIZE) {
                const oldestPath = lru.removeHead();  //O(1) 操作
                if (oldestPath) {
                    const item = cache.get(oldestPath);
                    if (item) {
                        PathItemPool.return(item);
                    }
                    cache.delete(oldestPath);
                }
            }
            const item = PathItemPool.get();
            item.init(filePath, fileName, Date.now(), data);
            // 添加新缓存
            cache.set(filePath, item);
            lru.add(filePath);  //O(1) 操作
        }
        /**
         * 从缓存获取文件数据
         * @param {string} filePath - 文件路径
         * @returns {Object|null} 缓存数据或 null
         */
        function getCachedFile(filePath) {
            if (!filePath || !cache.has(filePath)) {
                return null;
            }
            lru.moveToTail(filePath);  //O(1) 操作
            return cache.get(filePath);
        }
        /**
         * 获取所有缓存的文件列表
         * @returns {Array<{path: string, fileName: string, timestamp: number}>}
         */
        function getCachedFilesList() {
            const keys = lru.getAllKeys();  //已经是从新到旧排序
            const list = new Array(keys.length);
            for (let i = 0; i < keys.length; i++) {
                const path = keys[i];
                const value = cache.get(path);
                if (value) {
                    list[i] = {
                        path,
                        fileName: value.fileName,
                        timestamp: value.timestamp
                    }
                }
            }
            return list;
        }
        /**
         * 移除缓存
         * @param {string} filePath - 文件路径
         */
        function removeCache(filePath) {
            if (cache.has(filePath)) {
                cache.delete(filePath);
                lru.remove(filePath);  // ✅ O(1) 操作
            }
        }
        /**
         * 清空所有缓存
         */
        function clearCache() {
            cache.clear();
            lru.clear();
        }
        return {
            cache: cacheFile,
            get: getCachedFile,
            list: getCachedFilesList,
            remove: removeCache,
            clear: clearCache
        };
    })();
    // ===== 输入对话框函数 =====
    //优化：减少闭包和监听器，使用缓存的 DOM 元素和事件委托
    let inputTimeout = 0;
    function callInput() {
        const inputEl = DOM.inputDialogInput;
        if (!inputEl) return;
        inputEl.focus();
        inputEl.select();
        if (inputTimeout) {
            clearTimeout(inputTimeout);
            inputTimeout = 0;
        }
    }
    const inputState = {
        title: String.empty,
        message: String.empty,
        defaultValue: String.empty,
        resolve: null,
    }
    const inputPromise = function (resolve) {
        const { inputDialog, inputDialogTitle, inputDialogMessage, inputDialogInput, inputDialogConfirm, inputDialogCancel } = DOM;
        // 保存 resolve 函数供事件处理器使用
        inputState.resolve = resolve;
        // 设置对话框内容
        inputDialogTitle.textContent = inputState.title;
        inputDialogMessage.textContent = inputState.message;
        inputDialogInput.value = inputState.defaultValue;
        // 修复 Bug 2：确保输入框不是禁用状态
        inputDialogInput.disabled = false;
        inputDialogInput.removeAttribute('readonly');
        // 显示对话框
        inputDialog.classList.remove('hidden');
        // 修复 Bug 2：使用 setTimeout 确保 DOM 已渲染后再设置焦点
        clearTimeout(inputTimeout);
        inputTimeout = setTimeout(callInput, 50);
        // 重新绑定事件监听器（仅在显示时）
        inputDialogConfirm.onclick = handleDialogConfirm;
        inputDialogCancel.onclick = handleDialogCancel;
        inputDialogInput.onkeypress = handleDialogKeyPress;
    }
    function showInputDialog(title, message, defaultValue = '') {
        inputState.title = title;
        inputState.message = message;
        inputState.defaultValue = defaultValue;
        return new Promise(inputPromise);
    }

    // 优化：共享的事件处理函数
    function handleDialogConfirm() {
        const { inputDialog, inputDialogInput, inputDialogConfirm, inputDialogCancel } = DOM;
        if (inputState.resolve) {
            const value = inputDialogInput.value.trim() || null;
            // 清理事件和状态
            inputDialogConfirm.onclick = null;
            inputDialogCancel.onclick = null;
            inputDialogInput.onkeypress = null;
            inputDialogInput.value = '';
            inputDialogInput.disabled = true;
            inputDialogInput.setAttribute('readonly', 'readonly');
            inputDialog.classList.add('hidden');
            if (inputTimeout) {
                clearTimeout(inputTimeout);
                inputTimeout = 0;
            }
            inputState.resolve(value);
            inputState.resolve = null;
        }
    }

    function handleDialogCancel() {
        const { inputDialog, inputDialogConfirm, inputDialogCancel, inputDialogInput } = DOM;
        if (inputState.resolve) {
            // 清理事件和状态
            inputDialogConfirm.onclick = null;
            inputDialogCancel.onclick = null;
            inputDialogInput.onkeypress = null;
            inputDialogInput.value = '';
            inputDialogInput.disabled = true;
            inputDialogInput.setAttribute('readonly', 'readonly');
            inputDialog.classList.add('hidden');
            if (inputTimeout) {
                clearTimeout(inputTimeout);
                inputTimeout = 0;
            }
            inputState.resolve(null);
            inputState.resolve = null;
        }
    }

    function handleDialogKeyPress(e) {
        if (e.key === 'Enter') {
            handleDialogConfirm();
        } else if (e.key === 'Escape') {
            handleDialogCancel();
        }
    }

    // ===== 初始化 =====
    document.addEventListener('DOMContentLoaded', async () => {
        DOM.init();  // 首先缓存所有 DOM 元素
        initializePropertyPanel();
        initializeNotePanel();
        initializeProjectilePanel();
        initializeHistoryFilesDialog();
        attachEventListeners();
        await loadConfig();
        initializeCodeEditor();
        listenMenuEvents();
        await ensurePathsConfigured();
        await ensureQuestEditorReady().catch(() => { /* 初始化失败忽略，切换模式时再提示 */ });
        // 初始化时检查文件状态，如果没有文件则显示空状态
        if (!hasFileLoaded()) {
            showEmptyState();
        } else {
            switchMode('script');
        }
    });


    function initializePropertyPanel() {
        appState.propertyPanelElement = DOM.propertyModePanel;
        if (!appState.propertyPanelElement) return;

        const baseGrid = DOM.propertyBaseGrid;
        if (baseGrid) {
            for (let i = 0; i < baseAttributes.length; i++) {
                const attr = baseAttributes[i];
                const field = document.createElement('div');
                field.className = 'property-field';
                const label = document.createElement('label');
                label.className = 'attribute-label';
                label.textContent = attr.label;
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'attribute-input';
                input.placeholder = '整数';
                input.step = '1';
                input.inputMode = 'numeric';
                input.dataset.attr = attr.key;
                field.appendChild(label);
                field.appendChild(input);
                baseGrid.appendChild(field);
                appState.attributeInputs[attr.key] = input;

                const floatField = document.createElement('div');
                floatField.className = 'property-field';
                const floatLabel = document.createElement('label');
                floatLabel.className = 'attribute-label';
                floatLabel.textContent = `${attr.label} 波动`;
                const floatInput = document.createElement('input');
                floatInput.type = 'number';
                floatInput.className = 'attribute-input';
                floatInput.placeholder = '整数';
                floatInput.step = '1';
                floatInput.inputMode = 'numeric';
                floatInput.dataset.attrFloat = attr.key;
                floatField.appendChild(floatLabel);
                floatField.appendChild(floatInput);
                baseGrid.appendChild(floatField);
                appState.attributeFloatInputs[attr.key] = floatInput;
            }
        }
        appState.customPropertyList = DOM.customAttributeList;
        appState.propertyStatusElement = DOM.propertyModeSubtitle;

        // 优化：属性面板按钮（仅绑定一次）
        if (DOM.savePropertiesBtn && !DOM.savePropertiesBtn.onclick) {
            DOM.savePropertiesBtn.onclick = savePropertyDefinition;
        }
        if (!DOM.saveCustomPropertyBtn) {
            // 动态创建自定义属性保存按钮，避免旧布局缺失
            const btn = document.createElement('button');
            btn.id = 'saveCustomPropertyBtn';
            btn.className = 'save-btn';
            // 缩短文案以保持按钮宽度
            btn.textContent = '保存自定义';
            const anchor = DOM.addCustomPropertyBtn || appState.customPropertyList;
            if (anchor && anchor.parentNode) {
                anchor.parentNode.insertBefore(btn, anchor.nextSibling);
            } else if (DOM.propertyModePanel) {
                DOM.propertyModePanel.appendChild(btn);
            }
            DOM.saveCustomPropertyBtn = btn;
        }
        if (DOM.saveCustomPropertyBtn && !DOM.saveCustomPropertyBtn.onclick) {
            DOM.saveCustomPropertyBtn.onclick = saveCustomProperties;
        }
        if (DOM.addCustomPropertyBtn && !DOM.addCustomPropertyBtn.onclick) {
            DOM.addCustomPropertyBtn.onclick = () => addCustomPropertyRow();
        }

        // 优化：为自定义属性列表添加事件委托（仅绑定一次），统一处理删除按钮点击
        if (appState.customPropertyList && !appState.customPropertyList.__customListenerAdded) {
            appState.customPropertyList.addEventListener('click', handleCustomPropertyDelete);
            appState.customPropertyList.__customListenerAdded = true;
        }

        renderPropertyPanel();
    }

    // ===== Note面板初始化 =====
    function initializeNotePanel() {
        if (!DOM.noteModePanel || !DOM.noteEditor) return;
        // 优化：note面板按钮（仅绑定一次）
        if (DOM.saveNoteBtn && !DOM.saveNoteBtn.onclick) {
            DOM.saveNoteBtn.onclick = saveNote;
        }
        if (DOM.saveDescriptionBtn && !DOM.saveDescriptionBtn.onclick) {
            DOM.saveDescriptionBtn.onclick = saveDescription;
        }
        renderNotePanel();
    }
    const projectilePreview = {
        engine: null,
        spriteset: null,
        container: null,
        emitterSprite: null,
        targetSprite: null
    };

    function initializeProjectilePanel() {
        if (!DOM.projectileModePanel) return;
        populateProjectileFileSelects();
        for (const [type, config] of Object.entries(PROJECTILE_DATA_CONFIG)) {
            const loadBtn = DOM[config.loadBtnRef];
            if (loadBtn && !loadBtn.onclick) {
                loadBtn.onclick = () => handleProjectileLoad(type);
            }
            const pickBtn = DOM[config.pickBtnRef];
            if (pickBtn && !pickBtn.onclick) {
                pickBtn.onclick = () => handleProjectilePick(type);
            }
            setProjectileStatus(type, '尚未加载');
        }
        if (DOM.projectileCreateTemplateBtn && !DOM.projectileCreateTemplateBtn.onclick) {
            DOM.projectileCreateTemplateBtn.onclick = createProjectileTemplate;
        }
        if (DOM.projectileDeleteTemplateBtn && !DOM.projectileDeleteTemplateBtn.onclick) {
            DOM.projectileDeleteTemplateBtn.onclick = () => deleteProjectileTemplate(appState.projectileSelectedTemplateIndex || 1);
        }
        if (DOM.projectileSaveTemplateBtn && !DOM.projectileSaveTemplateBtn.onclick) {
            DOM.projectileSaveTemplateBtn.onclick = saveProjectileTemplate;
        }
        if (DOM.projectilePlayTestBtn && !DOM.projectilePlayTestBtn.onclick) {
            DOM.projectilePlayTestBtn.onclick = handleProjectilePlayTest;
        }
        bindProjectileRoleSelectors();
        bindProjectileOffsetListeners();
        setupProjectileSegmentControls();
        populateAnimationSelects();
    }

    function populateProjectileFileSelects() {
        const keys = Object.keys(PROJECTILE_DATA_CONFIG);
        for (let i = 0; i < keys.length; i++) {
            const type = keys[i];
            const config = PROJECTILE_DATA_CONFIG[type];
            const select = DOM[config.selectRef];
            if (!select) continue;
            recycleOptions(select);
            const fragment = document.createDocumentFragment();
            const optionPool = getOptionPool();
            const defaultOption = optionPool.get();
            bindPoolItem(defaultOption.element, defaultOption);
            defaultOption.element.value = config.defaultFile;
            defaultOption.element.textContent = config.defaultFile;
            fragment.appendChild(defaultOption.element);
            const custom = appState.projectileCustomFiles[type];
            if (custom) {
                const customOption = optionPool.get();
                bindPoolItem(customOption.element, customOption);
                customOption.element.value = custom.path;
                customOption.element.textContent = `${custom.label} (自定义)`;
                fragment.appendChild(customOption.element);
                select.value = custom.path;
            } else {
                select.value = config.defaultFile;
            }
            select.appendChild(fragment);
        }
    }

    function getProjectileDataArray(type) {
        const path = appState.projectileDataPaths?.[type];
        if (!path) return null;
        const cached = FileCacheManager.get(path);
        if (!cached || !Array.isArray(cached.data)) {
            return null;
        }
        return cached.data;
    }

    function populateProjectileCharacterSelects() {
        populateCharacterList(DOM.projectileActorSelect, getProjectileDataArray('actor'));
        populateCharacterList(DOM.projectileEnemySelect, getProjectileDataArray('enemy'));
        populateCharacterList(DOM.projectileEmitterCharacterSelect, getProjectileDataArray(DOM.projectileEmitterRoleSelect?.value || 'actor'));
        populateCharacterList(DOM.projectileTargetCharacterSelect, getProjectileDataArray(DOM.projectileTargetRoleSelect?.value || 'actor'));
        populateWeaponList();
        populateSkillList();
        populateAnimationSelects();
    }

    // Option类用于对象池
    class OptionElement {
        constructor() {
            this.element = document.createElement('option');
        }
        reset() {
            const element = this.element;
            if (element) {
                element.__poolItem = null;
            }
            element.value = '';
            element.textContent = '';
            element.selected = false;
        }
        destroy() {
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            this.element = null;
        }
    }

    // DOM元素类用于对象池
    class DivElement {
        constructor() {
            this.element = document.createElement('div');
        }
        reset() {
            const element = this.element;
            if (element) {
                element.__poolItem = null;
            }
            element.className = '';
            element.textContent = '';
            element.dataset.index = '';
        }
        destroy() {
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            this.element = null;
        }
    }

    class LabelElement {
        constructor() {
            this.element = document.createElement('label');
        }
        reset() {
            const element = this.element;
            if (element) {
                element.__poolItem = null;
            }
            element.textContent = '';
            element.className = '';
        }
        destroy() {
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            this.element = null;
        }
    }

    class InputElement {
        constructor() {
            this.element = document.createElement('input');
        }
        reset() {
            const element = this.element;
            if (element) {
                element.__poolItem = null;
            }
            element.value = '';
            element.type = 'text';
            element.className = '';
            element.dataset.field = '';
            element.min = '';
        }
        destroy() {
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            this.element = null;
        }
    }

    class SelectElement {
        constructor() {
            this.element = document.createElement('select');
        }
        reset() {
            const element = this.element;
            if (element) {
                element.__poolItem = null;
            }
            element.className = '';
            element.value = '';
            element.dataset.index = '';
            element.innerHTML = '';
        }
        destroy() {
            if (this.element?.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            this.element = null;
        }
    }

    class ButtonElement {
        constructor() {
            this.element = document.createElement('button');
        }
        reset() {
            const element = this.element;
            if (element) {
                element.__poolItem = null;
            }
            element.textContent = '';
            element.className = '';
            element.type = 'button';
            element.onclick = null;
        }
        destroy() {
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            this.element = null;
        }
    }

    let OptionPool = null;
    function getOptionPool() {
        if (!OptionPool) {
            const { createPool } = Zaun.Core.PoolSystem;
            OptionPool = createPool('OptionElement', OptionElement, 100);
        }
        return OptionPool;
    }

    let DivPool = null;
    function getDivPool() {
        if (!DivPool) {
            const { createPool } = Zaun.Core.PoolSystem;
            DivPool = createPool('DivElement', DivElement, 50);
        }
        return DivPool;
    }

    let LabelPool = null;
    function getLabelPool() {
        if (!LabelPool) {
            const { createPool } = Zaun.Core.PoolSystem;
            LabelPool = createPool('LabelElement', LabelElement, 50);
        }
        return LabelPool;
    }

    let InputPool = null;
    function getInputPool() {
        if (!InputPool) {
            const { createPool } = Zaun.Core.PoolSystem;
            InputPool = createPool('InputElement', InputElement, 50);
        }
        return InputPool;
    }

    let SelectPool = null;
    function getSelectPool() {
        if (!SelectPool) {
            const { createPool } = Zaun.Core.PoolSystem;
            SelectPool = createPool('SelectElement', SelectElement, 50);
        }
        return SelectPool;
    }

    let ButtonPool = null;
    function getButtonPool() {
        if (!ButtonPool) {
            const { createPool } = Zaun.Core.PoolSystem;
            ButtonPool = createPool('ButtonElement', ButtonElement, 20);
        }
        return ButtonPool;
    }

    // ===== 对象池辅助：绑定与回收 =====
    function bindPoolItem(element, poolItem) {
        if (element && poolItem) {
            element.__poolItem = poolItem;
        }
    }

    function recyclePoolItem(item) {
        if (!item) return;
        const ctor = item.constructor;
        if (ctor === OptionElement) {
            getOptionPool().return(item);
        } else if (ctor === DivElement) {
            getDivPool().return(item);
        } else if (ctor === LabelElement) {
            getLabelPool().return(item);
        } else if (ctor === InputElement) {
            getInputPool().return(item);
        } else if (ctor === SelectElement) {
            getSelectPool().return(item);
        } else if (ctor === ButtonElement) {
            getButtonPool().return(item);
        }
    }

    function recyclePoolNode(node) {
        if (!node) return;
        const item = node.__poolItem;
        if (!item) return;
        node.__poolItem = null;
        recyclePoolItem(item);
    }

    function recycleOptions(select) {
        if (!select) return;
        const children = Array.from(select.children);
        for (let i = 0; i < children.length; i++) {
            recyclePoolNode(children[i]);
        }
        select.innerHTML = '';
    }

    function recyclePoolTree(root) {
        if (!root) return;
        const nodes = root.querySelectorAll('*');
        for (let i = 0; i < nodes.length; i++) {
            recyclePoolNode(nodes[i]);
        }
        recyclePoolNode(root);
        root.innerHTML = '';
    }

    function populateCharacterList(select, data) {
        if (!select) return;
        recycleOptions(select);
        const pool = getOptionPool();
        const fragment = document.createDocumentFragment();
        if (!data) {
            const optionObj = pool.get();
            bindPoolItem(optionObj.element, optionObj);
            optionObj.element.value = '';
            optionObj.element.textContent = '未加载';
            fragment.appendChild(optionObj.element);
            select.appendChild(fragment);
            return;
        }
        for (let i = 1; i < data.length; i++) {
            const entry = data[i];
            if (!entry) continue;
            const optionObj = pool.get();
            bindPoolItem(optionObj.element, optionObj);
            const id = entry.id ?? i;
            optionObj.element.value = id;
            optionObj.element.textContent = `${id} · ${entry.name || entry.battlerName || '未命名'}`;
            fragment.appendChild(optionObj.element);
        }
        select.appendChild(fragment);
    }

    function populateWeaponList() {
        const select = DOM.projectileWeaponOffsetSelect;
        const data = getProjectileDataArray('weapon');
        if (!select) return;
        recycleOptions(select);
        const pool = getOptionPool();
        const fragment = document.createDocumentFragment();
        if (!data) {
            const optionObj = pool.get();
            bindPoolItem(optionObj.element, optionObj);
            optionObj.element.value = '';
            optionObj.element.textContent = '未加载';
            fragment.appendChild(optionObj.element);
            select.appendChild(fragment);
            return;
        }
        for (let i = 1; i < data.length; i++) {
            const weapon = data[i];
            if (!weapon) continue;
            const optionObj = pool.get();
            bindPoolItem(optionObj.element, optionObj);
            const id = weapon.id ?? i;
            optionObj.element.value = id;
            optionObj.element.textContent = `${id} · ${weapon.name || '未命名'}`;
            fragment.appendChild(optionObj.element);
        }
        select.appendChild(fragment);
    }

    function populateSkillList() {
        const select = DOM.projectileSkillSelect;
        const data = getProjectileDataArray('skill');
        if (!select) return;
        recycleOptions(select);
        const pool = getOptionPool();
        const fragment = document.createDocumentFragment();
        if (!data) {
            const optionObj = pool.get();
            bindPoolItem(optionObj.element, optionObj);
            optionObj.element.value = '';
            optionObj.element.textContent = '未加载';
            fragment.appendChild(optionObj.element);
            select.appendChild(fragment);
            return;
        }
        for (let i = 1; i < data.length; i++) {
            const skill = data[i];
            if (!skill) continue;
            const optionObj = pool.get();
            bindPoolItem(optionObj.element, optionObj);
            const id = skill.id ?? i;
            optionObj.element.value = id;
            optionObj.element.textContent = `${id} · ${skill.name || '未命名'}`;
            fragment.appendChild(optionObj.element);
        }
        select.appendChild(fragment);
    }

    function populateAnimationSelect(targetSelect) {
        if (!targetSelect) return;
        recycleOptions(targetSelect);
        const data = getProjectileDataArray('animation');
        const fragment = document.createDocumentFragment();
        const optionPool = getOptionPool();
        const empty = optionPool.get();
        bindPoolItem(empty.element, empty);
        empty.element.value = '';
        empty.element.textContent = data ? '选择动画' : '未加载';
        fragment.appendChild(empty.element);
        if (data) {
            for (let i = 1; i < data.length; i++) {
                const anim = data[i];
                if (!anim) continue;
                const optionObj = optionPool.get();
                bindPoolItem(optionObj.element, optionObj);
                const id = anim.id ?? i;
                optionObj.element.value = id;
                optionObj.element.textContent = `${id} · ${anim.name || '未命名动画'}`;
                fragment.appendChild(optionObj.element);
            }
        }
        targetSelect.appendChild(fragment);
    }

    function populateAnimationSelects() {
        populateAnimationSelect(DOM.projectileStartAnimationSelect);
        populateAnimationSelect(DOM.projectileLaunchAnimationSelect);
        populateAnimationSelect(DOM.projectileEndAnimationSelect);
    }

    function findProjectileEntryById(dataArray, id) {
        if (!Array.isArray(dataArray)) return null;
        const numId = Number(id);
        if (!numId || numId < 1 || numId >= dataArray.length) return null;
        return dataArray[numId] || null;
    }

    function refreshActorOffsetInputs() {
        if (!DOM.projectileActorOffsetX || !DOM.projectileActorOffsetY) return;
        const actorId = Number(DOM.projectileActorSelect?.value) || 0;
        const weaponId = Number(DOM.projectileWeaponOffsetSelect?.value) || 0;
        const weaponData = getProjectileDataArray('weapon');
        if (weaponData === null) {
            DOM.projectileActorOffsetX.value = 0;
            DOM.projectileActorOffsetY.value = 0;
            return;
        }
        const weapon = weaponData[weaponId];
        if (!weapon) {
            DOM.projectileActorOffsetX.value = 0;
            DOM.projectileActorOffsetY.value = 0;
            return;
        }
        const wtypeId = weapon.wtypeId;
        const actorData = getProjectileDataArray('actor');
        if (actorData === null) {
            DOM.projectileActorOffsetX.value = 0;
            DOM.projectileActorOffsetY.value = 0;
            return;
        }
        const actor = findProjectileEntryById(actorData, actorId);
        const offset = actor?.projectileOffset?.[wtypeId] ?? emptyPoint;
        DOM.projectileActorOffsetX.value = offset.x ?? 0;
        DOM.projectileActorOffsetY.value = offset.y ?? 0;
    }

    function refreshEnemyOffsetInputs() {
        if (!DOM.projectileEnemyOffsetX || !DOM.projectileEnemyOffsetY) return;
        const enemyId = Number(DOM.projectileEnemySelect?.value) || 0;
        const skillId = Number(DOM.projectileSkillSelect?.value) || 0;
        const enemyData = getProjectileDataArray('enemy');
        if (enemyData === null) {
            DOM.projectileEnemyOffsetX.value = 0;
            DOM.projectileEnemyOffsetY.value = 0;
            return;
        }
        const enemy = findProjectileEntryById(enemyData, enemyId);
        const offset = enemy?.projectileOffset?.[skillId] ?? { x: 0, y: 0 };
        DOM.projectileEnemyOffsetX.value = offset.x ?? 0;
        DOM.projectileEnemyOffsetY.value = offset.y ?? 0;
    }

    async function saveProjectileJsonResource(type, dataArray) {
        if (!type) return;
        const resource = appState.projectileResources[type];
        if (!resource || !resource.filePath) {
            throw new Error('未找到数据文件路径');
        }
        await electronAPI.writeFile(resource.filePath, JSON.stringify(dataArray, null, 2), 'utf-8');
        updateStatus(`✅ ${resource.fileName || type} 已保存`);
    }

    async function handleSaveActorOffset() {
        const actorId = Number(DOM.projectileActorSelect?.value) || 0;
        const weaponId = Number(DOM.projectileWeaponOffsetSelect?.value) || 0;
        if (!actorId || !weaponId) {
            showError('请选择角色和武器');
            return;
        }
        const actors = getProjectileDataArray('actor');
        if (!actors) {
            showError('角色数据未加载');
            return;
        }
        const actor = findProjectileEntryById(actors, actorId);
        if (!actor) {
            showError('未找到角色');
            return;
        }
        const weapon = getProjectileDataArray('weapon')[weaponId];
        if (!weapon) {
            showError('未找到武器');
            return;
        }
        const wtypeId = weapon.wtypeId;
        const offsetX = Number(DOM.projectileActorOffsetX?.value) || 0;
        const offsetY = Number(DOM.projectileActorOffsetY?.value) || 0;
        if (!actor.projectileOffset || typeof actor.projectileOffset !== 'object') {
            actor.projectileOffset = {};
        }
        let projectileOffset = actor.projectileOffset;
        if (!projectileOffset) {
            projectileOffset = actor.projectileOffset = {};
        }
        let offset = projectileOffset[wtypeId];
        if (!offset) {
            offset = projectileOffset[wtypeId] = { x: 0, y: 0 };
        }
        offset.x = offsetX;
        offset.y = offsetY;
        try {
            await saveProjectileJsonResource('actor', actors);
        } catch (error) {
            showError('保存角色偏移失败: ' + error.message);
        }
    }

    async function handleSaveEnemyOffset() {
        const enemyId = Number(DOM.projectileEnemySelect?.value) || 0;
        const skillId = Number(DOM.projectileSkillSelect?.value) || 0;
        if (!enemyId || !skillId) {
            showError('请选择敌人和技能');
            return;
        }
        const enemies = getProjectileDataArray('enemy');
        if (!enemies) {
            showError('敌人数据未加载');
            return;
        }
        const enemy = findProjectileEntryById(enemies, enemyId);
        if (!enemy) {
            showError('未找到敌人');
            return;
        }
        const offsetX = Number(DOM.projectileEnemyOffsetX?.value) || 0;
        const offsetY = Number(DOM.projectileEnemyOffsetY?.value) || 0;
        let projectileOffset = enemy.projectileOffset;
        if (!projectileOffset) {
            projectileOffset = enemy.projectileOffset = {};
        }
        let offset = projectileOffset[skillId];
        if (!offset) {
            offset = projectileOffset[skillId] = { x: 0, y: 0 };
        }
        offset.x = offsetX;
        offset.y = offsetY;
        try {
            await saveProjectileJsonResource('enemy', enemies);
        } catch (error) {
            showError('保存敌人偏移失败: ' + error.message);
        }
    }

    function bindProjectileRoleSelectors() {
        if (DOM.projectileEmitterRoleSelect) {
            DOM.projectileEmitterRoleSelect.onchange = () => populateCharacterList(
                DOM.projectileEmitterCharacterSelect,
                getProjectileDataArray(DOM.projectileEmitterRoleSelect.value)
            );
        }
        if (DOM.projectileTargetRoleSelect) {
            DOM.projectileTargetRoleSelect.onchange = () => populateCharacterList(
                DOM.projectileTargetCharacterSelect,
                getProjectileDataArray(DOM.projectileTargetRoleSelect.value)
            );
        }
    }

    function bindProjectileOffsetListeners() {
        if (DOM.projectileActorSelect && !DOM.projectileActorSelect.onchange) {
            DOM.projectileActorSelect.onchange = refreshActorOffsetInputs;
        }
        if (DOM.projectileWeaponOffsetSelect && !DOM.projectileWeaponOffsetSelect.onchange) {
            DOM.projectileWeaponOffsetSelect.onchange = refreshActorOffsetInputs;
        }
        if (DOM.projectileEnemySelect && !DOM.projectileEnemySelect.onchange) {
            DOM.projectileEnemySelect.onchange = refreshEnemyOffsetInputs;
        }
        if (DOM.projectileSkillSelect && !DOM.projectileSkillSelect.onchange) {
            DOM.projectileSkillSelect.onchange = refreshEnemyOffsetInputs;
        }
        if (DOM.projectileActorOffsetSaveBtn && !DOM.projectileActorOffsetSaveBtn.onclick) {
            DOM.projectileActorOffsetSaveBtn.onclick = handleSaveActorOffset;
        }
        if (DOM.projectileEnemyOffsetSaveBtn && !DOM.projectileEnemyOffsetSaveBtn.onclick) {
            DOM.projectileEnemyOffsetSaveBtn.onclick = handleSaveEnemyOffset;
        }
    }

    function setupProjectileSegmentControls() {
        if (!DOM.projectileSegmentList) return;
        if (DOM.projectileAddSegmentBtn && !DOM.projectileAddSegmentBtn.onclick) {
            DOM.projectileAddSegmentBtn.onclick = addProjectileSegment;
        }
        if (DOM.projectileClearSegmentsBtn && !DOM.projectileClearSegmentsBtn.onclick) {
            DOM.projectileClearSegmentsBtn.onclick = function clearSegments() {
                appState.projectileSegments = [];
                renderProjectileSegments();
            };
        }
        if (!DOM.projectileSegmentList.onclick) {
            DOM.projectileSegmentList.onclick = handleSegmentListClick;
        }
        if (!DOM.projectileSegmentList.onchange) {
            DOM.projectileSegmentList.onchange = handleSegmentListChange;
        }
        renderProjectileSegments();
    }

    function handleSegmentListClick(event) {
        const target = event.target;
        if (!target || target.className !== 'action-btn tiny secondary' || target.textContent !== '删除') return;
        const item = target.closest('.projectile-segment-item');
        if (!item) return;
        const index = Number(item.dataset.index);
        if (isNaN(index) || index < 0 || index >= appState.projectileSegments.length) return;
        appState.projectileSegments.splice(index, 1);
        renderProjectileSegments();
    }

    function handleSegmentListChange(event) {
        const target = event.target;
        if (!target) return;
        const item = target.closest('.projectile-segment-item');
        if (!item) return;
        const index = Number(item.dataset.index);
        if (isNaN(index) || index < 0 || index >= appState.projectileSegments.length) return;
        const segment = appState.projectileSegments[index];
        if (!segment) return;
        if (target.tagName === 'INPUT' && target.type === 'number') {
            const key = target.dataset.field;
            if (key && (key === 'targetX' || key === 'targetY' || key === 'duration')) {
                segment[key] = Number(target.value) || 0;
            }
        } else if (target.tagName === 'SELECT') {
            const key = target.dataset.field;
            if (key && (key === 'easeX' || key === 'easeY')) {
                segment[key] = target.value || 'linear';
            }
        }
    }

    function ensureProjectileSegments() {
        if (!appState.projectileSegments || appState.projectileSegments.length === 0) {
            appState.projectileSegments = [{ ...PROJECTILE_DEFAULT_SEGMENT }];
        }
    }

    function addProjectileSegment() {
        appState.projectileSegments.push({ ...PROJECTILE_DEFAULT_SEGMENT });
        renderProjectileSegments();
    }

    const fields = [
        { key: 'targetX', label: '目标X', type: 'number' },
        { key: 'targetY', label: '目标Y', type: 'number' },
        { key: 'duration', label: '帧数', type: 'number' }
    ];
    function renderProjectileSegments() {
        ensureProjectileSegments();
        if (!DOM.projectileSegmentList) return;
        recyclePoolTree(DOM.projectileSegmentList);
        const optionPool = getOptionPool();
        const divPool = getDivPool();
        const labelPool = getLabelPool();
        const inputPool = getInputPool();
        const buttonPool = getButtonPool();
        const fragment = document.createDocumentFragment();
        const projectileSegments = appState.projectileSegments;
        for (let i = 0; i < projectileSegments.length; i++) {
            const segment = projectileSegments[i];
            const itemObj = divPool.get();
            const item = itemObj.element;
            bindPoolItem(item, itemObj);
            item.className = 'projectile-segment-item';
            item.dataset.index = i;
            for (let j = 0; j < fields.length; j++) {
                const field = fields[j];
                const labelObj = labelPool.get();
                const label = labelObj.element;
                bindPoolItem(label, labelObj);
                label.textContent = field.label;
                const inputObj = inputPool.get();
                const input = inputObj.element;
                bindPoolItem(input, inputObj);
                input.type = field.type;
                input.value = segment[field.key] ?? '';
                input.min = '0';
                input.dataset.field = field.key;
                label.appendChild(input);
                item.appendChild(label);
            }
            const easeXLabelObj = labelPool.get();
            const easeXLabel = easeXLabelObj.element;
            bindPoolItem(easeXLabel, easeXLabelObj);
            easeXLabel.textContent = 'X 缓动';
            const easeXObj = getSelectPool().get();
            const easeXSelect = easeXObj.element;
            bindPoolItem(easeXSelect, easeXObj);
            easeXSelect.className = 'theme-select';
            easeXSelect.dataset.field = 'easeX';
            recycleOptions(easeXSelect);
            const easeXFragment = document.createDocumentFragment();
            for (let k = 0; k < PROJECTILE_EASE_OPTIONS.length; k++) {
                const opt = PROJECTILE_EASE_OPTIONS[k];
                const optionObj = optionPool.get();
                bindPoolItem(optionObj.element, optionObj);
                optionObj.element.value = opt.value;
                optionObj.element.textContent = opt.label;
                easeXFragment.appendChild(optionObj.element);
            }
            easeXSelect.appendChild(easeXFragment);
            easeXSelect.value = segment.easeX || 'linear';
            easeXLabel.appendChild(easeXSelect);
            item.appendChild(easeXLabel);
            const easeYLabelObj = labelPool.get();
            const easeYLabel = easeYLabelObj.element;
            bindPoolItem(easeYLabel, easeYLabelObj);
            easeYLabel.textContent = 'Y 缓动';
            const easeYObj = getSelectPool().get();
            const easeYSelect = easeYObj.element;
            bindPoolItem(easeYSelect, easeYObj);
            easeYSelect.className = 'theme-select';
            easeYSelect.dataset.field = 'easeY';
            recycleOptions(easeYSelect);
            const easeYFragment = document.createDocumentFragment();
            for (let k = 0; k < PROJECTILE_EASE_OPTIONS.length; k++) {
                const opt = PROJECTILE_EASE_OPTIONS[k];
                const optionObj = optionPool.get();
                bindPoolItem(optionObj.element, optionObj);
                optionObj.element.value = opt.value;
                optionObj.element.textContent = opt.label;
                easeYFragment.appendChild(optionObj.element);
            }
            easeYSelect.appendChild(easeYFragment);
            easeYSelect.value = segment.easeY || 'linear';
            easeYLabel.appendChild(easeYSelect);
            item.appendChild(easeYLabel);
            const removeBtnObj = buttonPool.get();
            const removeBtn = removeBtnObj.element;
            bindPoolItem(removeBtn, removeBtnObj);
            removeBtn.type = 'button';
            removeBtn.className = 'action-btn tiny secondary';
            removeBtn.textContent = '删除';
            item.appendChild(removeBtn);
            fragment.appendChild(item);
        }
        DOM.projectileSegmentList.appendChild(fragment);
    }

    async function handleProjectileLoad(type) {
        const config = PROJECTILE_DATA_CONFIG[type];
        if (!config) return;
        const select = DOM[config.selectRef];
        const fileValue = select?.value || config.defaultFile;
        try {
            await loadProjectileDataResource(type, fileValue);
            updateStatus(`✅ ${config.label} 已加载`);
            renderProjectilePanel();
        } catch (error) {
            setProjectileStatus(type, '加载失败');
            showError(`加载 ${config.label} 失败: ${error.message}`);
        }
    }

    async function handleProjectilePick(type) {
        const config = PROJECTILE_DATA_CONFIG[type];
        if (!config) return;
        try {
            const result = await electronAPI.showOpenDialog({
                properties: ['openFile'],
                filters: [{ name: 'JSON 文件', extensions: ['json'] }],
                title: `选择 ${config.label}`
            });
            if (result?.canceled || !result.filePaths.length) {
                return;
            }
            const filePath = result.filePaths[0];
            const fileName = filePath.split(TRANSFORM_REGEXP).pop() || filePath;
            appState.projectileCustomFiles[type] = { path: filePath, label: fileName };
            populateProjectileFileSelects();
            invalidateProjectileResources(type);
            await loadProjectileDataResource(type, filePath);
            updateStatus(`✅ ${config.label} 已加载 (${fileName})`);
        } catch (error) {
            setProjectileStatus(type, '加载失败');
            showError(`选择 ${config.label} 失败: ${error.message}`);
        }
    }

    async function loadProjectileDataResource(type, fileValue) {
        const config = PROJECTILE_DATA_CONFIG[type];
        if (!config) {
            throw new Error('未知数据类型');
        }
        const filePath = resolveProjectileFilePath(fileValue || config.defaultFile);
        if (!filePath) {
            throw new Error('数据目录未配置');
        }
        // 优先使用通用文件缓存，避免重复 IO
        let cached = FileCacheManager.get(filePath);
        let rows;
        if (cached && Array.isArray(cached.data)) {
            rows = cached.data;
        } else {
            const raw = await electronAPI.readFile(filePath);
            const parsed = JSON.parse(raw);
            rows = Array.isArray(parsed) ? parsed : [parsed];
            FileCacheManager.cache(filePath, fileValue, rows);
            cached = FileCacheManager.get(filePath);
        }
        appState.projectileDataPaths[type] = filePath;
        const fileName = cached?.fileName || fileValue || filePath.split(TRANSFORM_REGEXP).pop() || '已加载';
        const count = Math.max(rows.length - 1, 0);
        setProjectileStatus(type, `${fileName} · ${count} 条`);
        registerProjectileDataFile(fileName, filePath);
        populateProjectileCharacterSelects();
        refreshActorOffsetInputs();
        refreshEnemyOffsetInputs();
        return rows;
    }

    function renderProjectilePanel() {
        if (!DOM.projectileModePanel) return;
        ensureProjectileTemplatesLoaded();
        refreshProjectileResourceStatuses();
        populateProjectileCharacterSelects();
        refreshActorOffsetInputs();
        refreshEnemyOffsetInputs();
        const preferredIndex = isProjectileFileActive() && appState.currentItemIndex
            ? appState.currentItemIndex
            : appState.projectileSelectedTemplateIndex;
        focusProjectileTemplate(preferredIndex || 1);
    }

    function createBlankProjectileTemplate(name) {
        return {
            name: name || `新弹道`,
            startAnimationId: 0,
            launchAnimation: {
                animationId: 0,
                segments: [{ ...PROJECTILE_DEFAULT_SEGMENT }]
            },
            endAnimationId: 0
        };
    }

    function ensureProjectileTemplatesLoaded() {
        if (appState.isProjectileFileLoaded) return appState.projectileTemplates;
        appState.isProjectileFileLoaded = true;
        if (isProjectileFileActive() && Array.isArray(appState.currentData)) {
            appState.projectileTemplates = appState.currentData;
            appState.projectileSelectedTemplateIndex = Math.min(
                appState.projectileSelectedTemplateIndex,
                Math.max(1, appState.projectileTemplates.length - 1)
            );
            normalizeProjectileTemplates(appState.projectileTemplates);
            return appState.projectileTemplates;
        }
    }

    function normalizeProjectileTemplates(templates) {
        for (let i = 1; i < templates.length; i++) {
            const template = templates[i];
            if (!template) continue;
            if (template.launchAnimation === undefined) {
                template.launchAnimation = {
                    animationId: template.launchAnimationId ?? 0,
                    segments: Array.isArray(template.segments) ? template.segments : [{ ...PROJECTILE_DEFAULT_SEGMENT }]
                };
            } else {
                template.launchAnimation.animationId = template.launchAnimation.animationId ?? template.launchAnimationId ?? 0;
                if (!Array.isArray(template.launchAnimation.segments)) {
                    template.launchAnimation.segments = template.segments && Array.isArray(template.segments) ? template.segments : [{ ...PROJECTILE_DEFAULT_SEGMENT }];
                }
            }
            template.endAnimationId = template.endAnimationId ?? 0;
        }
    }

    function markItemListActive(index) {
        if (index === appState.currentItemIndex) {
            return;
        }
        appState.currentItemIndex = index;
        const itemList = DOM.itemList;
        const oldActive = document.querySelector('.list-item.active');
        if (oldActive) {
            oldActive.classList.remove('active');
        }
        const target = itemList.querySelector(`[data-index="${index}"]`);
        if (target) {
            target.classList.add('active');
        }
    }

    function syncProjectileSidebarEntry(index, template) {
        if (!Array.isArray(appState.currentData) || !isProjectileFileActive()) return;
        appState.currentData[index] = template;
        displayItemList();
        markItemListActive(index);
    }

    function focusProjectileTemplate(index) {
        const templates = appState.projectileTemplates;
        if (!Array.isArray(templates) || templates.length <= 1) {
            return false;
        }
        let targetIndex = Number(index) || 1;
        const maxIndex = templates.length - 1;
        if (targetIndex > maxIndex) {
            targetIndex = maxIndex;
        }
        if (targetIndex < 1) {
            targetIndex = 1;
        }
        const template = templates[targetIndex] || DEFAULT_PROJECTILE_TEMPLATES[1];
        updateProjectileTemplateForm(template);
        return true;
    }

    function updateProjectileTemplateForm(template) {
        if (!DOM.projectileTemplateName || !template) return;
        DOM.projectileTemplateName.value = template.name || '';
        if (DOM.projectileStartAnimationSelect) {
            DOM.projectileStartAnimationSelect.value = `${template.startAnimationId ?? 0}`;
        }
        if (DOM.projectileLaunchAnimationSelect) {
            DOM.projectileLaunchAnimationSelect.value = `${template.launchAnimation?.animationId ?? 0}`;
        }
        if (DOM.projectileEndAnimationSelect) {
            DOM.projectileEndAnimationSelect.value = `${template.endAnimationId ?? 0}`;
        }
        appState.projectileSegments = Array.isArray(template.launchAnimation?.segments) && template.launchAnimation.segments.length > 0
            ? template.launchAnimation.segments
            : [{ ...PROJECTILE_DEFAULT_SEGMENT }];
        renderProjectileSegments();
    }

    function readProjectileTemplateForm(index = appState.currentItemIndex) {
        if (!DOM.projectileTemplateName) {
            return DEFAULT_PROJECTILE_TEMPLATES[1];
        }
        const projectileTemplates = appState.projectileTemplates;
        let object = projectileTemplates[index];
        if (!object) {
            object = { ...DEFAULT_PROJECTILE_TEMPLATES[1] };
            projectileTemplates[index] = object;
        }
        const name = DOM.projectileTemplateName.value.trim() || '未命名弹道';
        const startAnimationId = Number(DOM.projectileStartAnimationSelect?.value) || 0;
        const launchAnimationId = Number(DOM.projectileLaunchAnimationSelect?.value) || 0;
        const endAnimationId = Number(DOM.projectileEndAnimationSelect?.value) || 0;
        object.name = name;
        object.startAnimationId = startAnimationId;
        object.launchAnimation.animationId = launchAnimationId;
        object.launchAnimation.segments = appState.projectileSegments;
        object.endAnimationId = endAnimationId;
        return object;
    }

    async function saveProjectileTemplate() {
        const index = appState.currentItemIndex;
        const template = readProjectileTemplateForm(index);
        appState.projectileTemplates[index] = template;
        try {
            await persistProjectileTemplates();
            updateStatus('✅ 弹道模板已保存');
            renderProjectilePanel();
        } catch (error) {
            showError('保存弹道模板失败: ' + error.message);
        }
    }

    async function persistProjectileTemplates() {
        if (!isProjectileFileActive() || !appState.projectileFilePath) {
            throw new Error('请先在左侧打开 Projectile.json 文件');
        }
        await electronAPI.writeFile(appState.projectileFilePath, JSON.stringify(appState.projectileTemplates, null, 2), 'utf-8');
        updateFileCache();
    }

    async function createProjectileTemplate() {
        try {
            const templates = appState.projectileTemplates;
            const newIndex = Math.max(1, templates.length);
            const template = createBlankProjectileTemplate(`新弹道 #${newIndex}`);
            templates[newIndex] = template;
            appState.projectileSelectedTemplateIndex = newIndex;
            updateProjectileTemplateForm(template);
            await persistProjectileTemplates();
            syncProjectileSidebarEntry(newIndex, template);
            updateStatus(`✅ 已创建弹道模板 #${newIndex}`);
        } catch (error) {
            showError('新建弹道模板失败: ' + error.message);
        }
    }

    async function deleteProjectileTemplate(index) {
        const templates = appState.projectileTemplates;
        if (!Array.isArray(templates) || templates.length <= 1) return;
        const target = Number(index);
        if (!target || target <= 0 || target >= templates.length) return;
        templates.splice(target, 1);
        appState.projectileSelectedTemplateIndex = Math.min(target, templates.length - 1 || 1);
        await persistProjectileTemplates();
        displayItemList();
        focusProjectileTemplate(appState.projectileSelectedTemplateIndex);
        updateStatus('✅ 已删除弹道模板');
    }

    async function copyProjectileTemplate(index = appState.currentItemIndex || appState.projectileSelectedTemplateIndex || 1) {
        const templates = appState.projectileTemplates;
        if (!Array.isArray(templates) || templates.length <= 1) return;
        const srcIndex = Number(index) || 1;
        if (!templates[srcIndex]) return;
        const cloned = JSON.parse(JSON.stringify(templates[srcIndex]));
        cloned.name = `${cloned.name || '新弹道'}_复制`;
        const newIndex = templates.length;
        templates[newIndex] = cloned;
        appState.projectileSelectedTemplateIndex = newIndex;
        await persistProjectileTemplates();
        displayItemList();
        markItemListActive(newIndex);
        focusProjectileTemplate(newIndex);
        updateStatus(`✅ 已复制弹道模板 #${newIndex}`);
    }

    function setProjectileStatus(type, message) {
        const config = PROJECTILE_DATA_CONFIG[type];
        if (!config) return;
        const statusEl = DOM[config.statusRef];
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    function refreshProjectileResourceStatuses() {
        const keys = Object.keys(PROJECTILE_DATA_CONFIG);
        for (let i = 0; i < keys.length; i++) {
            const type = keys[i];
            const path = appState.projectileDataPaths?.[type];
            const cached = path ? FileCacheManager.get(path) : null;
            if (!cached || !Array.isArray(cached.data)) {
                setProjectileStatus(type, '尚未加载');
                continue;
            }
            const count = Math.max(cached.data.length - 1, 0);
            const fileName = cached.fileName || cached.path?.split(TRANSFORM_REGEXP).pop() || '已加载';
            setProjectileStatus(type, `${fileName} · ${count} 条`);
        }
    }

    function invalidateProjectileResources(targetType = null, resetCustomFiles = false) {
        if (!appState.projectileDataPaths) {
            return;
        }
        if (targetType === null) {
            appState.projectileDataPaths = Object.create(null);
        } else {
            delete appState.projectileDataPaths[targetType];
        }
        if (resetCustomFiles) {
            appState.projectileCustomFiles = Object.create(null);
            if (DOM.projectileAnimationFileSelect) {
                populateProjectileFileSelects();
            }
        }
    }

    function setProjectilePlayButtonState(isPlaying) {
        const button = DOM.projectilePlayTestBtn;
        if (!button) return;
        button.disabled = isPlaying;
        button.textContent = isPlaying ? '播放中...' : '播放测试';
    }

    async function handleProjectilePlayTest() {
        if (!DOM.projectilePlayTestBtn) {
            return;
        }
        if (DOM.projectilePlayTestBtn.disabled) {
            return;
        }
        setProjectilePlayButtonState(true);
        try {
            await previewProjectileTemplate();
        } catch (error) {
            showError(error.message || '弹道播放失败');
        } finally {
            setProjectilePlayButtonState(false);
        }
    }

    async function ensureProjectilePreviewInitialized() {
        if (projectilePreview.engine || !DOM.projectilePreviewContainer) return;
        const container = DOM.projectilePreviewContainer;
        container.innerHTML = '';
        const width = 360;
        const height = 220;
        await Engine.initialize(width, height);
        const stage = Engine.emptyStage;
        const spriteset = new PIXI.Container();
        const animationContainer = new PIXI.Container();
        animationContainer.addAnimation = function addAnimation(sprite) {
            spriteset.addChild(sprite);
        };
        spriteset.addChild(animationContainer);
        stage.addChild(spriteset);
        Engine.active();
        projectilePreview.spriteset = spriteset;
        projectilePreview.container = animationContainer;
        projectilePreview.engine = Engine;
    }

    function findAnimationById(value) {
        const data = getProjectileDataArray('animation');
        if (!data) return null;
        const target = Number(value);
        if (!target || target < 1 || target >= data.length) return null;
        return data[target] || null;
    }


    function createSegmentsCompleteHandler(template, launchMirror, targetBase) {
        if (template.endAnimation && template.endAnimation.animationId > 0) {
            playPreviewAnimation(template.endAnimation.animationId, launchMirror, targetBase, Function.empty);
        } else {
        }
    }

    function createLaunchSegmentsHandler(sprite, endSegments, startX, startY, onSegmentsComplete) {
        if (endSegments.length === 0) {
            onSegmentsComplete();
            return;
        }
        runTrajectorySegment(sprite, endSegments, 0, startX, startY, onSegmentsComplete);
    }

    async function previewProjectileTemplate() {
        const template = readProjectileTemplateForm(appState.currentItemIndex);
        if (!template) {
            throw new Error('弹道模板无效');
        }
        await ensureProjectilePreviewInitialized();
        await ensureProjectilePreviewSprite();
        if (!projectilePreview.emitterSprite || !projectilePreview.targetSprite || !projectilePreview.container || !projectilePreview.spriteset) {
            throw new Error('预览初始化失败');
        }
        const emitterType = DOM.projectileEmitterRoleSelect?.value || 'actor';
        const targetType = DOM.projectileTargetRoleSelect?.value || 'enemy';
        const emitterId = Number(DOM.projectileEmitterCharacterSelect?.value) || 0;
        const targetId = Number(DOM.projectileTargetCharacterSelect?.value) || 0;
        const startBase = getPreviewPosition(emitterType, emitterId);
        const targetBase = getPreviewPosition(targetType, targetId);
        const emitterOffset = getRoleOffset(emitterType, emitterId);
        const startX = startBase.x + emitterOffset.x;
        const startY = startBase.y + emitterOffset.y;
        const endSegments = prepareTrajectorySegments(startX, startY);
        projectilePreview.emitterSprite._position.set(startX, startY);
        projectilePreview.targetSprite._position.set(targetBase.x, targetBase.y);
        const launchMirror = emitterType === 'enemy';
        const onSegmentsComplete = createSegmentsCompleteHandler(template, launchMirror, targetBase);
        const startAnimationId = template.startAnimationId;
        const launchSegments = createLaunchSegmentsHandler(projectilePreview.emitterSprite, endSegments, startX, startY, onSegmentsComplete);
        playPreviewAnimation(startAnimationId, launchMirror, { x: startX, y: startY }, launchSegments);
    }

    async function ensureProjectilePreviewSprite() {
        if (!projectilePreview.container || !projectilePreview.spriteset) return null;
        if (!projectilePreview.emitterSprite) {
            const emitterSprite = new PIXI.Graphics();
            emitterSprite.beginFill(0x4da6ff);
            emitterSprite.drawCircle(0, 0, 8);
            emitterSprite.endFill();
            emitterSprite._position.set(0, 0);
            projectilePreview.spriteset.addChild(emitterSprite);
            projectilePreview.emitterSprite = emitterSprite;
        }
        if (!projectilePreview.targetSprite) {
            const targetSprite = new PIXI.Graphics();
            targetSprite.beginFill(0xff4444);
            targetSprite.drawCircle(0, 0, 8);
            targetSprite.endFill();
            targetSprite._position.set(0, 0);
            projectilePreview.spriteset.addChild(targetSprite);
            projectilePreview.targetSprite = targetSprite;
        }
        return projectilePreview.emitterSprite;
    }

    const emptyPoint = { x: 0, y: 0 };
    function getPreviewPosition(role, id) {
        return PROJECTILE_PREVIEW_POSITIONS[role] || emptyPoint;
    }

    function getRoleOffset(role, id) {
        if (role === 'actor') {
            const actor = findProjectileEntryById(getProjectileDataArray('actor'), id);
            const weaponId = Number(DOM.projectileWeaponOffsetSelect?.value) || 0;
            return actor?.projectileOffset?.[weaponId] || emptyPoint;
        }
        if (role === 'enemy') {
            const enemy = findProjectileEntryById(getProjectileDataArray('enemy'), id);
            const skillId = Number(DOM.projectileSkillSelect?.value) || 0;
            return enemy?.projectileOffset?.[skillId] || emptyPoint;
        }
        return emptyPoint;
    }

    function prepareTrajectorySegments(startX, startY) {
        ensureProjectileSegments();
        const segments = appState.projectileSegments;
        const result = [];
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            result.push({
                x: startX + (Number(segment.targetX) || 0),
                y: startY + (Number(segment.targetY) || 0),
                duration: Math.max(1, Number(segment.duration) || 60),
                easeX: segment.easeX || 'linear',
                easeY: segment.easeY || 'linear'
            });
        }
        return result;
    }

    function runTrajectorySegment(sprite, segments, index, fromX, fromY, onComplete) {
        if (index >= segments.length) {
            onComplete?.();
            return;
        }
        const segment = segments[index];
        const motion = GlobalMotion.newCommand();
        motion.setAnimation(fromX, segment.x, segment.easeX);
        motion.setAnimation(fromY, segment.y, segment.easeY);
        motion.endCommand();
        motion.setFrames(segment.duration);
        motion.onUpdate(result => {
            sprite._position.set(result[0], result[1]);
        });
        motion.onComplete(() => {
            runTrajectorySegment(sprite, segments, index + 1, segment.x, segment.y, onComplete);
        });
        motion.start();
    }

    function playPreviewAnimation(animationId, mirror, position, onComplete) {
        if (!animationId || animationId <= 0) {
            onComplete?.();
            return;
        }
        const animation = findAnimationById(animationId);
        if (!animation) {
            onComplete?.();
            return;
        }
        if (!projectilePreview.container) {
            onComplete?.();
            return;
        }
        const animationSprite = PoolCache.AnimationPool.get();
        animationSprite.setup(animation, mirror, projectilePreview.container);
        animationSprite.isFullScreen = true;
        animationSprite._position.set(position.x, position.y);
        projectilePreview.spriteset?.onAnimationStart?.();
    }

    function isAbsolutePath(value) {
        if (!value) return false;
        return WINDOWS_DRIVE_REGEXP.test(value) || value.startsWith('/') || value.startsWith('\\');
    }

    function normalizeSlashes(value) {
        return value ? value.replace(BACKSLASH_REGEXP, '/') : '';
    }

    function getDataDirectory() {
        const dataPath = appState.config.dataPath;
        if (!dataPath) {
            return '';
        }
        return normalizeSlashes(dataPath.replace(TRANSFORM_REGEXP, ''));
    }

    function resolveProjectileFilePath(value) {
        const normalizedValue = value?.trim();
        if (!normalizedValue) return null;
        if (isAbsolutePath(normalizedValue)) {
            return normalizedValue;
        }
        const dataDir = getDataDirectory();
        if (!dataDir) return null;
        return `${dataDir}/${normalizedValue}`;
    }

    function getScriptDirectory() {
        const scriptPath = appState.config.scriptSavePath;
        return scriptPath ? normalizeSlashes(scriptPath.replace(TRANSFORM_REGEXP, '')) : '';
    }

    function getProjectRootDirectory() {
        const dataDir = getDataDirectory();
        if (!dataDir) {
            return '';
        }
        const lastSlash = dataDir.lastIndexOf('/');
        if (lastSlash <= 0) {
            return dataDir;
        }
        return dataDir.slice(0, lastSlash);
    }

    function getScriptRelativePrefix() {
        const scriptDir = getScriptDirectory();
        if (!scriptDir) return '';
        const projectRoot = getProjectRootDirectory();
        if (projectRoot && scriptDir.startsWith(projectRoot)) {
            const relative = scriptDir.slice(projectRoot.length).replace(LEADING_SLASH_REGEXP, '');
            if (relative) {
                return relative;
            }
        }
        const segments = scriptDir.split('/');
        return segments.pop() || '';
    }

    function needsScriptsRootLeadingSlash(relativePrefix) {
        return typeof relativePrefix === 'string' && relativePrefix.toLowerCase() === 'scripts';
    }

    function ensureScriptsRootRelativePath(pathValue, relativePrefix) {
        if (!pathValue || needsScriptsRootLeadingSlash(relativePrefix) === false) {
            return pathValue;
        }
        if (pathValue.startsWith('/') || pathValue.startsWith('//') || isAbsolutePath(pathValue)) {
            return pathValue;
        }
        return `/${pathValue}`;
    }

    function formatStoredScriptPath(pathValue) {
        if (!pathValue) return '';
        const trimmed = pathValue.trim();
        if (!trimmed) return '';
        const normalized = normalizeSlashes(trimmed);
        if (!normalized || HTTP_PROTOCOL_REGEXP.test(normalized)) {
            return normalized;
        }
        const scriptDir = getScriptDirectory();
        const relativePrefix = getScriptRelativePrefix();
        if (normalized.startsWith('//') && (!scriptDir || !scriptDir.startsWith('//'))) {
            return normalized;
        }
        if (isAbsolutePath(normalized)) {
            if (scriptDir && normalized.startsWith(scriptDir)) {
                const relativePath = normalized.slice(scriptDir.length).replace(LEADING_SLASH_REGEXP, '');
                if (!relativePrefix) {
                    return ensureScriptsRootRelativePath(relativePath, relativePrefix);
                }
                return ensureScriptsRootRelativePath(`${relativePrefix}/${relativePath}`, relativePrefix);
            }
            return normalized;
        }
        let cleaned = normalized.replace(LEADING_DOT_SLASH_REGEXP, '');
        if (relativePrefix && !cleaned.startsWith(relativePrefix)) {
            cleaned = `${relativePrefix}/${cleaned}`;
        }
        return ensureScriptsRootRelativePath(cleaned, relativePrefix);
    }

    function resolveScriptFilePath(storedPath) {
        if (!storedPath) return '';
        const trimmed = storedPath.trim();
        if (!trimmed) return '';
        const normalized = normalizeSlashes(trimmed);
        if (!normalized || HTTP_PROTOCOL_REGEXP.test(normalized)) {
            return normalized;
        }
        const scriptDir = getScriptDirectory();
        if (normalized.startsWith('//') && (!scriptDir || !scriptDir.startsWith('//'))) {
            return normalized;
        }
        const relativePrefix = getScriptRelativePrefix();
        if (
            scriptDir &&
            relativePrefix &&
            needsScriptsRootLeadingSlash(relativePrefix) &&
            normalized.startsWith('/')
        ) {
            const trimmedLeading = normalized.replace(LEADING_SLASH_REGEXP, '');
            const lowerTrimmed = trimmedLeading.toLowerCase();
            const lowerPrefix = relativePrefix.toLowerCase();
            if (lowerTrimmed === lowerPrefix) {
                return scriptDir;
            }
            const prefixWithSlash = `${lowerPrefix}/`;
            if (lowerTrimmed.startsWith(prefixWithSlash)) {
                const relativeTail = trimmedLeading.slice(relativePrefix.length + 1);
                return normalizeSlashes(`${scriptDir}/${relativeTail}`);
            }
        }
        if (isAbsolutePath(normalized)) {
            return normalized;
        }
        if (!scriptDir) {
            return normalized.replace(LEADING_DOT_SLASH_REGEXP, '').replace(LEADING_SLASH_REGEXP, '');
        }
        let relativePath = normalized.replace(LEADING_DOT_SLASH_REGEXP, '').replace(LEADING_SLASH_REGEXP, '');
        if (relativePrefix) {
            if (relativePath === relativePrefix) {
                relativePath = '';
            } else {
                const prefixWithSlash = `${relativePrefix}/`;
                if (relativePath.startsWith(prefixWithSlash)) {
                    relativePath = relativePath.slice(prefixWithSlash.length);
                }
            }
        }
        return normalizeSlashes(`${scriptDir}/${relativePath}`);
    }

    function isProjectileFileActive() {
        if (!appState.currentFilePath || !appState.projectileFilePath) {
            return false;
        }
        return appState.currentFilePath === appState.projectileFilePath;
    }

    function isQuestDataFileName(fileName) {
        if (typeof fileName !== 'string') return false;
        const lower = fileName.toLowerCase();
        return lower === 'quests.json';
    }

    function isProjectileDataFileName(fileName) {
        if (typeof fileName !== 'string') return false;
        const lower = fileName.toLowerCase();
        return lower === 'projectiles.json';
    }

    function normalizeItemScriptPaths(item) {
        if (!item || typeof item !== 'object' || !item.scripts) {
            return;
        }
        const scripts = item.scripts;
        const scriptKeys = Object.keys(scripts);
        for (let i = 0; i < scriptKeys.length; i++) {
            const key = scriptKeys[i];
            scripts[key] = formatStoredScriptPath(item.scripts[key]);
        }
    }

    // ===== 数据验证函数 =====
    //检查数据项是否有note或params属性，只有存在这些属性才能编辑
    function canEditNoteOrProperty(item) {
        if (!item || typeof item !== 'object') {
            return false;
        }
        const uiMode = appState.uiMode;
        if (uiMode === "note") {
            return Object.hasOwn(item, 'note');
        } else if (uiMode === "property") {
            return Object.hasOwn(item, 'params');
        }
        return true;
    }
    // ===== Note面板渲染 =====
    function renderNotePanel() {
        if (!DOM.noteModePanel || !DOM.noteEditor) {
            return;
        }
        if (!appState.currentItem) {
            if (DOM.noteModeSubtitle) {
                DOM.noteModeSubtitle.textContent = '请先从左侧项目列表选择一个项目';
            }
            if (DOM.noteEditor) {
                DOM.noteEditor.value = '';
                DisabledManager.apply(DOM.noteEditor, true);
            }
            if (DOM.saveNoteBtn) {
                DisabledManager.apply(DOM.saveNoteBtn, true);
            }
            if (DOM.noteDescription) {
                DOM.noteDescription.value = '';
                DisabledManager.apply(DOM.noteDescription, true);
            }
            if (DOM.saveDescriptionBtn) {
                DisabledManager.apply(DOM.saveDescriptionBtn, true);
            }
            return;
        }
        const currentItem = appState.currentItem;
        //数据验证：检查是否可以编辑note
        const canEdit = canEditNoteOrProperty(currentItem);
        if (!canEdit) {
            if (DOM.noteModeSubtitle) {
                DOM.noteModeSubtitle.textContent = `当前项目: ${currentItem.name || '未命名'} (ID: ${currentItem.id || currentItem.index || '-'}) - 该项目没有note或params属性，无法编辑`;
            }
            if (DOM.noteEditor) {
                DOM.noteEditor.value = '';
                DisabledManager.apply(DOM.noteEditor, true);
            }
            if (DOM.saveNoteBtn) {
                DisabledManager.apply(DOM.saveNoteBtn, true);
            }
            if (DOM.noteDescription) {
                DOM.noteDescription.value = '';
                DisabledManager.apply(DOM.noteDescription, true);
            }
            if (DOM.saveDescriptionBtn) {
                DisabledManager.apply(DOM.saveDescriptionBtn, true);
            }
            return;
        }
        // 可以编辑，加载note内容
        if (DOM.noteModeSubtitle) {
            DOM.noteModeSubtitle.textContent = `当前项目: ${appState.currentItem.name || '未命名'} (ID: ${appState.currentItem.id || appState.currentItemIndex || '-'})`;
        }
        if (DOM.noteEditor) {
            DOM.noteEditor.value = appState.currentItem.note || '';
            DisabledManager.apply(DOM.noteEditor, false);
            //监听 note 编辑器的输入事件，标记为 dirty
            if (!DOM.noteEditor.__inputListenerAdded) {
                DOM.noteEditor.addEventListener('input', () => {
                    noteExtractor.markDirty(currentItem);
                });
                DOM.noteEditor.__inputListenerAdded = true;
            }
        }
        DisabledManager.apply(DOM.saveNoteBtn, false);
        if (DOM.noteDescription) {
            const description = currentItem.description;
            if (Array.isArray(description)) {
                DOM.noteDescription.value = description.join('\n');
            } else {
                DOM.noteDescription.value = description ?? "";
            }
            DisabledManager.apply(DOM.noteDescription, false);
        }
        DisabledManager.apply(DOM.saveDescriptionBtn, false);
        //如果存在 note，确保元数据已提取（使用缓存优化）
        if (currentItem.note) {
            //初始化 noteDirty 属性（如果不存在）
            if (currentItem.noteDirty === undefined) {
                currentItem.noteDirty = false;
            }
            //使用缓存优化：只在需要时解析
            noteExtractor.extractMetadata(currentItem);
        }
        //渲染元数据面板
        renderMetaDataPanel();
    }

    // ===== Note保存函数 =====
    async function saveNote() {
        if (!appState.currentItem || appState.currentItemIndex === null || !appState.currentFilePath) {
            showError('请先选择文件和项目');
            return;
        }
        let saveSuccess = false;
        //数据验证：再次检查是否可以编辑
        if (!canEditNoteOrProperty(appState.currentItem)) {
            showError('该项目没有note或params属性，无法编辑备注');
            return;
        }
        const noteContent = DOM.noteEditor ? DOM.noteEditor.value : '';
        // 保存note内容
        appState.currentItem.note = noteContent;
        //提取并保存元数据（强制重新解析，因为note已更新）
        const currentItem = appState.currentItem;
        noteExtractor.extractMetadata(currentItem, true);
        //noteDirty 会在 extractMetadata 中自动设置为 false
        appState.currentData[appState.currentItemIndex] = appState.currentItem;
        showLoading(true, '保存备注...');
        try {
            await electronAPI.writeFile(appState.currentFilePath, JSON.stringify(appState.currentData, null, 2), 'utf-8');
            // 保存成功后更新缓存
            updateFileCache();
            updateStatus('✅ 备注已保存');
            renderNotePanel();
            saveSuccess = true;
        } catch (error) {
            showError('保存备注失败: ' + error.message);
        } finally {
            showLoading(false);
            if (saveSuccess) {
                // 保存成功后重新渲染元数据，确保展示最新备注解析结果
                renderMetaDataPanel();
            }
        }
    }

    //统一更新文件缓存（在数据保存后调用）
    function updateFileCache() {
        if (!appState.currentFilePath || !appState.currentFile || !appState.currentData) {
            return;
        }
        //normalizeScriptPaths(appState.currentData);
        // 深拷贝当前数据并更新缓存
        FileCacheManager.cache(appState.currentFilePath, appState.currentFile, appState.currentData);
    }
    async function persistCurrentData(successMessage, errorPrefix = '保存数据失败', loadingLabel = '保存中...') {
        if (!appState.currentFilePath || !appState.currentData) {
            showError('无效的文件路径或数据');
            return;
        }
        showLoading(true, loadingLabel);
        //normalizeScriptPaths(appState.currentData);
        try {
            await electronAPI.writeFile(appState.currentFilePath, JSON.stringify(appState.currentData, null, 2), 'utf-8');
            // 保存成功后更新缓存
            updateFileCache();
            updateStatus(successMessage);
        } catch (error) {
            showError(`${errorPrefix}: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }

    const lineRegexp = /\r?\n/;
    const descriptionArrayResult = [];

    async function saveDescription() {
        if (!appState.currentItem || appState.currentItemIndex === null || !appState.currentFilePath) {
            showError('请先选择文件和项目');
            return;
        }
        const currentItem = appState.currentItem;
        if (!canEditNoteOrProperty(currentItem)) {
            showError('该项目没有note或params属性，无法编辑描述');
            return;
        }
        const descriptionText = DOM.noteDescription ? DOM.noteDescription.value : '';
        let descriptionArray = descriptionText.split(lineRegexp);
        descriptionArrayResult.length = 0;
        let index = 0;
        for (let i = 0; i < descriptionArray.length; i++) {
            let line = descriptionArray[i];
            line = line.trim();
            if (line.length > 0) {
                descriptionArrayResult[index++] = line;
            }
        }
        currentItem.description = descriptionArrayResult;
        appState.currentData[appState.currentItemIndex] = appState.currentItem;
        await persistCurrentData('✅ 描述已保存', '保存描述失败', '保存描述...');
        renderNotePanel();
    }

    //统一文件状态检查
    function hasFileLoaded() {
        return appState.currentFile && appState.currentData && Array.isArray(appState.currentData);
    }

    //统一隐藏所有模式面板
    function hideAllModePanels() {
        DOM.scriptPanel.classList.add('hidden');
        DOM.metaDataPanel.classList.add('hidden');
        DOM.codeEditorContainer.classList.add('hidden');
        DOM.propertyModePanel.classList.add('hidden');
        DOM.noteModePanel.classList.add('hidden');
        if (DOM.projectileModePanel) {
            DOM.projectileModePanel.classList.add('hidden');
        }
        if (DOM.questModePanel) {
            DOM.questModePanel.classList.add('hidden');
        }
    }

    //显示空状态提示
    function showEmptyState() {
        if (DOM.emptyStatePanel) {
            DOM.emptyStatePanel.classList.remove('hidden');
        }
        if (DOM.projectActions) {
            DOM.projectActions.classList.add('hidden');
        }
        hideAllModePanels();
    }

    //隐藏空状态提示
    function hideEmptyState() {
        if (DOM.emptyStatePanel) {
            DOM.emptyStatePanel.classList.add('hidden');
        }
    }

    let questEditorReady = null;
    let questEditorInitialized = false;
    let dataFilesEnsured = false;
    const DEFAULT_QUEST_OBJECT = () => ({
        title: '新的任务',
        giver: 'NPC',
        category: true,
        repeatable: false,
        startSwitches: [],
        startVariables: [],
        switches: [],
        variables: [],
        difficulty: 1,
        description: ['任务简介'],
        requirements: [],
        objectives: [
            {
                type: 1,
                enemyId: 1,
                targetValue: 1,
                calculateType: true,
                operator: '>=',
                description: '击败1个敌人',
                switches: [],
                variables: []
            }
        ],
        rewards: [{ type: 4, targetValue: 100, description: '获得100金币' }]
    });

    function loadStyleOnce(id, href) {
        return new Promise((resolve, reject) => {
            if (document.getElementById(id)) {
                resolve();
                return;
            }
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => resolve();
            link.onerror = (e) => reject(e);
            document.head.appendChild(link);
        });
    }

    function loadScriptOnce(id, src) {
        return new Promise((resolve, reject) => {
            if (document.getElementById(id)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.id = id;
            script.src = src;
            script.onload = () => resolve();
            script.onerror = (e) => reject(e);
            document.body.appendChild(script);
        });
    }

    async function ensureDataFileExists(fileName, generator) {
        const dir = getDataDirectory();
        if (!dir) {
            return null;
        }
        const filePath = `${dir}/${fileName}`;
        try {
            await electronAPI.readFile(filePath, 'utf-8');
            return filePath;
        } catch (err) {
            const payload = generator();
            await electronAPI.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
            updateStatus(`✅ 已创建 ${fileName}`);
            return filePath;
        }
    }

    async function ensureCoreDataFiles() {
        if (dataFilesEnsured) return;
        dataFilesEnsured = true;
        const questPath = await ensureDataFileExists('Quests.json', () => [null, DEFAULT_QUEST_OBJECT()]);
        const projectilePath = await ensureDataFileExists('Projectiles.json', () => DEFAULT_PROJECTILE_TEMPLATES);
        if (questPath) {
            appState.questFilePath = questPath;
            if (window.QuestEditor?.onDataPathChange) {
                window.QuestEditor.onDataPathChange(getDataDirectory());
            }
        }
        if (projectilePath) {
            appState.projectileFilePath = projectilePath;
        }
    }

    async function ensureQuestEditorReady() {
        if (questEditorReady) return questEditorReady;
        questEditorReady = (async () => {
            if (!DOM.questModePanel) throw new Error('Quest 面板未找到');
            await ensureCoreDataFiles();
            const questFilePath = appState.currentFileType === 'quest' ? appState.questFilePath : '';
            await loadStyleOnce('quest-editor-style', '../editor/quest-editor.css');
            const html = await fetch('../editor/quest-editor.html').then(r => r.text());
            // 将任务编辑器内容注入 questModePanel 内部
            DOM.questModePanel.innerHTML = html;
            if (QuestEditor?.init) {
                await QuestEditor.init({
                    container: DOM.questModePanel,
                    electronAPI,
                    getDataDirectory,
                    updateStatus,
                    questFilePath
                });
            }
            questEditorInitialized = true;
            return QuestEditor;
        })();
        return questEditorReady;
    }

    function switchMode(mode) {
        // 设置模式，允许同一模式重复切换以强制刷新
        appState.setMode(mode);
        setQuestActionButtonsVisible(mode === 'quest');
        // 如果没有文件加载，显示空状态提示（无论模式是否改变）
        if (!hasFileLoaded()) {
            showEmptyState();
            return;
        }
        // 隐藏空状态提示
        hideEmptyState();
        // 根据模式显示对应的面板（如果模式改变或需要更新UI）
        if (mode === 'property') {
            hideAllModePanels();
            DOM.propertyModePanel.classList.remove('hidden');
            renderPropertyPanel();
        } else if (mode === 'note') {
            hideAllModePanels();
            DOM.metaDataPanel.classList.remove('hidden');
            DOM.noteModePanel.classList.remove('hidden');
            renderNotePanel();
        } else if (mode === 'projectile') {
            hideAllModePanels();
            if (DOM.projectileModePanel) {
                DOM.projectileModePanel.classList.remove('hidden');
            }
            renderProjectilePanel();
        } else if (mode === 'quest') {
            hideAllModePanels();
            if (DOM.questModePanel) {
                DOM.questModePanel.classList.remove('hidden');
            }
            if (questEditorInitialized && QuestEditor?.syncQuestToCommonList) {
                QuestEditor.syncQuestToCommonList();
            } else if (!questEditorInitialized) {
                showError('任务编辑器未初始化');
            }
        } else {
            // script 模式
            hideAllModePanels();
            DOM.scriptPanel.classList.remove('hidden');
            DOM.codeEditorContainer.classList.remove('hidden');
            updateCodeEditorState();
        }
    }

    // ===== 属性面板状态管理函数 =====
    //统一管理属性面板的输入状态，提高代码复用性
    function setPropertyPanelInputsState(disabled, clearValues = false, customDisabled = disabled) {
        const attributeInputs = appState.attributeInputs;
        for (const key in attributeInputs) {
            const input = attributeInputs[key];
            if (input) {
                DisabledManager.apply(input, disabled);
                if (clearValues) {
                    input.value = '';
                }
            }
        }
        const attributeFloatInputs = appState.attributeFloatInputs;
        for (const key in attributeFloatInputs) {
            const input = attributeFloatInputs[key];
            if (input) {
                DisabledManager.apply(input, disabled);
                if (clearValues) {
                    input.value = '';
                }
            }
        }
        if (appState.customPropertyList) {
            const inputs = appState.customPropertyList.querySelectorAll('input');
            DisabledManager.applyBatch(inputs, customDisabled);
        }
        DisabledManager.apply(DOM.savePropertiesBtn, disabled);
        DisabledManager.apply(DOM.addCustomPropertyBtn, customDisabled);
        DisabledManager.apply(DOM.saveCustomPropertyBtn, customDisabled);
    }

    // ===== Note元数据提取器 =====
    // ParseSystem 进行数据解析
    //性能优化：使用 noteDirty 标志避免重复解析
    class BaseExtractor {
        constructor() {
            /**
             * @type {RegExp}
             */
            this.metaRegexp = /<([^<>:]+)(:?)([^>]*)>/g;
        }
        /**
         * 从 note 中提取元数据
         * @param {Object} data - 数据项
         * @param {boolean} force - 是否强制重新解析（忽略缓存）
         */
        extractMetadata(data, force = false) {
            const note = data.note;
            if (!note) {
                // 备注被清空时清理元数据，避免渲染残留
                data.meta = {};
                data.noteDirty = false;
                return;
            }
            //性能优化：如果元数据已存在且未标记为dirty，直接返回
            if (!force && data.meta && typeof data.meta === 'object' && data.noteDirty === false) {
                return;
            }
            const metaInfo = {};
            //使用 matchAll 遍历所有匹配的标签
            for (const tag of note.matchAll(this.metaRegexp)) {
                const tagName = tag[1];
                const tagValue = tag[3];
                const tagPattern = tag[2];
                //如果有冒号，使用 ParseSystem 解析值；否则设为 true
                if (tagPattern === ":") {
                    metaInfo[tagName] = Zaun.Core.ParseSystem.toParse(tagValue);
                } else {
                    metaInfo[tagName] = true;
                }
            }
            data.meta = metaInfo;
            //解析完成后，标记为未修改
            data.noteDirty = false;
        }
        /**
         * 标记数据项的note为已修改
         * @param {Object} data - 数据项
         */
        markDirty(data) {
            if (data && data.note) {
                data.noteDirty = true;
            }
        }
    }
    const noteExtractor = new BaseExtractor();

    // ===== 元数据展示面板 =====
    //使用对象池优化 DOM 元素创建
    class MetaDataItem {
        constructor() {
            this.element = null;
            this.nameElement = null;
            this.valueElement = null;
        }
        /**
         * 初始化元数据项元素
         */
        init(name, value) {
            if (!this.element) {
                this.element = document.createElement('div');
                this.element.className = 'meta-data-item';
                this.nameElement = document.createElement('div');
                this.nameElement.className = 'meta-data-name';
                this.valueElement = document.createElement('div');
                this.valueElement.className = 'meta-data-value';
                this.element.appendChild(this.nameElement);
                this.element.appendChild(this.valueElement);
            }
            this.nameElement.textContent = name;
            // 格式化显示值
            if (value === null || value === undefined) {
                this.valueElement.textContent = 'null';
            } else if (typeof value === 'object') {
                if (Array.isArray(value)) {
                    this.valueElement.textContent = JSON.stringify(value);
                } else {
                    this.valueElement.textContent = JSON.stringify(value, null, 2);
                }
            } else {
                this.valueElement.textContent = `${value}`;
            }
            return this.element;
        }
        /**
         * 重置元素（用于对象池）
         */
        reset() {
            if (this.element) {
                this.nameElement.textContent = '';
                this.valueElement.textContent = '';
            }
        }
    }

    // 使用 Zaun_Core 的对象池系统
    let MetaDataItemPool = null;
    function getMetaDataItemPool() {
        if (!MetaDataItemPool) {
            const { createPool } = Zaun.Core.PoolSystem;
            MetaDataItemPool = createPool('MetaDataItemPool', MetaDataItem, 50);
        }
        return MetaDataItemPool;
    }
    /**
     * 渲染元数据面板
     */
    function renderMetaDataPanel() {
        if (!DOM.metaDataList) {
            return;
        }
        // 清空现有内容
        const metaDataList = DOM.metaDataList;
        const pool = getMetaDataItemPool();
        // 回收现有元素到对象池
        const existingItems = metaDataList.querySelectorAll('.meta-data-item');
        for (let i = 0; i < existingItems.length; i++) {
            const item = existingItems[i].__metaDataItem;
            if (item) {
                pool.return(item);
            }
        }
        metaDataList.innerHTML = '';
        const currentItem = appState.currentItem;
        if (!currentItem) {
            const emptyHint = document.createElement('div');
            emptyHint.className = 'empty-state';
            emptyHint.textContent = '选择项目以查看元数据';
            metaDataList.appendChild(emptyHint);
            return;
        }
        const meta = currentItem.meta;
        if (!meta || typeof meta !== 'object' || Object.keys(meta).length === 0) {
            const emptyHint = document.createElement('div');
            emptyHint.className = 'empty-state';
            emptyHint.textContent = '暂无元数据';
            metaDataList.appendChild(emptyHint);
            return;
        }
        //使用对象池创建元数据项
        const entries = Object.entries(meta);
        for (let i = 0; i < entries.length; i++) {
            const [name, value] = entries[i];
            const item = pool.get();
            const element = item.init(name, value);
            element.__metaDataItem = item; // 保存引用以便回收
            metaDataList.appendChild(element);
        }
    }
    function renderPropertyPanel() {
        if (!appState.propertyPanelElement) {
            return;
        }
        if (!appState.currentItem) {
            if (appState.propertyStatusElement) {
                appState.propertyStatusElement.textContent = '请先从左侧项目列表选择一个项目';
            }
            if (appState.customPropertyList) {
                appState.customPropertyList.innerHTML = '';
                const emptyHint = document.createElement('div');
                emptyHint.className = 'custom-empty';
                emptyHint.textContent = '选择项目后即可编辑属性';
                appState.customPropertyList.appendChild(emptyHint);
            }
            // 清空并禁用所有输入
            setPropertyPanelInputsState(true, true, true);
            return;
        }
        const currentItem = appState.currentItem;
        const hasParams = Object.hasOwn(currentItem, 'params');

        if (appState.propertyStatusElement) {
            appState.propertyStatusElement.textContent = `当前项目: ${currentItem.name || '未命名'} (ID: ${currentItem.id || appState.currentItemIndex || '-'})${hasParams ? '' : ' - 无 params，基础属性不可编辑'}`;
        }

        const params = Array.isArray(currentItem.params) ? currentItem.params : [];
        for (let i = 0; i < baseAttributes.length; i++) {
            const attr = baseAttributes[i];
            const input = appState.attributeInputs[attr.key];
            if (input) {
                input.value = hasParams ? (params[i] ?? '') : '';
            }
        }

        const floatParams = Array.isArray(currentItem.floatParams) ? currentItem.floatParams : [];
        for (let i = 0; i < baseAttributes.length; i++) {
            const attr = baseAttributes[i];
            const input = appState.attributeFloatInputs[attr.key];
            if (input) {
                input.value = hasParams ? (floatParams[i] ?? '') : '';
            }
        }
        if (appState.customPropertyList) {
            appState.customPropertyList.innerHTML = '';
            const customParamsSource = currentItem.customParams && typeof currentItem.customParams === 'object'
                ? currentItem.customParams
                : Object.empty;
            const entries = Object.entries(customParamsSource);
            if (entries.length === 0 && Array.isArray(currentItem.customAttributes)) {
                const customAttributes = currentItem.customAttributes;
                let index = 0;
                for (let i = 0; i < customAttributes.length; i++) {
                    const attr = customAttributes[i];
                    if (attr && attr.name) {
                        entries[index++] = [attr.name, {
                            value: attr.value ?? 0,
                            symbol: attr.symbol ?? '',
                            floatValue: attr.floatValue ?? 0
                        }];
                    }
                }
            }
            if (entries.length === 0) {
                const emptyHint = document.createElement('div');
                emptyHint.className = 'custom-empty';
                emptyHint.textContent = '暂无自定义属性，点击右上角按钮添加';
                appState.customPropertyList.appendChild(emptyHint);
            } else {
                for (let i = 0; i < entries.length; i++) {
                    const [name, payload] = entries[i];
                    addCustomPropertyRow(
                        name,
                        payload?.value ?? 0,
                        payload?.symbol ?? '',
                        payload?.floatValue ?? 0
                    );
                }
            }
        }
        // 基础属性可编辑性取决于 params 是否存在；自定义属性只在无选中项时禁用
        updatePropertyPanelState(hasParams);
    }

    function addCustomPropertyRow(name = '', value = '', symbol = '', floatValue = '') {
        if (!appState.customPropertyList) {
            return null;
        }
        const placeholder = appState.customPropertyList.querySelector('.custom-empty');
        if (placeholder) {
            placeholder.remove();
        }
        const card = document.createElement('div');
        card.className = 'custom-attribute-card property-field';

        const nameField = createCustomField('属性名', 'custom-attribute-name', 'text', name);
        const symbolField = createCustomField('缩写', 'custom-attribute-symbol', 'text', symbol);
        const valueField = createCustomField('值', 'custom-attribute-value', 'number', value);
        const floatField = createCustomField('波动', 'custom-attribute-float', 'number', floatValue);

        const actions = document.createElement('div');
        actions.className = 'custom-attribute-actions';
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'action-btn small remove-btn';
        removeBtn.textContent = '删除';
        // 优化：移除直接监听，使用事件委托

        actions.appendChild(removeBtn);

        card.appendChild(nameField.wrapper);
        card.appendChild(symbolField.wrapper);
        card.appendChild(valueField.wrapper);
        card.appendChild(floatField.wrapper);
        card.appendChild(actions);
        appState.customPropertyList.appendChild(card);
        return card;
    }

    function createCustomField(labelText, inputClass, type, value) {
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-field-wrapper';
        const label = document.createElement('span');
        label.className = 'attribute-label';
        label.textContent = labelText;
        const input = document.createElement('input');
        input.type = type;
        input.className = inputClass;
        input.placeholder = labelText;
        if (type === 'number') {
            input.step = '1';
            input.inputMode = 'numeric';
        }
        input.value = value != null ? `${value}` : '';
        wrapper.appendChild(label);
        wrapper.appendChild(input);
        return { wrapper, input };
    }

    function updateCustomPlaceholder() {
        if (!appState.customPropertyList) {
            return;
        }
        if (appState.customPropertyList.querySelectorAll('.custom-attribute-card').length === 0) {
            const emptyHint = document.createElement('div');
            emptyHint.className = 'custom-empty';
            emptyHint.textContent = '暂无自定义属性，点击右上角按钮添加';
            appState.customPropertyList.appendChild(emptyHint);
        }
    }

    // 优化：事件委托处理自定义属性删除
    function handleCustomPropertyDelete(event) {
        const removeBtn = event.target.closest('.remove-btn');
        if (!removeBtn) return;

        const card = removeBtn.closest('.custom-attribute-card');
        if (card) {
            card.remove();
            updateCustomPlaceholder();
        }
    }

    function updatePropertyPanelState(hasParamsOverride = null) {
        const hasItem = !!appState.currentItem;
        const hasParams = hasParamsOverride !== null ? hasParamsOverride : (hasItem && Object.hasOwn(appState.currentItem, 'params'));
        const baseDisabled = !hasItem || !hasParams;
        const customDisabled = !hasItem;
        setPropertyPanelInputsState(baseDisabled, false, customDisabled);
    }

    function collectCustomParams() {
        const customRows = appState.customPropertyList ? Array.from(appState.customPropertyList.querySelectorAll('.custom-attribute-card')) : Array.empty;
        const customParams = {};
        for (let i = 0; i < customRows.length; i++) {
            const row = customRows[i];
            const nameInput = row.querySelector('.custom-attribute-name');
            const valueInput = row.querySelector('.custom-attribute-value');
            const symbolInput = row.querySelector('.custom-attribute-symbol');
            const floatInput = row.querySelector('.custom-attribute-float');
            if (!nameInput || !nameInput.value.trim()) {
                continue;
            }
            const name = nameInput.value.trim();
            const rawValue = valueInput ? valueInput.value.trim() : '';
            const parsedValue = rawValue === '' ? 0 : parseInt(rawValue, 10);
            if (rawValue !== '' && Number.isNaN(parsedValue)) {
                showError('自定义属性值必须是整数');
                return null;
            }
            const rawFloat = floatInput ? floatInput.value.trim() : '';
            const parsedFloat = rawFloat === '' ? 0 : parseFloat(rawFloat);
            if (rawFloat !== '' && Number.isNaN(parsedFloat)) {
                showError('自定义属性的波动值必须是数字');
                return null;
            }
            const symbol = symbolInput ? symbolInput.value.trim() : '';
            customParams[name] = {
                value: parsedValue,
                floatValue: parsedFloat,
                symbol
            };
        }
        return customParams;
    }

    async function persistCurrentItem(saveMessage, successMessage) {
        const currentItem = appState.currentItem;
        appState.currentData[appState.currentItemIndex] = currentItem;
        showLoading(true, saveMessage);
        try {
            await electronAPI.writeFile(appState.currentFilePath, JSON.stringify(appState.currentData, null, 2), 'utf-8');
            updateFileCache();
            updateStatus(successMessage);
            renderPropertyPanel();
        } catch (error) {
            showError(successMessage.replace('成功', '失败') + ' ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function savePropertyDefinition() {
        if (!appState.currentItem || appState.currentItemIndex === null || !appState.currentFilePath) {
            showError('请先选择文件和项目');
            return;
        }
        if (!Object.hasOwn(appState.currentItem, 'params')) {
            showError('该项目没有 params，基础属性不可编辑');
            return;
        }
        const currentItem = appState.currentItem;
        const params = currentItem.params ?? [];
        for (let i = 0; i < baseAttributes.length; i++) {
            const attr = baseAttributes[i];
            const input = appState.attributeInputs[attr.key];
            if (!input) {
                params[i] = 0;
                continue;
            }
            const raw = input.value.trim();
            const parsed = raw === '' ? 0 : parseInt(raw, 10);
            if (raw !== '' && Number.isNaN(parsed)) {
                showError(`${attr.label} 必须是整数`);
                return;
            }
            params[i] = parsed;
        }

        const floatParams = currentItem.floatParams ?? [];
        for (let i = 0; i < baseAttributes.length; i++) {
            const attr = baseAttributes[i];
            const input = appState.attributeFloatInputs[attr.key];
            if (!input) {
                floatParams[i] = 0;
                continue;
            }
            const raw = input.value.trim();
            const parsed = raw === '' ? 0 : parseFloat(raw);
            if (raw !== '' && Number.isNaN(parsed)) {
                showError(`${attr.label} 的波动值必须是数字`);
                return;
            }
            floatParams[i] = parsed;
        }

        currentItem.params = params;
        currentItem.floatParams = floatParams;
        await persistCurrentItem('保存属性定义中...', '✔ 属性定义已保存');
    }

    async function saveCustomProperties() {
        if (!appState.currentItem || appState.currentItemIndex === null || !appState.currentFilePath) {
            showError('请先选择文件和项目');
            return;
        }
        const customParams = collectCustomParams();
        if (customParams === null) return;
        const currentItem = appState.currentItem;
        currentItem.customParams = customParams;
        if (currentItem.customAttributes) {
            delete currentItem.customAttributes;
        }
        await persistCurrentItem('保存自定义属性中...', '✔ 自定义属性已保存');
    }

    // ===== 历史文件列表对话框 =====// ===== 历史文件列表对话框 =====
    // 使用对象池管理历史文件列表项
    class HistoryFileItem {
        constructor() {
            this.reset();
        }
        reset() {
            this.filePath = String.empty;
        }
        init(filePath, fileName, timestamp) {
            if (!this.element) {
                this.element = document.createElement('div');
                this.element.className = 'history-file-item';
                this.nameElement = document.createElement('div');
                this.nameElement.className = 'history-file-item-name';
                this.pathElement = document.createElement('div');
                this.pathElement.className = 'history-file-item-path';
                this.timeElement = document.createElement('div');
                this.timeElement.className = 'history-file-item-time';
                this.element.appendChild(this.nameElement);
                this.element.appendChild(this.pathElement);
                this.element.appendChild(this.timeElement);
            }
            this.filePath = filePath;
            const baseName = (fileName || filePath || '').split(TRANSFORM_REGEXP).pop() || fileName || filePath;
            this.nameElement.textContent = baseName;
            this.pathElement.textContent = filePath;
            const date = new Date(timestamp);
            this.timeElement.textContent = DateFormatter.format(date);
            return this.element;
        }
    }

    // 获取历史文件列表项对象池
    let HistoryFileItemPool = null;
    function getHistoryFileItemPool() {
        if (!HistoryFileItemPool) {
            const { createPool } = Zaun.Core.PoolSystem;
            HistoryFileItemPool = createPool('HistoryFileItemPool', HistoryFileItem, 50);
        }
        return HistoryFileItemPool;
    }

    function setupHistoryItemDelegate() {
        const list = DOM.historyFilesList;
        if (!list) return;
        if (list.__clickListenerAdded) {
            return;
        }
        list.addEventListener('click', handleHistoryItemClick);
        list.__clickListenerAdded = true;
    }
    function handleHistoryItemClick(e) {
        const item = e.target.closest('.history-file-item');
        if (!item) return;
        const index = item.dataset.index;
        if (index) {
            const historyItem = item.__historyFileItem;
            loadFileFromCache(historyItem.filePath);
            hideHistoryFilesDialog();
        }
    }
    // 显示历史文件对话框
    function showHistoryFilesDialog() {
        if (!DOM.historyFilesDialog || !DOM.historyFilesList) {
            return;
        }
        const pool = getHistoryFileItemPool();
        const list = DOM.historyFilesList;
        // 回收现有项到对象池
        const existingItems = list.querySelectorAll('.history-file-item');
        const existingLength = existingItems.length;
        for (let i = 0; i < existingLength; i++) {
            const item = existingItems[i].__historyFileItem;
            if (item) {
                pool.return(item);
            }
        }
        list.innerHTML = '';
        // 获取历史文件列表
        const historyList = FileCacheManager.list();
        if (historyList.length === 0) {
            const emptyHint = document.createElement('div');
            emptyHint.className = 'history-files-empty';
            emptyHint.textContent = '暂无历史文件';
            list.appendChild(emptyHint);
        } else {
            const listLength = historyList.length;
            for (let i = 0; i < listLength; i++) {
                const file = historyList[i];
                const item = pool.get();
                const displayName = (file.fileName || file.path || '').split(TRANSFORM_REGEXP).pop() || file.fileName || file.path;
                const element = item.init(file.path, displayName, file.timestamp);
                element.__historyFileItem = item;
                element.dataset.index = i;
                list.appendChild(element);
            }
        }
        setupHistoryItemDelegate();
        DOM.historyFilesDialog.classList.remove('hidden');
    }
    // 隐藏历史文件对话框
    function hideHistoryFilesDialog() {
        if (DOM.historyFilesDialog) {
            DOM.historyFilesDialog.classList.add('hidden');
        }
    }
    // ===== 菜单事件监听 =====
    // 优化：移除不必要的闭包包装，直接传递函数引用
    function listenMenuEvents() {
        if (window.ipcOn) {
            window.ipcOn('file-loaded', handleFileLoaded);
            window.ipcOn('set-data-path', handleSetDataPath);
            window.ipcOn('set-script-path', handleSetScriptPath);
            window.ipcOn('save-settings', handleSaveSettings);
            window.ipcOn('switch-mode', (mode) => switchMode(mode, true));
            window.ipcOn('show-history-files', showHistoryFilesDialog);
        }
    }

    // 初始化历史文件对话框事件
    function initializeHistoryFilesDialog() {
        if (DOM.historyFilesDialogClose) {
            DOM.historyFilesDialogClose.onclick = hideHistoryFilesDialog;
        }
        // 点击背景关闭对话框
        if (DOM.historyFilesDialog) {
            DOM.historyFilesDialog.onclick = function (e) {
                if (e.target === DOM.historyFilesDialog) {
                    hideHistoryFilesDialog();
                }
            };
        }
    }
    //统一处理文件数据加载（支持从缓存或新加载）
    function processFileData(fileName, filePath, data, fromCache = false) {
        try {
            ScriptCacheManager.clear();
            appState.currentFile = fileName;
            appState.currentFilePath = filePath;
            const currentData = appState.currentData = fromCache ? data : JSON.parse(data);
            const isQuestFile = isQuestDataFileName(fileName);
            const isProjectileFile = isProjectileDataFileName(fileName);
            if (isQuestFile && Array.isArray(currentData)) {
                appState.currentFileType = 'quest';
                appState.questFilePath = filePath;
                appState.uiMode = 'quest';
                if (questEditorInitialized) {
                    QuestEditor?.loadQuestFile?.(filePath);
                    QuestEditor?.syncQuestToCommonList?.();
                }
            }
            if (isProjectileFile && Array.isArray(currentData)) {
                appState.currentFileType = 'projectile';
                appState.uiMode = 'projectile';
                appState.isProjectileFileLoaded = true;
                appState.projectileTemplates = currentData;
                appState.projectileFilePath = filePath;
                appState.projectileSelectedTemplateIndex = Math.min(
                    appState.projectileSelectedTemplateIndex,
                    Math.max(1, currentData.length - 1)
                );
            }
            if (!isQuestFile && !isProjectileFile) {
                appState.currentFileType = '';
                appState.uiMode = 'script';
            }
            //性能优化：为所有有 note 的数据项提取元数据（使用缓存优化）
            updateFileCache();
            if (currentData && Array.isArray(currentData)) {
                for (let i = 0; i < currentData.length; i++) {
                    const item = currentData[i];
                    if (item && item.note) {
                        //如果数据没有 noteDirty 属性，初始化为 false（表示未修改）
                        if (item.noteDirty === undefined) {
                            item.noteDirty = false;
                        }
                        //只在需要时解析（noteDirty 为 true 或 meta 不存在）
                        if (item.noteDirty === true || !item.meta) {
                            noteExtractor.extractMetadata(item, true);
                        }
                    }
                }
            }
            hideEmptyState();
            if (DOM.projectActions) {
                DOM.projectActions.classList.remove('hidden');
            }
            const resolvedMode = appState.uiMode || 'script';
            // 根据当前模式更新UI（确保显示正确的面板）
            switchMode(resolvedMode);
            displayItemList();
            updateStatus(`已加载 ${fileName}${fromCache ? '（从缓存）' : ''}，共 ${currentData.length - 1} 个项目`);
            // 自动选择第一个项目
            if (currentData && currentData.length > 1) {
                selectItem(appState.currentItemIndex);
            }
            // 登记弹道依赖数据文件（如动画/敌人/玩家等）
            registerProjectileDataFile(fileName, filePath);
        } catch (error) {
            console.error('[Renderer] 处理文件失败:', error);
            showError(`处理文件失败: ${error.message}`);
            // 文件加载失败时，重置状态并显示空状态
            appState.resetData();
            showEmptyState();
        }
    }

    function handleFileLoaded(data) {
        processFileData(data.fileName, data.filePath, data.content, false);
    }
    //从缓存加载文件
    function loadFileFromCache(filePath) {
        const cached = FileCacheManager.get(filePath);
        if (cached) {
            processFileData(cached.fileName, filePath, cached.data, true);
        } else {
            showError('缓存中未找到该文件，请重新打开文件');
        }
    }

    function registerProjectileDataFile(fileName, filePath) {
        if (!fileName || !filePath) return;
        const lower = fileName.toLowerCase();
        let hitType = null;
        for (const [type, fname] of Object.entries(PROJECTILE_DATA_FILE_MAP)) {
            if (lower === fname) {
                hitType = type;
                break;
            }
        }
        if (!hitType) return;
        if (!appState.projectileDataPaths) {
            appState.projectileDataPaths = Object.create(null);
        }
        appState.projectileDataPaths[hitType] = filePath;
        refreshProjectileResourceStatuses();
        populateProjectileFileSelects();
        populateProjectileCharacterSelects();
        if (QuestEditor?.onExternalDataLoaded) {
            QuestEditor.onExternalDataLoaded(hitType, filePath);
        }
    }
    // ===== 脚本文件头部时间戳处理 =====
    //正则表达式：匹配脚本文件头部的时间戳行
    const SCRIPT_TIMESTAMP_REGEXP = /^\/\/\s*保存时间:\s*.+$/m;
    /**
     * 从脚本文件内容中提取实际代码（去除头部时间戳）
     * @param {string} fileContent - 文件内容
     * @returns {string} - 提取的代码内容
     */
    function extractScriptCode(fileContent) {
        // 移除头部时间戳行和后续的空行
        const lines = fileContent.split('\n');
        let codeStartIndex = 0;
        // 跳过时间戳行和空行
        const length = lines.length;
        for (let i = 0; i < length; i++) {
            if (SCRIPT_TIMESTAMP_REGEXP.test(lines[i])) {
                codeStartIndex = i + 1;
                // 跳过后续的空行
                while (codeStartIndex < length && lines[codeStartIndex].trim() === '') {
                    codeStartIndex++;
                }
                break;
            }
        }
        return lines.slice(codeStartIndex).join('\n');
    }

    function applyTimestampToActiveEditor(timestampLine) {
        if (!appState.codeEditor || !isMonacoLoaded || typeof monaco === 'undefined') {
            return;
        }
        const model = appState.codeEditor.getModel();
        if (!model || !timestampLine) {
            return;
        }
        const firstLine = model.getLineContent(1);
        if (firstLine === timestampLine) {
            return;
        }
        const edits = [];
        if (SCRIPT_TIMESTAMP_REGEXP.test(firstLine)) {
            edits.push({
                range: new monaco.Range(1, 1, 1, firstLine.length + 1),
                text: timestampLine
            });
        } else {
            edits.push({
                range: new monaco.Range(1, 1, 1, 1),
                text: `${timestampLine}\n`
            });
        }
        appState.codeEditor.pushUndoStop();
        model.pushEditOperations([], edits, () => null);
        appState.codeEditor.pushUndoStop();
    }
    // ===== 代码编辑器状态管理 =====
    //根据脚本数量控制代码编辑器的启用/禁用状态
    function updateCodeEditorState() {
        if (!DOM.codeEditorContainer || appState.uiMode !== 'script' || !appState.codeEditor) {
            return;
        }
        const currentItem = appState.currentItem;
        const scripts = currentItem && currentItem.scripts ? Object.keys(currentItem.scripts) : [];
        const hasScripts = scripts.length > 0;
        //使用统一的编辑器状态管理器
        EditorStateManager.apply(appState.codeEditor, !hasScripts, DOM.codeEditorContainer);
        //禁用保存和清空按钮
        DisabledManager.apply(DOM.saveCodeBtn, !hasScripts);
        DisabledManager.apply(DOM.clearCodeBtn, !hasScripts);
    }
    //处理代码编辑器点击事件（当被禁用时显示提示）
    let newScriptTimeout = null;
    function onNewScriptTimeout() {
        const newScriptBtn = DOM.scriptList?.querySelector('.new-script-btn');
        if (newScriptBtn) {
            newScriptBtn.style.animation = '';
        }
        if (newScriptTimeout) {
            clearTimeout(newScriptTimeout);
        }
        newScriptTimeout = null;
    }
    function handleCodeEditorClick(e) {
        if (!DOM.codeEditorContainer || appState.uiMode !== 'script') {
            return;
        }
        const currentItem = appState.currentItem;
        const scripts = currentItem && currentItem.scripts ? Object.keys(currentItem.scripts) : Array.empty;
        const hasScripts = scripts.length > 0;
        //如果没有脚本，显示提示
        if (!hasScripts) {
            e.preventDefault();
            e.stopPropagation();
            showError('请先点击左侧的"➕ 新建脚本"按钮创建脚本后，才能编辑代码');
            //高亮显示新建脚本按钮
            const newScriptBtn = DOM.scriptList?.querySelector('.new-script-btn');
            if (newScriptBtn) {
                newScriptBtn.style.animation = 'pulse 0.5s ease-in-out 3';
                newScriptTimeout = setTimeout(onNewScriptTimeout, 1500);
            }
        }
    }
    // ===== 代码编辑器初始化 =====
    async function initializeCodeEditor() {
        const codeEditorElement = document.getElementById('codeEditor');
        if (!codeEditorElement) return;

        // 先确保用户选择工作区，未选择则中止初始化
        const workspaceRoot = await ensureWorkspaceRoot();
        if (!workspaceRoot) {
            showError('未选择工作区，编辑器未初始化');
            return;
        }

        // 等待 Monaco 初始化
        await initMonaco();
        appState.workspaceRoot = workspaceRoot;
        await applyTsWorkspaceSettings(workspaceRoot);
        //为代码编辑器容器添加点击事件监听（处理禁用状态）
        if (DOM.codeEditorContainer && !DOM.codeEditorContainer.__clickListenerAdded) {
            DOM.codeEditorContainer.addEventListener('click', handleCodeEditorClick);
            DOM.codeEditorContainer.__clickListenerAdded = true;
        }
        appState.codeEditor = createMonacoEditor(codeEditorElement, {
            language: 'javascript',
            // theme: 'vs-dark', // 使用默认配置的 monokai-pro
            automaticLayout: true,
            minimap: { enabled: true }, // 启用小地图
            lineNumbers: 'on',
            fontSize: 15,
            fontFamily: "'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
            fontLigatures: true, // 启用连字
            wordWrap: 'on',
            // 快捷键处理
            fixedOverflowWidgets: true
        });
        const editor = appState.codeEditor;
        // 清空: Ctrl+Delete / Cmd+Delete
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Delete, clearCode);
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, deleteCurrentScript);
        // 统计信息: Ctrl+Shift+S
        editor.addAction({
            id: 'show-stats',
            label: '显示统计信息',
            keybindings: [
                monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS
            ],
            run: function (ed) {
                const content = ed.getValue();
                const lines = content.split('\n').length;
                const chars = content.length;
                const trimmed = content.trim();
                const words = trimmed ? trimmed.split(/\s+/).length : 0;
                alert(`统计信息:\n字符数: ${chars}\n行数: ${lines}\n单词数: ${words}`);
            }
        });

        // 监听内容变化更新状态栏
        editor.onDidChangeModelContent(() => {
            updateStats();
        });
    }

    function attachEventListeners() {
        // 优化：使用 onclick 代替 addEventListener，避免重复绑定
        if (DOM.saveCodeBtn && !DOM.saveCodeBtn.onclick) {
            DOM.saveCodeBtn.onclick = saveCode;
        }
        if (DOM.clearCodeBtn && !DOM.clearCodeBtn.onclick) {
            DOM.clearCodeBtn.onclick = clearCode;
        }
    }

    // 使用对象池管理项目列表项
    class ListItem {
        constructor() {
            this.reset();
        }
        reset() {
            this.index = -1;
        }
        init(index, id, name) {
            if (!this.element) {
                this.element = document.createElement('div');
                this.element.className = 'list-item';
                this.element.innerHTML = `
                    <span class="list-item-id"></span>
                    <span class="list-item-name"></span>
                `;
                this.idElement = this.element.querySelector('.list-item-id');
                this.nameElement = this.element.querySelector('.list-item-name');
            }
            this.index = index;
            this.element.dataset.index = index;
            this.idElement.textContent = `#${id}`;
            this.nameElement.textContent = name;
            this.element.classList.remove('active');
            return this.element;
        }
    }

    let ListItemPool = null;
    function getListItemPool() {
        if (!ListItemPool) {
            const { createPool } = Zaun.Core.PoolSystem;
            ListItemPool = createPool('ListItemPool', ListItem, 100);
        }
        return ListItemPool;
    }

    // 使用对象池管理脚本列表项
    class ScriptListItem {
        constructor() {
            this.reset();
        }
        reset() {
            this.key = null;
        }
        init(key) {
            if (!this.element) {
                this.element = document.createElement('div');
                this.element.className = 'script-item';
                this.element.innerHTML = '<span></span>';
                this.spanElement = this.element.querySelector('span');
            }
            this.key = key;
            this.element.dataset.script = key;
            this.spanElement.textContent = key;
            this.element.classList.remove('active');
            return this.element;
        }
    }

    let ScriptListItemPool = null;
    function getScriptListItemPool() {
        if (!ScriptListItemPool) {
            const { createPool } = Zaun.Core.PoolSystem;
            ScriptListItemPool = createPool('ScriptListItemPool', ScriptListItem, 20);
        }
        return ScriptListItemPool;
    }

    // 脚本内容缓存管理
    class ScriptCacheItem {
        constructor() {
            this.reset();
        }
        reset() {
            this.path = null;
            this.content = null;
            this.timestamp = 0;
        }
        init(path, content) {
            this.path = path;
            this.content = content;
            this.timestamp = Date.now();
        }
    }

    const ScriptCacheManager = (() => {
        const cache = new Map();
        let pool = null;

        function getPool() {
            if (!pool) {
                const { createPool } = Zaun.Core.PoolSystem;
                pool = createPool('ScriptCacheItemPool', ScriptCacheItem, 20);
            }
            return pool;
        }

        function get(path) {
            const item = cache.get(path);
            return item ? item.content : null;
        }

        function set(path, content) {
            let item = cache.get(path);
            if (!item) {
                item = getPool().get();
                cache.set(path, item);
            }
            item.init(path, content);
        }

        function remove(path) {
            const item = cache.get(path);
            if (item) {
                getPool().return(item);
                cache.delete(path);
            }
        }

        function clear() {
            const poolInstance = getPool();
            cache.forEach(item => {
                poolInstance.return(item);
            });
            cache.clear();
        }

        return { get, set, remove, clear };
    })();

    // ===== 项目列表 =====
    // 优化：移除每个项目的事件监听器，使用事件委托处理
    function displayItemList() {
        const itemList = DOM.itemList;
        if (!itemList) return;
        const pool = getListItemPool();
        // 回收现有项
        const existingItems = itemList.querySelectorAll('.list-item');
        for (let i = 0; i < existingItems.length; i++) {
            const el = existingItems[i];
            if (el.__listItem) {
                pool.return(el.__listItem);
            }
        }
        itemList.innerHTML = '';
        const currentData = appState.currentData;
        if (!currentData || currentData.length === 0) {
            itemList.innerHTML = '<div class="empty-state">数据为空</div>';
            return;
        }
        // 使用 Fragment 优化 DOM 插入
        const fragment = document.createDocumentFragment();
        const isQuest = appState.currentFileType === "quest";
        for (let i = 1; i < currentData.length; i++) {
            const item = currentData[i];
            if (item === null) continue;
            const itemId = item.id || i;
            const itemName = isQuest
                ? (item.title || `任务${i}`)
                : (item.name || `[无名]`);
            const listItem = pool.get();
            const itemEl = listItem.init(i, itemId, itemName);
            itemEl.__listItem = listItem; // 绑定引用以便回收
            fragment.appendChild(itemEl);
        }
        itemList.appendChild(fragment);
        // 为整个列表容器设置事件委托
        setupItemListDelegate();
    }

    // 优化：项目列表点击处理（只创建一次，重复使用）
    function handleItemListClick(e) {
        const listItem = e.target.closest('.list-item');
        if (listItem && listItem.dataset.index) {
            selectItem(parseInt(listItem.dataset.index));
        }
    }

    async function handleCreateItem() {
        if (appState.currentFileType === 'quest' || appState.currentFileType === 'projectile') {
            const ok = await confirmAction(`确定新建${appState.currentFileType === 'quest' ? '任务' : '弹道'}吗？`);
            if (!ok) return;
        }
        if (appState.currentFileType === 'quest') {
            QuestEditor.newQuest();
            QuestEditor.syncQuestToCommonList();
            await QuestEditor.saveQuestFile();
            return;
        }
        if (appState.currentFileType === 'projectile') {
            await createProjectileTemplate();
            return;
        }
        if (!appState.currentData) return;
        const newItem = { id: appState.currentData.length, name: '新建项' };
        appState.currentData.push(newItem);
        appState.currentItemIndex = appState.currentData.length - 1;
        appState.currentItem = newItem;
        displayItemList();
        selectItem(appState.currentItemIndex);
        await persistCurrentData('✅ 已新建项目');
    }

    async function handleCopyItem() {
        updateStatus('复制功能已禁用');
    }

    async function handleDeleteItem() {
        if (appState.currentFileType === 'quest' || appState.currentFileType === 'projectile') {
            const ok = await confirmAction(`确定删除${appState.currentFileType === 'quest' ? '任务' : '弹道'}吗？`);
            if (!ok) return;
        }
        if (appState.currentFileType === 'quest') {
            await QuestEditor.deleteQuest();
            return;
        }
        if (appState.currentFileType === 'projectile') {
            const idx = appState.currentItemIndex || appState.projectileSelectedTemplateIndex || 1;
            await deleteProjectileTemplate(idx);
            return;
        }
        if (!appState.currentData || appState.currentItemIndex === null || appState.currentItemIndex < 1) return;
        const idx = appState.currentItemIndex;
        appState.currentData.splice(idx, 1);
        appState.currentItemIndex = Math.max(1, idx - 1);
        appState.currentItem = appState.currentData[appState.currentItemIndex];
        displayItemList();
        selectItem(appState.currentItemIndex);
        await persistCurrentData('✅ 已删除项目');
    }

    async function handleSaveItem() {
        if (appState.currentFileType === 'quest' || appState.currentFileType === 'projectile') {
            const ok = await confirmAction(`确定保存${appState.currentFileType === 'quest' ? '任务' : '弹道'}吗？`);
            if (!ok) return;
        }
        if (appState.currentFileType === 'quest') {
            await QuestEditor.saveQuestFile();
            return;
        }
        if (appState.currentFileType === 'projectile') {
            await saveProjectileTemplate();
            return;
        }
        if (!appState.currentData || appState.currentItemIndex === null) return;
        await persistCurrentData('✅ 已保存任务');
    }

    // 新增：使用事件委托处理项目列表点击事件
    function setupItemListDelegate() {
        const itemList = DOM.itemList;  // 优化：使用缓存的 DOM
        if (!itemList) return;
        // 优化：检查是否已绑定，防止重复监听器和内存泄漏
        if (!itemList.__clickListenerAdded) {
            itemList.addEventListener('click', handleItemListClick);
            itemList.__clickListenerAdded = true;
        }
        if (DOM.itemNewBtn && !DOM.itemNewBtn.onclick) {
            DOM.itemNewBtn.onclick = handleCreateItem;
        }
        if (DOM.itemCopyBtn && !DOM.itemCopyBtn.onclick) {
            DOM.itemCopyBtn.onclick = handleCopyItem;
        }
        if (DOM.itemDeleteBtn && !DOM.itemDeleteBtn.onclick) {
            DOM.itemDeleteBtn.onclick = handleDeleteItem;
        }
        if (DOM.itemSaveBtn && !DOM.itemSaveBtn.onclick) {
            DOM.itemSaveBtn.onclick = handleSaveItem;
        }
    }

    const checkButtons = [];
    function setQuestActionButtonsVisible(visible) {
        if (checkButtons.length === 0) {
            checkButtons.push(DOM.itemNewBtn,
                DOM.itemCopyBtn,
                DOM.itemDeleteBtn,
                DOM.itemSaveBtn)
        }
        for (let i = 0; i < 4; i++) {
            const btn = checkButtons[i];
            if (btn) {
                btn.classList.toggle('hidden', !visible);
            }
        }
    }

    function selectItem(index) {
        if (appState.currentFileType === 'quest') {
            QuestEditor.handleCommonListSelect(index);
            appState.currentItemIndex = index;
            return;
        }
        if (index === appState.currentItemIndex) {
            return;
        }
        appState.currentItemIndex = index;
        appState.currentItem = appState.currentData[index];
        appState.currentScriptKey = null;
        // 更新活跃状态（只影响必要元素）
        const oldActive = document.querySelector('.list-item.active');
        if (oldActive) {
            oldActive.classList.remove('active');
        }
        const selectedListEl = document.querySelector(`[data-index="${index}"]`);
        if (selectedListEl) {
            selectedListEl.classList.add('active');
        }
        // 更新脚本项（如果有）
        const oldScriptActive = document.querySelector('.script-item.active');
        if (oldScriptActive) {
            oldScriptActive.classList.remove('active');
        }
        // 清空编辑器
        if (appState.codeEditor) {
            appState.codeEditor.setValue('');
        }
        // 显示次级脚本列表
        displayScriptList();
        //更新代码编辑器状态（根据脚本数量）
        updateCodeEditorState();
        // 更新路径和状态
        const itemName = appState.currentItem.name || '未命名';
        const itemId = appState.currentItem.id || index;
        DOM.codeFilePath.textContent = `项目: ${itemName} (ID: ${itemId})`;
        updateStatus(`选中项目 #${itemId}`);
        renderPropertyPanel();
        //如果当前是note模式，也需要更新note面板和元数据面板
        if (appState.uiMode === 'note') {
            renderNotePanel();
            renderMetaDataPanel();
        }
        if (appState.uiMode === 'projectile' && isProjectileFileActive()) {
            focusProjectileTemplate(index);
        }
    }

    // 优化：脚本列表点击处理（只创建一次，重复使用）
    function handleScriptListClick(e) {
        // 新增：处理新建脚本按钮，独立逻辑不依赖 saveCode()
        const newScriptBtn = e.target.closest('.new-script-btn');
        if (newScriptBtn) {
            createNewScript();  // 调用独立的新建脚本函数
            return;
        }
        // 优化：使用缓存的 DOM，避免重复查询
        const scriptItem = e.target.closest('.script-item');
        if (scriptItem && scriptItem.dataset.script) {
            const scriptKey = scriptItem.dataset.script;
            if (scriptKey === appState.currentScriptKey) {
                return;
            }
            selectScript(scriptKey);
        }
        if (DOM.scriptList) {
            DOM.scriptList.focus();
        }
    }

    // 显示脚本列表
    // 优化：移除每个脚本的事件监听器，使用事件委托处理
    function displayScriptList() {
        const scriptListContainer = DOM.scriptList;
        if (!scriptListContainer) return;

        const pool = getScriptListItemPool();
        // 回收现有项
        const existingItems = scriptListContainer.querySelectorAll('.script-item:not(.new-script-btn)');
        for (let i = 0; i < existingItems.length; i++) {
            const el = existingItems[i];
            if (el.__scriptItem) {
                pool.return(el.__scriptItem);
            }
        }
        scriptListContainer.innerHTML = '';

        const scripts = Object.keys(appState.currentItem.scripts || Object.empty);
        // 优化：无论有无脚本，始终显示现有脚本列表
        if (scripts.length > 0) {
            const fragment = document.createDocumentFragment();
            for (let i = 0; i < scripts.length; i++) {
                const scriptKey = scripts[i];
                const scriptItem = pool.get();
                const scriptEl = scriptItem.init(scriptKey);
                scriptEl.__scriptItem = scriptItem;
                fragment.appendChild(scriptEl);
            }
            scriptListContainer.appendChild(fragment);
        }
        // 优化：始终在最后显示新建脚本按钮，支持创建多个脚本
        const newScriptBtn = document.createElement('div');
        newScriptBtn.className = 'script-item new-script-btn';
        newScriptBtn.innerHTML = '<span>➕ 新建脚本</span>';
        scriptListContainer.appendChild(newScriptBtn);
        // 为脚本列表设置事件委托
        setupScriptListDelegate();
        //更新代码编辑器状态
        updateCodeEditorState();
    }
    // 新增：使用事件委托处理脚本列表点击事件
    function setupScriptListDelegate() {
        const scriptListContainer = DOM.scriptList;  // 优化：使用缓存的 DOM
        if (!scriptListContainer) return;
        // 优化：检查是否已绑定，防止重复监听器和内存泄漏
        if (scriptListContainer.__clickListenerAdded) {
            return;  // 已经绑定过，直接返回
        }
        scriptListContainer.setAttribute('tabindex', '0');
        // 优化：仅绑定一次 keydown 监听器
        if (!scriptListContainer.__keydownListenerAdded) {
            scriptListContainer.addEventListener('keydown', handleScriptListDeleteKey);
            scriptListContainer.__keydownListenerAdded = true;
        }
        // 使用已定义的函数，不再创建新函数
        scriptListContainer.addEventListener('click', handleScriptListClick);
        scriptListContainer.__clickListenerAdded = true;
    }

    function handleScriptListDeleteKey(event) {
        if (event.key !== 'F4') {
            return;
        }
        if (appState.uiMode !== 'script' || !appState.currentScriptKey) {
            return;
        }
        event.preventDefault();
        deleteCurrentScript();
    }

    async function deleteCurrentScript() {
        const currentItem = appState.currentItem;
        if (!currentItem || !currentItem.scripts || !appState.currentScriptKey || appState.currentItemIndex === null) {
            return;
        }
        const deletedKey = appState.currentScriptKey;
        const confirmResult = confirm(`确认删除脚本 ${deletedKey} 及其文件？此操作不可恢复！`);
        if (!confirmResult) {
            return;
        }
        showLoading(true, '删除脚本中...');
        const storedPath = currentItem.scripts[deletedKey];
        const scriptPath = resolveScriptFilePath(storedPath);
        try {
            if (scriptPath && !HTTP_PROTOCOL_REGEXP.test(scriptPath)) {
                await electronAPI.deleteFile(scriptPath);
                // 移除缓存
                ScriptCacheManager.remove(scriptPath);
            }
        } catch (error) {
            console.warn(`删除文件 ${scriptPath} 失败:`, error);
        }
        delete currentItem.scripts[deletedKey];
        appState.currentData[appState.currentItemIndex] = currentItem;
        try {
            //normalizeScriptPaths(appState.currentData);
            await electronAPI.writeFile(appState.currentFilePath, JSON.stringify(appState.currentData, null, 2), 'utf-8');
            // 保存成功后更新缓存
            updateFileCache();
            updateStatus(`✅ 脚本已删除: ${deletedKey}`);
        } catch (error) {
            showError('脚本删除同步失败: ' + error.message);
        } finally {
            showLoading(false);
        }
        appState.currentScriptKey = null;
        if (appState.codeEditor) {
            appState.codeEditor.setValue('');
        }
        displayScriptList();
        renderPropertyPanel();
    }

    // 选中脚本并显示代码
    async function selectScript(scriptKey) {
        try {
            // 优化：仅处理当前活跃元素，避免不必要的循环
            const activeScriptEl = document.querySelector('.script-item.active');
            if (activeScriptEl) {
                activeScriptEl.classList.remove('active');
            }
            // 直接通过 data-script 选择，性能更好
            const selectedEl = document.querySelector(`[data-script="${scriptKey}"]`);
            if (selectedEl) {
                selectedEl.classList.add('active');
            }
            const storedPath = appState.currentItem.scripts[scriptKey];
            const scriptFilePath = resolveScriptFilePath(storedPath);
            if (!scriptFilePath) {
                showError('脚本路径无效');
                return;
            }
            let scriptContent = ScriptCacheManager.get(scriptFilePath);
            if (scriptContent === null) {
                // 从磁盘读取脚本文件内容
                scriptContent = await electronAPI.readFile(scriptFilePath);
                ScriptCacheManager.set(scriptFilePath, scriptContent);
            }
            // 使用带语言的模型加载，便于 TS/JSON 等文件获得正确服务
            setEditorModel(scriptContent, scriptFilePath || storedPath, scriptKey);
            // 设置当前脚本键，用于保存时判断
            appState.currentScriptKey = scriptKey;
            const displayPath = storedPath || scriptFilePath;
            DOM.codeFilePath.textContent = `脚本: ${scriptKey} - ${displayPath}`;
            updateStatus(`已加载脚本: ${scriptKey}`);
        } catch (error) {
            showError('加载脚本失败: ' + error.message);
        }
    }

    // ===== Monaco Editor 集成 =====
    let isMonacoLoaded = false;
    let monacoInitPromise = null;
    let pendingWorkspaceRoot = null;
    let activeEditorModel = null;
    const MONOKAI_THEME_JSON_PATH = '../js/monaco-pro-theme.json';
    const fallbackMonokaiTheme = {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: '', foreground: 'f7f1ff', background: '222222' },
            { token: 'comment', foreground: '69676c', fontStyle: 'italic' },
            { token: 'string', foreground: 'fce566' },
            { token: 'constant', foreground: '948ae3' },
            { token: 'keyword', foreground: 'fc618d' },
            { token: 'storage.type', foreground: '5ad4e6', fontStyle: 'italic' },
            { token: 'entity.name.function', foreground: '7bd88f' },
            { token: 'entity.name.class', foreground: '5ad4e6' },
            { token: 'variable', foreground: 'f7f1ff' },
            { token: 'variable.parameter', foreground: 'fd9353', fontStyle: 'italic' },
            { token: 'punctuation', foreground: '8b888f' },
            { token: 'delimiter', foreground: '8b888f' }
        ],
        colors: {
            'editor.background': '#222222',
            'editor.foreground': '#F7F1FF',
            'editorCursor.foreground': '#F7F1FF',
            'editor.lineHighlightBackground': '#F7F1FF0C',
            'editorLineNumber.foreground': '#525053',
            'editor.selectionBackground': '#BAB6C026',
            'editor.inactiveSelectionBackground': '#F7F1FF0C',
            'editorIndentGuide.background': '#222222',
            'editorIndentGuide.activeBackground': '#7BD88FA5'
        }
    };
    async function loadMonokaiThemeConfig() {
        try {
            const response = await fetch(MONOKAI_THEME_JSON_PATH);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.warn('[Monaco Theme] 无法读取 Monokai Pro JSON，使用备选配色', error);
            return null;
        }
    }
    function initMonaco() {
        if (monacoInitPromise) return monacoInitPromise;
        monacoInitPromise = new Promise((resolve) => {
            try {
                require.config({
                    paths: { 'vs': '../node_modules/monaco-editor/min/vs' },
                    'vs/nls': { availableLanguages: { '*': 'zh-cn' } }
                });
                require(['vs/editor/editor.main'], function () {
                    registerCustomCompletions();
                    const applyTheme = (themeConfig) => {
                        const themeToUse = themeConfig || fallbackMonokaiTheme;
                        monaco.editor.defineTheme('monokai-pro', themeToUse);
                        monaco.editor.setTheme('monokai-pro');
                        isMonacoLoaded = true;
                        // 如果有待应用的工作区，优先应用
                        if (pendingWorkspaceRoot) {
                            applyTsWorkspaceSettings(pendingWorkspaceRoot);
                            pendingWorkspaceRoot = null;
                        }
                        resolve();
                    };
                    // 尝试加载官方 Monokai JSON 主题，失败后退回内置配色
                    loadMonokaiThemeConfig()
                        .then(applyTheme)
                        .catch(() => applyTheme(null));
                });
            } catch (e) {
                console.error("Monaco Loader Error:", e);
            }
        });
        return monacoInitPromise;
    }

    // 按文件路径推断语言
    function getLanguageByPath(filePath = '') {
        if (typeof filePath !== 'string') return 'javascript';
        const ext = filePath.split('.').pop()?.toLowerCase();
        if (ext === 'ts' || ext === 'tsx') return 'typescript';
        if (ext === 'json') return 'json';
        return 'javascript';
    }

    // 将内容绑定到带语言的 Monaco 模型
    function setEditorModel(content, filePath, fallbackName = 'untitled') {
        if (!appState.codeEditor || !isMonacoLoaded) return;
        const language = getLanguageByPath(filePath);
        const safeName = fallbackName || 'untitled';
        const uri = filePath
            ? monaco.Uri.file(filePath)
            : monaco.Uri.parse(`inmemory://model/${safeName}.${language}`);
        const targetModel = monaco.editor.getModel(uri);
        if (activeEditorModel && activeEditorModel !== targetModel) {
            if (appState.codeEditor.getModel() === activeEditorModel) {
                appState.codeEditor.setModel(null);
            }
            if (!activeEditorModel.isDisposed?.()) {
                activeEditorModel.dispose();
            }
            activeEditorModel = null;
        }
        let model = targetModel;
        if (!model) {
            model = monaco.editor.createModel(content, language, uri);
        } else {
            model.setValue(content);
            monaco.editor.setModelLanguage(model, language);
        }
        appState.codeEditor.setModel(model);
        activeEditorModel = model;
    }

    // ===== TS 工作区/类型支持 =====
    let extraLibDisposers = [];

    function clearExtraLibs() {
        for (let i = 0; i < extraLibDisposers.length; i++) {
            try {
                extraLibDisposers[i].dispose?.();
            } catch (e) {
                console.warn('[TS] 释放 extraLib 失败', e);
            }
        }
        extraLibDisposers.length = 0;
    }

    function addDtsLib(code, virtualPath) {
        if (!monaco?.languages?.typescript) return;
        // 同时注入 TS/JS 默认库，保证 JS 也能看到声明
        const tsDisposer = monaco.languages.typescript.typescriptDefaults.addExtraLib(code, virtualPath);
        const jsDefaults = monaco.languages.typescript.javascriptDefaults;
        if (jsDefaults?.addExtraLib) {
            extraLibDisposers.push(jsDefaults.addExtraLib(code, virtualPath));
        }
        extraLibDisposers.push(tsDisposer);
    }

    async function loadWorkspaceDts(workspaceRoot) {
        if (!workspaceRoot || !monaco?.languages?.typescript) return;
        clearExtraLibs();
        // 依赖主进程提供的 d.ts 列表 API；没有则跳过
        if (!electronAPI.listDtsFiles) {
            console.warn('[TS] 缺少 listDtsFiles API，跳过工作区 .d.ts 注册');
            return;
        }
        try {
            const dtsFiles = await electronAPI.listDtsFiles(workspaceRoot);
            if (!Array.isArray(dtsFiles) || dtsFiles.length === 0) {
                return;
            }
            for (let i = 0; i < dtsFiles.length; i++) {
                const filePath = dtsFiles[i];
                try {
                    const code = await electronAPI.readFile(filePath, 'utf-8');
                    const virtualPath = monaco.Uri.file(filePath).toString();
                    addDtsLib(code, virtualPath);
                } catch (err) {
                    console.warn(`[TS] 读取声明文件失败: ${filePath}`, err);
                }
            }
        } catch (error) {
            console.warn('[TS] 扫描工作区 .d.ts 失败', error);
        }
    }

    async function configureTsDefaults(workspaceRoot) {
        if (!monaco?.languages?.typescript) return;
        const tsDefaults = monaco.languages.typescript.typescriptDefaults;
        tsDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false
        });
        // 基础选项，保证 JS 也有类型提示
        tsDefaults.setCompilerOptions({
            allowJs: true,
            checkJs: true,
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            strict: false
        });
        // 如果有 tsconfig，按项目配置覆盖
        if (!workspaceRoot || !electronAPI.readFile) {
            return;
        }
        const tsconfigPath = `${workspaceRoot}/tsconfig.json`;
        try {
            const raw = await electronAPI.readFile(tsconfigPath, 'utf-8');
            const cfg = JSON.parse(raw);
            const opts = cfg.compilerOptions || {};
            tsDefaults.setCompilerOptions({
                ...opts
            });
        } catch (error) {
            console.warn('[TS] 读取 tsconfig 失败，使用默认 TS 选项', error);
        }
    }

    async function applyTsWorkspaceSettings(workspaceRoot) {
        if (!workspaceRoot) return;
        if (!isMonacoLoaded) {
            pendingWorkspaceRoot = workspaceRoot;
            return;
        }
        await configureTsDefaults(workspaceRoot);
        await loadWorkspaceDts(workspaceRoot);
    }

    // 确保用户选择工作区，必要时强制弹窗
    async function ensureWorkspaceRoot() {
        const cfgWs = appState.config?.workspaceRoot;
        const memWs = appState.workspaceRoot;
        if (cfgWs) {
            appState.workspaceRoot = cfgWs;
            return cfgWs;
        }
        if (memWs) return memWs;
        if (!electronAPI.pickWorkspace) {
            showError('缺少 pickWorkspace 接口，无法选择工作区');
            return null;
        }
        let workspacePath = null;
        while (!workspacePath) {
            const picked = await electronAPI.pickWorkspace();
            if (!picked) {
                const retry = confirm('必须选择工作区才能继续。是否重新选择？');
                if (!retry) return null;
                continue;
            }
            workspacePath = picked;
            appState.workspaceRoot = picked;
            updateConfigPath('workspaceRoot', picked, '工作区目录');
        }
        return workspacePath;
    }

    //自定义代码补全函数（增强 JavaScript 补全）
    const CUSTOM_JS_COMPLETIONS = [
        'console.log', 'console.error', 'console.warn', 'console.info',
        'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
        'JSON.stringify', 'JSON.parse',
        'Array.isArray', 'Object.keys', 'Object.values', 'Object.entries',
        'parseInt', 'parseFloat', 'isNaN', 'isFinite',
        'Math.abs', 'Math.max', 'Math.min', 'Math.round', 'Math.floor', 'Math.ceil', 'Math.random',
        'Date.now',
        'Promise.resolve', 'Promise.reject',
        'async function', 'await',
        'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'return',
        'try', 'catch', 'finally', 'throw', 'new', 'this', 'typeof', 'instanceof'
    ];

    // 缓存的补全项数组
    let cachedCompletions = null;
    function registerCustomCompletions() {
        // 1. 预先创建数组对象（单例模式），避免重复创建
        if (!cachedCompletions) {
            const len = CUSTOM_JS_COMPLETIONS.length;
            cachedCompletions = new Array(len);
            for (let i = 0; i < len; i++) {
                const label = CUSTOM_JS_COMPLETIONS[i];
                cachedCompletions[i] = {
                    label: label,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: label,
                    range: null // 将在运行时更新
                };
            }
        }
        const result = {
            suggestions: null
        };
        const range = {
            startLineNumber: 0,
            endLineNumber: 0,
            startColumn: 0,
            endColumn: 0
        }
        monaco.languages.registerCompletionItemProvider('javascript', {
            provideCompletionItems: function (model, position) {
                const word = model.getWordUntilPosition(position);
                range.startLineNumber = position.lineNumber;
                range.endLineNumber = position.lineNumber;
                range.startColumn = word.startColumn;
                range.endColumn = word.endColumn;
                // 2. 使用 for 循环更新 range，复用已有对象
                const len = cachedCompletions.length;
                for (let i = 0; i < len; i++) {
                    cachedCompletions[i].range = range;
                }
                result.suggestions = cachedCompletions;
                return result;
            }
        });
    }

    const defaultOptions = {
        value: '',
        language: 'javascript',
        theme: 'monokai-pro', // 类似于 dracula
        automaticLayout: true, // 自动处理 resize
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 15,
        fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
        tabSize: 4,
        insertSpaces: true,
        lineNumbers: 'on',
        wordWrap: 'on',
        contextmenu: true,
        // VSCode 风格配置
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        fixedOverflowWidgets: true, // 修复提示框在第一行被遮挡的问题
        // 启用语义高亮，帮助识别函数名、变量等
        'semanticHighlighting.enabled': true
    };
    function createMonacoEditor(container, options = {}) {
        if (!isMonacoLoaded || !container) return null;
        // 默认配置
        const editor = monaco.editor.create(container, { ...defaultOptions, ...options });
        // 统一绑定保存快捷键
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            saveCode();
        });
        return editor;
    }

    // ===== 代码编辑 =====
    // 优化：独立的新建脚本函数，不会触发保存当前脚本的逻辑
    async function createNewScript() {
        try {
            if (!appState.currentFile || !appState.currentItem) {
                showError('请先选择文件和项目');
                return;
            }
            // 修复 Bug 2：清除之前选中的脚本
            appState.currentScriptKey = null;
            // 弹出输入框获取脚本键名
            const scriptKey = await showInputDialog(
                '新建脚本',
                '请输入脚本的键名 (例如: onLoad, onUpdate):'
            );
            if (!scriptKey) {
                updateStatus('新建脚本已取消');
                return;
            }
            const currentItem = appState.currentItem;
            // 检查脚本键名是否重复，防止覆盖现有脚本
            if (currentItem.scripts && currentItem.scripts[scriptKey]) {
                showError(`⚠️ 脚本键名 "${scriptKey}" 已存在！请使用不同的键名或删除现有脚本后重试。`);
                updateStatus(`脚本键名 "${scriptKey}" 重复，新建失败`);
                return;
            }
            showLoading(true, '创建脚本中...');
            const itemId = currentItem.id || appState.currentItemIndex;
            const jsFileName = `${itemId}_${scriptKey}_${Date.now()}.js`;
            const scriptDir = getScriptDirectory();
            if (!scriptDir) {
                showError('请先设置脚本保存目录');
                showLoading(false);
                return;
            }
            const filePath = `${scriptDir}/${jsFileName}`;
            // 创建空脚本文件（仅包含头部注释）
            const wrappedCode = `// 保存时间: ${DateFormatter.format(new Date())}`;
            // 写入 JS 文件
            await electronAPI.writeFile(filePath, wrappedCode);
            // 1. 初始化 scripts 属性（如果不存在）
            if (!currentItem.scripts) {
                currentItem.scripts = {};
            }
            // 2. 添加新脚本键名和文件路径
            const storedPath = formatStoredScriptPath(filePath);
            currentItem.scripts[scriptKey] = storedPath;
            normalizeItemScriptPaths(currentItem);
            // 缓存初始脚本内容
            ScriptCacheManager.set(filePath, wrappedCode);
            // 3. 保存 JSON 文件
            appState.currentData[appState.currentItemIndex] = currentItem;
            const jsonContent = JSON.stringify(appState.currentData, null, 2);
            await electronAPI.writeFile(appState.currentFilePath, jsonContent, 'utf-8');
            // 保存成功后更新缓存
            updateFileCache();
            // 4. 刷新脚本列表
            displayScriptList();
            // 5. 自动选择新创建的脚本
            if (appState.currentScriptKey !== scriptKey) {
                selectScript(scriptKey);
            }
            updateStatus(`✅ 脚本已创建: ${scriptKey}`);
            showLoading(false);
        } catch (error) {
            showError('创建脚本失败: ' + error.message);
            showLoading(false);
        }
    }
    async function saveCode() {
        try {
            // 保存当前脚本
            if (!appState.currentScriptKey) {
                showError('未选择脚本');
                return;
            }
            const code = appState.codeEditor.getValue();
            if (!code.trim()) {
                showError('代码为空');
                return;
            }
            if (!appState.currentFile || !appState.currentItem) {
                showError('未选择文件或项目');
                return;
            }
            showLoading(true, '保存中...');
            const storedPath = appState.currentItem.scripts[appState.currentScriptKey];
            const filePath = resolveScriptFilePath(storedPath);
            if (!filePath) {
                showError('无法解析脚本路径');
                showLoading(false);
                return;
            }
            const codeToSave = extractScriptCode(code).trim();
            const cachedContent = ScriptCacheManager.get(filePath);
            if (cachedContent !== null) {
                const previousCode = extractScriptCode(cachedContent).trim();
                if (previousCode === codeToSave) {
                    updateStatus('代码未变更，无需保存');
                    showLoading(false);
                    return;
                }
            }
            const newTimestamp = `// 保存时间: ${DateFormatter.format(new Date())}`;
            const newFileContent = `${newTimestamp}\n${codeToSave}`;
            await electronAPI.writeFile(filePath, newFileContent);
            ScriptCacheManager.set(filePath, newFileContent);
            const newStoredPath = formatStoredScriptPath(filePath);
            if (newStoredPath) {
                appState.currentItem.scripts[appState.currentScriptKey] = newStoredPath;
            }
            applyTimestampToActiveEditor(newTimestamp);
            updateStatus(`已保存脚本: ${appState.currentScriptKey}`);
            showLoading(false);
        } catch (error) {
            showError('保存失败: ' + error.message);
            showLoading(false);
        }
    }

    // 清除所有脚本
    async function clearCode() {
        const currentItem = appState.currentItem;
        if (!currentItem || !currentItem.scripts) {
            showError('没有脚本要清除');
            return;
        }
        const scriptCount = Object.keys(currentItem.scripts).length;
        if (scriptCount === 0) {
            showError('没有脚本要清除');
            return;
        }
        const confirm_result = confirm(`确认要删除该项目下的所有 ${scriptCount} 个脚本吗？此操作不可恢复！`);
        if (!confirm_result) {
            return;
        }
        showLoading(true, '删除脚本中...');
        try {
            // 1. 删除所有脚本文件
            const scripts = currentItem.scripts;
            for (const scriptKey in scripts) {
                const storedPath = scripts[scriptKey];
                const filePath = resolveScriptFilePath(storedPath);
                if (!filePath || HTTP_PROTOCOL_REGEXP.test(filePath)) {
                    continue;
                }
                try {
                    await electronAPI.deleteFile(filePath);
                    // 移除缓存
                    ScriptCacheManager.remove(filePath);
                } catch (error) {
                    console.warn(`删除文件 ${filePath} 失败:`, error);
                }
            }
            // 2. 清除 scripts 属性
            currentItem.scripts = {};
            // 3. 保存 JSON 文件到原始位置（紧凑格式）
            appState.currentData[appState.currentItemIndex] = currentItem;
            const jsonContent = JSON.stringify(appState.currentData, null, 2);
            await electronAPI.writeFile(appState.currentFilePath, jsonContent, "utf-8");
            // 保存成功后更新缓存
            updateFileCache();
            // 4. 重置当前脚本键
            appState.currentScriptKey = null;
            // 5. 刷新界面
            if (appState.codeEditor) {
                appState.codeEditor.setValue('');
            }
            displayScriptList();
            updateStatus(`✅ 已删除所有脚本`);
            showLoading(false);
        } catch (error) {
            showError('删除脚本失败: ' + error.message);
            showLoading(false);
        }
    }

    // ===== 配置管理 =====
    async function loadConfig() {
        try {
            const config = appState.config = await electronAPI.readConfig();
            config.dataPath = appState.config.dataPath || '';
            config.scriptSavePath = config.scriptSavePath || '';
            appState.configDirty = false;
        } catch (error) {
            console.error('加载配置失败:', error);
        }
    }
    async function saveConfig() {
        const config = appState.config;
        if (!config.dataPath || !config.scriptSavePath) {
            showError('请先设置数据目录和脚本保存目录后再保存设置');
            return;
        }
        try {
            await electronAPI.writeConfig(config);
            appState.configDirty = false;
            updateStatus('✅ 配置已保存');
        } catch (error) {
            showError('保存配置失败: ' + error.message);
        }
    }
    function handleSetDataPath(dataPath) {
        if (!dataPath) {
            return;
        }
        updateConfigPath('dataPath', dataPath, '数据目录');
        invalidateProjectileResources(null, true);
        ScriptCacheManager.clear();
        if (window.QuestEditor?.onDataPathChange) {
            window.QuestEditor.onDataPathChange(getDataDirectory());
        }
        dataFilesEnsured = false;
        ensureCoreDataFiles().catch(() => { /* ignore */ });
    }
    function handleSetScriptPath(scriptPath) {
        if (!scriptPath) {
            return;
        }
        updateConfigPath('scriptSavePath', scriptPath, '脚本保存目录');
    }

    async function handleSaveSettings() {
        if (!appState.configDirty) {
            updateStatus('当前配置未修改，无需保存');
            return;
        }
        await saveConfig();
    }
    function updateConfigPath(key, value, label) {
        appState.config[key] = value;
        appState.configDirty = true;
        updateStatus(`✅ ${label} 已更新（未保存）: ${value}`);
    }

    async function ensurePathsConfigured() {
        const missingPaths = [];
        const config = appState.config;
        if (!config.dataPath) {
            missingPaths.push('数据目录');
        }
        if (!config.scriptSavePath) {
            missingPaths.push('脚本保存目录');
        }
        if (!config.workspaceRoot) {
            missingPaths.push('工作区目录');
        }
        if (missingPaths.length === 0) {
            return;
        }
        await electronAPI.showMessageBox({
            type: 'warning',
            title: '路径未配置',
            message: `当前缺少 ${missingPaths.join(' 和 ')}，请先完成设置以保证文件保存正常。`
        });
        if (!config.dataPath) {
            const dir = await promptDirectory(
                '选择数据目录',
                '请选择用于读取 JSON 数据的目录（数据文件目录）。'
            );
            if (dir) {
                handleSetDataPath(dir);
            }
        }

        if (!config.scriptSavePath) {
            const dir = await promptDirectory(
                '选择脚本保存目录',
                '请选择用于存放脚本文件（生成的 JS）的目录。'
            );
            if (dir) {
                handleSetScriptPath(dir);
            }
        }
        if (!config.workspaceRoot) {
            const dir = await promptDirectory(
                '选择工作区目录',
                '请选择代码工作区根目录（用于 tsconfig 与类型声明解析）。'
            );
            if (dir) {
                appState.workspaceRoot = dir;
                updateConfigPath('workspaceRoot', dir, '工作区目录');
            }
        }
        if (!config.dataPath || !config.scriptSavePath || !config.workspaceRoot) {
            updateStatus('路径仍未配置完整，请使用菜单完成设置并保存配置。');
            return;
        }
        appState.configDirty = true;
        updateStatus('路径已选择，请使用 文件 > 保存设置 以写入配置文件（否则重启后丢失）。');
    }

    async function promptDirectory(title, infoMessage) {
        if (infoMessage) {
            await electronAPI.showMessageBox({
                type: 'info',
                title: '请选择路径',
                message: infoMessage
            });
        }
        try {
            const result = await electronAPI.showOpenDialog({
                properties: ['openDirectory'],
                title
            });
            if (!result.canceled && result.filePaths.length > 0) {
                return result.filePaths[0];
            }
        } catch (error) {
            showError('选择目录失败: ' + error.message);
        }
        return null;
    }
    // ===== 工具函数 =====
    function updateStatus(text) {
        if (DOM.statusText) {
            DOM.statusText.textContent = text;
        }
    }

    async function confirmAction(message) {
        try {
            const result = await electronAPI.showMessageBox({
                type: 'question',
                title: '请确认',
                message: message || '确定执行此操作吗？',
                buttons: ['取消', '确定'],
                defaultId: 1,
                cancelId: 0
            });
            return result.response === 1;
        } catch (err) {
            console.error('确认对话框失败', err);
            return false;
        }
    }
    function updateStats() {
        const model = appState.codeEditor ? appState.codeEditor.getModel() : null;
        const lineCount = model ? model.getLineCount() : 0;
        const charCount = model ? model.getValueLength() : 0;

        if (DOM.characterCount) {
            DOM.characterCount.textContent = charCount;
        }
        if (DOM.lineCount) {
            DOM.lineCount.textContent = lineCount;
        }
    }
    function showError(message) {
        updateStatus(`❌ ${message}`);
        console.error(message);
    }

    function showLoading(show, text = '加载中...') {
        if (show) {
            if (DOM.loadingText) {
                DOM.loadingText.textContent = text;
            }
            DOM.loadingIndicator?.classList.remove('hidden');
        } else {
            DOM.loadingIndicator?.classList.add('hidden');
        }
    }
}();
