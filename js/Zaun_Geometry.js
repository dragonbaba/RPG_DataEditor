"use strict";
Zaun.GeometrySystem = (GeometrySystem => {
    const { PoolSystem, LoaderSystem, LogSystem } = Zaun.Core;
    const { Logger } = LogSystem;
    const { PoolCache, setPool, createPool } = PoolSystem;
    const { CanvasPool, TextureSourcePool } = PoolCache;
    const { Loader } = LoaderSystem;
    const { TextureSource, EventEmitter, Texture } = PIXI;
    const { DisintegrateEffectManager } = Zaun.DisintegrateEffect;

    const image = {
        sampler: "linear",
        mipmap: false,
        cacheSize: 500
    }

    const SAMPLER = {
        smooth: "linear",
        rough: "nearest"
    }
    Reflect.defineProperty(HTMLCanvasElement.prototype, "isCanvas", {
        value: true,
        writable: false,
        configurable: false
    });
    Reflect.defineProperty(OffscreenCanvas.prototype, "isCanvas", {
        value: true,
        writable: false,
        configurable: false
    });

    const EMPTY_SOURCE = PIXI.Texture.EMPTY._source;

    const context2D = CanvasRenderingContext2D.prototype;
    if (context2D.roundRect === void 0) {
        context2D.roundRect = function (x, y, width, height, radius) {
            this.moveTo(x + radius, y);
            this.arcTo(x + width, y, x + width, y + height, radius);
            this.arcTo(x + width, y + height, x, y + height, radius);
            this.arcTo(x, y + height, x, y, radius);
            this.arcTo(x, y, x + width, y, radius);
        };
    }
    if (context2D.reset === void 0) {
        context2D.reset = function () {
            const canvas = this.canvas;
            canvas.width = 0;
            canvas.height = 0;
        }
    }
    TextureSource.prototype.initGpuTexture = function () {
        if (this.hasGpuTexture) return;
        initGpuTexture(this);
        if (this.uploadMethodId === "compressed") {
            this.resource = null;
            this.textureBuffers.length = 0;
        }
    }
    const gpuTextureInit = {
        "webgl": textureSource => {
            Engine.renderer.texture._initSource(textureSource);
        },
        "webgpu": textureSource => {
            Engine.renderer.texture.initSource(textureSource);
            textureSource._style.initGpuSampler();
        }
    }

    function initGpuTexture(textureSource) {
        const renderType = Engine.renderType;
        gpuTextureInit[renderType](textureSource);
    }

    class TextBox {
        constructor() {
            this.reset();
        }
        reset() {
            this.width = 0;
            this.height = 0;
        }
        set(width, height) {
            this.width = width;
            this.height = height;
        }
    }
    const TextBoxPool = createPool("TextBoxPool", TextBox, image.cacheSize);
    /**
     * 文本大小缓存类，用于存储已测量过的文本尺寸
     * @class TextSize
     */
    class TextSize {
        constructor() {
            /**
             * 文本尺寸缓存对象
             * @type {Object<string, TextBox>}
             */
            this.cache = Object.create(null);
        }
        /**
         * 设置文本尺寸到缓存
         * @param {string} text - 要缓存的文本
         * @param {number} width - 文本宽度
         * @param {number} height - 文本高度
         * @returns {Object} - 缓存的文本尺寸对象
         */
        setText(text, width, height) {
            let cache = this.cache[text];
            if (cache === void 0) {
                cache = this.cache[text] = TextBoxPool.get();
                cache.set(width, height);
            }
            return cache;
        }
        /**
         * 清理缓存项
         */
        reset() {
            const cache = this.cache;
            for (const key in cache) {
                TextBoxPool.return(cache[key])
            }
            this.cache = Object.create(null);
        }
    }
    const TextSizePool = createPool("TextSizePool", TextSize, image.cacheSize);
    /**
     * 文本度量管理器，用于管理不同字体的文本尺寸缓存
     * @class TextMetricsManager
     */
    class TextMetricsManager {
        /**
         * 创建文本度量管理器
         * @param {number} maxSize - 每种字体的最大缓存大小
         */
        constructor(maxSize = 100) {
            /**
             * 字体文本缓存映射
             * @type {Object<string, TextSize>}
             */
            this.cache = Object.create(null);
        }
        /**
         * 获取或创建指定字体的文本尺寸缓存
         * @param {string} font - 字体名称
         * @returns {TextSize} - 字体的文本尺寸缓存对象
         */
        setFont(font) {
            let size = this.cache[font];
            if (size === void 0) {
                // 使用插件参数中的缓存大小
                size = this.cache[font] = TextSizePool.get();
            }
            return size;
        }
        /**
         * 获取指定字体和文本的缓存
         * @param {string} font - 字体名称
         * @param {string} text - 文本内容
         * @returns {Object} - 文本尺寸对象
         */
        getText(font, text) {
            const size = this.setFont(font);
            return size.setText(text);
        }
        /**
         * 清理所有字体的文本缓存
         */
        clear() {
            const cache = this.cache;
            for (const key in cache) {
                TextSizePool.return(cache[key]);
            }
            this.cache = Object.create(null);
        }
    }
    const TextMetrics = setPool("TextMetrics", TextMetricsManager, 500);

    function getMipMapLevel(width, height) {
        return Math.floor(Math.log2(Math.max(width, height))) + 1;
    }

    // 纹理源选项
    const SourceOptions = {
        resource: null,
    }
    // 纹理选项
    const TextureOptions = {
        source: null
    }
    // 精灵选项
    const SpriteOptions = {
        texture: null
    }

    class DrawProxy {
        constructor() {
            this.reset();
        }
        reset() {
            this.target = null;
            this.sx = 0;
            this.sy = 0;
            this.sw = 0;
            this.sh = 0;
            this.dx = 0;
            this.dy = 0;
            this.dw = 0;
        }
        emit(source) {
            const target = this.target;
            const sx = this.sx;
            const sy = this.sy;
            const sw = this.sw;
            const sh = this.sh;
            const dx = this.dx;
            const dy = this.dy;
            const dw = this.dw;
            const dh = this.dh;
            target.blt(source, sx, sy, sw, sh, dx, dy, dw, dh);
        }
        on(target, sx, sy, sw, sh, dx, dy, dw, dh) {
            this.target = target;
            this.sx = sx;
            this.sy = sy;
            this.sw = sw;
            this.sh = sh;
            this.dx = dx;
            this.dy = dy;
            this.dw = dw;
            this.dh = dh;
        }
    }
    const DrawProxyPool = createPool("DrawProxyPool", DrawProxy, 100);
    /**
     * 位图类，用于创建和管理画布及其上下文
     * @class Bitmap
     */
    class Bitmap extends EventEmitter {
        /**
         * 创建位图对象
         * @param {number} width - 位图宽度
         * @param {number} height - 位图高度
         */
        constructor(width = 0, height = 0) {
            super();
            this.initialize(width, height);
        }
        /**
         * 获取平滑设置
         * @returns {boolean} - 是否启用平滑
         */
        get smooth() {
            return this._smooth;
        }
        /**
         * 设置平滑属性
         * @param {boolean} value - 是否启用平滑
         */
        set smooth(value) {
            if (this._smooth !== value) {
                this._smooth = value;
                this.updateScaleMode();
            }
        }
        /**
         * 获取绘制不透明度
         * @returns {number} - 不透明度值(0-255)
         */
        get paintOpacity() {
            return this._paintOpacity;
        }
        /**
         * 设置绘制不透明度
         * @param {number} value - 不透明度值(0-255)
         */
        set paintOpacity(value) {
            if (this._paintOpacity !== value) {
                this._paintOpacity = value;
                this.context.globalAlpha = value / 255;
            }
        }
        /**
         * 初始化位图对象
         * @param {number} width - 位图宽度
         * @param {number} height - 位图高度
         */
        initialize(width, height) {
            this.initProperties();
            if (width > 0 && height > 0) {
                this.createCanvas(width, height);
            }
        }
        /**
         * 初始化位图参数
         */
        initProperties() {
            this.width = 1;
            this.height = 1;
            this.proxys = [];
            /**
             * @type {HTMLCanvasElement | OffscreenCanvas}
             */
            this.canvas = null;
            /**
             * @type {CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D}
             */
            this.context = null;
            /**
             * @type {PIXI.TextureSource}
             */
            this.baseTexture = EMPTY_SOURCE;
            /**
             * @type {ImageBitmap}
             */
            this.image = null;
            this.imageClosed = false;
            this.url = "";
            this.isCompressed = false;
            this.folder = "";
            this.fileName = "";
            this.canvasObj = null;
            this.lastTextHeight = 0;
            this.lastTextWidth = 0;
            this.lineSpacing = 6;
            this.fontFace = "rmmz-mainfont";
            this.fontSize = 16;
            this.fontBold = false;
            this.fontItalic = false;
            this.textColor = "#ffffff";
            this.outlineColor = "#000000";
            this.outlineWidth = 2;
            this.isSystem = false;
            this.referenceCount = 0;
            this._paintOpacity = 255;
            this._smooth = image.sampler === "linear";
            this.mipmap = image.mipmap;
            this.points = [];
            this.pointsSize = 0;
        }
        /**
         * @description 绘制代理
         * @param {DrawProxy} proxy 
         */
        onDrawingProxy(proxy) {
            if (this.baseTexture !== EMPTY_SOURCE) return;
            const proxys = this.proxys;
            proxys[proxys.length] = proxy;
        }
        /**
         * 在加载绘制时
         */
        onLoadDrawing() {
            const proxys = this.proxys;
            for (let i = 0; i < proxys.length; i++) {
                const proxy = proxys[i];
                proxy.emit(this);
                DrawProxyPool.return(proxy);
            }
            proxys.clear();
        }
        /**
         * 清除点数据
         */
        clearPoints() {
            this.points.clear();
            this.pointsSize = 0;
            return this;
        }
        /**
         * 添加点数据
         * @param {number} x - 点的X坐标
         * @param {number} y - 点的Y坐标
         */
        pushPoint(x, y) {
            const points = this.points;
            points[this.pointsSize++] = x;
            points[this.pointsSize++] = y;
            return this;
        }
        /**
         * 增加引用计数
         */
        refer() {
            if (this.canvas !== null) return;
            this.referenceCount += 1;
        }
        /**
         * 减少引用计数
         */
        unRefer() {
            if (this.canvas !== null) return;
            if (this.referenceCount > 0) {
                this.referenceCount -= 1;
            }
        }
        clearProxys() {
            const proxys = this.proxys;
            for (let i = 0; i < proxys.length; i++) {
                DrawProxyPool.return(proxys[i]);
            }
            proxys.clear();
        }
        /**
         * 重置位图对象
         */
        reset() {
            const source = this.baseTexture;
            if (source !== EMPTY_SOURCE) {
                source.rpgBitmap = null;
                TextureSourcePool.return(source);
                this.baseTexture = EMPTY_SOURCE;
            }
            if (this.image !== null && !this.imageClosed) {
                this.image.close();
                this.imageClosed = true;
            }
            this.image = null;
            this.destroyCanvas();
            this.isCompressed = false;
            this.lastTextHeight = 0;
            this.lastTextWidth = 0;
            this.lineSpacing = 6;
            this.fontFace = "rmmz-mainfont";
            this.fontSize = 16;
            this.fontBold = false;
            this.fontItalic = false;
            this.textColor = "#ffffff";
            this.outlineColor = "#000000";
            this.outlineWidth = 2;
            this.isSystem = false;
            this.referenceCount = 0;
            this._paintOpacity = 255;
            this._smooth = image.sampler === "linear";
            this.mipmap = image.mipmap;
            this.width = 1;
            this.height = 1;
            this.clearPoints();
            this.clearProxys();
            this.removeAllListeners();
        }
        /**
         * 初始化GPU纹理
         * @param {boolean} disposeImage - 是否释放图像数据
         */
        initGpuTexture(disposeImage = false) {
            if (this.baseTexture !== EMPTY_SOURCE) {
                if (this.baseTexture.hasGpuTexture) return;
                this.baseTexture.initGpuTexture();
                if (this.imageClosed) return;
                if (this.image !== null && disposeImage) {
                    this.image.close();
                    this.image = null;
                    this.imageClosed = true;
                }
            }
        }
        /**
         * 开始加载图像
         * @returns {Promise<void>}
         */
        async startLoading() {
            const url = this.url;
            const bitmap = (this.image = await Loader.loadTexture(url, this.isCompressed));
            this.imageClosed = false;
            this.createBaseTexture(bitmap);
            this.emit("loaded", this);
            this.onLoadDrawing();
        }
        /**
         * 设置加载信息
         * @param {boolean} isSystem - 是否为系统图像
         * @param {string} url - 图像URL
         * @param {string} folder - 图像文件夹
         * @param {string} fileName - 图像文件名
         * @param {boolean} isCompressed -是否为压缩纹理
         */
        setLoadInfo(isSystem, url, folder, fileName, isCompressed = false) {
            url = `${url}${isCompressed ? Loader.compressedUrlSuffix : ".png"}`;
            this.isSystem = isSystem;
            this.url = url;
            this.folder = folder;
            this.fileName = fileName;
            this.isCompressed = isCompressed;
            Loader.add(this.startLoading());
        }
        /**
         * 创建基础纹理
         * @param {HTMLCanvasElement|ImageBitmap} source - 图像源
         */
        createBaseTexture(source) {
            const isCompressed = this.isCompressed;
            const textureSource = this.baseTexture = TextureSourcePool.get();
            if (isCompressed) {
                textureSource.setupOptions(source);
                textureSource.uploadMethodId = "compressed";
                textureSource.textureBuffers.copy(source.resource);
                source.resource.length = 0;
                textureSource.resource = textureSource.textureBuffers;
                this.width = source.width;
                this.height = source.height;
                this.image = null;
                this.imageClosed = false;
                textureSource.rpgBitmap = this;
            } else {
                SourceOptions.resource = source;
                textureSource.setupOptions(SourceOptions);
                SourceOptions.resource = null;
                textureSource.uploadMethodId = "image";
                if (source !== this.canvas) {
                    textureSource.rpgBitmap = this;
                    if (this.mipmap) {
                        textureSource.mipLevelCount = getMipMapLevel(source.width, source.height);
                    }
                }
            }
            this.width = source.width;
            this.height = source.height;
            this.updateScaleMode();
        }
        /**
         * 更新缩放模式
         */
        updateScaleMode() {
            if (this.baseTexture !== EMPTY_SOURCE) {
                const style = this.baseTexture._style;
                style.scaleMode = this._smooth ? SAMPLER.smooth : SAMPLER.rough;
            }
        }
        resize(width, height) {
            const resize = this.resizeCanvas(width, height);
            if (resize) this.resizeSource(width, height);
        }
        resizeSource(width, height) {
            width = Math.round(width);
            height = Math.round(height);
            this.baseTexture.resize(width, height, 1);
        }
        resizeCanvas(width, height) {
            width = Math.round(width);
            height = Math.round(height);
            if (this.width !== width || this.height !== height) {
                const canvas = this.canvas;
                this.width = canvas.width = width;
                this.height = canvas.height = height;
                return true;
            }
            return false;
        }
        update() {
            this.baseTexture.emit("update", this.baseTexture);
            return this;
        }
        createCanvas(width, height) {
            const canvasObj = CanvasPool.get(width, height);
            this.canvasObj = canvasObj;
            this.canvas = canvasObj.canvas;
            this.context = canvasObj.context;
            this.createBaseTexture(this.canvas);
        }
        destroyCanvas() {
            if (this.canvasObj) {
                CanvasPool.return(this.canvasObj);
                this.canvas = null;
                this.context = null;
                this.canvasObj = null;
            }
        }
        blt(source, sx, sy, sw, sh, dx, dy, dw, dh) {
            dw = dw || sw;
            dh = dh || sh;
            const context = this.context;
            const image = source.canvas || source.image;
            if (image === null) return;
            context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
            return this;
        }
        fillRoundRect(x, y, width, height, radius, shouldFill = true, shouldStroke = false) {
            const context = this.context;
            context.beginPath();
            context.roundRect(x, y, width, height, radius);
            if (shouldFill) {
                context.fillStyle = this.textColor;
                context.fill();
            }
            if (shouldStroke) {
                context.strokeStyle = this.outlineColor;
                context.stroke();
            }
            context.closePath();
            return this;
        }
        drawPolygon(shouldFill = true, shouldStroke = true) {
            const points = this.points;
            const size = this.pointsSize;
            if (size < 6 || size % 2 !== 0) {
                Logger.warn("绘制多边形至少需要6个点 以及不能传入不完整的点");
                return;
            }
            const context = this.context;
            context.beginPath();
            for (let i = 2; i < size; i += 2) {
                const x = points[i];
                const y = points[i + 1];
                context.lineTo(x, y);
            }
            context.lineTo(points[0], points[1]);
            if (shouldFill === false && shouldStroke === false) {
                Logger.warn("绘制多边形时，至少需要填充或描边其中一种");
                shouldStroke = true;
            }
            if (shouldFill) {
                context.fillStyle = this.textColor;
                context.fill();
            }
            if (shouldStroke) {
                context.strokeStyle = this.outlineColor;
                context.stroke();
            }
            context.closePath();
            return this;
        }
        fillGradientRoundRect(x = 0, y = 0, width, height, radius, color1, color2, start = 0.4, end = 1) {
            const context = this.context;
            const x1 = x + width;
            const y1 = y;
            const grad = context.createLinearGradient(x, y, x1, y1);
            grad.addColorStop(start, color1);
            grad.addColorStop(end, color2);
            context.beginPath();
            context.roundRect(x, y, width, height, radius);
            context.fillStyle = grad;
            context.fill();
            context.closePath();
            return this;
        }
        clear() {
            const context = this.context;
            const canvas = this.canvas;
            context.clearRect(0, 0, canvas.width, canvas.height);
            return this;
        }
        clearRect(x, y, width, height) {
            this.context.clearRect(x, y, width, height);
            return this;
        }
        fillRect(x, y, width, height, color) {
            const context = this.context;
            context.fillStyle = color;
            context.fillRect(x, y, width, height);
            return this;
        }
        fillAll(color) {
            this.fillRect(0, 0, this.width, this.height, color);
            return this;
        }
        strokeRect(x, y, width, height, color) {
            const context = this.context;
            context.strokeStyle = color;
            context.strokeRect(x, y, width, height);
            return this;
        }
        gradientFillRect(x, y, width, height, color1, color2, vertical) {
            const context = this.context;
            const x1 = vertical ? x : x + width;
            const y1 = vertical ? y + height : y;
            const grad = context.createLinearGradient(x, y, x1, y1);
            grad.addColorStop(0, color1);
            grad.addColorStop(1, color2);
            context.fillStyle = grad;
            context.fillRect(x, y, width, height);
            return this;
        }
        drawCircle(x, y, radius, color) {
            const context = this.context;
            context.fillStyle = color;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2, false);
            context.fill();
            return this;
        }
        /**
         * @description 设置单个像素的颜色
         * @param {number} x - X坐标
         * @param {number} y - Y坐标
         * @param {string} color - 颜色值（支持rgba格式）
         */
        setPixel(x, y, color) {
            const context = this.context;
            context.fillStyle = color;
            context.fillRect(x, y, 1, 1);
            return this;
        }
        measureText(text) {
            const font = this.makeFontNameText();
            const textSize = TextMetrics.getText(font, text);
            if (textSize.width === void 0) {
                const context = this.context;
                context.font = font;
                const textMetrics = context.measureText(text);
                textSize.height = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent + this.lineSpacing;
                textSize.width = textMetrics.width;
            }
            this.lastTextWidth = textSize.width;
            this.lastTextHeight = textSize.height;
            return this;
        }
        makeFontNameText() {
            const italic = this.fontItalic ? "Italic " : "";
            const bold = this.fontBold ? "Bold " : "";
            return italic + bold + this.fontSize + "px " + this.fontFace;
        }
        /**
         * @param {string} text 
         * @param {number} x 
         * @param {number} y 
         * @param {number} maxWidth 
         * @param {number} lineHeight 
         * @param {string} align 
         */
        drawText(text, x, y, maxWidth, lineHeight, align = "left") {
            const context = this.context;
            const alpha = context.globalAlpha;
            maxWidth = maxWidth || 0xffffffff;
            let tx = x;
            const ty = Math.round(y + lineHeight / 2 + this.fontSize * 0.35);
            if (align === "center") {
                tx += maxWidth / 2;
            } else if (align === "right") {
                tx += maxWidth;
            }
            context.font = this.makeFontNameText();
            context.textAlign = align;
            context.textBaseline = "alphabetic";
            context.globalAlpha = 1;
            this.drawTextOutline(text, tx, ty, maxWidth);
            context.globalAlpha = alpha;
            this.drawTextBody(text, tx, ty, maxWidth);
            return this;
        }
        drawTextOutline(text, tx, ty, maxWidth) {
            const context = this.context;
            context.strokeStyle = this.outlineColor;
            context.lineWidth = this.outlineWidth;
            context.lineJoin = "round";
            context.strokeText(text, tx, ty, maxWidth);
            return this;
        }
        drawTextBody(text, tx, ty, maxWidth) {
            const context = this.context;
            context.fillStyle = this.textColor;
            context.fillText(text, tx, ty, maxWidth);
            return this;
        }
        drawLine(x, y, width) {
            const context = this.context;
            width = width || this.canvas.width;
            const sx = x,
                nx = x + width;
            context.beginPath();
            context.moveTo(sx, y);
            context.lineTo(nx, y);
            context.strokeStyle = this.outlineColor;
            context.stroke();
            context.closePath();
            return this;
        }
        drawNewLine(x, y, height, width) {
            const context = this.context;
            width = width || this.canvas.width;
            const rw = width / 2,
                rh = height / 2,
                ca = Math.PI * 2,
                cx = x + rw;
            context.beginPath();
            context.ellipse(cx, y, rw, rh, 0, 0, ca);
            context.fillStyle = this.textColor;
            context.fill();
            context.closePath();
            return this;
        }
        onLoad(func, context) {
            if (this.baseTexture === EMPTY_SOURCE) {
                this.once("loaded", func, context);
            } else {
                context[func.name](this);
            }
            return this;
        }
    }
    Bitmap.empty = new Bitmap();
    Bitmap.empty.width = 1;
    Bitmap.empty.height = 1;
    Bitmap.empty.baseTexture = Texture.EMPTY._source;

    class Effect {
        static effectType = {
            "appear": 0,
            "disappear": 1,
            "collapse": 2,
            "bossCollapse": 3,
        }
        constructor() {
            this.reset();
        }
        reset() {
            this.duration = 0;
            this.effectType = String.empty;;
            this.displayObject = null;
            this.opacityChange = 0;
        }
        setup(displayObject, effectType) {
            effectType = Effect.effectType[effectType];
            this.displayObject = displayObject;
            this.effectType = effectType;
            switch (effectType) {
                case Effect.effectType.appear: {
                    this.duration = 16;
                    break;
                }
                case Effect.effectType.disappear: {
                    this.duration = 32;
                    break;
                }
                case Effect.effectType.collapse: {
                    this.duration = 32;
                    this.opacityChange = 255 / 32;
                    break;
                }
                case Effect.effectType.bossCollapse: {
                    this.duration = 64;
                    this.opacityChange = 255 / 64;
                    break;
                }
                default: {
                    this.duration = 1;
                    Logger.warn("不存在的效果类型，请检查");
                    break;
                }
            }
        }
        update() {
            const effectType = this.effectType;
            switch (effectType) {
                case Effect.effectType.appear: {
                    this.updateAppear();
                    break;
                }
                case Effect.effectType.disappear: {
                    this.updateDisappear();
                    break;
                }
                case Effect.effectType.collapse: {
                    this.updateCollapse();
                    break;
                }
                case Effect.effectType.bossCollapse: {
                    this.updateBoseCollapse();
                    break;
                }
                default: {
                    break;
                }
            }
        }
        updateAppear() {
            if (this.duration > 0) {
                this.displayObject.opacity = (16 - this.duration) * 16;
                this.duration--;
            } else {
                this.remove();
            }
        }
        updateDisappear() {
            if (this.duration > 0) {
                this.displayObject.opacity = 256 - (32 - this.duration) * 10;
                this.duration--;
            } else {
                this.remove();
            }
        }
        updateCollapse() {
            if (this.duration > 0) {
                this.displayObject.setBlendColor(255, 128, 128, 128);
                this.displayObject.opacity -= this.opacityChange;
                this.duration--;
            } else {
                this.displayObject.setBlendColor(0, 0, 0, 0);
                this.remove();
            }
        }
        updateBoseCollapse() {
            if (this.duration > 0) {
                this.displayObject.opacity -= this.opacityChange;
                this.displayObject.setBlendColor(255, 255, 255, 255 - this.opacity);
                this.duration--;
            } else {
                this.displayObject.setBlendColor(0, 0, 0, 0);
                this.remove();
            }
        }
        remove() {
            const gaugeSprite = this.displayObject.parent.parent.gaugeSprite;
            if (gaugeSprite !== null) {
                gaugeSprite.alpha = 0;
            }
            EffectManager.remove(this);
        }
    }
    const EffectPool = createPool("EffectPool", Effect, 100);

    class EffectAdaptor {
        constructor() {
            /**
             * @description 当前可以管理的效果数量
             * @type {number}
             */
            this.count = 0;
            this.effects = [];
            this.containers = [];
            /**
             * @description 实际效果数量
             * @type {number}
             */
            this.effectCount = 0;
            DisintegrateEffectManager.effectManager = this;
        }
        setupEffect(displayObject, effectType) {
            if (!this.containers.add(displayObject)) {
                Logger.warn("当前对象已存在效果,请在当前效果结束后再添加新的效果");
                return;
            }
            if (effectType === "instantCollapse") {
                displayObject.opacity = 0;
                this.effectCount++;
                DisintegrateEffectManager.setup(displayObject, 30);
                return;
            }
            const effect = EffectPool.get();
            effect.setup(displayObject, effectType);
            this.effects[this.count++] = effect;
            this.effectCount++;
        }
        update() {
            if (this.count === 0) return;
            const effects = this.effects;
            for (let i = 0; i < this.count; i++) {
                const effect = effects[i];
                if (effect === void 0) continue;
                effect.update();
            }
        }
        remove(effect) {
            if (this.effects.remove(effect)) {
                this.count--;
                this.effectCount--;
                const displayObject = effect.displayObject;
                this.containers.remove(displayObject);
                EffectPool.return(effect);
            }
        }
        isBusy() {
            return this.effectCount > 0;
        }
    }
    const EffectManager = new EffectAdaptor();

    function setHitArea(x, y, width, height, displayObject) {
        let hitArea = displayObject.hitArea;
        if (hitArea === null) {
            hitArea = displayObject.hitArea = new Rectangle();
            displayObject.pressed = false;
            displayObject.hovered = false;
        }
        displayObject.checkWorldTransform();
        hitArea.x = x;
        hitArea.y = y;
        hitArea.width = width;
        hitArea.height = height;
    }
    function updateClickable(displayObject) {
        if (displayObject.localAlpha === 0) return;
        displayObject.updateWorldTransform();
        if (isBeingTouched(displayObject)) {
            if (!displayObject.hovered && TouchInput.isHovered()) {
                displayObject.hovered = true;
                displayObject.emit("touchEnter");
            }
            if (TouchInput.isTriggered() && !displayObject.pressed) {
                displayObject.pressed = true;
                displayObject.emit("touchDown");
            }
            if (TouchInput.isReleased() && displayObject.pressed) {
                displayObject.emit("touchUp");
                displayObject.pressed = false;
            }
        } else {
            if (displayObject.hovered) displayObject.emit("touchLeave");
            displayObject.pressed = false;
            displayObject.hovered = false;
        }
    }
    function isBeingTouched(displayObject) {
        const hitArea = displayObject.hitArea;
        const point = displayObject._worldTransform.applyInverse(
            TouchInput.point,
            Clickable.hitPoint
        );
        return hitArea.contains(point.x, point.y);
    }

    const Clickable = {
        hitPoint: new Point(),
        setHitArea,
        updateClickable,
        isBeingTouched,
        __proto__: null
    }

    const allBlendModes = [
        'normal',
        'add',
        'screen',
        'darken',
        'lighten',
        'color-dodge',
        'color-burn',
        'linear-burn',
        'linear-dodge',
        'linear-light',
        'hard-light',
        'soft-light',
        'pin-light',
        'difference',
        'exclusion',
        'overlay',
        'saturation',
        'color',
        'luminosity',
        'add-npm',
        'subtract',
        'divide',
        'vivid-light',
        'hard-mix',
        'negation',
    ];

    Reflect.set(globalThis, "Bitmap", Bitmap);
    GeometrySystem.Effect = Effect;
    GeometrySystem.EffectManager = EffectManager;
    GeometrySystem.EffectAdaptor = EffectAdaptor;
    GeometrySystem.Clickable = Clickable;
    GeometrySystem.SourceOptions = SourceOptions;
    GeometrySystem.TextureOptions = TextureOptions;
    GeometrySystem.SpriteOptions = SpriteOptions;
    GeometrySystem.TextMetricsManager = TextMetricsManager;
    GeometrySystem.TextSize = TextSize;
    GeometrySystem.EMPTY_SOURCE = EMPTY_SOURCE;
    GeometrySystem.getBlendMode = mode => allBlendModes[mode];
    GeometrySystem.SAMPLER = SAMPLER;
    GeometrySystem.VERSION = "1.00";
    return GeometrySystem;
})(Object.create(null));