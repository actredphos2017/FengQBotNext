/**
 * @typedef {function(any): void} EventListener
 */

/**
 * @typedef {function(string): any} PluginInterface
 */

/**
 * @typedef {PluginInterface | {[key: string]: any}} PluginInterfaceExpose
 */

/**
 * @typedef {function(string | string[], string): (function(function): function)} CommandDecorator
 */

/**
 * @typedef {Object} CommandConfig
 * @property {string} description - 命令描述
 */

/**
 * @typedef {Object} PluginAPI
 * @property {function(string, EventListener): void} listen - 注册事件监听器
 * @property {function(string, any): void} send - 发送事件
 * @property {function(PluginInterfaceExpose): void} expose - 定义暴露的方法和属性
 * @property {function(string, (api: PluginInterface) => (any | Promise<any>)): Promise<any>} withPlugin - 导入并使用插件接口
 * @property {(trigger: string | string[], fn: (context: Context) => void | Promise<void>, config: CommandConfig) => void} cmd - 注册命令
 * @property {function(string): boolean} assert - 检查插件是否存在
 * @property {function(string): void} reject - 拒绝插件加载
 * @property {{
 *     info: function(string): void,
 *     warn: function(string): void,
 *     error: function(string): void,
 *     debug: function(string): void
 * }} logger - 日志记录器
 */

/**
 * @typedef {"core" | "functional" | "normal" | "finally" | number} LoadLevel
 */

const levelMap = {
    core: 200,
    functional: 150,
    normal: 100,
    finally: 50
};

const defaultLevel = levelMap["normal"];

/**
 * @param {LoadLevel} level
 * @return {number}
 */
export function getLoadLevel(level) {
    if (level === undefined) return defaultLevel;
    if (typeof level === "number") return level;
    const res = levelMap[level];
    if (typeof res !== "number")
        return defaultLevel;
    return res;
}

/**
 * @typedef {Object} PluginConfig
 * @property {string} id - 插件的唯一标识符
 * @property {string} name - 插件名称
 * @property {string} description - 插件描述
 * @property {string} author - 插件作者
 * @property {string} version - 插件版本
 * @property {LoadLevel} level - 插件类型、加载优先级（可选）
 */

/**
 * @typedef {Object} PluginInfo
 * @property {PluginConfig} config - 插件配置
 * @property {function(PluginAPI): (void | Promise<void>)} setup - 插件初始化函数
 */