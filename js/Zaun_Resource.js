"use strict";
Zaun.Resource = ((Resource) => {
    const { LoaderSystem, PoolSystem, EventSystem, ParseSystem, LogSystem } = Zaun.Core;
    const { Logger } = LogSystem;
    const { Pool, PoolCache, createPool } = PoolSystem;
    const { FileReaderPool, CanvasPool } = PoolCache;
    const { Loader } = LoaderSystem;
    const { GlobalEvent } = EventSystem;
    const { SourceOptions } = Zaun.GeometrySystem;
    const { EventEmitter } = PIXI;

    const ImageResource = (() => {
        /**
         * 图像包类，管理图像的加载和缓存
         * @class ImageBundle
         */
        class ImageBundle extends EventEmitter {
            /**
             * 创建图像包
             */
            constructor() {
                super();
                this.path = "";
                this.bitmaps = [];
                this.compressed = false;
                this.isLoaded = false;
            }
            /**
             * 设置图像路径
             * @param {string} path - 图像基础路径
             * @param {boolean} compressed
             */
            setPathAndCompressed(path, compressed = false) {
                this.path = path;
                this.compressed = compressed;
            }
            /**
             * 添加加载监听器
             * @param {Function} fn - 加载完成回调函数
             */
            onLoad(func, context) {
                if (this.isLoaded) func.call(context, this);
                else this.once("loaded", func, context);
                return this;
            }
            async load(...files) {
                const bitmaps = this.bitmaps;
                const path = this.path;
                Loader.enableAddToQueue();
                const compressed = this.compressed;
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (file === String.empty) continue;
                    bitmaps[i] = ImageManager.loadBitmap(path, file, compressed);
                }
                Loader.disableAddToQueue();
                await Loader.waitLoading();
                for (let i = 0; i < bitmaps.length; i++) {
                    const bitmap = bitmaps[i];
                    bitmap.initGpuTexture(true);
                    bitmap.refer();
                }
                this.isLoaded = true;
                this.emit("loaded", this);
            }
            reset() {
                const bitmaps = this.bitmaps;
                for (let i = 0; i < bitmaps.length; i++) {
                    ImageManager.deleteBitmap(bitmaps[i]);
                }
                bitmaps.clear();
                this.removeAllListeners();
                this.isLoaded = false;
                this.path = String.empty;
            }
        }

        createPool("ImageBundlePool", ImageBundle, 100);

        class ImageAdatpor {
            constructor() {
                this.iconWidth = 32;
                this.iconHeight = 32;
                this.faceWidth = 144;
                this.faceHeight = 144;
                /**
                 * @type {Object<string, Bitmap>}
                 */
                this._cache = Object.create(null);
                /**
                 * @type {Object<string, Bitmap>}
                 */
                this._system = Object.create(null);
                this._pool = new Pool(Bitmap, 200);
            }
            clear() {
                const cache = this._cache;
                const pool = this._pool;
                for (const fileName in cache) {
                    const bitmap = cache[fileName];
                    if (bitmap === null || bitmap.referenceCount > 0) continue;
                    pool.return(bitmap);
                    cache[fileName] = null;
                }
            }
            isBitmapExist(folder, fileName) {
                if (fileName !== String.empty) {
                    const isSystem = folder.includes("/system/");
                    const url = `${folder}${fileName}.png`;
                    const cache = isSystem ? this._system : this._cache;
                    return cache[url] != null;
                }
                return false;
            }
            /**
             * @param {string} filename 
             * @returns 
             */
            isZeroParallax(filename) {
                return filename.charAt(0) === "!";
            }
            /**
             * @param {string} filename 
             * @returns 
             */
            isObjectCharacter(filename) {
                return filename.startsWith("!$", 0);
            }
            /**
             * @param {string} filename 
             * @returns 
             */
            isBigCharacter(filename) {
                return filename.charAt(0) === "$" || filename.charAt(1) === "$";
            }
            /**
             * @param {string} filename 
             * @returns 
             */
            isElementCharacter(filename) {
                return filename.charAt(0) === "@";
            }
            loadAnimation(filename) {
                return this.loadBitmap("img/animations/", filename, false);
            }
            loadBattleback1(filename) {
                return this.loadBitmap("img/battlebacks1/", filename, false);
            }
            loadBattleback2(filename) {
                return this.loadBitmap("img/battlebacks2/", filename, false);
            }
            loadEnemy(filename) {
                return this.loadBitmap("img/enemies/", filename, false);
            }
            loadCharacter(filename) {
                return this.loadBitmap("img/characters/", filename, false);
            }
            loadFace(filename) {
                return this.loadBitmap("img/faces/", filename, false);
            }
            loadParallax(filename) {
                return this.loadBitmap("img/parallaxes/", filename, false);
            }
            loadPicture(filename) {
                return this.loadBitmap("img/pictures/", filename, false);
            }
            loadSvActor(filename) {
                return this.loadBitmap("img/sv_actors/", filename, false);
            }
            loadSvEnemy(filename) {
                return this.loadBitmap("img/sv_enemies/", filename, false);
            }
            loadSystem(filename) {
                return this.loadBitmap("img/system/", filename, false);
            }
            loadTileset(filename) {
                return this.loadBitmap("img/tilesets/", filename, false);
            }
            loadTitle1(filename) {
                return this.loadBitmap("img/titles1/", filename, false);
            }
            loadTitle2(filename) {
                return this.loadBitmap("img/titles2/", filename, false);
            }
            loadBitmap(folder, fileName, isCompressed = false) {
                if (fileName !== String.empty) {
                    const isSystem = folder.includes("/system");
                    const url = `${folder}${fileName}`;
                    const cache = isSystem ? this._system : this._cache;
                    let bitmap = cache[url];
                    if (bitmap == null) {
                        bitmap = this._pool.get();
                        cache[url] = bitmap;
                        bitmap.setLoadInfo(isSystem, url, folder, fileName, isCompressed);
                    }
                    return bitmap;
                } else {
                    Logger.error(`Bitmap ${folder}/${fileName} input Error\n instead of using empty bitmap`);
                    return Bitmap.empty;
                }
            }
            deleteBitmap(bitmap = null) {
                if (bitmap === null) {
                    Logger.warn("Bitmap is null");
                    return;
                }
                const isSystem = bitmap.isSystem;
                const url = bitmap.url;
                const cache = isSystem ? this._system : this._cache;
                const success = Reflect.has(cache, url);
                if (success) {
                    cache[url] = null;
                    this.returnBitmap(bitmap);
                }
            }
            returnBitmap(bitmap) {
                this._pool.return(bitmap);
            }
        }
        const ImageManager = new ImageAdatpor();
        globalThis.ImageManager = ImageManager;

        const toReadCanvas = Object.create(null);
        toReadCanvas.canvasObj = null;
        toReadCanvas.url = null;
        function getCanvasDataUrl(canvas, type = "image/webp", quality = 0.92) {
            toReadCanvas.canvas = canvas;
            toReadCanvas.type = type;
            toReadCanvas.quality = quality;
            return new Promise(readCanvasPromise);
        }
        function onCanvasRead(event) {
            const reader = event.target;
            toReadCanvas.resolve(reader.result);
            toReadCanvas.resolve = null;
            toReadCanvas.reject = null;
            FileReaderPool.sampleReturn(reader);
        }
        function onCanvasError(event) {
            const reader = event.target;
            const error = reader.error;
            toReadCanvas.reject(error);
            toReadCanvas.resolve = null;
            toReadCanvas.reject = null;
            FileReaderPool.sampleReturn(reader);
        }
        function canvasToBlob(blob) {
            const reader = FileReaderPool.get();
            reader.onload = onCanvasRead;
            reader.onerror = onCanvasError;
            reader.readAsDataURL(blob);
        }
        function readCanvasPromise(resolve, reject) {
            const canvas = toReadCanvas.canvas;
            const type = toReadCanvas.type;
            const quality = toReadCanvas.quality;
            toReadCanvas.resolve = resolve;
            toReadCanvas.reject = reject;
            canvas.toBlob(canvasToBlob, type, quality);
        }

        function getWebGlPixel(renderer, renderTexture) {
            const gl = renderer.gl;
            const width = renderTexture.width;
            const height = renderTexture.height;
            const pixels = new Uint8Array(4 * width * height);
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            const imageData = new ImageData(
                new Uint8ClampedArray(pixels.buffer),
                width,
                height
            );
            const canvasObj = CanvasPool.get(width, height);
            canvasObj.context.putImageData(imageData, 0, 0);
            toReadCanvas.canvasObj = canvasObj;
            return getCanvasDataUrl(canvas)
                .then(readCanvasUrl);
        }
        function readCanvasUrl(url) {
            toReadCanvas.url = url;
            if (toReadCanvas.canvasObj !== null) {
                CanvasPool.return(toReadCanvas.canvasObj);
                toReadCanvas.canvasObj = null;
            }
        }
        const gpuCanvasObj = {
            canvas: null,
            context: null
        }
        function getGpuCanvas(renderer) {
            if (gpuCanvasObj.canvas === null) {
                const canvas = gpuCanvasObj.canvas = document.createElement("canvas");
                const screen = Engine.screen;
                canvas.width = screen.width;
                canvas.height = screen.height;
                const gpu_context = canvas.getContext("webgpu");
                gpu_context.configure({
                    device: renderer.gpu.device,
                    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC,
                    format: navigator.gpu.getPreferredCanvasFormat(),
                    alphaMode: "premultiplied"
                });
                gpuCanvasObj.context = gpu_context;
            }
        }
        const gpuTextureOptions = {
            source: {
                texture: null,
                origin: {
                    x: 0,
                    y: 0
                }
            },
            target: {
                texture: null
            },
            size: {
                width: 0,
                height: 0
            },
            buffer: []
        }
        function getWebGpuPixel(renderer, renderTexture) {
            getGpuCanvas(renderer);
            const width = renderTexture.width;
            const height = renderTexture.height;
            const canvas = gpuCanvasObj.canvas;
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }
            const context = gpuCanvasObj.context;
            const commandEncoder = renderer.gpu.device.createCommandEncoder();
            gpuTextureOptions.source.texture = renderer.texture.getGpuSource(renderTexture._source);
            gpuTextureOptions.target.texture = context.getCurrentTexture();
            gpuTextureOptions.size.width = width;
            gpuTextureOptions.size.height = height;
            commandEncoder.copyTextureToTexture(gpuTextureOptions.source, gpuTextureOptions.target, gpuTextureOptions.size);
            gpuTextureOptions.buffer[0] = commandEncoder.finish();
            renderer.gpu.device.queue.submit(gpuTextureOptions.buffer);
            return getCanvasDataUrl(canvas)
                .then(readCanvasUrl);
        }
        return {
            ImageBundle,
            getCanvasDataUrl,
            getWebGlPixel,
            getWebGpuPixel,
            __proto__: null,
        };
    })();
    const VideoResource = (() => {
        class VideoPlayer {
            constructor(basePath = "movies/") {
                this.cache = Object.create(null);
                this.basePath = basePath;
            }
            load(url, loop) {
                const loadUrl = this.basePath + url + ".webm";
                let video = this.cache[url];
                if (video == null) {
                    video = this.cache[url] = new Video(loadUrl, loop);
                }
                return video.load();
            }
            get(url) {
                return this.cache[url];
            }
            play(url) {
                const video = this.cache[url];
                if (video !== void 0) {
                    video.play();
                }
            }
            delete(url) {
                const video = this.cache[url];
                video.destroy();
                this.cache[url] = null;
            }
            clear() {
                const cache = this.cache;
                for (const url in cache) {
                    const video = cache[url];
                    video.destroy();
                }
                this.cache = Object.create(null);
            }
        }
        const VideoDevice = new VideoPlayer();

        class Video {
            static MIME_TYPES = {
                ogv: "video/ogg",
                mov: "video/quicktime",
                m4v: "video/mp4",
            };
            constructor(url = "", loop = false) {
                this.initProperties();
                this.url = url;
                this.loop = loop;
                this.setupHandlers();
                this.createVideoElement();
                this.createSourceElement();
            }
            initProperties() {
                this.url = "";
                this.video = null;
                this.loop = false;
                this.textureSource = null;
                this.requestId = 0;
                this.resolve = null;
                this.reject = null;
                this._volume = 0;
                this.source = null;
                this.width = 0;
                this.height = 0;
                this.startListener = Function.empty;
                this.endListener = Function.empty;
                this.loadListener = Function.empty;
                this.isVideoBackReady = false;
                this.isReady = false;
                this.isPlaying = false;
            }
            get volume() {
                return this._volume;
            }
            set volume(value) {
                if (this._volume !== value) {
                    this._volume = value;
                    this.video.volume = value / 100;
                }
            }
            resize(width, height) {
                if (this.width !== width || this.height !== height) {
                    this.width = width;
                    this.height = height;
                    const video = this.video;
                    video.width = width;
                    video.height = height;
                    this.textureSource.resize(width, height, 1);
                }
            }
            setLoadListener(func) {
                if (!this.isVideoBackReady) this.loadListener = func;
                else func(this);
            }
            setupHandlers() {
                this.videoHandler = this.updateVideoFrame.bind(this);
                this.startHandler = this.onPlayStart.bind(this);
                this.errorHandler = this.onError.bind(this);
                this.loadingHandler = this.onLoadingCheck.bind(this);
                this.pauseHandler = this.onPlayPause.bind(this);
                this.endHandler = this.onPlayEnd.bind(this);
                this.promiseHandler = this.onLoadPromise.bind(this);
            }
            updateVideoFrame() {
                this.requestId = 0;
                this.textureSource.emit("update", this.textureSource);
                if (this.requestId === 0) this.requestId = this.video.requestVideoFrameCallback(
                    this.videoHandler
                );
            }
            onError(event) {
                this.video.removeEventListener("error", this.errorHandler);
                const error = event.target.error;
                this.reject(error.message);
                this.reject = null;
                this.resolve = null;
            }
            onLoadingCheck() {
                const video = this.video;
                if (video.readyState >= 4) {
                    this.beforeVidoeStart();
                }
            }
            onVideoPrepare() {
                this.video.currentTime = 0;
                this.textureSource.initGpuTexture();
                this.isVideoBackReady = true;
                this.video.pause();
                this.loadListener(this);
                this.loadListener = Function.empty;
            }
            createTextureSource(video) {
                SourceOptions.resource = video;
                this.textureSource = new PIXI.TextureSource();
                this.textureSource.setupOptions(SourceOptions);
                SourceOptions.resource = null;
                this.textureSource.uploadMethodId = "image";
            }
            beforeVidoeStart() {
                if (!this.isReady) {
                    const video = this.video;
                    const width = video.videoWidth;
                    const height = video.videoHeight;
                    video.width = width;
                    video.height = height;
                    this.width = width;
                    this.height = height;
                    this.createTextureSource(video);
                    this.video.play();
                    this.resolve(this);
                    this.resolve = null;
                    this.reject = null;
                    this.isReady = true;
                }
            }
            onPlayStart() {
                if (!this.isVideoBackReady) {
                    GlobalEvent.on("onVideoPrepare", this, 10, 1);
                    return;
                }
                this.isPlaying = true;
                this.startListener();
                this.updateVideoFrame();
            }
            onPlayPause() {
                if (!this.isVideoBackReady || !this.isPlaying) return;
                this.isPlaying = false;
                this.video.cancelVideoFrameCallback(this.requestId);
                this.requestId = 0;
            }
            onPlayEnd() {
                if (!this.loop) {
                    this.endListener();
                    this.video.currentTime = 0;
                    this.video.cancelVideoFrameCallback(this.requestId);
                    this.requestId = 0;
                }
                this.isPlaying = false;
            }
            play() {
                if (this.isPlaying) return;
                this.video.play();
            }
            pause() {
                this.video.pause();
            }
            createVideoElement() {
                const element = document.createElement("video");
                element.setAttribute("webkit-playsinline", String.empty);
                element.setAttribute("playsinline", String.empty);
                element.setAttribute("muted", "true");
                if (this.loop) {
                    element.setAttribute("loop", "true");
                }
                element.crossOrigin = "anonymous";
                element.addEventListener("progress", this.loadingHandler);
                element.addEventListener("play", this.startHandler);
                element.addEventListener("error", this.errorHandler);
                element.addEventListener("pause", this.pauseHandler);
                element.addEventListener("ended", this.endHandler);
                element.src = this.url;
                this.video = element;
            }
            createSourceElement() {
                const source = document.createElement("source");
                const url = this.url;
                let mime = null;
                if (url.startsWith("data:")) {
                    mime = url.slice(5, url.indexOf(";"));
                } else if (!url.startsWith("blob:")) {
                    const ext = url
                        .split("?")[0]
                        .slice(url.lastIndexOf(".") + 1)
                        .toLowerCase();
                    mime = Video.MIME_TYPES[ext] || `video/${ext}`;
                }
                source.src = url;
                if (mime !== null) source.type = mime;
                this.video.appendChild(source);
                this.source = source;
            }
            load() {
                if (this.isReady) return null;
                return new Promise(this.promiseHandler);
            }
            onLoadPromise(resolve, reject) {
                this.resolve = resolve;
                this.reject = reject;
                this.video.load();
            }
            destroy() {
                const element = this.video;
                element.removeEventListener("play", this.startHandler);
                element.removeEventListener("pause", this.pauseHandler);
                element.removeEventListener("error", this.errorHandler);
                element.removeEventListener("progress", this.loadingHandler);
                element.removeEventListener("ended", this.endHandler);
                element.pause();
                this.source.src = "";
                element.src = "";
                element.load();
                element.removeChild(this.source);
                this.isPlaying = false;
                this.video = null;
                this.source = null;
                this.startListener = null;
                this.endListener = null;
                this.textureSource.destroy();
                this.textureSource.resource = null;
                this.textureSource = null;
            }
        }
        return {
            VideoPlayer,
            VideoDevice,
            Video,
            __proto__: null,
        };
    })();

    const AudioResource = (() => {
        /**
         * 音频源类，处理音频资源的加载和访问
         * @class AudioSource
         */
        class AudioSource extends EventEmitter {
            /**
             * 创建音频源对象
             */
            constructor() {
                super();
                this.initProperties();
            }

            /**
             * 初始化参数
             */
            initProperties() {
                this.audioBuffer = null;
                this.url = String.empty;
                this.fileName = String.empty;
                this.isLoaded = false;
            }

            /**
             * 添加加载监听器
             * @param {Function} func - 加载完成后的回调函数
             * @param {Object} context - 上下文对象
             * @returns {AudioSource} - 当前音频源对象
             */
            onLoad(func, context) {
                if (this.isLoaded) func.call(context, this.fileName);
                else this.once("loaded", func, context);
                return this;
            }
            /**
             * 加载音频文件
             * @param {string} url - 音频文件URL
             * @param {string} fileName - 文件名称
             * @returns {Promise<AudioSource>} - 音频源本身
             */
            async load(url, fileName) {
                this.url = url;
                this.fileName = fileName;
                const data = await Loader.loadSource(url, "binary");
                this.audioBuffer = await AudioManager.audioContext.decodeAudioData(data);
                this.isLoaded = true;
                this.emit("loaded", this.fileName);
            }
            /**
             * 重置音频源
             */
            reset() {
                this.audioBuffer = null;
                this.isLoaded = false;
                this.url = null;
                this.fileName = null;
                this.removeAllListeners();
            }
        }

        /**
         * Web音频适配器，管理游戏音频播放
         * @class WebAudioAdaptor
         */
        class WebAudioAdaptor {
            constructor() {
                /**
                 * @type {AudioContext}
                 */
                this.audioContext = new (AudioContext || webkitAudioContext)();
                this.onUserGestureHandler = this.onUserGesture.bind(this);
                this.audioOptions = {
                    name: String.empty,
                    volume: 100,
                }
                this.initializeState = false;
                this.setupEventListeners();
            }
            static PLAYER_TYPES = {
                bgm: 0,
                bgs: 1,
                me: 2,
                se: 3
            }
            /**
             * 设置待播放的音频数据
             * @param {string} name - 音频类型名称 (bgm/bgs/me/se)
             * @param {number} volume - 音量值 (0-1)
             */
            setAudio(name, volume) {
                const audioOptions = this.audioOptions;
                audioOptions.name = name;
                audioOptions.volume = volume || 100;
            }
            /**
             * 设置事件监听器
             */
            setupEventListeners() {
                globalThis.addEventListener("click", this.onUserGestureHandler);
                globalThis.addEventListener("keydown", this.onUserGestureHandler);
            }
            /**
             * 移除事件监听器
             */
            removeEventListeners() {
                this.initializeState = true;
                globalThis.removeEventListener("click", this.onUserGestureHandler);
                globalThis.removeEventListener("keydown", this.onUserGestureHandler);
            }
            /**
             * 用户交互手势处理
             */
            onUserGesture() {
                const context = this.audioContext;
                if (context.state === "suspended") {
                    context.resume();
                    if (!this.initializeState) this.removeEventListeners();
                }
            }
            initAudioPlayer() {
                this.bgmPlayer = new AudioPlayer("audio/bgm/");
                this.bgsPlayer = new AudioPlayer("audio/bgs/");
                this.sePlayer = new SeAudioPlayer("audio/se/");
                this.mePlayer = new AudioPlayer("audio/me/").setLoop(false);
            }
            /**
             * 获取指定类型的音频播放器
             * @param {string} type - 音频类型 (bgm/bgs/me/se)
             * @returns {AudioPlayer} - 对应的音频播放器
             */
            getPlayer(type) {
                type = WebAudioAdaptor.PLAYER_TYPES[type];
                switch (type) {
                    case 0:
                        return this.bgmPlayer;
                    case 1:
                        return this.bgsPlayer;
                    case 2:
                        return this.mePlayer;
                    case 3:
                        return this.sePlayer;
                    default:
                        return null;
                }
            }
            playBgm(bgm) {
                const player = this.bgmPlayer;
                player.setAudioVolume(bgm.volume);
                player.play(bgm.name);
            }
            loadBgm(bgm) {
                this.bgmPlayer.load(bgm.name);
            }
            replayBgm(bgm) {
                this.bgmPlayer.replay(bgm);
            }
            stopBgm() {
                this.bgmPlayer.stop();
            }
            fadeOutBgm(duration) {
                this.bgmPlayer.fadeOut(duration);
            }
            fadeInBgm(duration) {
                this.bgmPlayer.fadeIn(duration);
            }
            isCurrentBgm(bgm) {
                return this.bgmPlayer.lastAudioName === bgm.name;
            }
            playBgs(bgs) {
                const player = this.bgsPlayer;
                player.setAudioVolume(bgs.volume);
                player.play(bgs.name);
            }
            loadBgs(bgs) {
                this.bgsPlayer.load(bgs.name);
            }
            replayBgs(bgs) {
                this.bgsPlayer.replay(bgs);
            }
            stopBgs() {
                this.bgsPlayer.stop();
            }
            fadeOutBgs(duration) {
                this.bgsPlayer.fadeOut(duration);
            }
            fadeInBgs(duration) {
                this.bgsPlayer.fadeIn(duration);
            }
            playMe(me) {
                const player = this.mePlayer;
                player.setAudioVolume(me.volume);
                player.play(me.name);
            }
            loadMe(me) {
                this.mePlayer.load(me.name);
            }
            fadeOutMe(duration) {
                this.mePlayer.fadeOut(duration);
            }
            stopMe() {
                this.mePlayer.stop();
            }
            playSe(se) {
                const player = this.sePlayer;
                player.setAudioVolume(se.volume);
                player.play(se.name);
            }
            stopSe() {
                this.sePlayer.stopAll();
            }
            loadSe(se) {
                this.sePlayer.load(se.name);
            }
            saveBgm() {
                return this.bgmPlayer.save();
            }
            saveBgs() {
                return this.bgsPlayer.save();
            }
            stopAll() {
                this.bgmPlayer.stop();
                this.bgsPlayer.stop();
                this.sePlayer.stopAll();
                this.mePlayer.stop();
            }
            clearAll() {
                this.bgmPlayer.clear();
                this.bgsPlayer.clear();
                this.sePlayer.clear();
                this.mePlayer.clear();
            }
        }
        const AudioManager = new WebAudioAdaptor();
        globalThis.AudioManager = AudioManager;
        const AudioSourcePool = new Pool(AudioSource, 100);

        class AudioData {
            constructor() {
                this.name = String.empty;
                this.time = 0;
                this.loop = false;
                this.volume = 100;
                this.pitch = 100;
                this.panner = 50;
            }
            onSave(player) {
                this.name = player.lastAudioName;
                this.time = player.lastPlayedTime;
                this.loop = player.loop;
                this.volume = player.volume;
                this.pitch = player.pitch;
                this.panner = player.panner;
            }
        }

        class AudioPlayer {
            constructor(basePath = String.empty) {
                this.initProperties();
                this.basePath = basePath;
                this.initLoop();
                this.createNodes();
                this.setVolume(100);
                this.setPanner(50);
                this.setPitch(0);
            }
            initProperties() {
                this.basePath = String.empty;
                this.isPlaying = false;
                this.loop = false;
                this.volume = 0;
                this.audioVolume = 100;
                this.panner = 0;
                this.pitch = 0;
                this.lastAudioName = String.empty;
                this.startOffset = 0;
                this.startTime = 0;
                this.sourceCache = Object.create(null);
                this.onPlayEnd = this.stop.bind(this);
                this.isPause = false;
                this.lastPlayedTime = 0;
                this.gainNode = null;
                this.sourceNode = null;
                this.pannerNode = null;
                this.audioData = new AudioData();
            }
            initLoop() {
                this.setLoop(true);
            }
            createNodes() {
                const audioContext = AudioManager.audioContext;
                this.gainNode = new GainNode(audioContext);
                this.pannerNode = new StereoPannerNode(audioContext);
                this.sourceNode = this.createSourceNode(audioContext);
                this.gainNode.connect(this.pannerNode);
                this.pannerNode.connect(audioContext.destination);
            }
            createSourceNode() {
                const audioContext = AudioManager.audioContext;
                const sourceNode = new AudioBufferSourceNode(audioContext);
                sourceNode.addEventListener("ended", this.onPlayEnd);
                sourceNode.connect(this.gainNode);
                sourceNode.loop = this.loop;
                sourceNode.detune.value = this.pitch;
                return sourceNode;
            }
            load(fileName = String.empty, play = false) {
                if (fileName === String.empty) return;
                let source = this.sourceCache[fileName];
                if (source == null) {
                    const url = `${this.basePath}${fileName}.ogg`;
                    source = AudioSourcePool.get();
                    this.sourceCache[fileName] = source;
                    if (play) source.onLoad(this.onLoad, this);
                    Loader.add(source.load(url, fileName));
                }
            }
            onLoad(fileName) {
                this.play(fileName);
            }
            play(fileName = String.empty) {
                if (fileName === String.empty) return;
                const source = this.sourceCache[fileName];
                if (source == null) {
                    this.load(fileName, true);
                    return;
                }
                if (!source.isLoaded) {
                    source.onLoad(this.onLoad, this);
                    return;
                }
                if (this.lastAudioName === fileName) return;
                this.stop();
                const audioBuffer = source.audioBuffer;
                this.sourceNode.buffer = audioBuffer;
                this.lastAudioName = fileName;
                this.startTime = AudioManager.audioContext.currentTime;
                this.resetPlayingTime();
                this.resetPlayingState();
                this.sourceNode.start(0, this.startOffset);
            }
            resetPlayingTime() {
                this.startOffset = 0;
                this.lastPlayedTime = 0;
            }
            resetPlayingState() {
                this.isPause = false;
                this.isPlaying = true;
            }
            stop() {
                if (this.isPlaying) {
                    const sourceNode = this.sourceNode;
                    sourceNode.buffer = null;
                    sourceNode.disconnect(this.gainNode);
                    sourceNode.removeEventListener("ended", this.onPlayEnd);
                    this.sourceNode = this.createSourceNode();
                    if (!this.isPause) {
                        this.resetPlayingTime();
                        this.lastAudioName = String.empty;
                        this.isPause = false;
                    }
                    this.isPlaying = false;
                }
                this.gainNode.gain.value = Math.fround(this.volume / 100);
            }
            pause() {
                if (this.isPlaying && !this.isPause) {
                    this.startOffset =
                        AudioManager.audioContext.currentTime - this.startTime;
                    this.lastPlayedTime += this.startOffset;
                    this.isPause = true;
                    this.sourceNode.stop(0);
                }
            }
            continue() {
                if (!this.isPlaying && this.isPause) {
                    const audioSource = this.sourceCache[this.lastAudioName];
                    if (audioSource == null) {
                        Logger.warn(
                            "you can't continue last audio\n player isn't in work now!"
                        );
                        return;
                    }
                    const audioBuffer = audioSource.audioBuffer;
                    this.sourceNode = this.createSourceNode();
                    this.sourceNode.buffer = audioBuffer;
                    if (this.lastPlayedTime >= audioBuffer.duration) {
                        this.resetPlayingTime();
                    }
                    this.startTime = AudioManager.audioContext.currentTime;
                    this.sourceNode.start(0, this.lastPlayedTime);
                    this.isPlaying = true;
                    this.isPause = false;
                }
            }
            getDuration(duration, currentTime) {
                const currentBuffer = this.sourceNode.buffer;
                if (currentBuffer === null)
                    throw new Error("there is nothing is playing");
                const totalTime = currentBuffer.duration;
                const startTime = this.startTime;
                const wasPlayed = currentTime - startTime;
                const restTime = totalTime - wasPlayed;
                return Math.min(duration, restTime);
            }
            fadeIn(duration) {
                if (!this.isPlaying) return;
                const currentTime = AudioManager.audioContext.currentTime;
                duration = this.getDuration(duration, currentTime);
                this.gainNode.gain.linearRampToValueAtTime(1.0, currentTime + duration);
            }
            fadeOut(duration) {
                if (!this.isPlaying) return;
                const currentTime = AudioManager.audioContext.currentTime;
                duration = this.getDuration(duration, currentTime);
                const targetTime = currentTime + duration;
                this.gainNode.gain.linearRampToValueAtTime(0, targetTime);
                this.sourceNode.stop(targetTime);
            }
            setLoop(loop) {
                this.loop = loop;
                return this;
            }
            /**
             * @description 从游戏全局设置中设置基础的音量大小
             * @param {number} volume 
             */
            setVolume(volume) {
                if (this.volume !== volume) {
                    this.volume = volume;
                    this.gainNode.gain.value = Math.fround(volume / 100);
                }
            }
            /**
             * @description 从单独的音频数据中设置音量，同时与当前音量进行比较
             * @param {number} volume 
             * @returns 
             */
            setAudioVolume(volume) {
                volume = this.volume * volume / 100;
                if (this.audioVolume !== volume) {
                    const targetVolume = Math.fround(volume / 100);
                    this.audioVolume = volume;
                    if (this.audioVolume === this.volume) return;
                    this.gainNode.gain.value = targetVolume;
                }
            }
            setPanner(panner) {
                if (this.panner !== panner) {
                    const targetPanner = Math.fround((panner - 50) / 50);
                    this.panner = panner;
                    this.pannerNode.pan.value = targetPanner;
                }
            }
            setPitch(value) {
                this.pitch = Math.fround(value * 100);
            }
            clear() {
                const lastAudioName = this.lastAudioName;
                const sourceCache = this.sourceCache;
                for (const key in sourceCache) {
                    if (lastAudioName === key && this.isPlaying) continue;
                    const source = sourceCache[key];
                    if (source === null) continue;
                    AudioSourcePool.return(source);
                    sourceCache[key] = null;
                }
            }
            save() {
                if (this.isPlaying) {
                    this.startOffset =
                        AudioManager.audioContext.currentTime - this.startTime;
                    this.lastPlayedTime += this.startOffset;
                    this.audioData.onSave(this);
                    return this.audioData;
                }
                return null;
            }
            replay(replayObj) {
                if (replayObj === null) return;
                if (replayObj.name === this.lastAudioName) return;
                this.stop();
                this.lastAudioName = replayObj.name;
                this.lastPlayedTime = replayObj.time;
                this.isPause = true;
                this.setLoop(replayObj.loop);
                this.setAudioVolume(replayObj.volume);
                this.setPanner(replayObj.panner);
                this.setPitch(replayObj.pitch);
                this.continue();
            }
        }
        class SeAudioPlayer extends AudioPlayer {
            initProperties() {
                super.initProperties();
                this.lastFrame = 0;
                this.sourceNodeCache = [];
            }
            initLoop() {
                this.setLoop(false);
            }
            createNodes() {
                const audioContext = AudioManager.audioContext;
                this.gainNode = new GainNode(audioContext);
                this.pannerNode = new StereoPannerNode(audioContext);
                this.gainNode.connect(this.pannerNode);
                this.pannerNode.connect(audioContext.destination);
            }
            stop(e) {
                const sourceNode = e.target;
                if (this.sourceNodeCache.remove(sourceNode)) {
                    sourceNode.buffer = null;
                    sourceNode.disconnect(this.gainNode);
                    sourceNode.removeEventListener("ended", this.onPlayEnd);
                }
            }
            stopAll() {
                const sourceNodeCache = this.sourceNodeCache;
                for (let i = 0; i < sourceNodeCache.length; i++) {
                    const sourceNode = sourceNodeCache[i];
                    if (sourceNode === void 0) continue;
                    sourceNode.stop(0);
                }
            }
            play(fileName) {
                const source = this.sourceCache[fileName];
                if (source == null) {
                    this.load(fileName, true);
                    return;
                }
                if (!source.isLoaded) {
                    source.onLoad(this.onLoad, this);
                    return;
                }
                const currentFrame = Engine.frameCount;
                if (this.lastFrame === currentFrame && this.lastAudioName === fileName) return;
                this.lastFrame = currentFrame;
                const sourceNode = this.createSourceNode();
                this.sourceNodeCache[this.sourceNodeCache.length] = sourceNode;
                this.lastAudioName = fileName;
                const audioBuffer = source.audioBuffer;
                sourceNode.buffer = audioBuffer;
                sourceNode.start(0, 0);
            }
        }
        AudioManager.initAudioPlayer();

        class SampleSoundAdaptor {
            preloadImportantSounds() {
                this.loadSystemSound(0);
                this.loadSystemSound(1);
                this.loadSystemSound(2);
                this.loadSystemSound(3);
            }
            loadSystemSound(n) {
                AudioManager.loadSe($dataSystem.sounds[n]);
            }
            playSystemSound(n) {
                AudioManager.playSe($dataSystem.sounds[n]);
            }
            playCursor() {
                this.playSystemSound(0);
            }
            playOk() {
                this.playSystemSound(1);
            }
            playCancel() {
                this.playSystemSound(2);
            }
            playBuzzer() {
                this.playSystemSound(3);
            }
            playEquip() {
                this.playSystemSound(4);
            }
            playSave() {
                this.playSystemSound(5);
            }
            playLoad() {
                this.playSystemSound(6);
            }
            playBattleStart() {
                this.playSystemSound(7);
            }
            playEscape() {
                this.playSystemSound(8);
            }
            playEnemyAttack() {
                this.playSystemSound(9);
            };
            playEnemyDamage() {
                this.playSystemSound(10);
            };
            playEnemyCollapse() {
                this.playSystemSound(11);
            };
            playBossCollapse1() {
                this.playSystemSound(12);
            };
            playBossCollapse2() {
                this.playSystemSound(13);
            };
            playActorDamage() {
                this.playSystemSound(14);
            };
            playActorCollapse() {
                this.playSystemSound(15);
            };
            playRecovery() {
                this.playSystemSound(16);
            };
            playMiss() {
                this.playSystemSound(17);
            };
            playEvasion() {
                this.playSystemSound(18);
            };
            playMagicEvasion() {
                this.playSystemSound(19);
            };
            playReflection() {
                this.playSystemSound(20);
            };
            playShop() {
                this.playSystemSound(21);
            };
            playUseItem() {
                this.playSystemSound(22);
            };
            playUseSkill() {
                this.playSystemSound(23);
            }
        }
        const SoundManager = new SampleSoundAdaptor();
        globalThis.SoundManager = SoundManager;

        return {
            AudioPlayer,
            AudioSource,
            SeAudioPlayer,
            WebAudioAdaptor,
            SampleSoundAdaptor,
            __proto__: null,
        };
    })();
    const FontResource = (() => {
        class FontAdaptor {
            constructor() {
                this.fontCache = Object.create(null);
            }
            load(family, filename) {
                const font = this.fontCache[family];
                if (font == null) {
                    const url = this.makeUrl(filename);
                    Loader.add(this.startLoading(family, url));
                }
            }
            makeUrl(filename) {
                return "fonts/" + filename;
            }
            async startLoading(family, url) {
                const source = `url(${url})`;
                const font = new FontFace(family, source);
                try {
                    await font.load();
                    document.fonts.add(font);
                    this.fontCache[family] = font;
                } catch (error) {
                    throw new Error(`Loading occured an Error! \nURL is ${url} \n the reason is ${error}`);
                }
            }
            deleteFont(family) {
                const font = this.fontCache[family];
                if (font !== void 0) {
                    document.fonts.delete(font);
                    this.fontCache[family] = null;
                }
            }
        }
        const FontManager = new FontAdaptor();
        globalThis.FontManager = FontManager;
        return {
            FontAdaptor,
            __proto__: null,
        };
    })();

    const DataResource = (() => {
        function getMapName(mapId) {
            return "Map%1.json".format(mapId.padZero(3));
        }

        class DataCache {
            constructor(isMap = false) {
                /**
                 * @type {Object<string, object>}
                 */
                this.cache = Object.create(null);
                /**
                 * @type {DataExtractor|EventExtractor}
                 */
                this.extractor = new (isMap ? EventExtractor : DataExtractor)();
            }
            setData(key, data, type, funcKey) {
                this.cache[key] = data;
                this.extractor.extractData(data, type, funcKey);
            }
            hasData(key) {
                return Reflect.has(this.cache, key);
            }
            /**
             * 
             * @param {string} key 
             * @returns {object}
             */
            getData(key) {
                return this.cache[key];
            }
            deleteData(key) {
                return Reflect.deleteProperty(this.cache, key);
            }
        }

        class DataScript {
            constructor() {
                this.onLoad = this._onLoad.bind(this);
                this.onError = this._onError.bind(this);
                this.reset();
            }
            reset() {
                this.script = null;
                this.url = String.empty;
                this.funcKey = String.empty;
            }
            setup(script, funcKey, url) {
                this.script = script;
                this.funcKey = funcKey;
                this.url = url;
            }
            _onLoad(module) {
                const funcKey = this.funcKey;
                this.script[funcKey] = module[funcKey];
                DataScriptPool.return(this);
            }
            load() {
                Loader.add(import(this.url).then(this.onLoad).catch(this.onError));
            }
            _onError(error) {
                throw new Error(`Loading Script occured an Error! \nURL is ${this.url} \n the reason is ${error}`);
            }
        }
        const DataScriptPool = createPool("DataScriptPool", DataScript, 100);

        class BaseExtractor {
            constructor() {
                /**
                 * @type {RegExp}
                 */
                this.metaRegexp = /<([^<>:]+)(:?)([^>]*)>/g;
            }
            extractMetadata(data) {
                this.loadDataScripts(data);
                if (data.meta !== void 0) return;
                const note = data.note;
                const metaInfo = Object.create(null);
                for (const tag of note.matchAll(this.metaRegexp)) {
                    const tagName = tag[1];
                    const tagValue = tag[3];
                    const tagPattern = tag[2];
                    metaInfo[tagName] = tagPattern === ":" ? ParseSystem.toParse(tagValue) : true;
                }
                data.meta = metaInfo;
            }
            loadDataScripts(data) {
                const scripts = data.scripts;
                if (scripts === void 0) return;
                for (const key of Object.keys(scripts)) {
                    const scriptUrl = scripts[key];
                    const dataScript = DataScriptPool.get();
                    dataScript.setup(scripts, key, scriptUrl);
                    dataScript.load();
                }
            }
            extractData(data, dataType, funcKey) {
                if (funcKey === void 0) return;
                this[funcKey](data, dataType);
            }
        }
        //item 0,skill 1,weapon armor 2,state 3,enemy 4

        class DataExtractor extends BaseExtractor {
            extractActorData(actors, type) {
                for (let i = 1; i < actors.length; i++) {
                    const actor = actors[i];
                    if (actor === null) continue;
                    actor[type] = true;
                    this.extractMetadata(actor);
                    this.extractActorMetaData(actor);
                }
            }
            extractActorMetaData(_actor) { }
            extractClassData(classDatas, type) {
                for (let i = 1; i < classDatas.length; i++) {
                    const classData = classDatas[i];
                    if (classData === null) continue;
                    classData[type] = true;
                    this.extractMetadata(classData);
                    this.extractClassMetaData(classData);
                }
            }
            extractClassMetaData(_classData) { }
            extractSkillData(skills, type) {
                for (let i = 1; i < skills.length; i++) {
                    const skill = skills[i];
                    if (skill === null) continue;
                    skill[type] = true;
                    skill.dataType = 3;
                    this.extractMetadata(skill);
                    this.extractSkillMetaData(skill);
                }
            }
            extractSkillMetaData(_skill) { }
            extractItemData(items, type) {
                for (let i = 1; i < items.length; i++) {
                    const item = items[i];
                    if (item === null) continue;
                    item[type] = true;
                    item.dataType = 0;
                    this.extractMetadata(item);
                    this.extractItemMetaData(item);
                }
            }
            extractItemMetaData(_item) { }
            extractWeaponData(weapons, type) {
                for (let i = 1; i < weapons.length; i++) {
                    const weapon = weapons[i];
                    if (weapon === null) continue;
                    weapon[type] = true;
                    weapon.dataType = 1;
                    this.extractMetadata(weapon);
                    this.extractWeaponMetaData(weapon);
                }
            }
            extractWeaponMetaData(_weapon) { }
            extractArmorData(armors, type) {
                for (let i = 1; i < armors.length; i++) {
                    const armor = armors[i];
                    if (armor === null) continue;
                    armor[type] = true;
                    armor.dataType = 2;
                    this.extractMetadata(armor);
                    this.extractArmorMetaData(armor);
                }
            }
            extractArmorMetaData(_armor) { }
            extractEnemyData(enemys, type) {
                for (let i = 1; i < enemys.length; i++) {
                    const enemy = enemys[i];
                    if (enemy === null) continue;
                    enemy[type] = true;
                    this.extractMetadata(enemy);
                    this.extractEnemyMetaData(enemy);
                }
            }
            extractEnemyMetaData(_enemy) { }
            extractStateData(states, type) {
                for (let i = 1; i < states.length; i++) {
                    const state = states[i];
                    if (state === null) continue;
                    state[type] = true;
                    this.extractMetadata(state);
                    this.extractStateMetaData(state);
                }
            }
            extractStateMetaData(_state) { }
        }

        class EventExtractor extends BaseExtractor {
            constructor() {
                super();
                this.conditionFuncCache = Object.create(null);
                this.valueFuncCache = Object.create(null);
                this.scriptCache = Object.create(null);
            }
            /**
             * @param {string} funcText 
             * @returns {Function}
             */
            getConditionFuncCache(funcText) {
                const conditionFuncCache = this.conditionFuncCache;
                let func = conditionFuncCache[funcText];
                if (func === void 0) {
                    func = conditionFuncCache[funcText] = new Function("return " + funcText);
                }
                return func;
            }
            /**
             * @param {string} funcText 
             * @returns {Function}
             */
            getValueFuncCache(funcText) {
                const valueFuncCache = this.valueFuncCache;
                let func = valueFuncCache[funcText];
                if (func === void 0) {
                    func = valueFuncCache[funcText] = new Function("return " + funcText);
                }
                return func;
            }
            /**
             * @param {string} funcText 
             * @returns {Function}
             */
            getScriptFunc(funcText) {
                let func = this.scriptCache[funcText];
                if (func === void 0) {
                    func = this.scriptCache[funcText] = new Function(funcText);
                }
                return func;
            }
            extractCommonEventData(commonEvents) {
                for (let i = 1; i < commonEvents.length; i++) {
                    const commonEvent = commonEvents[i];
                    if (commonEvent === null) continue;
                    this.extractCommonEventMetaData(commonEvent);
                }
            }
            extractCommonEventMetaData(commonEvent) {
                const list = commonEvent.list;
                for (let i = 0; i < list.length; i++) {
                    const command = list[i];
                    const code = command.code;
                    const parameters = command.parameters;
                    this.extractCommanddata(code, parameters, Object.empty, list, i);
                }
            }
            /**
             * @param {object} mapData 
             */
            extractMapData(mapData) {
                this.extractMetadata(mapData);
                const events = mapData.events;
                for (let i = 1; i < events.length; i++) {
                    const event = events[i];
                    if (event === null) continue;
                    this.extractMetadata(event);
                    this.extractEventMetaData(event);
                }
            }
            /**
             * @param {object} event 
             */
            extractEventMetaData(event) {
                const pages = event.pages;
                for (let i = 0; i < pages.length; i++) {
                    const page = pages[i];
                    const lists = page.list;
                    for (let j = 0; j < lists.length; j++) {
                        const command = lists[j];
                        const code = command.code;
                        const parameters = command.parameters;
                        this.extractCommanddata(code, parameters, page, lists, j);
                    }
                    this.extraceMoveRoute(page);
                }
            }
            "101"(parameters, _page, _list, _index) {
                let speakerName = parameters[4];
                //speakerName = convertEscapeCharacters(speakerName);
                parameters[4] = speakerName;
            }
            "102"(parameters, _pages, _list, _index) {
                const choices = parameters[0];
                for (let i = 0; i < choices.length; i++) {
                    let choiceText = choices[i];
                    //choiceText = convertEscapeCharacters(choiceText);
                    choices[i] = choiceText;
                }
            }
            /**
             * @description 被其他插件拓展 
             * 注释的解析
             */
            "108"(parameters, page, _list, _index) {
                const params = parameters[0];
                if (params.includes("label:") && page.label === void 0) {
                    let label = params.substring(6);
                    //label = convertEscapeCharacters(label);
                    page.label = label;
                }
            }
            "111"(parameters, _page, _list, _index) {
                const type = parameters[0];
                if (type === 12) {
                    const funcText = parameters[1];
                    this.getConditionFuncCache(funcText);
                }
            }
            "122"(parameters, _page, _list, _index) {
                const operate = parameters[3];
                if (operate === 4) {
                    const funcText = parameters[4];
                    this.getValueFuncCache(funcText);
                }
            }
            "355"(parameters, _page, list, index) {
                let funcText = parameters[0];
                let startIndex = index;
                while (list[startIndex + 1].code === 655) {
                    startIndex++;
                    funcText += `\n${list[startIndex].parameters[0]}`;
                }
                this.getScriptFunc(funcText);
            }
            "357"(parameters, _page, _list, _index) {
                const commandName = parameters[1];
                const args = parameters[3];
                this.extractPluginCommand(commandName, args, parameters);
            }
            "401"(parameters, _page, _list, _index) {
                let text = parameters[0];
                //text = convertEscapeCharacters(text);
                parameters[0] = text;
            }
            extractCommanddata(code, parameters, page, list, index) {
                const func = this[code];
                if (func !== void 0) {
                    func.call(this, parameters, page, list, index);
                }
            }
            extractPluginCommand(_commandName, args, parameters) {
                parameters[3] = ParseSystem.toParse(args);
            }
            extraceMoveRoute(page) {
                const moveRoute = page.moveRoute;
                const list = moveRoute.list;
                let scriptCache = moveRoute.scriptCache;
                if (scriptCache === void 0) {
                    scriptCache = moveRoute.scriptCache = Object.create(null);
                }
                for (let i = 0; i < list.length; i++) {
                    const command = list[i];
                    const code = command.code;
                    if (code !== 45) continue;
                    const funcText = command.parameters[0];
                    if (scriptCache[funcText] === void 0) {
                        scriptCache[funcText] = new Function(funcText);
                    }
                }
            }
        }

        class DataGenerator {
            #generated = false;
            constructor() {
                this.initGlobalData();
            }
            generateGameObjects() {
                if (this.#generated) {
                    throw new SyntaxError("Game Objects have been generated!");
                }
                this.createGlobalObjects();
                this.#generated = true
            }
            initGlobalData() {
                const _this = globalThis;
                _this.$dataActors = null;
                _this.$dataClasses = null;
                _this.$dataSkills = null;
                _this.$dataActors = null;
                _this.$dataItems = null;
                _this.$dataWeapons = null;
                _this.$dataArmors = null;
                _this.$dataEnemies = null;
                _this.$dataTroops = null;
                _this.$dataStates = null;
                _this.$dataAnimations = null;
                _this.$dataTilesets = null;
                _this.$dataCommonEvents = null;
                _this.$dataMapInfos = null;
                _this.$dataMap = null;
                _this.$testEvent = null;
            }
            setupNewGame() {
                this.resetGlobalObjects();
                $gamePlayer.setupForNewGame();
            }
            setupGameStart() {
                if (Zaun.BatchMarkTest) {
                    Zaun.BatchMarkTest.startTest(500000, true);
                    return;
                }
                if (Utils.isOptionValid("btest")) {
                    this.setupBattleTest();
                } else if (Utils.isOptionValid("etest")) {
                    this.setupEventTest();
                } else {
                    this.setupNormalGame();
                }
            }
            setupNormalGame() {
                if ($dataSystem.startMapId === 0) throw new Error("Player's starting position is not set");
                Engine.frameCount = 0;
                SceneManager.goto("Scene_Splash");
            }
            setupBattleTest() {
                $gameParty.setupBattleTest();
                BattleManager.setup($dataSystem.testTroopId, true, false);
                BattleManager.setBattleTest(true);
                globalThis.$dataMap = emptyMapData;
                SceneManager.goto("Scene_Battle");
            }
            setupEventTest() {
                $gamePlayer.reserveTransfer(-1, 8, 6);
                $gamePlayer.setTransparent(false);
            }
            resetGlobalObjects() {
                const _this = globalThis;
                _this.$gameTemp.reset();
                _this.$gameSystem.reset();
                _this.$gameScreen.clear();
                _this.$gameTimer.initialize();
                _this.$gameMessage.clear();
                _this.$gameSwitches.clear();
                _this.$gameVariables.clear();
                _this.$gameSelfSwitches.clear();
                _this.$gameActors.reset();
                _this.$gameParty.reset();
                const followers = _this.$gamePlayer._followers;
                followers.reset(false);
                _this.$gamePlayer.reset(false);
                if (Zaun.TimeSystem) {
                    Zaun.TimeSystem.globalTime.setupInitialTime();
                }
                if (Zaun.QuestSystem) {
                    Zaun.QuestSystem.QuestManager.reset();
                }
                if (Zaun.TankCore) {
                    Zaun.TankCore.TankManager.resetTanks();
                }
                followers.reverseFollowersUid();
                _this.$gameTroop.clear();
                _this.$gameMap.reset();
                Engine.frameCount = 0;
            }
            createGlobalObjects() {
                const _this = globalThis;
                _this.$gameTemp = new Game_Temp();
                _this.$gameSystem = new Game_System();
                _this.$gameScreen = new Game_Screen();
                _this.$gameTimer = new Game_Timer();
                _this.$gameMessage = new Game_Message();
                _this.$gameSwitches = new Game_Switches();
                _this.$gameVariables = new Game_Variables();
                _this.$gameSelfSwitches = new Game_SelfSwitches();
                _this.$gameActors = new Game_Actors();
                _this.$gameParty = new Game_Party();
                _this.$gameTroop = new Game_Troop();
                _this.$gameMap = new Game_Map();
                if (Zaun.TankCore) {
                    Zaun.TankCore.TankManager.setupTanks();
                }
                const followers = new Game_Followers();
                _this.$gamePlayer = new Game_Player(followers);
            }
            beforeGameStart() {
                this.clearTempObjects();
                SaveManager.createSaveData();
                Game_Map.setupCommonEvents();
                $gameMap.initMapConstant();
            }
            /**
             * @description 清除临时对象
             */
            clearTempObjects() {

            }
        }

        const GlobalDataGenerator = new DataGenerator();

        const emptyMapData = {
            data: Object.empty,
            events: Array.empty,
            width: 100,
            height: 100,
            scrollType: 3,
        }
        class DataAdaptor {
            constructor() {
                /**
                 * @type {DataCache}
                 */
                this.systemCache = new DataCache(false);
                /**
                 * @type {DataCache}
                 */
                this.mapCache = new DataCache(true);
            }
            /**
             * @param {string} funcText 
             * @returns {Function}
             */
            getScriptConditionFunc(funcText) {
                return this.mapCache.extractor.getConditionFuncCache(funcText);
            }
            /**
             * @param {string} funcText 
             * @returns {Function}
             */
            getScriptValueFunc(funcText) {
                return this.mapCache.extractor.getValueFuncCache(funcText);
            }
            /**
             * @param {string} funcText 
             * @returns {Function}
             */
            getScriptFunc(funcText) {
                return this.mapCache.extractor.getScriptFunc(funcText);
            }
            /**
             * @param {string} name 
             * @param {string} src 
             * @param {string} type 
             * @param {string} key 
             * @param {boolean} isMapData 
             * @param {boolean} setGlobal 
             * @returns {Promise<object>}
             */
            async loadDataFile(name, src, type, key, isMapData = false, setGlobal = true) {
                const url = `data/${src}`;
                const data = await Loader.loadSource(url, "json");
                const cache = isMapData ? this.mapCache : this.systemCache;
                if (setGlobal) globalThis[name] = data;
                cache.setData(src, data, type, key);
                return data;
            }
            loadMapData(mapId) {
                if (mapId <= 0) {
                    globalThis.$dataMap = emptyMapData;
                    return;
                }
                const filename = getMapName(mapId);
                Loader.add(this.loadDataFile("$dataMap", filename, "isMap", "extractMapData", true, true));
            }
            /**
             * @param {number} mapId 
             * @returns {object}
             */
            getMapData(mapId) {
                const filename = getMapName(mapId);
                return this.mapCache.getData(filename);
            }
            hasMapData(mapId) {
                const filename = getMapName(mapId);
                return this.mapCache.hasData(filename);
            }
            /**
             * @description 预加载地图数据
             * @param {number} mapId 
             * @returns {Promise<object>}
             */
            preloadMapData(mapId) {
                const filename = getMapName(mapId);
                return this.loadDataFile("$dataMap", filename, "isMap", "extractMapData", true, false);
            }
        }
        const DataManager = new DataAdaptor();
        globalThis.DataManager = DataManager;
        return {
            DataAdaptor,
            DataCache,
            BaseExtractor,
            DataExtractor,
            EventExtractor,
            DataGenerator,
            GlobalDataGenerator,
            __proto__: null,
        };
    })();
    Object.freeze(ImageResource);
    Object.freeze(VideoResource);
    Object.freeze(AudioResource);
    Object.freeze(FontResource);
    Object.freeze(DataResource);
    Resource.ImageResource = ImageResource;
    Resource.VideoResource = VideoResource;
    Resource.AudioResource = AudioResource;
    Resource.FontResource = FontResource;
    Resource.DataResource = DataResource;
    Resource.VERSION = "1.00";
    return Resource;
})(Object.create(null));
