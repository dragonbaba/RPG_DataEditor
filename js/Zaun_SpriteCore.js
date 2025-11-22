/*:
 * @target MZ
 * @author Zaun
 * @plugindesc [v1.00] 精灵核心 - 包含崩解效果
 * @help
 * 
 */
"use strict";
Zaun.SpriteCore = ((SpriteCore) => {
    const { PoolSystem, CoreUtils, EventSystem, AnimationSystem } = Zaun.Core;
    const { Clickable } = Zaun.GeometrySystem;
    const { FilterManager } = Zaun.FilterSystem;
    const { DESTROY_OPTIONS } = CoreUtils;
    const { PoolCache, createPool } = PoolSystem;
    const { ImageBundlePool } = PoolCache;
    const { GlobalEvent } = EventSystem;
    const { GlobalMotion } = AnimationSystem;
    const { BatchableSprite, Container } = PIXI;
    const { EMPTY_SOURCE, SpriteOptions, TextureOptions, EffectManager } = Zaun.GeometrySystem;

    createPool("defaultBatchPool", BatchableSprite, 100);

    class Sprite extends PIXI.Sprite {
        get bitmap() {
            return this._bitmap;
        }
        set bitmap(value) {
            if (this._bitmap !== value) {
                if (this._bitmap !== null) {
                    this._bitmap.unRefer();
                    if (this._bitmap.canvasObj) {
                        ImageManager.returnBitmap(this._bitmap);
                    }
                }
                this._bitmap = value;
                if (value !== null) {
                    this.onBitmapChange(value);
                } else {
                    this.setEmptyTexture();
                }
            }
        }
        get width() {
            return this._width;
        }
        get height() {
            return this._height;
        }
        constructor(bitmap = null) {
            TextureOptions.source = EMPTY_SOURCE;
            const texture = new PIXI.Texture(TextureOptions);
            SpriteOptions.texture = texture;
            super(SpriteOptions);
            this.initProperties();
            this.initialize(bitmap);
        }
        onBitmapChange(bitmap) {
            bitmap.refer();
            bitmap.onLoad(this.onBitmapLoad, this);
            this.checkNormalBitmap(bitmap);
        }
        checkNormalBitmap(bitmap) {
            if (Zaun.LightingSystem === void 0) return;
            const folder = bitmap.folder;
            const fileName = bitmap.fileName;
            if (!fileName.includes("_d")) {
                this.checkSpriteGpuData();
                return;
            }
            if (this.renderPipeId === "sprite" && this._gpuData !== null) {
                const gpuData = this._gpuData;
                PoolCache["defaultBatchPool"].return(gpuData);
                this._gpuData = null;
            }
            this.renderPipeId = "lighting";
            const normalFileName = fileName.replace("_d", "_n");
            const normalBitmap = ImageManager.loadBitmap(folder, normalFileName, bitmap.isCompressed);
            if (this._normalBitmap !== normalBitmap) {
                if (this._normalBitmap !== Bitmap.empty) {
                    this._normalBitmap.unRefer();
                }
                this._normalBitmap = normalBitmap;
                normalBitmap.refer();
            }
        }
        checkSpriteGpuData() {
            if (this.renderPipeId === "sprite" && this._gpuData !== null) {
                const gpuData = this._gpuData;
                const batcherName = gpuData.batcherName;
                if (batcherName === "lighting") {
                    PoolCache["lightingBatchPool"].return(gpuData);
                    this._gpuData = null;
                }
            }
        }
        setEmptyTexture() {
            const texture = this._texture;
            texture.source = EMPTY_SOURCE;
            texture.setFrame(0, 0, 1, 1);
            this._fx = 0;
            this._fy = 0;
            this._width = 1;
            this._height = 1;
            this.updateFilterArea(1, 1);
            if (this._normalBitmap !== Bitmap.empty) {
                this._normalBitmap.unRefer();
                this._normalBitmap = Bitmap.empty;
            }
            this._updateBounds();
            this.onViewUpdate();
        }
        initialize(bitmap = null) {
            this.bitmap = bitmap;
        }
        initProperties() {
            this._bitmap = null;
            this._normalBitmap = Bitmap.empty;
            this._fx = 0;
            this._fy = 0;
            this._filterArea = new Rectangle();
        }
        onBitmapLoad(bitmap) {
            if (bitmap !== this._bitmap) return false;
            const texture = this._texture;
            const baseTexture = bitmap.baseTexture;
            const width = bitmap.width;
            const height = bitmap.height;
            if (width === 1 && height === 1) return false;
            texture.source = baseTexture;
            bitmap.initGpuTexture();
            this.initOriginFrame();
            //强制更新视图,防止因为纹理尺寸uv相同不更新
            this.onViewUpdate();
            return true;
        }
        initOriginFrame() {
            const bitmap = this._bitmap;
            const width = bitmap.width;
            const height = bitmap.height;
            this.setFrame(0, 0, width, height);
        }
        setFrame(x, y, width, height) {
            const sizeChange = this._width !== width || this._height !== height;
            if (this._fx !== x || this._fy !== y || sizeChange) {
                this._fx = x;
                this._fy = y;
                this._width = width;
                this._height = height;
                this._texture.setFrame(x, y, width, height);
                this.updateFilterArea(width, height);
                if (sizeChange) this._updateBounds();
                this.onViewUpdate();
            }
        }
        updateFilterArea(width, height) {
            const rect = this._filterArea;
            rect.width = width;
            rect.height = height;
            const anchor = this._anchor;
            rect.x = -anchor._x * width;
            rect.y = -anchor._y * height;
        }
        destroy() {
            this._ColorFilter = null;
            this._filterArea = null;
            if (this._bitmap) {
                this._bitmap.unRefer();
            }
            this._bitmap = null;
            super.destroy(DESTROY_OPTIONS);
        }
        hide() {
            this.alpha = 0;
        }
        show() {
            this.alpha = 1;
        }
        setBlendColor(r, g, b, a) {
            if (Zaun.LightingSystem) {
                return;
            }
            if (this._ColorFilter === void 0) {
                this.createColorFilter();
            }
            this._ColorFilter.setBlendColor(r, g, b, a);
        }
        setColorTone(r, g, b, a) {
            if (Zaun.LightingSystem) {
                return;
            }
            if (this._ColorFilter === void 0) {
                this.createColorFilter();
            }
            this._ColorFilter.setColorTone(r, g, b, a);
        }
        setHue(hue) {
            if (Zaun.LightingSystem) {
                return;
            }
            if (hue === 0) return;
            if (this._ColorFilter === void 0) {
                this.createColorFilter();
            }
            this._ColorFilter.setHue(hue);
        }
        createColorFilter() {
            if (this._ColorFilter != null) return;
            FilterManager.addFilter(this, "ColorFilter");
            this._filterEffect.filterArea = this._filterArea;
        }
        reset() {
            const gpuData = this._gpuData;
            if (gpuData !== null) {
                const batcherName = gpuData.batcherName;
                PoolCache[`${batcherName}BatchPool`].return(gpuData);
                this._gpuData = null;
            }
            super.reset();
            this.resetBitmap();
            FilterManager.removeFilter(this, "ColorFilter");
        }
        resetBitmap() {
            this.bitmap = null;
        }
    }

    const SpritePool = createPool("SpritePool", Sprite, 100);
    globalThis.Sprite = Sprite;

    class TilingSprite extends PIXI.TilingSprite {
        constructor(bitmap) {
            TextureOptions.source = EMPTY_SOURCE;
            const texture = new PIXI.Texture(TextureOptions);
            SpriteOptions.texture = texture;
            super(SpriteOptions);
            this.initProperties();
            this.initialize(bitmap);
        }
        get bitmap() {
            return this._bitmap;
        }
        set bitmap(value = null) {
            if (this._bitmap !== value) {
                if (this._bitmap !== null) {
                    this._bitmap.unRefer();
                    if (this._bitmap.canvasObj) {
                        ImageManager.returnBitmap(this._bitmap);
                    }
                }
                this._bitmap = value;
                if (value !== null) {
                    this.onBitmapChange(value);
                } else {
                    this.setEmptyTexture();
                }
            }
        }
        onBitmapChange(bitmap) {
            bitmap.refer();
            bitmap.onLoad(this.onBitmapLoad, this);
        }
        initProperties() {
            this.ox = 0;
            this.oy = 0;
            this._bitmap = null;
            this.imgWidth = 2;
            this.imgHeight = 2;
            this.fx = 0;
            this.fy = 0;
            this.fw = 0;
            this.fh = 0;
        }
        setEmptyTexture() {
            const texture = this._texture;
            texture.source = EMPTY_SOURCE;
            texture.setFrame(0, 0, 2, 2);
            this.imgWidth = 2;
            this.imgHeight = 2;
            this._width = 2;
            this._height = 2;
            this.fx = 0;
            this.fy = 0;
            this.fw = 0;
            this.fh = 0;
            this.visible = false;
            this._updateBounds();
            this.onViewUpdate();
        }
        initialize(bitmap) {
            this.bitmap = bitmap;
        }
        onBitmapLoad(bitmap) {
            if (bitmap !== this._bitmap) return false;
            const texture = this._texture;
            const baseTexture = bitmap.baseTexture;
            const width = bitmap.width;
            const height = bitmap.height;
            if (width === 1 && height === 1) {
                return false;
            }
            this.visible = true;
            texture.source = baseTexture;
            const style = baseTexture._style;
            style.addressMode = "repeat";
            this.imgWidth = width;
            this.imgHeight = height;
            bitmap.initGpuTexture();
            this.initOriginFrame();
            this.onViewUpdate();
            return true;
        }
        initOriginFrame() {
            const bitmap = this._bitmap;
            this.setFrame(0, 0, bitmap.width, bitmap.height);
        }
        destroy() {
            if (this._bitmap) {
                this._bitmap.unRefer();
            }
            this._bitmap = null;
            super.destroy(DESTROY_OPTIONS);
        }
        move(x = 0, y = 0, width = 1, height = 1) {
            this._position.set(x, y);
            this.setSize(width, height);
        }
        setFrame(x, y, width, height) {
            if (x !== this.fx || y !== this.fy || width !== this.fw || height !== this.fh) {
                this._texture.setFrame(x, y, width, height);
                this.onViewUpdate();
            }
        }
        update(ox = 0, oy = 0) {
            if (this.ox !== ox || this.oy !== oy) {
                this.ox = ox;
                this.oy = oy;
                this._tileTransform.position.set(ox, oy);
                this.onViewUpdate();
            }
        }
    }
    globalThis.TilingSprite = TilingSprite;

    const BUTTON_TABLE = {
        cancel: { x: 0, w: 2 },
        pageup: { x: 2, w: 1 },
        pagedown: { x: 3, w: 1 },
        down: { x: 4, w: 1 },
        up: { x: 5, w: 1 },
        down2: { x: 6, w: 1 },
        up2: { x: 7, w: 1 },
        ok: { x: 8, w: 2 },
        menu: { x: 10, w: 1 },
    };
    const BUTTON_FRAME_CACHE = Object.create(null);
    function getButtonFrames(type) {
        let frames = BUTTON_FRAME_CACHE[type];
        if (frames === void 0) {
            const data = BUTTON_TABLE[type];
            const x = data.x * 48;
            const w = data.w * 48;
            const h = 48;
            BUTTON_FRAME_CACHE[type] = frames = {
                hotFrame: new Rectangle(x, h, w, h),
                coldFrame: new Rectangle(x, 0, w, h)
            }
        }
        return frames;
    }
    class Sprite_Button extends Sprite {
        get width() {
            return this._hotFrame.width;
        }
        get height() {
            return this._hotFrame.height;
        }
        initialize(buttonType) {
            super.initialize()
            this._buttonType = buttonType;
            this.setupFrames();
            this.on("touchDown", this.onTouchDown, this);
            this.on("touchUp", this.onTouchUp, this);
            this.on("touchLeave", this.onTouchLeave, this);
            this.enableUpdate();
        }
        initProperties() {
            super.initProperties();
            this._clickHandler = null;
            this._coldFrame = null;
            this._hotFrame = null;
        }
        initOriginFrame() {
            const frame = this._coldFrame;
            const width = frame.width;
            const height = frame.height;
            Clickable.setHitArea(0, 0, width, height, this);
            this.refreshButtonFrame(frame);
        }
        update() {
            Clickable.updateClickable(this);
        }
        refreshButtonFrame(frame) {
            this.setFrame(frame.x, frame.y, frame.width, frame.height);
        }
        registerConfig() {
            this.alpha = ConfigManager.data.touchUI ? 1 : 0;
            ConfigManager.on("touchUI", this.onVisibleChange, this);
        }
        unregisterConfig() {
            this.alpha = ConfigManager.data.touchUI ? 1 : 0;
            ConfigManager.off("touchUI", this.onVisibleChange, this);
        }
        onVisibleChange(visible) {
            this.alpha = visible ? 1 : 0;
        }
        setupFrames() {
            const frames = getButtonFrames(this._buttonType);
            this._coldFrame = frames.coldFrame;
            this._hotFrame = frames.hotFrame;
            this.opacity = 192;
            this.loadButtonImage();
        }
        onTouchDown() {
            this.refreshButtonFrame(this._hotFrame);
        }
        onTouchUp() {
            this.refreshButtonFrame(this._coldFrame);
            if (this._clickHandler) {
                this._clickHandler();
            } else {
                Input.forceKeyDown(this._buttonType);
            }
            this.hovered = false;
        }
        onTouchLeave() {
            this.refreshButtonFrame(this._coldFrame);
        }
        loadButtonImage() {
            this.bitmap = ImageManager.loadSystem("ButtonSet");
        }
        buttonData() {
            return BUTTON_TABLE[this._buttonType];
        }
        setClickHandler(method) {
            this._clickHandler = method;
        }
    }

    class Sprite_Timer extends Sprite {
        initialize() {
            super.initialize();
            this.createBitmap();
            this.updatePosition();
        }
        initProperties() {
            super.initProperties();
            this._seconds = 0;
        }
        createBitmap() {
            const bitmap = this.bitmap = new Bitmap(96, 48);
            bitmap.fontFace = this.fontFace();
            bitmap.fontSize = this.fontSize();
            bitmap.outlineColor = ColorManager.outlineColor();
        }
        fontFace() {
            return $gameSystem.numberFontFace();
        }
        fontSize() {
            return $gameSystem.mainFontSize() + 8;
        }
        update() {
            const seconds = $gameTimer.seconds();
            if (this._seconds !== seconds) {
                this._seconds = seconds;
                this.redraw();
            }
        }
        redraw() {
            const text = this.timerText();
            const bitmap = this.bitmap;
            const width = bitmap.width;
            const height = bitmap.height;
            bitmap.clear();
            bitmap.drawText(text, 0, 0, width, height, "center");
            bitmap.update();
        }
        timerText() {
            const seconds = this._seconds;
            const min = Math.floor(seconds / 60) % 60;
            const sec = seconds % 60;
            return min.padZero(2) + ":" + sec.padZero(2);
        }
        updatePosition() {
            const screen = Engine.screen;
            const x = (screen.width - 96) / 2;
            this._position.set(x, 0);
        }
    }


    class VideoSprite extends Sprite {
        initProperties() {
            super.initProperties();
            this._video = null;
            this._onVideoLoad = this.onVideoLoad.bind(this);
            this._onVideoEnd = this.onVideoEnd.bind(this);
            this._onVideoStart = this.onVideoStart.bind(this);
        }
        get video() {
            return this._video;
        }
        set video(value) {
            if (this._video !== value) {
                if (this._video !== null) {
                    this._video.pause();
                    this._video.startListener = Function.empty;
                    this._video.endListener = Function.empty;
                }
                this._video = value;
                value.endListener = this._onVideoEnd;
                value.startListener = this._onVideoStart;
                value.setLoadListener(this._onVideoLoad);
            }
        }
        play() {
            this._video.play();
        }
        pause() {
            this._video.pause();
        }
        onVideoLoad(video) {
            const width = video.width;
            const height = video.height;
            const source = video.textureSource;
            const texture = this._texture;
            texture.source = source;
            texture.noFrame = false;
            this.setFrame(0, 0, width, height);
        }
        onVideoStart() {

        }
        onVideoEnd() {

        }
        destroy() {
            if (this._video !== null) {
                this._video.startListener = Function.empty;
                this._video.endListener = Function.empty;
                if (this._video.isPlaying) {
                    this._video.pause();
                }
                this._video = null;
            }
            super.destroy();
        }
    }

    class Sprite_Frame extends Sprite {
        initProperties() {
            super.initProperties();
            /**
             * 动画等待时间
             * @type {number}
             */
            this.waitCount = 20;
            /**
             * 动画时间计数
             * @type {number}
             */
            this.timeCount = 0;
            /**
             * 动画帧和名称的映射
             * @type {Object}
             */
            this.motions = Object.create(null);
            /**
             * 动画是否正在播放
             * @type {boolean}
             */
            this.active = false;
            /**
             * 当前动画的帧索引
             * @type {number}
             */
            this.frameIndex = -1;
            /**
             * 当前动画
             * @type {Object}
             */
            this.currentMotion = null;
            /**
             * 当前动画的名称
             * @type {string}
             */
            this.currentMotionName = String.empty;
            /**
             * 是否自动更新
             * @type {boolean}
             */
            this.autoUpdate = true;
            /**
             * 是否冻结动画
             * @type {boolean}
             */
            this.isFreeze = false;
        }
        resetFrame() {
            this.active = false;
            this.timeCount = 0;
            this.frameIndex = -1;
            this.currentMotion = null;
            this.currentMotionName = String.empty;
            this.isFreeze = false;
        }
        onBitmapLoad(bitmap) {
            if (bitmap !== this._bitmap) return false;
            const texture = this._texture;
            const baseTexture = bitmap.baseTexture;
            const width = bitmap.width;
            const height = bitmap.height;
            if (width === 1 && height === 1) {
                return false;
            }
            texture.source = baseTexture;
            bitmap.initGpuTexture();
            this.createFrames(width, height);
            if (this.autoUpdate) this.enableUpdate();
            return true;
        }
        play(animationName) {
            if (this.isFreeze === true) return;
            if (this.currentMotionName !== animationName) {
                this.currentMotionName = animationName;
                this.currentMotion = this.motions[animationName];
                this.active = true;
                this.frameIndex = 0;
                this.timeCount = this.waitCount;
            }
        }
        forcePlay(animationName) {
            if (this.isFreeze === true) return;
            this.currentMotionName = animationName;
            this.currentMotion = this.motions[animationName];
            this.active = true;
            this.frameIndex = 0;
            this.timeCount = this.waitCount;
        }
        freezeAnimationFrame(animationName, frameIndex) {
            if (this.isFreeze === true) return;
            this.currentMotionName = animationName || this.currentMotionName;
            this.currentMotion = this.motions[this.currentMotionName];
            this.frameIndex = frameIndex;
            this.timeCount = this.waitCount;
            this.updateAnimation();
            this.active = false;
            this.isFreeze = true;
        }
        unfreezeAnimationFrame(newAnimationName) {
            if (this.isFreeze === false) return;
            newAnimationName = newAnimationName || this.currentMotionName;
            this.play(newAnimationName);
            this.isFreeze = false;
        }
        update() {
            if (this.active === false) {
                this.updateUnActive();
                return;
            }
            this.updateAnimation();
        }
        updateUnActive() { }
        updateAnimation() {
            this.timeCount += 1;
            if (this.timeCount >= this.waitCount) {
                const motion = this.currentMotion;
                const maxFrame = motion.maxFrame;
                const frames = motion.frames;
                const loop = motion.loop;
                const frame = frames[this.frameIndex];
                this.setFrame(frame.x, frame.y, frame.width, frame.height);
                this.frameIndex++;
                if (this.frameIndex >= maxFrame) {
                    this.frameIndex = 0;
                    this.active = loop;
                }
                this.timeCount = 0;
            }
        }
        createFrames(_width, _height) { }
        destroy(options) {
            this.currentMotion = null;
            this.motions = null;
            super.destroy(options);
        }
        reset() {
            super.reset();
            this.active = false;
            this.frameIndex = -1;
            this.currentMotion = null;
            this.currentMotionName = String.empty;
            this.timeCount = 0;
        }
    }
    const CHARACTER_FRAME_CACHE = Object.create(null);
    function characterIndexToFrameIndex(characterIndex) {
        let opt = CHARACTER_FRAME_CACHE[characterIndex];
        if (opt !== void 0) return opt;
        //0-7
        let baseIndex = characterIndex * 8;
        if (characterIndex < 4) {
            CHARACTER_FRAME_CACHE[characterIndex] = opt = {
                8: baseIndex + 3,
                6: baseIndex + 2,
                2: baseIndex + 0,
                4: baseIndex + 1
            }
            return opt;
        }
        const originIndex = characterIndex;
        characterIndex = characterIndex % 4;
        baseIndex = characterIndex * 8;
        CHARACTER_FRAME_CACHE[originIndex] = opt = {
            8: baseIndex + 7,
            6: baseIndex + 6,
            2: baseIndex + 4,
            4: baseIndex + 5
        }
        return opt;
    }

    const BalloonMotions = Object.create(null);
    function getBalloonFrame(balloonId) {
        let balloonFrames = BalloonMotions[balloonId];
        if (balloonFrames === void 0) {
            balloonFrames = BalloonMotions[balloonId] = Object.create(null);
            const frames = new Array(7);
            const sy = (balloonId - 1) * 48;
            for (let i = 0; i < 7; i++) {
                const sx = i * 48;
                frames[i] = new Rectangle(sx, sy, 48, 48);
            }
            balloonFrames.frames = frames;
            balloonFrames.loop = false;
            balloonFrames.maxFrame = 7;
        }
        return balloonFrames;
    }
    class Sprite_Balloon extends Sprite_Frame {
        initProperties() {
            super.initProperties();
            this.balloonId = 0;
            this.z = 7;
            this.character = null;
            this.waitCount = 12;
        }
        initialize(bitmap) {
            super.initialize(bitmap);
            this._anchor.set(0.5, 1);
        }
        setup(balloonId, character) {
            this.character = character;
            this.balloonId = balloonId;
            character._balloonPlaying = true;
            const bitmap = ImageManager.loadSystem("Balloon");
            this._texture.source = bitmap.baseTexture;
            this.createFrames();
        }
        createFrames() {
            const balloonId = this.balloonId;
            const motions = this.motions;
            const motion = getBalloonFrame(balloonId);
            motions[balloonId] = motion;
            this.play(balloonId);
            this.alpha = 1;
            this.enableUpdate();
        }
        updateUnActive() {
            SPRITE_BALLOON_POOL.return(this);
        }
        reset() {
            super.reset();
            this.alpha = 0;
            this.character._balloonPlaying = false;
            this.character = null;
            this.currentMotionName = String.empty;
            this.motions = Object.create(null);
            this.balloonId = 0;
        }
    }
    const SPRITE_BALLOON_POOL = createPool("Sprite_BalloonPool", Sprite_Balloon, 100);

    class AnimationMv_Pool {
        constructor() {
            this.pool = Object.create(null);
        }
        get(animation) {
            const id = animation.id;
            let motions = this.pool[id];
            if (motions === void 0) {
                const frames = animation.frames;
                const length = frames.length;
                const w = 192;
                const h = 192;
                const bundle = ImageBundlePool.get();
                bundle.setPathAndCompressed("img/animations/", false);
                const name1 = animation.animation1Name;
                const name2 = animation.animation2Name;
                bundle.load(name1, name2);
                motions = {};
                let motionCount = 0;
                let maxSprites = 0;
                for (let i = 0; i < length; i++) {
                    const frame = frames[i];
                    if (frame.length > 0) {
                        const motion = {};
                        const spriteSettings = [];
                        let framecount = 0;
                        for (let j = 0; j < frame.length; j++) {
                            const baseFrame = frame[j];
                            const pattern = baseFrame[0];
                            if (pattern >= 0) {
                                const mirror = baseFrame[5] === 1 ? -1 : 1;
                                const sx = (pattern % 5) * 192;
                                const sy = Math.floor((pattern % 100) / 5) * 192;
                                const rect = new Rectangle(sx, sy, w, h);
                                const setting = {};
                                setting.frame = rect;
                                setting.bitmapIndex = pattern < 100 ? 0 : 1;
                                setting.hue = pattern < 100 ? animation.animation1Hue : animation.animation2Hue;
                                setting.spriteIndex = j;
                                setting.mirror = mirror;
                                if (maxSprites < j + 1) maxSprites = j + 1;
                                setting.x = baseFrame[1];
                                setting.y = baseFrame[2];
                                setting.rotation = baseFrame[4] * Math.angle;
                                setting.scale = baseFrame[3] / 100;
                                setting.opacity = baseFrame[6];
                                spriteSettings[framecount++] = setting;
                            }
                        }
                        motion.settings = spriteSettings;
                        motions[motionCount++] = motion;
                    }
                }
                motions.maxSprites = maxSprites;
                motions.maxFrame = motionCount;
                motions.bundle = bundle;
                this.pool[id] = motions;
            }
            return motions;
        }
    }
    const MvAnimationPool = new AnimationMv_Pool();

    class Sprite_MvAnimation extends Sprite {
        initialize(bitmap) {
            super.initialize(bitmap);
            this.scale.set(1, 1);
            this._anchor.set(0.5, 0.5);
        }
        initOriginFrame() {
            //nothing
        }
    }
    const Sprite_MvAnimationPool = createPool("Sprite_MvAnimationPool", Sprite_MvAnimation, 100);

    class Sprite_Animation extends Container {
        static ORIGIN_POINT = new Point(0, 0);
        static OUTPUT_POINT = new Point(0, 0);
        static TARGETS = [];
        constructor() {
            super();
            this.targets = [];
            this.targetObjects = [];
            this.animation = null;
            this.mirror = false;
            this.targetCount = 0;
            this.z = 8;
            this.initBaseParams();
        }
        initBaseParams() {
            this.duration = 0;
            this.waitCount = 4;
            this.frameCount = 0;
            this.frameIndex = 0;
            this.maxFrame = 0;
            this.maxSprites = 0;
            this.motions = null;
            this.bitmaps = null;
            this.flashColor = [0, 0, 0, 0];
            this.flashDuration = 0;
            this.hidingDuration = 0;
            this.container = null;
            this.isFullScreen = false;
        }
        addTarget(target, targetSprite) {
            this.targetObjects[this.targetCount] = target;
            this.targets[this.targetCount] = targetSprite;
            this.targetCount++;
            target.startAnimation && target.startAnimation();
        }
        setup(animation, mirror, container) {
            this.container = container;
            this.animation = animation;
            this.mirror = mirror ? -1 : 1;
            this.createFrameSprites(animation);
            if (animation.position === 3) {
                const screen = Engine.screen;
                const x = screen.width / 2;
                const y = screen.height / 2;
                this._position.set(x, y);
                this.isFullScreen = true;
            } else {
                this.isFullScreen = false;
            }
            this.motions.bundle.onLoad(this.onLoad, this);
        }
        createFrameSprites(animation) {
            this.motions = MvAnimationPool.get(animation);
            this.maxFrame = this.motions.maxFrame;
            this.maxSprites = this.motions.maxSprites;
            this.duration = (this.maxFrame - 1) * this.waitCount;
            for (let k = 0; k < this.maxSprites; k++) {
                const sprite = Sprite_MvAnimationPool.get();
                this.addChild(sprite);
            }
        }
        update() {
            this.updateFrames();
            this.updateFlash();
            this.updateHiding();
            this.updateTargetPosition();
        }
        updateFrames() {
            this.frameCount += 1;
            if (this.frameCount >= this.waitCount) {
                this.frameCount = 0;
                if (this.frameIndex < this.maxFrame) {
                    const mirror = this.mirror;
                    const children = this.children;
                    const bitmaps = this.bitmaps;
                    const animation = this.animation;
                    const timings = animation.timings;
                    for (let i = 0, length = timings.length; i < length; i++) {
                        const timing = timings[i];
                        if (timing.frame === this.frameIndex) {
                            this.processTimingData(timing);
                        }
                    }
                    const motion = this.motions[this.frameIndex++];
                    const settings = motion.settings;
                    for (let i = 0; i < this.maxSprites; i++) {
                        children[i].opacity = 0;
                    }
                    for (let i = 0; i < settings.length; i++) {
                        const setting = settings[i];
                        const frame = setting.frame;
                        const bitmapIndex = setting.bitmapIndex;
                        const spriteIndex = setting.spriteIndex;
                        const frameMirror = setting.mirror;
                        const x = setting.x;
                        const y = setting.y;
                        const hue = setting.hue;
                        const rotation = setting.rotation;
                        const scale = setting.scale;
                        const opacity = setting.opacity;
                        const bitmap = bitmaps[bitmapIndex];
                        const sprite = children[spriteIndex];
                        sprite.bitmap = bitmap;
                        sprite.setFrame(frame.x, frame.y, frame.width, frame.height);
                        sprite._position.set(x * mirror, y);
                        const realScaleX = scale * mirror * frameMirror;
                        sprite._scale.set(realScaleX, scale);
                        sprite.rotation = rotation * mirror;
                        sprite.opacity = opacity;
                        hue > 0 && sprite.setHue(hue);
                    }
                } else {
                    this.onEnd();
                }
            }
        }
        updateFlash() {
            if (this.flashDuration > 0) {
                const d = this.flashDuration--;
                const flashColor = this.flashColor;
                flashColor[3] *= (d - 1) / d;
                const count = this.targetCount;
                const targets = this.targets;
                const colorR = flashColor[0];
                const colorG = flashColor[1];
                const colorB = flashColor[2];
                const colorA = flashColor[3];
                for (let i = 0; i < count; i++) {
                    const target = targets[i];
                    target.setBlendColor(colorR, colorG, colorB, colorA);
                }
            }
        }
        updateHiding() {
            if (this.hidingDuration > 0) {
                this.hidingDuration--;
                if (this.hidingDuration === 0) {
                    const count = this.targetCount;
                    const targets = this.targets;
                    for (let i = 0; i < count; i++) {
                        const target = targets[i];
                        target.alpha = 1;
                    }
                }
            }
        }
        onLoad(bundle) {
            this.frameIndex = 0;
            this.frameCount = this.waitCount;
            this.bitmaps = bundle.bitmaps;
            GlobalEvent.on("update", this, 0, this.duration)
                .onComplete("onEnd")
        }
        targetSpritePosition(sprite, animation) {
            sprite.checkWorldTransform();
            sprite.updateWorldTransform();
            const transform = sprite._worldTransform;
            const point = Sprite_Animation.OUTPUT_POINT;
            transform.apply(Sprite_Animation.ORIGIN_POINT, point);
            if (animation.position === 0) {
                point.y -= sprite._height;
            } else if (animation.position === 1) {
                point.y -= sprite._height / 2;
            }
            return point;
        }
        updateTargetPosition() {
            if (this.isFullScreen) return;
            const targets = this.targets;
            const count = this.targetCount;
            const animation = this.animation;
            let x = 0, y = 0;
            for (let i = 0; i < count; i++) {
                const sprite = targets[i];
                const pos = this.targetSpritePosition(sprite, animation);
                x += pos.x;
                y += pos.y;
            }
            x /= count;
            y /= count;
            this._position.set(x, y);
        }
        processTimingData(timing) {
            const duration = timing.flashDuration * 4;
            switch (timing.flashScope) {
                case 1:
                    this.startFlash(timing.flashColor, duration);
                    break;
                case 2:
                    break;
                case 3:
                    this.startHiding(duration);
                    break;
            }
            if (timing.se) {
                AudioManager.playSe(timing.se);
            }
        }
        startFlash(color, duration) {
            const flashColor = this.flashColor;
            flashColor[0] = color[0];
            flashColor[1] = color[1];
            flashColor[2] = color[2];
            flashColor[3] = color[3];
            this.flashDuration = duration;
        }
        startHiding(duration) {
            this.hidingDuration = duration;
            const targets = this.targets;
            const count = this.targetCount;
            for (let i = 0; i < count; i++) {
                targets[i].alpha = 0;
            }
        }
        onEnd() {
            this.flashDuration = 0;
            this.hidingDuration = 0;
            const targets = this.targets;
            const count = this.targetCount;
            for (let i = 0; i < count; i++) {
                const target = targets[i];
                const mainSprite = target.mainSprite || target.battlerSprite;
                FilterManager.removeFilter(mainSprite, "ColorFilter");
                target.alpha = 1;
            }
            AnimationPool.return(this);
        }
        removeAllChildren() {
            const children = this.children;
            const renderGroup = this.parentRenderGroup;
            const hasRenderGroup = renderGroup !== null;
            for (let i = children.length - 1; i > -1; i--) {
                const child = children[i];
                hasRenderGroup && renderGroup.removeChild(child);
                child.parent = null;
                Sprite_MvAnimationPool.return(child);
            }
            this._didViewChangeTick++;
            children.length = 0;
        }
        reset() {
            super.reset();
            this.bitmaps = null;
            this.isFullScreen = false;
            this.removeAllChildren();
            this.maxSprites = 0;
            this.targetCount = 0;
            const targetObjects = this.targetObjects;
            for (let i = 0; i < targetObjects.length; i++) {
                const target = targetObjects[i];
                target.endAnimation && target.endAnimation();
            }
            targetObjects.clear();
            this.motions = null;
            this.duration = 0;
            this.targets.clear();
            this.container.onAnimationEnd();
            this.container = null;
        }
    }
    const AnimationPool = createPool("AnimationPool", Sprite_Animation, 100);

    /**
     * @description 一个用来在菜单显示行走图的类
     */
    class Sprite_MenuCharacter extends Sprite_Frame {
        initProperties() {
            super.initProperties();
            this.character = null;
            this.characterName = String.empty;
            this.isBigCharacter = false;
        }
        setCharacter(character) {
            if (this.character !== character) {
                this.character = character;
                this.characterName = character.characterName();
                if (this.characterName === String.empty) {
                    this.alpha = 0;
                    return;
                }
                const characterName = this.characterName;
                this.isBigCharacter = ImageManager.isBigCharacter(characterName);
                this.isElementCharacter = ImageManager.isElementCharacter(characterName);
                this.bitmap = ImageManager.loadCharacter(this.characterName);
            }
        }
        createFrames(width, height) {
            const character = this.character;
            const characterName = character.characterName();
            const isBigCharacter = ImageManager.isBigCharacter(characterName);
            const w = width / (isBigCharacter ? 3 : 12);
            const h = height / (isBigCharacter ? 4 : 8);
            const motions = this.motions;
            const indexs = characterIndexToFrameIndex(character.characterIndex());
            const isElementCharacter = this.isElementCharacter;
            const frameH = isElementCharacter ? h - 48 : h;
            const index = indexs[4];
            const y = index % 8;
            if (motions["4"] !== void 0) {
                const motion = motions["4"];
                const frames = motion.frames;
                for (let i = 0; i < 4; i++) {
                    if (i === 3) {
                        frames[i] = frames[1];
                    } else {
                        const x = index < 8 ? i : index < 16 ? 3 + i : index < 24 ? 6 + i : 9 + i;
                        const frame = frames[i];
                        frame.x = x * w;
                        frame.y = y * h;
                        frame.width = w;
                        frame.height = frameH;
                    }
                }
            } else {
                const motion = Object.create(null);
                const frames = new Array(4);
                for (let i = 0; i < 4; i++) {
                    if (i === 3) {
                        frames[i] = frames[1];
                    } else {
                        const x = index < 8 ? i : index < 16 ? 3 + i : index < 24 ? 6 + i : 9 + i;
                        frames[i] = new Rectangle(x * w, y * h, w, frameH);
                    }
                }
                motion.frames = frames;
                motion.loop = true;
                motion.maxFrame = 4;
                motions["4"] = motion;
            }
            const currentFrame = motions["4"].frames[0];
            this.setFrame(currentFrame.x, currentFrame.y, currentFrame.width, currentFrame.height);
            this.play("4");
            this.enableUpdate();
        }
        checkNormalBitmap(_bitmap) {
            //nothing for menu
        }
    }
    createPool("SpriteMenuCharacterPool", Sprite_MenuCharacter, 100);

    const BATTLE_MOTIONS = {
        walk: { index: 0, loop: true, frames: 4 },
        wait: { index: 1, loop: true, frames: 4 },
        chant: { index: 2, loop: true, frames: 4 },
        guard: { index: 3, loop: true, frames: 4 },
        damage: { index: 4, loop: false, frames: 4 },
        evade: { index: 5, loop: false, frames: 4 },
        thrust: { index: 6, loop: false, frames: 4 },
        swing: { index: 7, loop: false, frames: 4 },
        missile: { index: 8, loop: false, frames: 4 },
        skill: { index: 9, loop: false, frames: 4 },
        spell: { index: 10, loop: false, frames: 4 },
        item: { index: 11, loop: false, frames: 4 },
        escape: { index: 12, loop: true, frames: 4 },
        victory: { index: 13, loop: true, frames: 4 },
        dying: { index: 14, loop: true, frames: 4 },
        abnormal: { index: 15, loop: true, frames: 4 },
        sleep: { index: 16, loop: true, frames: 4 },
        dead: { index: 17, loop: true, frames: 4 },
    };
    const BATTLE_MOTION_NAMES = Reflect.ownKeys(BATTLE_MOTIONS);

    class Sprite_BattlerEx extends Sprite_Frame {
        initProperties() {
            this.battler = null;
            this.battlerName = String.empty;
            this.isElementCharacter = false;
            super.initProperties();
            this.waitCount = 12;
            this.autoUpdate = false;
        }
        initialize(bitmap) {
            super.initialize(bitmap);
            this.scale.set(1, 1);
        }
        checkBattlerName() {
            const battlerName = this.battler.battlerName();
            if (this.battlerName !== battlerName) {
                this.battlerName = battlerName;
                this.isElementCharacter = ImageManager.isElementCharacter(battlerName);
                this.bitmap = ImageManager.loadSvActor(battlerName);
            }
        }
        onBitmapLoad(bitmap) {
            const isValid = super.onBitmapLoad(bitmap);
            if (isValid) this.battler.emit("loaded", bitmap);
            return isValid;
        }
        setBattler(battler) {
            this.battler = battler;
            const isEnemy = battler.isEnemy();
            this._scale.x = isEnemy ? -1 : 1;
            this.checkBattlerName();
        }
        createFrames(width, height) {
            const w = width / 9,
                h = height / 6;
            const motions = this.motions;
            const isElementCharacter = this.isElementCharacter;
            const frameH = isElementCharacter ? h - 48 : h;
            for (const key of BATTLE_MOTION_NAMES) {
                const motion = BATTLE_MOTIONS[key];
                const index = motion.index;
                const frames = motion.frames;
                const loop = motion.loop;
                const y = index % 6;
                if (motions[key] !== void 0) {
                    const cur = motions[key].frames;
                    for (let i = 0; i < frames; i++) {
                        const frame = cur[i];
                        if (i === 3) {
                            cur[i] = cur[1];
                        } else {
                            const x = (index < 6 ? i : index < 12 ? 3 + i : 6 + i) * w;
                            frame.x = x;
                            frame.y = y * h;
                            frame.width = w;
                            frame.height = frameH;
                        }
                    }
                } else {
                    const cur = new Array(frames);
                    for (let i = 0; i < frames; i++) {
                        if (i === 3) {
                            cur[i] = cur[1];
                        } else {
                            const x = (index < 6 ? i : index < 12 ? 3 + i : 6 + i) * w;
                            cur[i] = new Rectangle(x, y * h, w, frameH);
                        }
                    }
                    motions[key] = {
                        frames: cur,
                        maxFrame: frames,
                        loop,
                    };
                }
            }
            const motionWalk = motions["walk"];
            const frame = motionWalk.frames[0];
            this.setFrame(frame.x, frame.y, frame.width, frame.height);
        }
        updateUnActive() {
            if (this.isFreeze === true) return;
            this.refreshMotion();
        }
        refreshMotion() {
            const battler = this.battler;
            if (this.currentMotionName === "guard" && !BattleManager._isInputting) return;
            const stateMotion = battler.stateMotionIndex();
            if (battler.isInputting() || battler.isActing()) {
                this.play("walk");
            } else if (stateMotion === 3) {
                this.play("dead");
            } else if (stateMotion === 2) {
                this.play("sleep");
            } else if (battler.isChanting()) {
                this.play("chant");
            } else if (battler.isGuard() || battler.isGuardWaiting()) {
                this.play("guard");
            } else if (stateMotion === 1) {
                this.play("abnormal");
            } else if (battler.isDying()) {
                this.play("dying");
            } else if (battler.isUndecided()) {
                this.play("walk");
            } else {
                this.play("wait");
            }
        };
        reset() {
            super.reset();
            this.battler = null;
            this.battlerName = String.empty;
        }
    }

    class Sprite_MenuBattler extends Sprite_BattlerEx {
        initProperties() {
            super.initProperties();
            this.autoUpdate = true;
        }
        updateUnActive() {
            // nothing todo
        }
        createFrames(width, height) {
            super.createFrames(width, height);
            this.play("wait");
        }
        checkNormalBitmap(_bitmap) {
            //nothing for menu
        }
    }
    createPool("SpriteMenuBattlerPool", Sprite_MenuBattler, 100);

    class Sprite_BattlerStatic extends Sprite {
        initialize(bitmap) {
            super.initialize(bitmap);
            this.scale.set(1, 1);
        }
        initProperties() {
            super.initProperties();
            this.battler = null;
            this.battlerName = String.empty;
        }
        refreshMotion = Function.empty;
        checkBattlerName() {
            const battlerName = this.battler.battlerName();
            if (this.battlerName !== battlerName) {
                this.battlerName = battlerName;
                this.bitmap = ImageManager.loadSvEnemy(battlerName);
            }
        }
        onBitmapLoad(bitmap) {
            const isValid = super.onBitmapLoad(bitmap);
            if (isValid) this.battler.emit("loaded", bitmap);
            return isValid;
        }
        setBattler(battler) {
            this.battler = battler;
            this.checkBattlerName();
        }
        forcePlay = Function.empty;
        play = Function.empty;
        freezeAnimationFrame = Function.empty;
        unfreezeAnimationFrame = Function.empty;
        initOriginFrame() {
            const bitamp = this._bitmap;
            const width = bitamp.width;
            const height = bitamp.height;
            this.setFrame(0, 0, width, height);
        }
        reset() {
            super.reset();
            this.battler = null;
            this.battlerName = String.empty;
        }
    }

    const BattlerExPool = createPool("BattlerExPool", Sprite_BattlerEx, 50);

    const BattlerStaticPool = createPool("BattlerStaticPool", Sprite_BattlerStatic, 50);

    const StateOverlayMotions = Object.create(null);
    function getStateOverlayMotion(index) {
        let motion = StateOverlayMotions[index];
        if (motion === void 0) {
            motion = StateOverlayMotions[index] = Object.create(null);
            const w = 96;
            const h = 96;
            const y = (index - 1) * h;
            const frames = new Array(8);
            for (let i = 0; i < 8; i++) {
                const x = i * w;
                frames[i] = new Rectangle(x, y, w, h);
            }
            motion.frames = frames;
            motion.maxFrame = 8;
            motion.loop = true;
        }
        return motion;
    }

    class Sprite_StateOverlay extends Sprite_Frame {
        initialize(bitmap) {
            super.initialize(bitmap);
            this.scale.set(1, 1);
        }
        initProperties() {
            super.initProperties();
            this.waitCount = 8;
            this.battler = null;
            this.stateIndex = 0;
            this._anchor.set(0.5, 1);
            this.autoUpdate = false;
        }
        setup(battler) {
            this.battler = battler;
            const bitmap = ImageManager.loadSystem("States");
            this._texture.source = bitmap.baseTexture;
        }
        checkFrames() {
            const index = this.stateIndex;
            if (index === 0) {
                this.resetFrame();
                this.alpha = 0;
                return;
            }
            const motion = getStateOverlayMotion(index);
            this.motions[index] = motion;
            this.play(index);
            this.alpha = 1;
        }
        update() {
            super.update();
            this.checkBattlerStateIndex();
        }
        checkBattlerStateIndex() {
            const battler = this.battler;
            const index = battler.stateOverlayIndex();
            if (index !== this.stateIndex) {
                this.stateIndex = index;
                this.checkFrames();
            }
        }
    }

    const WeaponMotions = Object.create(null);
    function getWeaponMotion(index) {
        index = index - 1;
        let motion = WeaponMotions[index];
        if (motion === void 0) {
            motion = WeaponMotions[index] = Object.create(null);
            index = index % 12;
            const w = 96;
            const h = 64;
            const y = Math.floor(index % 6) * h;
            const frames = new Array(3);
            for (let i = 0; i < 3; i++) {
                const x = (Math.floor(index / 6) * 3 + i) * w;
                frames[i] = new Rectangle(x, y, w, h);
            }
            motion.frames = frames;
            motion.maxFrame = 3;
            motion.loop = false;
        }
        return motion;
    }

    class Sprite_Weapon extends Sprite_Frame {
        initialize(bitmap) {
            super.initialize(bitmap);
            this.scale.set(1, 1);
        }
        initProperties() {
            super.initProperties();
            this.waitCount = 12;
            this.weaponImageId = 0;
            this._anchor.set(0.5, 1);
            this.autoUpdate = false;
        }
        setup(weaponImageId) {
            if (weaponImageId === 0) return;
            const pageId = Math.floor((weaponImageId - 1) / 12) + 1;
            const bitmap = ImageManager.loadSystem("Weapons" + pageId);
            this._texture.source = bitmap.baseTexture;
            const motion = getWeaponMotion(weaponImageId);
            this.motions[weaponImageId] = motion;
            this.alpha = 1;
            this.play(weaponImageId);
        }
        freezeAnimationFrame(animationName, frameIndex) {
            if (frameIndex === -1) return;
            const pageId = Math.floor((animationName - 1) / 12) + 1;
            const bitmap = ImageManager.loadSystem("Weapons" + pageId);
            this._texture.source = bitmap.baseTexture;
            const motion = getWeaponMotion(animationName);
            this.motions[animationName] = motion;
            this.alpha = 1;
            super.freezeAnimationFrame(animationName, frameIndex);
        }
        unfreezeAnimationFrame(newAnimationName) {
            newAnimationName = newAnimationName || this.currentMotionName;
            const pageId = Math.floor((newAnimationName - 1) / 12) + 1;
            const bitmap = ImageManager.loadSystem("Weapons" + pageId);
            this._texture.source = bitmap.baseTexture;
            const motion = getWeaponMotion(newAnimationName);
            this.motions[newAnimationName] = motion;
            super.unfreezeAnimationFrame(newAnimationName);
        }
        updateUnActive() {
            if (this.isFreeze === true) return;
            if (this._visible === false) return;
            this.alpha = 0;
            this.resetFrame();
        }
    }


    class BattlerContainer extends Container {
        constructor() {
            super();
            this.initProperties();
            this.initialize();
        }
        initProperties() {
            /**
             * @description 伤害计数
             * @type {number}
             */
            this.damageCount = 0;
            /**
             * @description 战斗者
             * @type {Game_BattlerBase}
             */
            this.battler = null;
            /**
             * @description 选择效果计数
             * @type {number}
             */
            this.selectionEffectCount = 0;
            /**
             * @description 原点x坐标
             * @type {number}
             */
            this.homeX = 0;
            /**
             * @description 原点y坐标
             * @type {number}
             */
            this.homeY = 0;
            /**
             * @description 战斗精灵池
             * @type {Pool}
             */
            this.pool = null;
            /**
             * @description 移动值
             * @type {number}
             */
            this.moveValue = 1;
            /**
             * @description 移动动作
             * @type {Motion}
             */
            this.motion = null;
            /**
             * @description 战斗精灵
             * @type {Sprite_BattlerEx | Sprite_BattlerStatic}
             */
            this.battlerSprite = null;
            /**
             * @description 武器精灵
             * @type {Sprite_Weapon}
             */
            this.weaponSprite = null;
            /**
             * @description 容器
             * @type {PIXI.Container}
             */
            this.container = null;
        }
        initialize() {
            this.createSprites();
        }
        createSprites() {
            this.createContainer();
            this.createWeaponSprite();
        }
        createContainer() {
            const container = this.container = new PIXI.Container();
            this.addChild(container);
        }
        createWeaponSprite() {
            const sprite = this.weaponSprite = new Sprite_Weapon();
            this.container.addChild(sprite);
        }
        setBlendColor(r, g, b, a) {
            this.battlerSprite.setBlendColor(r, g, b, a);
        }
        setHue(value) {
            this.battlerSprite.setHue(value);
        }
        setColorTone(r, g, b, a) {
            this.battlerSprite.setColorTone(r, g, b, a);
        }
        show() {
            this.alpha = 1;
        }
        hide() {
            this.alpha = 0;
        }
        freezeAnimationFrame(motion, frameIndex, weaponImgId, weaponFrameIndex) {
            this.battlerSprite.freezeAnimationFrame(motion, frameIndex);
            this.weaponSprite.freezeAnimationFrame(weaponImgId, weaponFrameIndex);
        }
        unfreezeAnimationFrame(motion) {
            this.battlerSprite.unfreezeAnimationFrame(motion);
            this.weaponSprite.unfreezeAnimationFrame(null);
        }
        refreshMotion() {
            this.battlerSprite.refreshMotion();
        }
        setupWeaponAnimation(weaponImageId) {
            this.weaponSprite.setup(weaponImageId);
        }
        setBattler(battler = null) {
            if (this.battler !== battler) {
                if (battler === null) {
                    this.battler = null;
                    return;
                }
                this.checkBattlerSprite(battler);
            }
        }
        onBattlerRevive() {
            const battlerSprite = this.battlerSprite;
            battlerSprite.play("walk");
            battlerSprite.opacity = 255;
        }
        onActionStart() {
            const battler = this.battler;
            const sprite = this.battlerSprite;
            sprite.play("walk");
            sprite.opacity = battler._hidden ? 0 : 255;
        }
        setMirror(value) {
            const battlerSprite = this.battlerSprite;
            const scale = battlerSprite._scale;
            const currentScaleX = scale._x;
            const battler = this.battler;
            const isSvEnemy = battler.isEnemy() && battler._enableSv;
            value = isSvEnemy ? !value : value;
            if (currentScaleX > 0 && value === true) {
                scale.x *= -1;
                this.weaponSprite._scale.x *= -1;
                this.overlaySprite._scale.x *= -1;
            } else if (currentScaleX < 0 && value === false) {
                scale.x *= -1;
                this.weaponSprite._scale.x *= -1;
                this.overlaySprite._scale.x *= -1;
            }
        }
        isInHome() {
            const position = this._position;
            return position._x === this.homeX && position._y === this.homeY;
        }
        updateMove(arr) {
            this._position.set(arr[0], arr[1]);
        }
        onMoveEnd() {
            BattleManager.endMove();
            this.motion = null;
            if (this.isInHome() && this.gaugeSprite !== null) {
                this.gaugeSprite.alpha = 1;
            }
        }
        moveForward(distance, duration) {
            const targetX = this.homeX + distance;
            this.moveTo(targetX, this._position._y, duration);
        }
        moveTo(x, y, duration) {
            const position = this._position;
            const currentX = position._x;
            const currentY = position._y;
            if (currentX === x && currentY === y || this.moveTargetX === x && this.moveTargetY === y) return;
            let motion = this.motion;
            if (motion === null) {
                motion = this.motion = GlobalMotion.getMotion();
            } else {
                BattleManager.endMove();
                motion.reset()
                    .link();
            }
            if (this.gaugeSprite !== null) this.gaugeSprite.alpha = 0;
            this.moveTargetX = x;
            this.moveTargetY = y;
            BattleManager.startMove();
            motion.setAnimation(currentX, x, "linear")
                .setAnimation(currentY, y, "linear")
                .onUpdate("updateMove")
                .onComplete("onMoveEnd")
                .setFrames(duration)
                .start(this);
        }
        startMotion(motionType) {
            this.battlerSprite.play(motionType);
        }
        forceMotion(motionType) {
            this.battlerSprite.forcePlay(motionType);
        }
        stepToSubstitute(focus) {
            const target = focus.sprite();
            const widthOffset = target._width / 2;
            const targetX = target.homeX;
            const targetY = target.homeY;
            const focusX = targetX + this.moveValue * widthOffset;
            this.moveTo(focusX, targetY, 5);
        }
        stepFlinch() {
            const distance = -12 * this.moveValue;
            this.moveForward(distance, 6);
        }
        returnHome(frames = 12) {
            if (!this.isInHome()) {
                this.moveTo(this.homeX, this.homeY, frames);
            }
        }
        stepForward() {
            const pos = BattleManager._performStagePos;
            const position = this._position;
            if (position._x === pos.x && position._y === pos.y) {
                return;
            }
            this.moveTo(pos.x, pos.y, 12);
        }
        stepBack() {
            this.returnHome(12);
        }
        onLoad() {
            const sprite = this.battlerSprite;
            const frame = sprite._texture.frame;
            const w = frame.width;
            const h = frame.height;
            const x = -w / 2;
            const y = -h;
            this._width = w;
            this._height = h;
            Clickable.setHitArea(x, y, w, h, this);
            this.enableUpdate();
        }
        update() {
            Clickable.updateClickable(this);
            this.updateSprites();
        }
        updateSprites() {
            this.battlerSprite.update();
            this.overlaySprite.update();
            this.weaponSprite.update();
        }
        onTouchLeave() {
            BattleManager.onTargetSelect(null, "leave");
        }
        onTouchEnter() {
            BattleManager.onTargetSelect(this.battler, "enter");
        }
        onTouchDown() {
            BattleManager.onTargetSelect(this.battler, "clickDown");
        }
        select() {
            let runner = this.selectRunner;
            if (runner === null) {
                runner = GlobalEvent.on("updateSelectionEffect", this, 0, -1);
            }
            this.selectRunner = runner;
        }
        deselect() {
            if (this.selectRunner !== null) {
                GlobalEvent.off(this.selectRunner);
                this.selectRunner = null;
            }
            this.selectionEffectCount = 0;
            this.battlerSprite.setBlendColor(0, 0, 0, 0);
        }
        onBattleEnd() {
            this.disableUpdate();
        }
        onBattleStart(battler) {
            this.setBattler(battler);
            this.battlerSprite._bitmap.onLoad(this.onActionStart, this);
        }
        checkBattlerSprite(battler) {
            const isActor = battler.isActor();
            const isSvEnemy = battler._enableSv;
            const pool = isActor ? BattlerExPool : (isSvEnemy ? BattlerExPool : BattlerStaticPool);
            const weaponSprite = this.weaponSprite;
            weaponSprite._scale.x = isSvEnemy ? -1 : 1;
            weaponSprite._position.x = isSvEnemy ? 16 : -16;
            weaponSprite.visible = isSvEnemy || isActor;
            if (this.pool !== pool) {
                if (this.pool !== null) {
                    this.pool.return(this.battlerSprite);
                }
                this.pool = pool;
                const sprite = this.battlerSprite = pool.get();
                sprite._anchor.set(0.5, 1);
                this.container.addChild(sprite);
                sprite.setBattler(battler);
                this.battler = battler;
            } else {
                this.battler = battler;
                this.battlerSprite.setBattler(battler);
            }
        }
        setHome(x, y) {
            this.homeX = x;
            this.homeY = y;
            this._position.set(x, y);
        }
        updateSelectionEffect() {
            this.selectionEffectCount++;
            if (this.selectionEffectCount % 30 < 15) {
                this.battlerSprite.setBlendColor(255, 255, 255, 64);
            } else {
                this.battlerSprite.setBlendColor(0, 0, 0, 0);
            }
        }
        returnBattlerSprite() {
            if (this.battlerSprite !== null) {
                this.container.removeChild(this.battlerSprite);
                this.pool.return(this.battlerSprite);
                this.pool = null;
                this.battlerSprite = null;
            }
        }
        reset() {
            super.reset();
            this.returnBattlerSprite();
            this.damageCount = 0;
            this.moveValue = 1;
            this.resetSprites();
            this.homeX = 0;
            this.homeY = 0;
            this._width = 0;
            this._height = 0;
            this.moveTargetX = 0;
            this.moveTargetY = 0;
        }
        resetSprites() {
            this.setBattler(null);
            const weaponSprite = this.weaponSprite;
            weaponSprite._scale.set(1, 1);
            weaponSprite.visible = true;
            weaponSprite._position.x = 0;
        }
    }

    createPool("BattlerContainerPool", BattlerContainer, 50);

    SpriteCore.VideoSprite = VideoSprite;
    SpriteCore.MvAnimationPool = MvAnimationPool;
    SpriteCore.Sprite_Timer = Sprite_Timer;
    SpriteCore.Sprite_Frame = Sprite_Frame;
    SpriteCore.Sprite_MenuCharacter = Sprite_MenuCharacter;
    SpriteCore.Sprite_Animation = Sprite_Animation;
    SpriteCore.Sprite_Balloon = Sprite_Balloon;
    SpriteCore.Sprite_Weapon = Sprite_Weapon;
    SpriteCore.BATTLE_MOTIONS = BATTLE_MOTIONS;
    SpriteCore.BATTLE_MOTION_NAMES = BATTLE_MOTION_NAMES;
    SpriteCore.Sprite_BattlerEx = Sprite_BattlerEx;
    SpriteCore.Sprite_MenuBattler = Sprite_MenuBattler;
    SpriteCore.Sprite_BattlerStatic = Sprite_BattlerStatic;
    SpriteCore.BattlerContainer = BattlerContainer;
    SpriteCore.Sprite_StateOverlay = Sprite_StateOverlay;
    SpriteCore.VERSION = "1.00";
    return SpriteCore;
})(Object.create(null));