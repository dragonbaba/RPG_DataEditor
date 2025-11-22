"use strict";
Zaun.GameCore = ((GameCore) => {
    const { LoaderSystem, EventSystem, AnimationSystem, FileSystem } = Zaun.Core;
    const { FileOperator } = FileSystem;
    const { Loader } = LoaderSystem;
    const { GlobalEvent } = EventSystem;
    const { GlobalMotion } = AnimationSystem;
    const { ImageResource } = Zaun.Resource;
    const { getWebGlPixel, getWebGpuPixel } = ImageResource;
    const { TextureOptions, SourceOptions, EffectManager } = Zaun.GeometrySystem;

    const parameters = {
        maxFps: 60,
        EnableAntialias: false,
        renderType: "webgpu"
    }
    const { maxFps, EnableAntialias, renderType } = parameters;

    class ScreenAdaptor {
        /**
         *
         * @param {number} width
         * @param {number} height
         */
        constructor(width, height) {
            /**
             * @type {number}
             */
            this.width = width;
            /**
             * @type {number}
             */
            this.height = height;
            /**
             * @type {number}
             */
            this.scale = 1;
            /**
             * @type {HTMLCanvasElement}
             */
            this.canvas = null;
            this.createCanvas();
        }
        createCanvas() {
            const width = this.width;
            const height = this.height;
            const canvas = (this.canvas = document.createElement("canvas"));
            canvas.width = width;
            canvas.height = height;
            canvas.className = "game-canvas";
            const innerWidth = globalThis.innerWidth;
            const innerHeight = globalThis.innerHeight;
            const scaleX = innerWidth / width;
            const scaleY = innerHeight / height;
            const scale = Math.min(scaleX, scaleY);
            const style = this.canvas.style;
            this.scale = scale;
            const rw = scale * width;
            const rh = scale * height;
            style.width = `${rw}px`;
            style.height = `${rh}px`;
            document.body.appendChild(canvas);
        }
        pageToCanvasX(x) {
            const left = this.canvas.offsetLeft;
            return (x - left) / this.scale;
        }
        pageToCanvasY(y) {
            const top = this.canvas.offsetTop;
            return (y - top) / this.scale;
        }
        /**
         * @description window #innerwidth #innerheight
         * @param {number} width 
         * @param {number} height 
         */
        resize(width, height) {
            const dw = this.width;
            const dh = this.height;
            const scaleX = width / dw;
            const scaleY = height / dh;
            const scale = Math.min(scaleX, scaleY);
            const style = this.canvas.style;
            this.scale = scale;
            const rw = scale * dw;
            const rh = scale * dh;
            style.width = `${rw}px`;
            style.height = `${rh}px`;
        }
    }

    class RendererOptions {
        constructor() {
            this.container = null;
            this.clearColor = [0, 0, 0, 0];
            this.transform = null;
            this.target = null;
        }
        /**
         * @param {PIXI.Container} stage 
         */
        setStage(stage) {
            this.container = stage;
        }
        /**
         * @param {PIXI.Texture} target 
         */
        setTarget(target) {
            this.target = target;
        }
    }

    class SnapAdaptor {
        constructor(width, height) {
            this.snapTexture = null;
            this.rendererOptions = new RendererOptions();
            this.getScenePixel = Function.empty;
            this.createSnapTexture(width, height);
        }
        setRenderType(type) {
            this.getScenePixel = type === "webgl" ? getWebGlPixel : getWebGpuPixel;
        }
        createSnapTexture(width, height) {
            SourceOptions.resource = null;
            const textureSource = new PIXI.TextureSource(SourceOptions);
            textureSource.width = textureSource.pixelWidth = width;
            textureSource.height = textureSource.pixelHeight = height;
            TextureOptions.source = textureSource;
            textureSource.initGpuTexture();
            this.snapTexture = new PIXI.Texture(TextureOptions);
            TextureOptions.source = null;
            this.rendererOptions.setTarget(this.snapTexture);
        }
        /**
         *
         * @param {PIXI.Container} container
         * @param {PIXI.Renderer} renderer
         */
        snap(container, renderer) {
            container._windowLayer.alpha = 0;
            this.rendererOptions.setStage(container);
            renderer.render(this.rendererOptions);
            container._windowLayer.alpha = 1;
        }
    }

    const getSupportedCompressedTexturesFormats = (() => {

        function getSupportedGPUCompressedTextureFormats() {
            const adapter = Engine.renderer.gpu.adapter;
            const features = adapter.features;
            const supportedGPUCompressedTextureFormats = [
                ...features.has("texture-compression-bc") ? [
                    // BC compressed formats usable if "texture-compression-bc" is both
                    // supported by the device/user agent and enabled in requestDevice.
                    "bc1-rgba-unorm",
                    "bc1-rgba-unorm-srgb",
                    "bc2-rgba-unorm",
                    "bc2-rgba-unorm-srgb",
                    "bc3-rgba-unorm",
                    "bc3-rgba-unorm-srgb",
                    "bc4-r-unorm",
                    "bc4-r-snorm",
                    "bc5-rg-unorm",
                    "bc5-rg-snorm",
                    "bc6h-rgb-ufloat",
                    "bc6h-rgb-float",
                    "bc7-rgba-unorm",
                    "bc7-rgba-unorm-srgb"
                ] : Array.empty,
                ...features.has("texture-compression-etc2") ? [
                    // ETC2 compressed formats usable if "texture-compression-etc2" is both
                    // supported by the device/user agent and enabled in requestDevice.
                    "etc2-rgb8unorm",
                    "etc2-rgb8unorm-srgb",
                    "etc2-rgb8a1unorm",
                    "etc2-rgb8a1unorm-srgb",
                    "etc2-rgba8unorm",
                    "etc2-rgba8unorm-srgb",
                    "eac-r11unorm",
                    "eac-r11snorm",
                    "eac-rg11unorm",
                    "eac-rg11snorm"
                ] : Array.empty,
                ...features.has("texture-compression-astc") ? [
                    // ASTC compressed formats usable if "texture-compression-astc" is both
                    // supported by the device/user agent and enabled in requestDevice.
                    "astc-4x4-unorm",
                    "astc-4x4-unorm-srgb",
                    "astc-5x4-unorm",
                    "astc-5x4-unorm-srgb",
                    "astc-5x5-unorm",
                    "astc-5x5-unorm-srgb",
                    "astc-6x5-unorm",
                    "astc-6x5-unorm-srgb",
                    "astc-6x6-unorm",
                    "astc-6x6-unorm-srgb",
                    "astc-8x5-unorm",
                    "astc-8x5-unorm-srgb",
                    "astc-8x6-unorm",
                    "astc-8x6-unorm-srgb",
                    "astc-8x8-unorm",
                    "astc-8x8-unorm-srgb",
                    "astc-10x5-unorm",
                    "astc-10x5-unorm-srgb",
                    "astc-10x6-unorm",
                    "astc-10x6-unorm-srgb",
                    "astc-10x8-unorm",
                    "astc-10x8-unorm-srgb",
                    "astc-10x10-unorm",
                    "astc-10x10-unorm-srgb",
                    "astc-12x10-unorm",
                    "astc-12x10-unorm-srgb",
                    "astc-12x12-unorm",
                    "astc-12x12-unorm-srgb"
                ] : Array.empty
            ];
            return supportedGPUCompressedTextureFormats;
        }
        function getSupportedGlCompressedTextureFormats() {
            const gl = Engine.renderer.gl;
            const bptc = gl.getExtension("EXT_texture_compression_bptc");
            const s3tc = gl.getExtension("WEBGL_compressed_texture_s3tc");
            const s3tc_srgb = gl.getExtension("WEBGL_compressed_texture_s3tc_srgb");
            const rgtc = gl.getExtension("EXT_texture_compression_rgtc");
            const etc = gl.getExtension("WEBGL_compressed_texture_etc");
            const astc = gl.getExtension("WEBGL_compressed_texture_astc");
            const isMobile = Utils.isMobileDevice();
            const formatsMap = (() => {
                if (!isMobile) {
                    return {
                        "bc6h-rgb-ufloat": bptc.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT,
                        "bc6h-rgb-float": bptc.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT,
                        "bc7-rgba-unorm": bptc.COMPRESSED_RGBA_BPTC_UNORM_EXT,
                        "bc7-rgba-unorm-srgb": bptc.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT,
                    }
                }
                return {
                    "astc-4x4-unorm": astc.COMPRESSED_RGBA_ASTC_4x4_KHR,
                    "astc-4x4-unorm-srgb": astc.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR,
                    "astc-5x4-unorm": astc.COMPRESSED_RGBA_ASTC_5x4_KHR,
                    "astc-5x4-unorm-srgb": astc.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR,
                    "astc-5x5-unorm": astc.COMPRESSED_RGBA_ASTC_5x5_KHR,
                    "astc-5x5-unorm-srgb": astc.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR,
                    "astc-6x5-unorm": astc.COMPRESSED_RGBA_ASTC_6x5_KHR,
                    "astc-6x5-unorm-srgb": astc.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR,
                    "astc-6x6-unorm": astc.COMPRESSED_RGBA_ASTC_6x6_KHR,
                    "astc-6x6-unorm-srgb": astc.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR,
                    "astc-8x5-unorm": astc.COMPRESSED_RGBA_ASTC_8x5_KHR,
                    "astc-8x5-unorm-srgb": astc.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR,
                    "astc-8x6-unorm": astc.COMPRESSED_RGBA_ASTC_8x6_KHR,
                    "astc-8x6-unorm-srgb": astc.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR,
                    "astc-8x8-unorm": astc.COMPRESSED_RGBA_ASTC_8x8_KHR,
                    "astc-8x8-unorm-srgb": astc.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR,
                    "astc-10x5-unorm": astc.COMPRESSED_RGBA_ASTC_10x5_KHR,
                    "astc-10x5-unorm-srgb": astc.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR,
                    "astc-10x6-unorm": astc.COMPRESSED_RGBA_ASTC_10x6_KHR,
                    "astc-10x6-unorm-srgb": astc.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR,
                    "astc-10x8-unorm": astc.COMPRESSED_RGBA_ASTC_10x8_KHR,
                    "astc-10x8-unorm-srgb": astc.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR,
                    "astc-10x10-unorm": astc.COMPRESSED_RGBA_ASTC_10x10_KHR,
                    "astc-10x10-unorm-srgb": astc.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR,
                    "astc-12x10-unorm": astc.COMPRESSED_RGBA_ASTC_12x10_KHR,
                    "astc-12x10-unorm-srgb": astc.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR,
                    "astc-12x12-unorm": astc.COMPRESSED_RGBA_ASTC_12x12_KHR,
                    "astc-12x12-unorm-srgb": astc.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR
                }
            })();
            const supportedGLCompressedTextureFormats = [
                ...bptc ? [
                    "bc6h-rgb-ufloat",
                    "bc6h-rgb-float",
                    "bc7-rgba-unorm",
                    "bc7-rgba-unorm-srgb"
                ] : Array.empty,
                ...s3tc ? [
                    "bc1-rgba-unorm",
                    "bc2-rgba-unorm",
                    "bc3-rgba-unorm"
                ] : Array.empty,
                ...s3tc_srgb ? [
                    "bc1-rgba-unorm-srgb",
                    "bc2-rgba-unorm-srgb",
                    "bc3-rgba-unorm-srgb"
                ] : Array.empty,
                ...rgtc ? [
                    "bc4-r-unorm",
                    "bc4-r-snorm",
                    "bc5-rg-unorm",
                    "bc5-rg-snorm"
                ] : Array.empty,
                ...etc ? [
                    "etc2-rgb8unorm",
                    "etc2-rgb8unorm-srgb",
                    "etc2-rgba8unorm",
                    "etc2-rgba8unorm-srgb",
                    "etc2-rgb8a1unorm",
                    "etc2-rgb8a1unorm-srgb",
                    "eac-r11unorm",
                    "eac-rg11unorm"
                ] : Array.empty,
                ...astc ? [
                    "astc-4x4-unorm",
                    "astc-4x4-unorm-srgb",
                    "astc-5x4-unorm",
                    "astc-5x4-unorm-srgb",
                    "astc-5x5-unorm",
                    "astc-5x5-unorm-srgb",
                    "astc-6x5-unorm",
                    "astc-6x5-unorm-srgb",
                    "astc-6x6-unorm",
                    "astc-6x6-unorm-srgb",
                    "astc-8x5-unorm",
                    "astc-8x5-unorm-srgb",
                    "astc-8x6-unorm",
                    "astc-8x6-unorm-srgb",
                    "astc-8x8-unorm",
                    "astc-8x8-unorm-srgb",
                    "astc-10x5-unorm",
                    "astc-10x5-unorm-srgb",
                    "astc-10x6-unorm",
                    "astc-10x6-unorm-srgb",
                    "astc-10x8-unorm",
                    "astc-10x8-unorm-srgb",
                    "astc-10x10-unorm",
                    "astc-10x10-unorm-srgb",
                    "astc-12x10-unorm",
                    "astc-12x10-unorm-srgb",
                    "astc-12x12-unorm",
                    "astc-12x12-unorm-srgb"
                ] : Array.empty
            ];
            Engine.compressedTextureGLExtensionsMap = formatsMap;
            return supportedGLCompressedTextureFormats;
        }

        function getSupportedCompressedTextureFormats() {
            const isWebgl = Engine.isWebgl();
            return isWebgl ? getSupportedGlCompressedTextureFormats() : getSupportedGPUCompressedTextureFormats();
        }
        return getSupportedCompressedTextureFormats;
    })();

    class EngineAdaptor {
        constructor() {
            /**
             * @type {ScreenAdaptor}
             */
            this.screen = null;
            /**
             * @type {PIXI.Renderer}
             */
            this.renderer = null;
            /**
             * @type {SnapAdaptor}
             */
            this.snap = null;
            /**
             * @type {RendererOptions}
             */
            this.rendererOptions = new RendererOptions();
            /**
             * @type {string}
             */
            this.renderType = null;
            /**
             * @type {PIXI.Container}
             */
            this.emptyStage = null;
            /**
             * @type {number}
             */
            this.lastTime = -1;
            /**
             * @type {number}
             */
            this.lastFrame = -1;
            /**
             * @type {number}
             */
            this.deltaTime = 0;
            /**
             * @type {number}
             */
            this.minElapsedTime = 0;
            /**
             * @type {number}
             */
            this.deltaMs = 0;
            /**
             * @type {number}
             */
            this.requestId = 0;
            /**
             * @type {number}
             */
            this.frameCount = 0;
            /**
             * @type {number}
             */
            this.renderCount = 0;
            /**
             * @type {number}
             */
            this.targetFPMS = 0.06;
            /**
             * @type {boolean}
             */
            this.renderState = false;
            this.updateHandler = this.update.bind(this);
            this.supportedCompressedTextureFormats = null;
            this.compressedTextureGLExtensionsMap = null;
        }
        get fps() {
            return this.rafFps;
        }
        /**
         * @type {number} value
         */
        set fps(value) {
            this.minElapsedTime = (1000 / value) | 0;
            this.targetFPMS = 0.001 * value;
        }
        enableRender() {
            this.renderState = true;
        }
        disableRender() {
            this.renderState = false;
        }
        screenWidth() {
            return this.screen.width;
        }
        screenHeight() {
            return this.screen.height;
        }
        active() {
            if (this.requestId === 0) {
                this.update();
            }
        }
        deactive() {
            if (this.requestId !== 0) {
                cancelAnimationFrame(this.requestId);
                this.requestId = 0;
            }
        }
        snapContainer(container) {
            this.snap.snap(container, this.renderer);
        }
        pageToCanvasX(x) {
            return this.screen.pageToCanvasX(x);
        }
        pageToCanvasY(y) {
            return this.screen.pageToCanvasY(y);
        }
        isWebgl() {
            return this.renderType === "webgl";
        }
        isWebgpu() {
            return this.renderType === "webgpu";
        }
        /**
         * @param {number} width 
         * @param {number} height 
         */
        async initialize(width, height) {
            this.createStage();
            this.createScreen(width, height);
            if (Utils.isElectron) {
                await Utils.initializeElectronProcessArgv();
            }
            await this.createRenderer(width, height);
            this.createSnap(width, height);
            this.setStage(this.emptyStage);
            this.fps = maxFps;
            this.supportedCompressedTextureFormats = getSupportedCompressedTexturesFormats();
        }
        /**
         * @param {number} width 
         * @param {number} height 
         */
        createSnap(width, height) {
            this.snap = new SnapAdaptor(width, height);
        }
        createStage() {
            const emptyStage = (this.emptyStage = new PIXI.Container());
            emptyStage.enableRenderGroup();
            emptyStage.destroy = Function.empty;
        }
        /**
         * @param {number} width 
         * @param {number} height 
         */
        createScreen(width, height) {
            this.screen = new ScreenAdaptor(width, height);
        }
        /**
         * @param {number} width 
         * @param {number} height 
         */
        async createRenderer(width, height) {
            try {
                const canvas = this.screen.canvas;
                SourceOptions.resource = canvas;
                const textureSource = new PIXI.TextureSource();
                textureSource.setupOptions(SourceOptions);
                TextureOptions.source = textureSource;
                textureSource.uploadMethodId = "image";
                const texture = new PIXI.Texture(TextureOptions);
                const options = {
                    canvas,
                    powerPreference: "high-performance",
                    backGround: "#000000",
                    hello: true,
                    antialias: EnableAntialias,
                    preference: renderType,
                    width,
                    height,
                    texture
                };
                // 在获取渲染器之前要先知道想要获取的渲染器是什么类型
                //这关联到后续的着色器程序是否有必要同时处理两种着色器程序
                this.renderType = renderType;
                const renderer = await PIXI.autoDetectRenderer(options);
                this.renderType = renderer.gpu ? "webgpu" : "webgl";
                return true;
            } catch (e) {
                throw e;
            }
        }
        /**
         * @param {PIXI.Container} stage 
         */
        setStage(stage) {
            this.rendererOptions.setStage(stage);
        }
        render() {
            GlobalMotion.update();
            GlobalEvent.update();
            if (!this.renderState) return;
            EffectManager.update();
            SceneManager.update();
            this.renderer.render(this.rendererOptions);
            this.frameCount++;
            this.renderCount++;
        }
        /**
         * @description 重新加载游戏
         */
        reload() {
            this.setStage(this.emptyStage);
            this.deactive();
            globalThis.location.reload();
        }
        /**
         * @description 退出游戏
         */
        exit() {
            globalThis.close();
        }
        /**
         * @param {number} time 
         */
        update(time = performance.now()) {
            this.requestId = 0;
            const elapsedTime = time - this.lastTime;
            const delta = time - this.lastFrame;
            if (delta >= this.minElapsedTime) {
                this.lastFrame = time - (delta % this.minElapsedTime);
                this.deltaTime = elapsedTime * this.targetFPMS;
                this.deltaMs = elapsedTime / 1e3;
                this.lastTime = time;
                this.render();
            }
            if (this.requestId === 0) {
                this.requestId = requestAnimationFrame(this.updateHandler);
            }
        }
    }
    const Engine = new EngineAdaptor();
    Reflect.defineProperty(globalThis, "Engine", {
        value: Engine,
        writable: false,
        configurable: false,
        enumerable: true
    });

    function loadDataBase() {
        const datas = [
            { name: "$dataSkills", src: "Skills.json", type: "isSkill", key: "extractSkillData" },
            { name: "$dataItems", src: "Items.json", type: "isItem", key: "extractItemData" },
            { name: "$dataWeapons", src: "Weapons.json", type: "isWeapon", key: "extractWeaponData" },
            { name: "$dataEnemies", src: "Enemies.json", type: "isEnemy", key: "extractEnemyData" },
            { name: "$dataTroops", src: "Troops.json", type: "isTroop" },
        ];
        for (const data of datas) {
            Loader.add(DataManager.loadDataFile(data.name, `${prefix}${data.src}`, data.type, data.key));
        }
    }

    function loadGameBaseResource() {
        loadDataBase();
        Loader.add(FileOperator.file.openDatabase());
        return Loader.waitLoading();
    }
    async function gameStart(width, height) {
        Loader.enableAddToQueue();
        Loader.add(DataManager.loadDataFile("$dataAnimations", "Animations.json", "isAnimation"));
        await Loader.waitLoading();
        await Engine.initialize(width, height);
        Loader.setTextureParser(null, "image", ".png");
        await loadGameBaseResource();
        Loader.disableAddToQueue();
        Engine.active();
    }
    GameCore.gameStart = gameStart;
    GameCore.VERSION = "1.00";
    return GameCore;
})(Object.create(null));
