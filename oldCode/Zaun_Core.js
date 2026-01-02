/*:
 * @target MZ
 * @author Zaun
 * @plugindesc [v1.00] 功能核心
 * @help
 * 该插件作为免费插件，以供我的插件和其他插件使用
 * 默认情况下不提供任何运行的功能
 * 
 * 2024.3.19 初版完成 1.00
 * 2024.5.2 版本变化 1.00 -> 1.10
 * 加载器移除
 * 理由，常规的rm不需要额外的加载器进行控制
 * 同时也是为了更快的加载，异步的数量不做限制
 * 
 * 2024.7.4 AM1:30
 * 版本变化 1.10->1.20
 * 解析器重构
 * 
 * */
"use strict";
globalThis.Zaun = Object.create(null);
Zaun.Core = (Core => {
  const CoreUtils = (() => {
    const freezeObject = {
      configurable: false,
      writable: false
    };
    Reflect.defineProperty(Function, "create", {
      configurable: false,
      writable: false,
      value(arg) {
        return () => arg;
      }
    })
    Reflect.defineProperty(Function, "empty", {
      configurable: false,
      writable: false,
      value: () => null
    })
    Function.false = Function.create(false);
    Reflect.defineProperty(Function, "false", freezeObject)
    Function.true = Function.create(true);
    Reflect.defineProperty(Function, "true", freezeObject)
    Function.error = error => { throw new Error(error) };
    Reflect.defineProperty(Function, "error", {
      configurable: false,
      writable: false
    })
    Object.mixin = function (targetObj, sourceObj) {
      for (const key in sourceObj) {
        const desc = Object.getOwnPropertyDescriptor(sourceObj, key);
        Object.defineProperty(targetObj, key, desc);
      }
    }
    String.empty = "";
    Reflect.defineProperty(String, "empty", {
      configurable: false,
      writable: false
    })
    Reflect.defineProperty(Array, "empty", {
      value: new Proxy([], {
        set(_target, _prop, _value) {
          LogSystem.Logger.warn("Array.empty is read-only");
          return false;
        }
      }),
      writable: false,
      configurable: false
    });
    Reflect.defineProperty(Object, "empty", {
      value: new Proxy({}, {
        set(_target, _prop, _value) {
          LogSystem.Logger.warn("Object.empty is read-only");
          return false;
        }
      }),
      writable: false,
      configurable: false
    });
    Math.angle = Math.PI / 180;
    Reflect.defineProperty(Math, "angle", freezeObject)
    function sortMinToBig(a, b) {
      return a - b;
    }
    Array.prototype.sortMinToBig = function () {
      this.sort(sortMinToBig);
      return this;
    }
    Reflect.defineProperty(Array.prototype, "sortMinToBig", {
      configurable: false,
      writable: false,
      enumerable: false
    });
    Array.prototype.previousElement = function (index) {
      const length = this.length;
      index = (index + length - 1) % length;
      return this[index];
    }
    Reflect.defineProperty(Array.prototype, "previousElement", {
      enumerable: false
    });
    Array.prototype.nextElement = function (index) {
      const length = this.length;
      index = (index + 1) % length;
      return this[index];
    }
    Reflect.defineProperty(Array.prototype, "nextElement", {
      enumerable: false
    });
    Array.prototype.copy = function (array) {
      if (array === this) return;
      this.length = array.length;
      for (let i = 0; i < array.length; i++) {
        this[i] = array[i];
      }
      return this;
    }
    Reflect.defineProperty(Array.prototype, "copy", {
      enumerable: false
    });
    Array.prototype.mapNumber = function () {
      const size = this.length;
      for (let i = 0; i < size; i++) {
        let str = this[i];
        str = str.trim();
        this[i] = Number(str);
      }
      return this;
    }
    Reflect.defineProperty(Array.prototype, "mapNumber", {
      enumerable: false
    });
    /**
     * 移除数组中的元素
     * @param {any} item 要移除的元素
     * @param {number} [startIndex=0] 开始索引
     * @param {number} [amount=1] 移除的数量
     * @param {Function} [callback=Function.empty] 移除元素的回调函数
     * @returns {boolean} 是否移除成功
     */
    Array.prototype.remove = function (item, startIndex, amount, callback = Function.empty) {
      const length = this.length;
      if (length === 0) return false;
      const maxSize = length - 1;
      amount = amount || 1;
      const endIndex = (startIndex ? startIndex + amount : maxSize).clamp(0, maxSize);
      startIndex = startIndex || 0;
      if (startIndex > maxSize) return false;
      let found = item === this[startIndex];
      // 移除元素数量为1的特殊情况
      if (found && (startIndex >= 0 && startIndex === endIndex)) {
        callback(this[startIndex]);
        this.length = length - 1;
        return true;
      }
      for (let i = startIndex; i < length; i++) {
        if (!found && this[i] === item) {
          found = true;
        }
        if (found) {
          const newIndex = i + amount;
          if (newIndex > maxSize) break;
          callback(this[i]);
          this[i] = this[newIndex];
        }
      }
      if (found) {
        this.length = length - amount;
        return true;
      }
      return false;
    };
    Reflect.defineProperty(Array.prototype, "remove", {
      enumerable: false
    });
    Array.prototype.add = function (item, itemIndex, onlyIfNotExists = true) {
      if (onlyIfNotExists && this.includes(item)) return false;
      const max = this.length;
      itemIndex = itemIndex == null ? max : itemIndex;
      itemIndex = itemIndex.clamp(0, max);
      if (itemIndex === max) {
        this[max] = item;
        return true;
      }
      this.length = max + 1;
      for (let i = max; i > itemIndex; i--) {
        this[i] = this[i - 1];
      }
      this[itemIndex] = item;
      return true;
    };
    Reflect.defineProperty(Array.prototype, "add", {
      enumerable: false
    });
    Array.prototype.clear = function () {
      this.length = 0;
      return this;
    }
    Reflect.defineProperty(Array.prototype, "clear", {
      enumerable: false
    });
    Array.prototype.swap = function (index1, index2) {
      const temp = this[index1];
      this[index1] = this[index2];
      this[index2] = temp;
      return this;
    };
    Reflect.defineProperty(Array.prototype, "swap", {
      enumerable: false
    });

    Array.prototype.equals = function (array) {
      if (!array || this.length !== array.length) {
        return false;
      }
      for (let i = 0; i < this.length; i++) {
        const value = this[i];
        const target = array[i];
        if (Array.isArray(value) && Array.isArray(target)) {
          if (!value.equals(target)) {
            return false;
          }
        } else if (value !== target) {
          return false;
        }
      }
      return true;
    };

    Reflect.defineProperty(Array.prototype, "equals", {
      enumerable: false
    });

    Math.randomInt = function (max) {
      return Math.floor(max * Math.random());
    };
    Reflect.defineProperty(Math, "randomInt", {
      enumerable: false
    });
    /**
     * @description 根据输入的最大值和最小值，返回一个介于两个值之间的随机整数值，min和max是自然整数，不会同时为0，闭区间，左右边界都可以取到
     * @param {number} min 
     * @param {number} max 
     * @return {number}
     */
    Math.randomRange = function (min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    Reflect.defineProperty(Math, "randomRange", {
      enumerable: false
    });
    Math.isPowOfTwo = function (v) {
      return (v & 1) === 0;
    }
    Reflect.defineProperty(Math, "isPowOfTwo", {
      enumerable: false
    });
    Number.prototype.clamp = function (min, max) {
      return Math.min(Math.max(this, min), max);
    };
    Reflect.defineProperty(Number.prototype, "clamp", {
      enumerable: false
    });
    Number.prototype.mod = function (n) {
      return ((this % n) + n) % n;
    };
    Reflect.defineProperty(Number.prototype, "mod", {
      enumerable: false
    });
    Number.prototype.padZero = function (length) {
      return `${this}`.padZero(length);
    };
    Reflect.defineProperty(Number.prototype, "padZero", {
      enumerable: false
    });
    String.prototype.padZero = function (length) {
      return this.padStart(length, "0");
    };
    Reflect.defineProperty(String.prototype, "padZero", {
      enumerable: false
    });
    if (String.prototype.replaceAll === void 0) {
      String.prototype.replaceAll = function (str, replace) {
        return this.replace(new RegExp(str, "g"), replace);
      }
      Reflect.defineProperty(String.prototype, "replaceAll", {
        enumerable: false
      });
    }
    RegExp.number = /\d+/g;
    Reflect.defineProperty(RegExp, "number", {
      enumerable: false
    });
    const DESTROY_OPTIONS = { children: true, texture: true };
    const isElectron = Reflect.has(globalThis, "electronAPI");
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|Opera Mini/i.test(navigator.userAgent);
    let argvs = location.search.slice(1).split("&");

    class UtilsAdaptor {
      constructor() {
        this.RPGMAKER_NAME = "Super_RPG_Maker";
        this.RPGMAKER_VERSION = "1.0.0";
        this.isElectron = isElectron;
      }
      async initializeElectronProcessArgv() {
        argvs = await electronAPI.processArgv();
      }
      isOptionValid(name) {
        return argvs.includes(name);
      }
      isNwjs() {
        return false;
      }
      isMobileDevice() {
        return isMobileDevice;
      }
      /**
       * 提取文件名
       * @param {string} filename - 文件路径
       * @returns {string} 文件名
       */
      extractFileName(filename) {
        const lastSlashIndex = filename.lastIndexOf("/");
        return filename.substring(lastSlashIndex + 1);
      }
    }
    const formatNum = num => num < 10 ? '0' + num : num;
    globalThis.Utils = new UtilsAdaptor();
    return {
      UtilsAdaptor,
      DESTROY_OPTIONS,
      formatNum,
      __proto__: null
    }
  })();
  const LogSystem = (() => {
    /**
     * 日志记录器
     * @class LogAdaptor
     */
    class LogAdaptor {
      constructor() {
        this.messages = [];
        // 样式配置
        this.styles = {
          debug: 'color: #7c7c7c; font-style: italic;',
          info: 'color: #0078D7; font-weight: normal;',
          log: 'color: #0e0d0c; font-weight: bold;',
          message: 'color: initial; font-weight: normal;',
          warn: 'color: #FF8C00; font-weight: bold;',
          error: 'color: #E81123; font-weight: bold; font-size: 1.05em;',
          success: 'color: #107C10; font-weight: bold;',
          highlight: 'color: #7928CA; font-weight: bold;',
          performance: 'color: #881798; font-style: italic;',
          // 模块样式
          core: 'color: #0063B1; background-color: #E6F3FF; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
          fs: 'color: #004E8C; background-color: #E1F1FF; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
          parser: 'color: #7928CA; background-color: #F3E7FF; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
          loader: 'color: #004D40; background-color: #E0F2F1; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
          pool: 'color: #BF360C; background-color: #FFF3E0; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
          event: 'color: #004D40; background-color: #DCEDC8; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
          anim: 'color: #B71C1C; background-color: #FFEBEE; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
          // 普通文本样式
          label: 'color: #000000; font-weight: bold;',
          value: 'color: #0063B1;',
          path: 'color: #7928CA; font-family: monospace;',
          time: 'color: #555555; font-style: italic;',
          json: 'color: #881798; font-family: monospace;'
        };
        this.warnCount = 0;
        this.warnLimit = 255;
      }
      /**
       * 获取格式化的时间戳
       * @returns {string} 格式化的时间戳
       * @private
       */
      _getTimestamp() {
        const now = new Date();
        const hours = `${now.getHours()}`.padStart(2, '0');
        const minutes = `${now.getMinutes()}`.padStart(2, '0');
        const seconds = `${now.getSeconds()}`.padStart(2, '0');
        return `[${hours}:${minutes}:${seconds}]`;
      }
      /**
       * 格式化日志消息
       * @param {string} level - 日志级别
       * @param {string} module - 模块名称
       * @param {string} message - 日志消息
       * @param {string} messageStyle - 消息样式
       * @returns {Array} 格式化后的消息和样式
       * @private
       */
      _formatMessage(level, module, message, messageStyle = "message") {
        const timestamp = this._getTimestamp();
        const styles = this.styles;
        const timestampStyle = styles.time;
        const levelStyle = styles[level];
        const moduleStyle = styles[module] || styles.core;
        const msgStyle = styles[messageStyle] || styles.message;
        const prefix = `%c${timestamp} %c[${level.toUpperCase()}] %c[${module}] %c ${message}`;
        let index = 0;
        const messages = this.messages.clear();
        messages[index++] = prefix;
        messages[index++] = timestampStyle;
        messages[index++] = levelStyle;
        messages[index++] = moduleStyle;
        messages[index++] = msgStyle;
        return messages;
      }
      /**
       * 打印调试日志
       * @param {string} message - 日志信息
       * @param {any} [data] - 附加数据
       * @param {string} [module='core'] - 模块名称
       * @param {string} messageStyle - 消息样式
       */
      debug(message, data, module = 'core', messageStyle) {
        const formattedMessage = this._formatMessage('debug', module, message, messageStyle);
        if (data !== undefined) {
          console.debug(...formattedMessage, data);
        } else {
          console.debug(...formattedMessage);
        }
      }
      /**
       * 输出日志信息
       * @param {string} message - 日志信息
       * @param {any} [data] - 附加数据
       * @param {string} [module='core'] - 模块名称
       * @param {string} messageStyle - 消息样式
       */
      info(message, data, module = 'core', messageStyle) {
        const formattedMessage = this._formatMessage('info', module, message, messageStyle);
        if (data !== undefined) {
          console.info(...formattedMessage, data);
        } else {
          console.info(...formattedMessage);
        }
      }
      /**
       * 打印普通日志
       * @param {string} message - 日志信息
       * @param {any} [data] - 附加数据
       * @param {string} [module='core'] - 模块名称
       * @param {string} messageStyle - 消息样式
       */
      log(message, data, module = 'core', messageStyle) {
        const formattedMessage = this._formatMessage('log', module, message, messageStyle);
        if (data !== undefined) {
          console.log(...formattedMessage, data);
        } else {
          console.log(...formattedMessage);
        }
      }
      /**
       * 打印警告日志
       * @param {string} message - 日志信息
       * @param {any} [data] - 附加数据
       * @param {string} [module='core'] - 模块名称
       * @param {string} messageStyle - 消息样式
       */
      warn(message, data, module = 'core', messageStyle) {
        if (this.warnCount > this.warnLimit) return;
        const formattedMessage = this._formatMessage('warn', module, message, messageStyle);
        if (data !== undefined) {
          console.warn(...formattedMessage, data);
        } else {
          console.warn(...formattedMessage);
        }
        this.warnCount++;
        if (this.warnCount === this.warnLimit) {
          console.warn("当前环境下已经有太多警告，不再显示警告");
        }
      }
      /**
       * 打印错误日志
       * @param {string} message - 日志信息
       * @param {any} [data] - 附加数据
       * @param {string} [module='core'] - 模块名称
       * @param {string} messageStyle - 消息样式
       */
      error(message, data, module = 'core', messageStyle) {
        if (this.warnCount > this.warnLimit) return;
        const formattedMessage = this._formatMessage('error', module, message, messageStyle);
        if (data !== undefined) {
          console.error(...formattedMessage, data);
        } else {
          console.error(...formattedMessage);
        }
        this.warnCount++;
        if (this.warnCount === this.warnLimit) {
          console.error("当前环境下已经有太多错误，不再显示错误");
        }
      }
      /**
       * 打印性能日志
       * @param {string} label - 性能标签
       * @param {Function} callback - 要测量的函数
       * @param {string} [module='core'] - 模块名称
       * @returns {any} 函数返回值
       */
      performance(label, callback, module = "core") {
        const perfLabel = `[PERF] [${module}] ${label}`;
        console.time(perfLabel);
        const result = callback();
        console.timeEnd(perfLabel);
        return result;
      }
      /**
       * 打印表格数据
       * @param {string} label - 表格标签
       * @param {Array|Object} data - 表格数据
       * @param {string} [module='core'] - 模块名称
       * @param {string} messageStyle - 消息样式
       */
      table(label, data, module = 'core', messageStyle) {
        const formattedMessage = this._formatMessage('info', module, label, messageStyle);
        console.info(...formattedMessage);
        console.table(data);
      }
      /**
       * 打印分组日志开始
       * @param {string} label - 分组标签
       * @param {boolean} [collapsed=false] - 是否折叠分组
       * @param {string} [module='core'] - 模块名称
       * @param {string} messageStyle - 消息样式
       */
      group(label, collapsed = false, module = 'core', messageStyle) {
        const formattedMessage = this._formatMessage('info', module, label, messageStyle);
        if (collapsed) {
          console.groupCollapsed(...formattedMessage);
        } else {
          console.group(...formattedMessage);
        }
      }
      /**
       * 结束分组日志
       */
      groupEnd() {
        console.groupEnd();
      }
      /**
       * 打印对象属性
       * @param {string} label - 对象标签
       * @param {Object} obj - 要打印的对象
       * @param {string} [module='core'] - 模块名称
       * @param {string} messageStyle - 消息样式
       */
      dir(label, obj, module = 'core', messageStyle) {
        const formattedMessage = this._formatMessage('debug', module, label, messageStyle);
        console.info(...formattedMessage);
        console.dir(obj);
      }
      /**
       * 清除控制台
       */
      clear() {
        console.clear();
      }
    }
    const Logger = new LogAdaptor();
    return {
      Logger,
      __proto__: null
    }
  })();
  const PoolSystem = (() => {
    /**
     * 通用对象池类
     * @class Pool
     */
    class Pool {
      /**
       * 创建对象池
       * @param {Function} classConstructor - 对象构造函数
       * @param {number} [poolSize=100] - 池大小
       */
      constructor(classConstructor, poolSize = 100) {
        this.pool = [];
        this.poolSize = poolSize;
        this.index = 0;
        this.classConstructor = classConstructor;
        this.totalCreated = 0;
        this.totalReturned = 0;
        this.name = classConstructor.name || 'AnonymousPool';
      }
      /**
       * 从对象池获取对象
       * @param {any} arg - 传递给构造函数的参数
       * @returns {Object} 池对象
       */
      get(arg) {
        let item = null;
        if (this.index > 0) {
          item = this.pool[--this.index];
        } else {
          item = this.createItem(arg);
          this.totalCreated++;
        }
        if (item.init) {
          item.init(arg);
        }
        return item;
      }
      /**
       * 创建对象
       * @param {any} arg 
       * @returns {Object} 创建的对象
       */
      createItem(arg) {
        return new this.classConstructor(arg);
      }

      /**
       * 返回对象到池中
       * @param {Object} target - 要返回的对象
       */
      return(target) {
        if (!target) {
          LogSystem.Logger.warn(`Attempted to return null/undefined to pool: ${this.name}`);
          return;
        }
        target.reset();
        this.pool[this.index++] = target;
        this.totalReturned++;
      }
      /**
       * 不调用reset方法返回对象到池中
       * @param {Object} target - 要返回的对象
       */
      sampleReturn(target) {
        if (!target) {
          LogSystem.Logger.warn(`Attempted to sample return null/undefined to pool: ${this.name}`);
          return;
        }
        this.pool[this.index++] = target;
        this.totalReturned++;
      }

      /**
       * @description 清除超过池大小的对象
       */
      clear() {
        const pool = this.pool;
        const maxIndex = this.index;
        const poolSize = this.poolSize;
        if (maxIndex > poolSize) {
          for (let i = poolSize; i < maxIndex; i++) {
            const value = pool[i];
            if (value.destroy) {
              value.destroy(CoreUtils.DESTROY_OPTIONS);
            }
          }
          this.index = poolSize;
          pool.length = poolSize;
        }
      }

      /**
       * 获取池使用统计信息
       * @returns {Object} 统计信息
       */
      getStats() {
        return {
          name: this.name,
          size: this.poolSize,
          available: this.index,
          totalCreated: this.totalCreated,
          totalReturned: this.totalReturned,
          currentUsage: this.totalCreated - this.index
        };
      }
      /**
       * 调整池大小
       * @param {number} newSize - 新的池大小
       */
      resize(newSize) {
        if (newSize < 1) {
          LogSystem.Logger.warn(`Invalid pool size: ${newSize}, ignoring resize request`);
          return;
        }
        const oldSize = this.poolSize;
        if (newSize < oldSize) {
          const pool = this.pool;
          for (let i = newSize; i <= this.index; i++) {
            const value = pool[i];
            if (value && typeof value.destroy === 'function') {
              value.destroy(CoreUtils.DESTROY_OPTIONS);
            }
          }
          pool.length = newSize;
          this.index = Math.min(this.index, newSize - 1);
        }
        this.poolSize = newSize;
      }

      /**
       * 预创建对象
       * @param {number} count - 要预创建的对象数量
       * @param {any} args - 传递给构造函数的参数
       */
      preAllocate(count, args) {
        const available = this.poolSize - (this.index + 1);
        if (count > available) {
          LogSystem.Logger.warn(`Cannot pre-allocate ${count} objects, only ${available} slots available in pool ${this.name}`);
          count = available;
        }
        for (let i = 0; i < count; i++) {
          const obj = new this.classConstructor(...args);
          this.totalCreated++;
          this.pool[++this.index] = obj;
        }
      }
    }

    const enableOffscreen = Reflect.has(globalThis, "OffscreenCanvas");
    let getCanvas = null;
    if (enableOffscreen) {
      getCanvas = function () {
        return new OffscreenCanvas(100, 100);
      }
    } else {
      getCanvas = function () {
        return document.createElement("canvas");
      }
    }
    /**
     * 提供 Canvas 和 Context 的对象
     * @class CanvasObj
     */
    class CanvasObj {
      constructor() {
        /**
         * @type {OffscreenCanvas|HTMLCanvasElement}
         */
        this.canvas = getCanvas();
        /**
         * @type {OffscreenCanvasRenderingContext2D|CanvasRenderingContext2D}
         */
        this.context = this.canvas.getContext("2d");
      }
      /**
       * 调整画布大小
       * @param {number} width - 宽度
       * @param {number} height - 高度
       */
      resize(width, height) {
        const canvas = this.canvas;
        canvas.width = width;
        canvas.height = height;
      }
      /**
       * 重置上下文状态
       */
      reset() {
        this.context.reset();
      }
      /**
       * 销毁对象
       */
      destroy() {
        this.context = null;
        this.canvas = null;
      }
    }
    /**
     * Canvas对象池
     * @class CanvasPool
     * @extends Pool
     */
    class CanvasPool extends Pool {
      /**
       * 获取指定大小的Canvas对象
       * @param {number} width - 宽度
       * @param {number} height - 高度
       * @returns {CanvasObj} Canvas对象
       */
      get(width, height) {
        let canvasObj = null;
        if (this.index > 0) {
          canvasObj = this.pool[--this.index]
        } else {
          canvasObj = new CanvasObj();
          this.totalCreated++;
        }
        canvasObj.resize(width, height);
        return canvasObj;
      }
    }

    // 为 Image 添加 reset 方法
    Image.prototype.reset = function () {
      this.onload = null;
      this.onerror = null;
      // 清除src可以帮助GC回收相关资源
      if (this.src) {
        this.src = '';
      }
    };

    // 集中管理所有池
    const PoolCache = {
      CanvasPool: new CanvasPool(CanvasObj, 100),
      ImagePool: new Pool(Image, 100),
      FileReaderPool: new Pool(FileReader, 100),
      __proto__: null
    }

    const pools = [];
    let poolCount = 0;
    pools[0] = PoolCache.CanvasPool;
    pools[1] = PoolCache.ImagePool;
    pools[2] = PoolCache.FileReaderPool;

    /**
     * 清理所有对象池
     */
    function clearPool() {
      for (let i = 0; i < pools.length; i++) {
        pools[i].clear();
      }
    }
    /**
     * 获取所有池的统计信息
     * @returns {Object} 统计信息
     */
    function getPoolStats() {
      const stats = {};
      for (const key in PoolCache) {
        const pool = PoolCache[key];
        if (pool && typeof pool.getStats === 'function') {
          stats[key] = pool.getStats();
        }
      }
      return stats;
    }
    /**
     * 创建新的对象池并添加到PoolCache
     * @param {string} name - 池名称
     * @param {Function} classConstructor - 对象构造函数
     * @param {number} [size=100] - 池大小
     * @returns {Pool} 创建的对象池
     */
    function createPool(name, classConstructor, size = 100) {
      if (PoolCache[name]) {
        return PoolCache[name];
      }
      const pool = new Pool(classConstructor, size);
      PoolCache[name] = pool;
      pools[poolCount++] = pool;
      return pool;
    }

    /**
     * @description 给缓存池添加设置特定类型的池
     * @param {string} name 
     * @param {Function} poolClass 
     * @param {number} size 
     * @returns {Pool}
     */
    function setPool(name, poolClass, size) {
      if (PoolCache[name]) return PoolCache[name];
      const pool = PoolCache[name] = new poolClass(size);
      pools[poolCount++] = pool;
      return pool;
    }
    /**
     * @description 从缓存池中获取对象，如果没有缓存过，则创建一个新的对象池，并返回对象
     * @param {Function} poolClass 
     * @returns {Object}
     */
    function getPoolObject(poolClass, args) {
      const name = poolClass.name;
      let pool = PoolCache[name];
      if (pool === void 0) {
        pool = PoolCache[name] = new Pool(poolClass, 100);
        pools[poolCount++] = pool;
      }
      return pool.get(args);
    }
    /**
     * @description 将对象返回给缓存池
     * @param {Object} object 
     */
    function returnPoolObject(object) {
      const name = object.constructor.name;
      let pool = PoolCache[name];
      if (pool === void 0) {
        pool = PoolCache[name] = new Pool(object.constructor, 100);
        pools[poolCount++] = pool;
      }
      pool.return(object);
    }
    return {
      CanvasPool,
      Pool,
      PoolCache,
      clearPool,
      setPool,
      getPoolObject,
      returnPoolObject,
      getPoolStats,
      createPool,
      __proto__: null
    }
  })();
  const ParseSystem = {
    initRegex: /^-?\d+$/,
    floatRegex: /^-?\d+\.\d+$/,
    /**
     * 检查字符串是否为数字
     * @param {string} str - 要检查的字符串
     * @returns {boolean} 是否为数字
     */
    isNumber(str) {
      if (typeof str !== 'string') return false;
      if (this.initRegex.test(str)) return true;
      return this.floatRegex.test(str);
    },
    /**
     * 检查值是否为对象
     * @param {any} obj - 要检查的值
     * @returns {boolean} 是否为对象
     */
    isObject(obj) {
      return obj && typeof obj === 'object';
    },
    /**
     * 检查字符串是否为布尔值
     * @param {string} str - 要检查的字符串
     * @returns {boolean} 是否为布尔值字符串
     */
    isBooleanString(str) {
      return str === 'true' || str === 'false';
    },
    /**
     * 安全地解析JSON
     * @param {string} str - 要解析的JSON字符串
     * @returns {any} 解析结果
     */
    safeJsonParse(str) {
      try {
        return JSON.parse(str);
      } catch (_e) {
        return str;
      }
    },
    /**
     * 尝试将值解析为合适的类型
     * @param {any} value - 要解析的值
     * @returns {any} 解析后的值
     */
    toParse(value) {
      if (typeof value === 'string') {
        if (this.isNumber(value)) {
          return Number(value);
        }
        if (this.isBooleanString(value)) {
          return value === 'true';
        }
        value = this.safeJsonParse(value);
      }
      if (Array.isArray(value)) {
        const length = value.length;
        for (let i = 0; i < length; i++) {
          const toParseValue = value[i];
          value[i] = this.toParse(toParseValue);
        }
        return value;
      }
      if (this.isObject(value)) {
        const array = Object.keys(value);
        for (let i = 0; i < array.length; i++) {
          const key = array[i];
          const objValue = value[key];
          value[key] = this.toParse(objValue);
        }
        return value;
      }
      return value;
    },
    __proto__: null
  }

  const LoaderSystem = (() => {
    const { Pool, PoolCache, createPool } = PoolSystem;
    const { UtilsAdaptor } = CoreUtils;
    const LOAD_TYPES = {
      image: 0,
      json: 1,
      text: 2,
      binary: 3,
      ktx: 4,
      dds: 5,
      default: 6,
      __proto__: null
    }
    function getCurrentCacheMethod(message) {
      let method, target;
      const type = LOAD_TYPES[message.type];
      switch (type) {
        case 0: {
          method = "blob";
          target = "response";
          break;
        }
        case 1: {
          method = "json";
          target = "response";
          break;
        }
        case 2: {
          method = "text";
          target = "responseText";
          break;
        }
        case 3:
        case 4:
        case 5: {
          method = loadBinary;
          target = "response";
          break;
        }
        default:
          method = "blob";
          target = "response";
          break;
      }
      message.method = method;
      message.target = target;
    }

    const LOAD_PARSE = {
      image(blob) {
        return createImageBitmap(blob);
      },
      ktx(arrayBuffer) {
        return Loader.textureParser.parse(arrayBuffer)
      },
      dds(arrayBuffer) {
        return Loader.textureParser.parse(arrayBuffer);
      },
      __proto__: null
    }

    class LoaderMessage {
      constructor() {
        this.reset();
      }
      reset() {
        this.method = String.empty;
        this.target = String.empty;
        this.url = String.empty;
        this.type = String.empty;
      }
    }

    const LoaderMessagePool = createPool("LoaderMessagePool", LoaderMessage, 100);

    XMLHttpRequest.prototype.reset = function () {
      this.reject = null;
      this.resolve = null;
      this.resourceTypeTarget = String.empty;
      if (this.loadMessage) LoaderMessagePool.return(this.loadMessage);
      this.loadMessage = null;
    }

    class XMLHttpRequestPool extends Pool {
      constructor(constructor, maxSize) {
        super(constructor, maxSize);
        this.onLoadHandler = this.onLoad.bind(this);
        this.onErrorHandler = this.onError.bind(this);
      }
      async onLoad(event) {
        const xhr = event.target;
        const status = xhr.status;
        if (status >= 200 && status < 300) {
          const message = xhr.loadMessage;
          let result = xhr[xhr.resourceTypeTarget];
          const type = message.type;
          const parse = LOAD_PARSE[type];
          if (parse !== void 0) {
            result = await parse(result);
          }
          xhr.resolve(result);
        }
        if (xhr.reject !== null) this.return(xhr);
      }
      onError(event) {
        const xhr = event.target;
        const error = xhr.error;
        if (xhr.reject !== null) {
          xhr.reject(error);
          this.return(xhr);
        }
      }
      /**
       * 创建对象
       * @returns {XMLHttpRequest}
       */
      createItem() {
        const xhr = new this.classConstructor();
        xhr.onload = this.onLoadHandler;
        xhr.onerror = this.onErrorHandler;
        return xhr;
      }
    }

    class BigXMLHttpRequestPool {
      constructor() {
        this.responseTypeMapper = Object.create(null);
      }
      /**
       * 获取池
       * @param {string} responseType 
       * @returns {XMLHttpRequestPool}
       */
      getPool(responseType) {
        let pool = this.responseTypeMapper[responseType];
        if (!pool) {
          pool = new XMLHttpRequestPool(XMLHttpRequest, 100);
          this.responseTypeMapper[responseType] = pool;
        }
        return pool;
      }
      /**
       * 获取请求
       * @param {string} responseType 
       * @returns {XMLHttpRequest}
       */
      getRequest(responseType) {
        const pool = this.getPool(responseType);
        const xhr = pool.get();
        if (xhr.status === 0) xhr.responseType = responseType;
        return xhr;
      }
      /**
       * 清除所有池
       */
      clear() {
        for (const key in this.responseTypeMapper) {
          const pool = this.responseTypeMapper[key];
          pool.clear();
        }
      }
    }

    const BigXhrPool = PoolCache.BigXhrPool = new BigXMLHttpRequestPool();

    function xhrPromise(resolve, reject) {
      const message = Loader.message;
      Loader.message = null;
      const method = message.method;
      const target = message.target;
      const xhr = BigXhrPool.getRequest(method);
      xhr.resolve = resolve;
      xhr.reject = reject;
      xhr.resourceTypeTarget = target;
      xhr.loadMessage = message;
      xhr.open("GET", message.url);
      xhr.send(null);
    }

    function xhrNormalSource(url, type) {
      const message = LoaderMessagePool.get();
      message.url = url;
      message.type = type;
      getCurrentCacheMethod(message);
      Loader.message = message;
      return new Promise(xhrPromise);
    }

    const fetchMessage = LoaderMessagePool.get();

    async function fetchNormalSource(url, type) {
      const message = fetchMessage;
      message.type = type;
      getCurrentCacheMethod(message);
      const method = message.method;
      try {
        const res = await fetch(url);
        const baseSource = await res[method]();
        const parse = LOAD_PARSE[type];
        if (parse !== void 0) {
          return await parse(baseSource);
        }
        return baseSource;
      } catch (error) {
        throw new Error(error);
      }
    }

    const isLocal = globalThis.location.href.startsWith("file:");
    const loadBinary = isLocal ? "arraybuffer" : "arrayBuffer";
    const loadFunc = isLocal ? xhrNormalSource : fetchNormalSource;

    UtilsAdaptor.prototype.isLocal = function () {
      return isLocal;
    }

    class LoaderClass {
      constructor() {
        this.promiseCache = [];
        this.addToQueue = false;
        this.message = null;
        this.toWaitPromisePool = [];
        this.loadSource = loadFunc;
        this.textureParser = null;
        this.compressedTextureType = "";
        this.compressedUrlSuffix = ".png";
        this.promiseCount = 0;
      }
      setTextureParser(parser, textureType = "", urlSuffix = "") {
        this.textureParser = parser;
        this.compressedTextureType = textureType;
        this.compressedUrlSuffix = urlSuffix;
      }
      enableAddToQueue() {
        this.addToQueue = true;
      }
      disableAddToQueue() {
        this.addToQueue = false;
      }
      loadTexture(url, isCompressed) {
        const type = isCompressed ? this.compressedTextureType : "image";
        const promise = this.loadSource(url, type);
        this.add(promise);
        return promise;
      }
      add(promise) {
        if (this.addToQueue === false) return;
        if (promise === null) return;
        this.promiseCache[this.promiseCount++] = promise;
      }
      waitLoading() {
        if (this.promiseCount === 0) return Promise.resolve(0);
        this.toWaitPromisePool.copy(this.promiseCache);
        this.promiseCache.clear();
        this.promiseCount = 0;
        return Promise.all(this.toWaitPromisePool);
      }
    }
    const Loader = new LoaderClass();
    return {
      LoaderClass,
      Loader,
      __proto__: null
    }
  })();

  const ColorSystem = (() => {
    const Logger = LogSystem.Logger;
    const hexTable = (() => {
      const table = new Array(256);
      const hexChars = "0123456789abcdef";
      for (let i = 0; i < 256; i++) {
        table[i] = hexChars[(i >> 4) & 0xF] + hexChars[i & 0xF];
      }
      return table;
    })();
    const div255Table = (() => {
      const table = new Array(256);
      for (let i = 0; i < 256; i++) {
        table[i] = i / 255;
      }
      return table;
    })();
    const div360Table = (() => {
      const table = new Array(360);
      for (let i = 0; i < 360; i++) {
        table[i] = i / 360;
      }
      return table;
    })();
    function hex(value) {
      return hexTable[value & 255];
    }
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const rgbaRegex = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/;
    const hexTestRegex = /^[0-9A-Fa-f]{3,8}$/;
    const whiteColor = [1, 1, 1, 1];
    const outputRGBA = { r: 0, g: 0, b: 0, a: 0 };
    const outputHSLA = { h: 0, s: 0, l: 0, a: 0 };
    const outputHSVA = { h: 0, s: 0, v: 0, a: 0 };
    class Color extends Float32Array {
      static NAMED_COLORS = {
        'white': { r: 255, g: 255, b: 255 },
        'black': { r: 0, g: 0, b: 0 },
        'red': { r: 255, g: 0, b: 0 },
        'green': { r: 0, g: 255, b: 0 },
        'blue': { r: 0, g: 0, b: 255 },
        'yellow': { r: 255, g: 255, b: 0 },
        'cyan': { r: 0, g: 255, b: 255 },
        'magenta': { r: 255, g: 0, b: 255 },
        'gray': { r: 128, g: 128, b: 128 },
        'grey': { r: 128, g: 128, b: 128 },
        'orange': { r: 255, g: 165, b: 0 },
        'purple': { r: 128, g: 0, b: 128 },
        'pink': { r: 255, g: 192, b: 203 },
        'brown': { r: 165, g: 42, b: 42 },
        'lime': { r: 0, g: 255, b: 0 },
        'navy': { r: 0, g: 0, b: 128 },
        'teal': { r: 0, g: 128, b: 128 },
        'olive': { r: 128, g: 128, b: 0 },
        'maroon': { r: 128, g: 0, b: 0 },
        'aqua': { r: 0, g: 255, b: 255 },
        'fuchsia': { r: 255, g: 0, b: 255 },
        'silver': { r: 192, g: 192, b: 192 },
        'gold': { r: 255, g: 215, b: 0 }
      };
      constructor(value) {
        super(whiteColor); // 默认白色
        if (value != null) {
          this.setValue(value);
        }
      }
      set(color) {
        super.set(color, 0);
        return this;
      }
      setValue(value) {
        let r, g, b, a;
        if (value instanceof Color) {
          return this.copyFrom(value);
        } else if ((typeof value === "number")) {
          return this.setFromNumber(value);
        } else if ((Array.isArray(value) || value instanceof Float32Array)) {
          return this.setFromArray(value);
        } else if (typeof value === "string") {
          if (Color.NAMED_COLORS[value.toLowerCase()]) {
            return this.setFromColorName(value);
          } else if (value.startsWith('#')) {
            return this.setFromHex(value);
          } else if (value.startsWith('rgb')) {
            return this.setFromRGBAString(value);
          }
        } else if (value && typeof value === "object") {
          if (value.r !== void 0 && value.g !== void 0 && value.b !== void 0) {
            r = value.r / 255;
            g = value.g / 255;
            b = value.b / 255;
            a = value.a !== void 0 ? value.a : 1;
          } else if (value.h !== void 0 && value.s !== void 0 && value.l !== void 0) {
            if (value.a !== void 0) this[3] = value.a;
            return this.setHSL(value.h, value.s, value.l);
          } else if (value.h !== void 0 && value.s !== void 0 && value.v !== void 0) {
            if (value.a !== void 0) this[3] = value.a;
            return this.setHSV(value.h, value.s, value.v);
          }
        }
        if (r !== void 0) {
          this[0] = r;
          this[1] = g;
          this[2] = b;
          this[3] = a;
        } else {
          Logger.error(`Unable to convert color ${value}`);
        }
        return this;
      }
      /**
       * @description 设置透明度
       * @param {number} alpha 透明度 (范围: 0-1)
       * @returns {Color} 返回颜色对象以支持链式调用
       */
      setAlpha(alpha) {
        this[3] = alpha;
        return this;
      }
      toNumber() {
        return (this[0] * 255 << 16) | (this[1] * 255 << 8) | (this[2] * 255);
      }
      toBgrNumber() {
        const r = this[0] * 255;
        const g = this[1] * 255;
        const b = this[2] * 255;
        return (b << 16) | (g << 8) | r;
      }
      toLittleEndianNumber() {
        const value = this.toNumber();
        return (value >> 16) | (value & 65280) | ((value & 255) << 16);
      }
      /**
       * @description 两个颜色相乘
       * @param {Color|string|number[]} value 颜色值，可能是字符串，color对象，或者数组
       * @returns {Color} 返回颜色对象以支持链式调用
       */
      multiply(value) {
        const sourceArray = Color.temp.setValue(value);
        this[0] *= sourceArray[0];
        this[1] *= sourceArray[1];
        this[2] *= sourceArray[2];
        this[3] *= sourceArray[3];
        sourceArray.reset();
        return this;
      }
      /**
       * @description 判断是否为颜色值
       * @param {any} value 值
       * @returns {boolean} 是否为颜色值
       */
      isColorLike(value) {
        return typeof value === "number" || typeof value === "string" || value instanceof Number || value instanceof _Color || Array.isArray(value) || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Float32Array || value.r !== void 0 && value.g !== void 0 && value.b !== void 0 || value.r !== void 0 && value.g !== void 0 && value.b !== void 0 && value.a !== void 0 || value.h !== void 0 && value.s !== void 0 && value.l !== void 0 || value.h !== void 0 && value.s !== void 0 && value.l !== void 0 && value.a !== void 0 || value.h !== void 0 && value.s !== void 0 && value.v !== void 0 || value.h !== void 0 && value.s !== void 0 && value.v !== void 0 && value.a !== void 0;
      }
      /**
       * @description 预乘法
       * @param {number} alpha 透明度 (范围: 0-1)
       * @param {boolean} applyToRGB 是否应用到RGB
       * @returns {Color} 返回颜色对象以支持链式调用
       */
      premultiply(alpha, applyToRGB = true) {
        if (applyToRGB) {
          this[0] *= alpha;
          this[1] *= alpha;
          this[2] *= alpha;
        }
        this[3] = alpha;
        return this;
      }
      /**
       * @description 将当前颜色值转换为预乘透明度后的颜色值
       * @param {number} alpha 透明度 (范围: 0-1)
       * @param {boolean} applyToRGB 是否应用到RGB
       * @returns {number} 返回颜色值
       */
      toPremultiplied(alpha, applyToRGB = true) {
        const initValue = this.toNumber();
        if (alpha === 1) {
          return (255 << 24) + initValue;
        }
        if (alpha === 0) {
          return applyToRGB ? 0 : initValue;
        }
        if (applyToRGB) {
          this[0] = this[0] * alpha + 0.5 | 0;
          this[1] = this[1] * alpha + 0.5 | 0;
          this[2] = this[2] * alpha + 0.5 | 0;
        }
        return (alpha * 255 << 24) | (this[0] << 16) | (this[1] << 8) | this[2];
      }
      /**
       * @description 从十六进制字符串设置颜色
       * @param {string} hexString 十六进制字符串
       * @returns {Color} 返回颜色对象以支持链式调用
       */
      setFromHex(hexString) {
        return Color.fromHex(hexString, this);
      }
      /**
       * @description 从RGBA字符串设置颜色
       * @param {string} rgbString RGBA字符串
       * @returns {Color} 返回颜色对象以支持链式调用
       */
      setFromRGBAString(rgbString) {
        return Color.fromRGBA(rgbString, this);
      }
      /**
       * @description 从数字值设置颜色
       * @param {number} number 数字值
       * @returns {Color} 返回颜色对象以支持链式调用
       */
      setFromNumber(number) {
        if (number < 0 || number > 16777215) {
          Logger.error(`Unable to convert color ${number}`);
          return this;
        }
        this[0] = div255Table[number >>> 16];
        this[1] = div255Table[number >>> 8];
        this[2] = div255Table[number];
        this[3] = 1;
        return this;
      }
      /**
       * @description 从数组设置颜色，每个元素的范围是0-255
       * @param {number[]} array 数组
       * @returns {Color} 返回颜色对象以支持链式调用
       */
      setFromArray(array) {
        if (array.length < 4) {
          Logger.error(`Unable to convert color ${array}`);
          return this;
        }
        this[0] = div255Table[array[0]];
        this[1] = div255Table[array[1]];
        this[2] = div255Table[array[2]];
        this[3] = div255Table[array[3]];
        return this;
      }
      setFromColorName(colorName) {
        let color = Color.NAMED_COLORS[colorName.toLowerCase()];
        if (color === void 0) {
          Logger.error(`Unable to convert color ${colorName}`);
          return this;
        }
        return this.setRGBA(color.r, color.g, color.b, color.a);
      }
      /**
       * @description 设置RGBA值 (0-255)
       * @param {number} r 红色分量 (范围: 0-255)
       * @param {number} g 绿色分量 (范围: 0-255)
       * @param {number} b 蓝色分量 (范围: 0-255)
       * @param {number} a 透明度 (范围: 0-255)
       * @returns {Color} 返回颜色对象以支持链式调用
       */
      setRGBA(r, g, b, a = 255) {
        const array = this;
        array[0] = div255Table[r & 255];
        array[1] = div255Table[g & 255];
        array[2] = div255Table[b & 255];
        array[3] = div255Table[a & 255];
        return this;
      }
      /**
       * @description 设置RGBA值 (0-1)
       * @param {number} r 红色分量 (范围: 0-1)
       * @param {number} g 绿色分量 (范围: 0-1)
       * @param {number} b 蓝色分量 (范围: 0-1)
       * @param {number} a 透明度 (范围: 0-1)
       * @returns {Color} 返回颜色对象以支持链式调用
       */
      setRGBAFloat(r, g, b, a = 1) {
        const array = this;
        array[0] = r;
        array[1] = g;
        array[2] = b;
        array[3] = a;
        return this;
      }
      /**
       * @description 获取RGBA值 (0-255)
       * @returns {Object} 返回RGBA值对象
       * @type {Object.r: number, g: number, b: number, a: number}
       */
      getRGBA() {
        const array = this;
        //从 小数转换成整数 需要额外取整 0-255的整数
        outputRGBA.r = array[0] * 255 & 255;
        outputRGBA.g = array[1] * 255 & 255;
        outputRGBA.b = array[2] * 255 & 255;
        outputRGBA.a = array[3] * 255 & 255;
        return outputRGBA;
      }
      /**
     * @description 获取RGBA值 (0-1)
     * @returns {Object} 返回RGBA值对象
     */
      getRGBAFloat() {
        const array = this;
        outputRGBA.r = array[0];
        outputRGBA.g = array[1];
        outputRGBA.b = array[2];
        outputRGBA.a = array[3];
        return outputRGBA;
      }
      /**
       * @description 转换为十六进制字符串
       * @returns {string} 返回十六进制字符串
       */
      toHex() {
        const r = this[0] * 255;
        const g = this[1] * 255;
        const b = this[2] * 255;
        return `#${hex(r)}${hex(g)}${hex(b)}`;
      }
      /**
       * @description 转换为带透明度的十六进制字符串
       * @returns {string} 返回带透明度的十六进制字符串
       */
      toHexWithAlpha() {
        const r = this[0] * 255;
        const g = this[1] * 255;
        const b = this[2] * 255;
        const a = this[3] * 255;
        return `#${hex(r)}${hex(g)}${hex(b)}${hex(a)}`;
      }
      /**
       * @description 转换为RGB字符串
       * @returns {string} 返回RGB字符串
       */
      toRGB() {
        const array = this;
        const r = array[0] * 255 & 255;
        const g = array[1] * 255 & 255;
        const b = array[2] * 255 & 255;
        return `rgb(${r}, ${g}, ${b})`;
      }
      /**
       * @description 转换为RGBA字符串
       * @returns {string} 返回RGBA字符串
       */
      toRGBA() {
        const array = this;
        const r = array[0] * 255 & 255;
        const g = array[1] * 255 & 255;
        const b = array[2] * 255 & 255;
        const a = array[3];
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      }
      /**
       * @description 转换为HSL
       * @returns {Object} 返回HSL对象
       */
      toHSL() {
        const array = this;
        const r = array[0];
        const g = array[1];
        const b = array[2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) {
          h = s = 0;
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        outputHSLA.h = h * 360;
        outputHSLA.s = s * 100;
        outputHSLA.l = l * 100;
        return outputHSLA;
      }
      /**
       * @description 从HSL设置颜色
       * @param {number} h 色调 (范围: 0-360)
       * @param {number} s 饱和度 (范围: 0-100)
       * @param {number} l 亮度 (范围: 0-100)
       * @returns {Color} 返回颜色对象以支持链式调用
       */
      setHSL(h, s, l) {
        h = (h % 360) / 360;
        s = Math.max(0, Math.min(1, s / 100));
        l = Math.max(0, Math.min(1, l / 100));
        const array = this;
        if (s === 0) {
          array[0] = array[1] = array[2] = l;
        } else {
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          array[0] = hue2rgb(p, q, h + 1 / 3);
          array[1] = hue2rgb(p, q, h);
          array[2] = hue2rgb(p, q, h - 1 / 3);
        }
        return this;
      }
      /**
       * @description 转换为HSV
       * @returns {Object} 返回HSV对象
       */
      toHSV() {
        const array = this;
        const r = array[0];
        const g = array[1];
        const b = array[2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;
        let h, s, v = max;
        s = max === 0 ? 0 : d / max;
        if (max === min) {
          h = 0;
        } else {
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        outputHSVA.h = h * 360;
        outputHSVA.s = s * 100;
        outputHSVA.v = v * 100;
        return outputHSVA;
      }
      /**
       * @description 从HSV设置颜色
       * @param {number} h 色调 (范围: 0-360)
       * @param {number} s 饱和度 (范围: 0-100)
       * @param {number} v 亮度 (范围: 0-100)
       * @returns {Color} 返回颜色对象以支持链式调用
       */
      setHSV(h, s, v) {
        h = (h % 360) / 360;
        s = Math.max(0, Math.min(1, s / 100));
        v = Math.max(0, Math.min(1, v / 100));
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        const array = this;
        switch (i % 6) {
          case 0: array[0] = v; array[1] = t; array[2] = p; break;
          case 1: array[0] = q; array[1] = v; array[2] = p; break;
          case 2: array[0] = p; array[1] = v; array[2] = t; break;
          case 3: array[0] = p; array[1] = q; array[2] = v; break;
          case 4: array[0] = t; array[1] = p; array[2] = v; break;
          case 5: array[0] = v; array[1] = p; array[2] = q; break;
        }
        return this;
      }
      /**
       * @description 混合颜色
       * @param {Color} otherColor 另一个颜色
       * @param {number} factor 混合因子 (范围: 0-1)
       * @returns {Color} 返回颜色对象以支持链式调用
       */
      blend(otherColor, factor = 0.5) {
        const array = this;
        const otherArray = otherColor;
        array[0] = array[0] * (1 - factor) + otherArray[0] * factor;
        array[1] = array[1] * (1 - factor) + otherArray[1] * factor;
        array[2] = array[2] * (1 - factor) + otherArray[2] * factor;
        array[3] = array[3] * (1 - factor) + otherArray[3] * factor;
        return this;
      }
      /**
       * @description 反转颜色
       * @returns {Color} 返回颜色对象以支持链式调用
       */
      invert() {
        this[0] = 1 - this[0];
        this[1] = 1 - this[1];
        this[2] = 1 - this[2];
        return this;
      }
      // 调整亮度
      adjustBrightness(factor) {
        const array = this;
        array[0] = Math.max(0, Math.min(1, array[0] * factor));
        array[1] = Math.max(0, Math.min(1, array[1] * factor));
        array[2] = Math.max(0, Math.min(1, array[2] * factor));
        return this;
      }
      // 调整饱和度
      adjustSaturation(factor) {
        const hsl = this.toHSL();
        this.setHSL(hsl.h, Math.max(0, Math.min(100, hsl.s * factor), hsl.l));
        return this;
      }
      // 调整色调
      adjustHue(offset) {
        const hsl = this.toHSL();
        this.setHSL(hsl.h + offset, hsl.s, hsl.l);
        return this;
      }
      // 创建颜色副本
      clone() {
        const newColor = new Color();
        newColor[0] = this[0];
        newColor[1] = this[1];
        newColor[2] = this[2];
        newColor[3] = this[3];
        return newColor;
      }
      copyFrom(otherColor) {
        this[0] = otherColor[0];
        this[1] = otherColor[1];
        this[2] = otherColor[2];
        this[3] = otherColor[3];
        return this;
      }
      copyTo(otherColor) {
        otherColor[0] = this[0];
        otherColor[1] = this[1];
        otherColor[2] = this[2];
        otherColor[3] = this[3];
        return otherColor;
      }
      // 重置颜色到默认值（用于对象池）
      reset() {
        this[0] = whiteColor[0];
        this[1] = whiteColor[1];
        this[2] = whiteColor[2];
        this[3] = whiteColor[3];
        return this;
      }
      // 检查两个颜色是否相等
      equals(otherColor) {
        if (!(otherColor instanceof Color)) return false;
        return this[0] === otherColor[0] &&
          this[1] === otherColor[1] &&
          this[2] === otherColor[2] &&
          this[3] === otherColor[3];
      }
      // 从十六进制字符串创建颜色
      static fromHex(hexString, targetColor = new Color()) {
        if (typeof hexString !== 'string') {
          Logger.error('Color.fromHex', hexString, 'hexString must be a string');
          return targetColor;
        }
        const hexChar0 = hexString.charAt(0);
        const isHex = hexChar0 === "#" || hexChar0 === "0x";
        hexString = isHex ? hexString.slice(1) : hexString;
        // 验证十六进制字符串格式
        if (!hexTestRegex.test(hexString)) {
          Logger.error('Color.fromHex', hexString, 'Invalid hex string format');
          return targetColor;
        }
        if (hexString.length === 3) {
          hexString = `${hexString[0]}${hexString[0]}${hexString[1]}${hexString[1]}${hexString[2]}${hexString[2]}`;
        }
        // 一次性解析所有值，避免多次parseInt
        const value = parseInt(hexString, 16);
        let r, g, b, a;
        if (hexString.length === 6) {
          r = div255Table[(value >> 16) & 255];
          g = div255Table[(value >> 8) & 255];
          b = div255Table[value & 255];
          a = 1;
        } else if (hexString.length === 8) {
          r = div255Table[(value >> 24) & 255];
          g = div255Table[(value >> 16) & 255];
          b = div255Table[(value >> 8) & 255];
          a = div255Table[value & 255];
        } else {
          Logger.error('Color.fromHex', hexString, 'Unsupported hex string length');
          return targetColor;
        }
        return targetColor.setRGBAFloat(r, g, b, a);
      }
      // 从RGB字符串创建颜色
      static fromRGBA(rgbString, targetColor = new Color()) {
        const match = rgbString.match(rgbaRegex);
        if (match) {
          const r = div255Table[parseInt(match[1])];
          const g = div255Table[parseInt(match[2])];
          const b = div255Table[parseInt(match[3])];
          const a = match[4] ? parseFloat(match[4]) : 1;
          return targetColor.setRGBAFloat(r, g, b, a);
        }
        Logger.error('Color.fromRGBA', rgbString, 'Invalid RGBA string format');
        return targetColor;
      }
    }
    // 预定义颜色
    Color.temp = new Color();
    Color.shared = new Color();
    return {
      Color,
      hex,
      hexTable,
      div255Table,
      div360Table,
      rgbaRegex,
      hue2rgb
    };
  })();
  const DateSystem = (() => {
    const { formatNum } = CoreUtils;
    class DateFormatter {
      static regexp = /YYYY|MM|DD|HH|mm|ss|M|D|H|m|s/g;
      constructor() {
        this._cache = {
          timestamp: 0,
          formatted: ''
        };
      }
      // 标准格式：YYYY-MM-DD HH:mm:ss
      format(date) {
        const y = date.getFullYear();
        const m = formatNum(date.getMonth() + 1);
        const d = formatNum(date.getDate());
        const h = formatNum(date.getHours());
        const min = formatNum(date.getMinutes());
        const s = formatNum(date.getSeconds());
        return `${y}-${m}-${d} ${h}:${min}:${s}`;
      }
      // 带缓存版本（适合UI显示）
      formatCached(date) {
        const ts = Math.floor(date.getTime() / 1000);
        if (ts === this._cache.timestamp) {
          return this._cache.formatted;
        }
        this._cache.formatted = this.format(date);
        this._cache.timestamp = ts;
        return this._cache.formatted;
      }
      // 只显示日期
      formatDate(date) {
        const y = date.getFullYear();
        const m = formatNum(date.getMonth() + 1);
        const d = formatNum(date.getDate());
        return `${y}-${m}-${d}`;
      }
      // 只显示时间
      formatTime(date) {
        const h = formatNum(date.getHours());
        const min = formatNum(date.getMinutes());
        const s = formatNum(date.getSeconds());
        return `${h}:${min}:${s}`;
      }
    }
    // 全局单例
    const dateFormatter = new DateFormatter();
    // 使用
    //const now = new Date();
    //console.log(dateFormatter.format(now));           // 2024-11-12 15:30:45
    //console.log(dateFormatter.formatCached(now));     // 缓存版本
    //console.log(dateFormatter.formatDate(now));       // 2024-11-12
    //console.log(dateFormatter.formatTime(now));       // 15:30:45
    //console.log(dateFormatter.formatCustom(now, 'YYYY/MM/DD HH:mm')); // 自定义
    return {
      dateFormatter,
      DateFormatter,
      __proto__: null
    }
  })();
  const FileSystem = (() => {
    class WebDataBase {
      constructor(dbName) {
        this.dbName = "rpgmaker_" + dbName;
        this.version = 1;
        this.db = null;
        this.transactionList = ["saves"];
        this._onDbCreate = this.createObjectStore.bind(this);
        this._onOpenSuccess = this.onOpenSuccess.bind(this);
        this._onOpenError = this.onOpenError.bind(this);
        this._onWriteSuccess = this.onWriteSuccess.bind(this);
        this._onError = this.onError.bind(this);
        this._onDeleteSuccess = this.onDeleteSuccess.bind(this);
        this._onReadSuccess = this.onReadSuccess.bind(this);
        this.dbOptions = { id: 0, data: null };
        this.openResolve = null;
        this.openReject = null;
      }
      createObjectStore(event) {
        const db = event.target.result;
        db.createObjectStore('saves', { keyPath: 'id' });
      }
      onOpenSuccess(event) {
        this.db = event.target.result;
        this.openResolve(0);
        this.openResolve = null;
        this.openReject = null;
      }
      onOpenError(event) {
        this.openReject(event.target.error);
        this.openResolve = null;
        this.openReject = null;
      }
      changeData() {
        const db = this.db;
        const transaction = db.transaction(this.transactionList, 'readwrite');
        return transaction.objectStore('saves');
      }
      getData() {
        const db = this.db;
        const transaction = db.transaction(this.transactionList, 'readonly');
        return transaction.objectStore('saves');
      }
      onReadSuccess(event) {
        let data = event.target.result || null;
        data = data === null ? null : data.data;
        data = Storage.unpackData(data);
        Storage.onOperateEnd(data);
      }
      hasSaveData(saveId) {
        return SaveManager.isFileExist(saveId);
      }
      onWriteSuccess() {
        Storage.onOperateEnd();
      }
      onError(event) {
        Storage.onOperateEnd(0, event.target.error);
      }
      onDeleteSuccess() {
        Storage.onOperateEnd();
      }
      openDatabase() {
        const openRequest = indexedDB.open(this.dbName, this.version);
        openRequest.onupgradeneeded = this._onDbCreate;
        openRequest.onsuccess = this._onOpenSuccess;
        openRequest.onerror = this._onOpenError;
        return new Promise((resolve, reject) => {
          this.openResolve = resolve;
          this.openReject = reject;
        });
      }
      addSaveData(saveId, data) {
        const store = this.changeData();
        data = Storage.packData(data);
        this.dbOptions.id = saveId;
        this.dbOptions.data = data;
        const request = store.put(this.dbOptions);
        request.onsuccess = this._onWriteSuccess;
        request.onerror = this._onError;
      }
      getSaveData(saveId) {
        const store = this.getData();
        const request = store.get(saveId);
        request.onsuccess = this._onReadSuccess;
        request.onerror = this._onError;
      }
      deleteSaveData(saveId) {
        const store = this.changeData();
        const request = store.delete(saveId);
        request.onsuccess = this._onDeleteSuccess;
        request.onerror = this._onError;
      }
      getAllSaveData() {
        const store = this.getData();
        const request = store.getAll();
        request.onsuccess = this._onReadSuccess;
        request.onerror = this._onError;
      }
    }
    class NodeFileAdaptor {
      constructor() {
        this.fs = require("node:fs");
        this.path = require("node:path");
        this.process = require("node:process");
        this.saveFilePath = String.empty;
      }
      getSaveData(saveId) {
        const path = this.filePath(saveId);
        const fs = this.fs;
        let data = null, error = null;
        try {
          if (fs.existsSync(path)) data = fs.readFileSync(path);
          data = Storage.unpackData(data);
        } catch (e) {
          error = e;
          data = null;
        }
        Storage.onOperateEnd(data, error);
      }
      addSaveData(saveId, data) {
        const path = this.filePath(saveId);
        data = Storage.packData(data);
        let error = null;
        try {
          this.fs.writeFileSync(path, data);
        } catch (e) {
          error = e;
        }
        Storage.onOperateEnd(0, error);
      }
      deleteSaveData(saveId) {
        const path = this.filePath(saveId);
        const fs = this.fs;
        let error = null;
        try {
          if (fs.existsSync(path)) fs.unlinkSync(path);
        } catch (e) {
          error = e;
        }
        Storage.onOperateEnd(0, error);
      }
      filePath(saveId) {
        if (this.saveFilePath === String.empty) {
          const path = this.path;
          const process = this.process;
          const base = path.dirname(process.mainModule.filename);
          this.saveFilePath = path.join(base, "save/");
        }
        return this.saveFilePath + saveId + ".save";
      }
      hasSaveData(saveId) {
        const fs = this.fs;
        return fs.existsSync(this.filePath(saveId));
      }
    }
    class StorageProgress {
      constructor() {
        this.pakoTarget = { to: "string", level: 1 };
        this.pakoResult = { to: "string" };
        this.resolve = null;
        this.reject = null;
        this._onPromise = this.onPromise.bind(this);
        this._onOperateEnd = this.onOperateEnd.bind(this);
      }
      /**
       * 设置操作结束回调
       * @param {Function} func - 回调函数
       */
      setOperateEnd(func) {
        this.operateEndFunc = func;
      }
      onPromise(resolve, reject) {
        this.resolve = resolve;
        this.reject = reject;
      }
      onOperateEnd(data = 0, error = null) {
        if (error !== null) this.reject(error);
        else this.resolve(data);
        this.resolve = null;
        this.reject = null;
        this.operateEndFunc(data);
      }
      /**
       * 解包数据
       * @param {any} zip - 压缩数据
       * @returns {any} 解压后的数据
       */
      unpackData(zip) {
        if (zip === null) return zip;
        zip = pako.inflate(zip, this.pakoResult);
        return JSON.parse(zip);
      }
      packData(data) {
        if (data === null) return data;
        data = JSON.stringify(data);
        return pako.deflate(data, this.pakoTarget);
      }
    }
    const Storage = new StorageProgress();
    class FileAdaptor {
      constructor() {
        // 创建适当的文件适配器
        if (Utils.isNwjs()) {
          LogSystem.Logger.info('Using Node.js file system');
          this.file = new NodeFileAdaptor();
        } else {
          LogSystem.Logger.info('Using Web IndexedDB storage');
          this.file = new WebDataBase("save_data");
        }
      }
      /**
       * 删除保存数据
       * @param {string} saveName - 保存名称
       * @returns {Promise<any>} 操作结果
       */
      remove(saveName) {
        const promise = new Promise(Storage._onPromise);
        this.file.deleteSaveData(saveName);
        return promise;
      }
      /**
       * 保存数据
       * @param {string} saveName - 保存名称
       * @param {any} data - 要保存的数据
       * @returns {Promise<any>} 操作结果
       */
      save(saveName, data) {
        const promise = new Promise(Storage._onPromise);
        this.file.addSaveData(saveName, data);
        return promise;
      }
      /**
       * 读取保存数据
       * @param {string} saveName - 保存名称
       * @returns {Promise<any>} 保存数据
       */
      read(saveName) {
        const promise = new Promise(Storage._onPromise);
        this.file.getSaveData(saveName);
        return promise;
      }
      /**
       * 检查保存数据是否存在
       * @param {string} saveName - 保存名称
       * @returns {boolean} 是否存在
       */
      exists(saveName) {
        return this.file.hasSaveData(saveName);
      }
    }
    const FileOperator = new FileAdaptor();
    return {
      FileOperator,
      FileAdaptor,
      StorageProgress,
      Storage,
      WebDataBase,
      NodeFileAdaptor,
      __proto__: null
    }
  })();

  const EventSystem = (() => {
    const { Pool, PoolCache } = PoolSystem;

    // 基础Runner类
    class BaseRunner {
      constructor() {
        /**
         * @type {string}
         */
        this.funcKey = String.empty;
        /**
         * @type {Object}
         */
        this.self = null;
        /**
         * @type {string}
         */
        this.onCompleteFuncKey = String.empty;
        /**
         * @type {boolean}
         */
        this.isReturnToPool = true;
      }
      /**
       * @param {string} funcKey 
       * @returns {this}
       */
      onComplete(funcKey) {
        this.onCompleteFuncKey = funcKey;
        return this;
      }
      /**
       * @param {string} funcKey 
       * @param {Object} self 
       * @param {number} waitCount 
       * @param {number} loopTime 
       * @returns {this}
       */
      restart(funcKey, self, waitCount = 0, loopTime = 0) {
        if (waitCount > 0 && loopTime > 0) {
          this.on(funcKey, self, waitCount, loopTime)
        } else if (waitCount > 0 && loopTime === 0) {
          this.on(funcKey, self, waitCount)
        } else if (waitCount === 0 && loopTime > 0) {
          this.on(funcKey, self, 0, loopTime)
        } else {
          this.on(funcKey, self)
        }
        GlobalEvent.put(this);
        return this;
      }
      trigger(loopTime = 0) {
        this.self[this.funcKey](loopTime);
      }
      off() {
        this.runComplete();
        GlobalEvent.off(this);
        return this;
      }
      /**
       * @param {boolean} isReturn 
       * @returns {this}
       */
      autoReturn(isReturn = true) {
        this.isReturnToPool = isReturn;
        return this;
      }
      runComplete() {
        if (this.onCompleteFuncKey !== String.empty) {
          this.self[this.onCompleteFuncKey]();
          this.onCompleteFuncKey = String.empty;
        }
        this.funcKey = String.empty;
      }
      reset() {
        this.self = null;
        return this;
      }
    }

    // 四种专用Runner实现
    class LoopWithWaitRunner extends BaseRunner {
      constructor() {
        super();
        this.runnerType = 1;
        this.waitCount = 0;
        this.count = -1;
      }
      on(funcKey, self, waitCount) {
        this.funcKey = funcKey;
        this.self = self;
        this.waitCount = waitCount;
        this.count = -1;
        return this;
      }
      update() {
        this.count++;
        if (this.count === this.waitCount) {
          this.count = -1;
          this.trigger();
        }
      }
      reset() {
        this.waitCount = 0;
        this.count = -1;
        return super.reset();
      }
    }

    class LoopWithoutWaitRunner extends BaseRunner {
      constructor() {
        super();
        this.runnerType = 2;
      }
      on(funcKey, self) {
        this.funcKey = funcKey;
        this.self = self;
        return this;
      }
      update() {
        this.trigger();
      }
    }

    class LimitWithWaitRunner extends BaseRunner {
      constructor() {
        super();
        this.runnerType = 3;
        this.waitCount = 0;
        this.count = -1;
        this.loopTime = 0;
      }
      on(funcKey, self, waitCount, loopTime) {
        this.funcKey = funcKey;
        this.self = self;
        this.waitCount = waitCount;
        this.loopTime = loopTime;
        this.count = -1;
        return this;
      }
      update() {
        this.count++;
        if (this.count === this.waitCount) {
          this.count = -1;
          if (this.loopTime > 0) {
            this.loopTime -= 1;
            this.trigger(this.loopTime);
            if (this.loopTime === 0) this.off();
          }
        }
      }
      reset() {
        this.waitCount = 0;
        this.count = -1;
        this.loopTime = 0;
        return super.reset();
      }
    }

    class LimitWithoutWaitRunner extends BaseRunner {
      constructor() {
        super();
        this.runnerType = 4;
        this.loopTime = 0;
      }
      on(funcKey, self, loopTime) {
        this.funcKey = funcKey;
        this.self = self;
        this.loopTime = loopTime;
        return this;
      }
      update() {
        if (this.loopTime > 0) {
          this.loopTime -= 1;
          this.trigger(this.loopTime);
          if (this.loopTime === 0) this.off();
        }
      }
      reset() {
        this.loopTime = 0;
        return super.reset();
      }
    }

    // 池管理器
    class RunnerPool {
      constructor() {
        this.loopWithWaitPool = new Pool(LoopWithWaitRunner, 30);
        this.loopWithoutWaitPool = new Pool(LoopWithoutWaitRunner, 30);
        this.limitWithWaitPool = new Pool(LimitWithWaitRunner, 30);
        this.limitWithoutWaitPool = new Pool(LimitWithoutWaitRunner, 30);
      }
      // 根据参数获取适当类型的Runner
      get(funcKey, self, waitCount = 100, loopTime = -1) {
        if (waitCount > 0 && loopTime > 0) {
          return this.limitWithWaitPool.get().on(funcKey, self, waitCount, loopTime);
        } else if (waitCount > 0 && loopTime === -1) {
          return this.loopWithWaitPool.get().on(funcKey, self, waitCount);
        } else if (loopTime > 0) {
          return this.limitWithoutWaitPool.get().on(funcKey, self, loopTime);
        } else {
          return this.loopWithoutWaitPool.get().on(funcKey, self);
        }
      }
      // 归还Runner到适当的池
      return(runner) {
        let pool = null;
        switch (runner.runnerType) {
          case 1:
            pool = this.loopWithWaitPool;
            break;
          case 2:
            pool = this.loopWithoutWaitPool;
            break;
          case 3:
            pool = this.limitWithWaitPool;
            break;
          case 4:
            pool = this.limitWithoutWaitPool;
            break;
        }
        pool.return(runner);
      }
      clear() {
        this.loopWithWaitPool.clear();
        this.loopWithoutWaitPool.clear();
        this.limitWithWaitPool.clear();
        this.limitWithoutWaitPool.clear();
      }
    }

    const runnerPool = PoolCache.RunnerPool = new RunnerPool();

    class RunnerSystem {
      constructor() {
        this.runners = [];
        this.count = 0;
      }
      /**
       * @description 添加事件监听  
       * @param {string} funcKey 
       * @param {Object} self 
       * @param {number} waitCount 
       * @param {number} loopTime 
       * @returns {LoopWithWaitRunner|LoopWithoutWaitRunner|LimitWithWaitRunner|LimitWithoutWaitRunner}
       */
      on(funcKey, self, waitCount = 100, loopTime = 0) {
        const runner = runnerPool.get(funcKey, self, waitCount, loopTime);
        this.runners[this.count++] = runner;
        return runner;
      }
      off(runner) {
        if (this.runners.remove(runner)) {
          this.count--;
        }
        if (runner.isReturnToPool) {
          runnerPool.return(runner);
        }
      }
      put(runner) {
        if (this.runners.add(runner)) {
          this.count++;
        }
      }
      update() {
        //为确保稳定性，要遍历的数量必须在循环之前就确定
        //不会因为事件的触发导致增加的新的runner立即执行
        const count = this.count;
        if (count === 0) return;
        const runners = this.runners;
        for (let i = 0; i < count; i++) {
          const runner = runners[i];
          if (runner === void 0) continue;
          runner.update();
        }
      }
    }

    const GlobalEvent = new RunnerSystem();
    return {
      BaseRunner,
      LoopWithWaitRunner,
      LoopWithoutWaitRunner,
      LimitWithWaitRunner,
      LimitWithoutWaitRunner,
      RunnerSystem,
      GlobalEvent,
      __proto__: null
    }
  })();
  const AnimationSystem = (() => {
    const { Logger } = LogSystem;
    const { Pool, PoolCache } = PoolSystem;
    const halfPI = Math.PI / 2;
    const PI2 = Math.PI * 2;
    const p = 0.3;
    const p4 = 0.3 / 4;
    const d1 = 1 / 2.75;
    const d2 = 2 / 2.75;
    const d3 = 1.5 / 2.75;
    const d4 = 2.25 / 2.75;
    const d5 = 2.5 / 2.75;
    const d6 = 2.625 / 2.75;
    const n1 = 7.5625;
    const ss = 1.70158 * 1.525;

    const EasingFunctions = {
      linear: t => t,
      // 二次方曲线
      easeInQuad: t => t * t,
      easeOutQuad: t => t * (2 - t),
      easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      // 三次方曲线
      easeInCubic: t => t * t * t,
      easeOutCubic: t => (--t) * t * t + 1,
      easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
      // 四次方曲线
      easeInQuart: t => t * t * t * t,
      easeOutQuart: t => 1 - (--t) * t * t * t,
      easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
      // 正弦曲线
      easeInSine: t => 1 - Math.cos(t * halfPI),
      easeOutSine: t => Math.sin(t * halfPI),
      easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
      // 指数曲线
      easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
      easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
      easeInOutExpo: t => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        return ((t *= 2) <= 1)
          ? Math.pow(2, 10 * (t - 1)) / 2
          : (2 - Math.pow(2, -10 * (t - 1))) / 2;
      },
      // 圆形曲线
      easeInCirc: t => 1 - Math.sqrt(1 - t * t),
      easeOutCirc: t => Math.sqrt(1 - (--t) * t),
      easeInOutCirc: t =>
        ((t *= 2) <= 1)
          ? (1 - Math.sqrt(1 - t * t)) / 2
          : (Math.sqrt(1 - (t -= 2) * t) + 1) / 2,

      // 弹性曲线
      easeInElastic: t => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        return -Math.pow(2, 10 * (t -= 1)) * Math.sin((t - p4) * PI2 / p);
      },
      easeOutElastic: t => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        return Math.pow(2, -10 * t) * Math.sin((t - p4) * PI2 / p) + 1;
      },
      easeInBack: t => {
        const s = 1.70158;
        return t === 1 ? 1 : t * t * ((s + 1) * t - s);
      },
      easeOutBack: t => {
        const s = 1.70158;
        return t === 0 ? 0 : --t * t * ((s + 1) * t + s) + 1;
      },
      easeInOutBack: t => {
        if ((t *= 2) < 1) {
          return 0.5 * (t * t * ((ss + 1) * t - ss));
        }
        return 0.5 * ((t -= 2) * t * ((ss + 1) * t + ss) + 2);
      },
      // 回弹曲线
      easeInBounce: t => 1 - EasingFunctions.easeOutBounce(1 - t),
      easeOutBounce: t => {
        if (t < d1) return n1 * t * t;
        if (t < d2) return n1 * (t -= d3) * t + 0.75;
        if (t < d5) return n1 * (t -= d4) * t + 0.9375;
        return n1 * (t -= d6) * t + 0.984375;
      },
      easeInOutBounce: t => {
        if (t < 0.5) {
          return EasingFunctions.easeInBounce(t * 2) * 0.5;
        }
        return EasingFunctions.easeOutBounce(t * 2 - 1) * 0.5 + 0.5;
      },
    }

    class MotionCommand {
      constructor() {
        /**
         * @type {Float32Array}
         */
        this.startValues = new Float32Array(new ArrayBuffer(4 * 8));
        /**
         * @type {Float32Array}
         */
        this.changeValues = new Float32Array(new ArrayBuffer(4 * 8));
        /**
         * @type {Float32Array}
         */
        this.resultValues = new Float32Array(new ArrayBuffer(4 * 8));
        /**
         * @type {Array<function>}
         */
        this.easingFuncs = [];
        /**
         * @type {number}
         */
        this.count = 0;
        /**
         * @type {number}
         */
        this.totalFrames = 0;
        /**
         * @type {string}
         */
        this.updateKey = String.empty;
      }
      /**
       * @description 重置MotionCommand
       * 不处理 属性值数组
       */
      reset() {
        this.easingFuncs.clear();
        this.count = 0;
        this.totalFrames = 0;
        this.updateKey = String.empty;
      }
      /**
       * @param {number} startValue 
       * @param {number} endValue 
       * @param {string} easing 
       * @returns {this}
       */
      setAnimation(startValue, endValue, easing = "linear") {
        if (this.count === 8) {
          Logger.warn("MotionCommand 最多只能存储8个动画属性");
          return this;
        }
        const count = this.count;
        this.changeValues[count] = endValue - startValue;
        this.startValues[count] = startValue;
        this.easingFuncs[count] = EasingFunctions[easing];
        this.count += 1;
        return this;
      }
      /**
       * @param {number} frames 
       */
      setFrames(frames = 60) {
        this.totalFrames = frames;
      }
      onUpdate(funcKey) {
        this.updateKey = funcKey;
      }
    }

    const CommandPool = PoolCache.MotionCommandPool = new Pool(MotionCommand, 100);

    class Motion {
      constructor() {
        /**
         * @type {MotionCommand[]}
         */
        this.commands = [];
        /**
         * @type {number}
         */
        this.totalFrames = 0;
        /**
         * @type {number}
         */
        this.currentFrame = 0;
        /**
         * @type {string}
         */
        this.updateKey = String.empty;
        /**
         * @type {string}
         */
        this.completeKey = String.empty;
        /**
         * @type {Object}
         */
        this.self = null;
        /**
         * @type {number}
         */
        this.commandSize = 0;
        /**
         * @type {MotionCommand}
         */
        this.currentCommand = null;
        /**
         * @type {boolean}
         */
        this.reserved = false;
        /**
         * @type {boolean}
         */
        this.yoyo = false;
        /**
         * @type {number}
         */
        this.index = 0;
        /**
         * @type {number}
         */
        this.repeatTime = 0;
        /**
         * @type {[]|null}
         */
        this.startValues = null;
        /**
         * @type {[]|null}
         */
        this.resultValues = null;
        /**
         * @type {[]|null}
         */
        this.changeValues = null;
        /**
         * @type {[]|null}
         */
        this.easingFuncs = null;
        /**
         * @type {number}
         */
        this.count = 0;
        /**
         * @type {boolean}
         */
        this.isReturnToPool = true;
      }
      /**
       * @returns {this}
       */
      newCommand() {
        if (this.currentCommand !== null) {
          Logger.warn("当前已存在缓动指令");
          return this;
        }
        this.currentCommand = CommandPool.get();
        this.commands[this.commandSize++] = this.currentCommand;
        return this;
      }
      endCommand() {
        if (this.currentCommand === null) {
          Logger.warn("当前不存在缓动指令");
          return this;
        }
        this.currentCommand = null;
        return this;
      }
      /**
       * @param {number} startValue 
       * @param {number} endValue 
       * @param {string} easing 
       * @returns {this}
       */
      setAnimation(startValue, endValue, easing = "linear") {
        this.checkCommand()
          .currentCommand.setAnimation(startValue, endValue, easing);
        return this;
      }
      checkCommand() {
        if (this.currentCommand === null) return this.newCommand();
        return this;
      }
      setFrames(frames = 60) {
        this.checkCommand()
          .currentCommand.setFrames(frames);
        return this;
      }
      /**
       * @param {MotionCommand} command 
       */
      setCommandStates(command) {
        this.startValues = command.startValues;
        this.resultValues = command.resultValues;
        this.changeValues = command.changeValues;
        this.easingFuncs = command.easingFuncs;
        this.totalFrames = command.totalFrames;
        this.count = command.count;
        this.updateKey = command.updateKey;
        this.currentFrame = 0;
      }
      /**
       * @param {string} funcKey 
       * @returns {this}
       */
      onUpdate(funcKey) {
        this.checkCommand()
          .currentCommand.onUpdate(funcKey);
        return this;
      }
      /**
       * @param {string} funcKey 
       * @returns {this}
       */
      onComplete(funcKey) {
        this.completeKey = funcKey;
        return this;
      }
      /**
       * @param {Object} self 
       * @returns {this}
       */
      start(self) {
        this.self = self;
        this.endCommand();
        const command = this.getNextCommand();
        this.setCommandStates(command);
        this.animate();
        return this;
      }
      animate() {
        if (this.currentFrame < this.totalFrames) {
          this.currentFrame += 1;
          const progress = this.currentFrame / this.totalFrames;
          const startValues = this.startValues;
          const changeValues = this.changeValues;
          const resultValues = this.resultValues;
          const easingFuncs = this.easingFuncs;
          for (let i = 0; i < this.count; i++) {
            const change = changeValues[i];
            resultValues[i] = startValues[i] + change * easingFuncs[i](progress);
          }
          this.updateResultValues(resultValues);
        } else {
          this.checkEnd();
        }
      }
      updateResultValues(resultValues) {
        this.self[this.updateKey](resultValues);
      }
      /**
       * @returns {this}
       */
      reserve(reserve = true) {
        this.reserved = reserve;
        return this;
      }
      /**
       * @param {number} repeatTime 
       * @returns {this}
       */
      repeat(repeatTime = 1) {
        this.repeatTime = repeatTime;
        return this;
      }
      /**
       * @param {boolean} isReturn 
       * @returns {this}
       */
      autoReturn(isReturn = true) {
        this.isReturnToPool = isReturn;
        return this;
      }
      /**
       * @returns {MotionCommand}
       */
      getNextCommand() {
        return this.commands[this.index++];
      }
      /**
       * @returns {MotionCommand}
       */
      getPreviousCommand() {
        return this.commands[this.index--];
      }
      checkEnd() {
        if (this.index < this.commandSize && !this.yoyo) {
          this.currentCommand = this.getNextCommand();
          this.setCommandStates(this.currentCommand);
          return;
        }
        if (this.reserved && !this.yoyo) {
          this.yoyo = true;
        }
        if (this.yoyo && this.index > -1) {
          this.currentCommand = this.getPreviousCommand();
          this.setCommandStates(this.currentCommand);
          return;
        }
        if (this.repeatTime > 0) {
          this.repeatTime -= 1;
          this.index = 0;
          this.yoyo = false;
          this.currentCommand = this.getNextCommand();
          this.setCommandStates(this.currentCommand);
        } else {
          this.runComplete();
          this.stop();
        }
      }
      runComplete() {
        if (this.completeKey !== String.empty) {
          this.self[this.completeKey]();
        }
      }
      stop() {
        GlobalMotion.returnMotion(this);
        return this;
      }
      resetCommands() {
        const commands = this.commands;
        for (let i = 0; i < this.commandSize; i++) {
          CommandPool.return(commands[i]);
        }
        commands.length = 0;
        this.commandSize = 0;
        this.index = 0;
      }
      reset() {
        this.startValues = null;
        this.resultValues = null;
        this.changeValues = null;
        this.easingFuncs = null;
        this.resetCommands();
        this.count = 0;
        this.totalFrames = 0;
        this.currentFrame = 0;
        this.updateKey = String.empty;
        this.completeKey = String.empty;
        this.self = null;
        this.reserved = false;
        this.yoyo = false;
        this.repeatTime = 0;
        this.currentCommand = null;
        return this;
      }
      link() {
        GlobalMotion.putMotion(this);
        return this;
      }
    }

    const MotionPool = PoolCache.MotionPool = new Pool(Motion, 100);

    class MotionGroup {
      constructor() {
        /**
         * @type {Motion[]}
         */
        this.motions = [];
        this.count = 0;
      }
      /**
       * @param {number} startValue 
       * @param {number} endValue
       * @param {number} easing 
       * @returns {Motion}
       */
      setAnimation(startValue, endValue, easing = "linear") {
        const motion = MotionPool.get();
        this.motions[this.count++] = motion;
        return motion.setAnimation(startValue, endValue, easing);
      }
      /**
       * @example 
       * const container = new PIXI.Container();
       * const GlobalMotion = Zaun.Core.AnimationSystem.GlobalMotion;
       * GlobalMotion.newCommand()
       * .setAnimation(1,0,"linear")
       * .setAnimation(100,200,"linear")
       * .endCommand()
       * .onUpdate(resultArr=>{
       * container.alpha = resultArr[0];
       * container.x = resultArr[1];
       * })
       * .onComplete(()=>{
       * console.log("complete animation!")
       * })
       * .setFrames(30)
       * .start();
       * @returns {Motion}
       */
      newCommand() {
        const motion = MotionPool.get();
        this.motions[this.count++] = motion;
        return motion.newCommand();
      }
      /**
       * @description 结束缓动动作
       * @param {Motion} motion 
       */
      returnMotion(motion) {
        if (this.motions.remove(motion)) {
          this.count--;
        }
        if (motion.isReturnToPool) {
          MotionPool.return(motion);
        }
      }
      /**
       * @returns {Motion}
       */
      getMotion() {
        const motion = MotionPool.get();
        this.motions[this.count++] = motion;
        return motion;
      }
      putMotion(motion) {
        if (this.motions.add(motion)) {
          this.count++;
        }
      }
      update() {
        const count = this.count;
        if (count === 0) return;
        const motions = this.motions;
        for (let i = 0; i < count; i++) {
          const motion = motions[i];
          if (motion === void 0) continue;
          motion.animate();
        }
      }
    }
    const GlobalMotion = new MotionGroup();
    return {
      Motion,
      MotionGroup,
      GlobalMotion,
      EasingFunctions,
      __proto__: null
    };
  })();
  Object.freeze(LoaderSystem);
  Object.freeze(ParseSystem);
  Object.freeze(EventSystem);
  Object.freeze(FileSystem);
  Object.freeze(PoolSystem);
  Object.freeze(LogSystem);
  Object.freeze(ColorSystem);
  Object.freeze(DateSystem);
  Object.freeze(AnimationSystem);
  Core.CoreUtils = CoreUtils;
  Core.LogSystem = LogSystem;
  Core.ColorSystem = ColorSystem;
  Core.ParseSystem = ParseSystem;
  Core.LoaderSystem = LoaderSystem;
  Core.FileSystem = FileSystem;
  Core.PoolSystem = PoolSystem;
  Core.EventSystem = EventSystem;
  Core.DateSystem = DateSystem;
  Core.AnimationSystem = AnimationSystem;
  Core.VERSION = "1.00";
  return Core;
})(Object.create(null));