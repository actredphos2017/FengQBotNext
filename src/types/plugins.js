/**
 * @typedef {function(any): void} EventListener
 */

/**
 * @typedef {{[key: string]: any}} PluginInterface
 */

/**
 * @typedef {Object} PluginDefine
 * @property {PluginInfo} instance - 插件实例
 * @property {boolean} loaded - 插件是否已加载
 * @property {string} hash - 插件文件的 MD5 哈希值
 * @property {boolean} error - 插件加载是否出错
 * @property {PluginInterface | undefined} api - 插件暴露的接口
 * @property {LoadLevel} level - 加载等级
 * @property {boolean} rejected - 插件是否拒绝加载
 * @property {{
*     fn: (ch: ContextHelper, ...args: string[]) => void | Promise<void>,
*     config: CommandConfig,
*     trigger: string[]
* }[]} commands - 插件注册的命令
* @property {{time: string, fn: (ch: ContextHelper | BotHelper) => (boolean | Promise<boolean>)}[]} superCommands - 插件注册的超级命令
*/

/**
 * @typedef {function(string | string[], string): (function(function): function)} CommandDecorator
 */

/**
 * @typedef {Object} CommandConfig
 * @property {string?} description - 命令描述
 * @property {boolean?} aiExpose - 由 sakulin 插件定义的 AI 暴露字段，用于 AI 插件调用
 * @property {boolean?} quickCommandRegisterIgnore - 是否忽略快速命令注册
 */

/**
 * @typedef {Object} ContextHelper - 上下文小帮手
 * @property {number} group_id - 群组 ID
 * @property {number} groupId - 群组 ID（驼峰命名接口）
 * @property {number} user_id - 用户 ID
 * @property {number} userId - 用户 ID（驼峰命名接口）
 * @property {string} user_nickname - 消息内容
 * @property {string} userNickname - 消息内容（驼峰命名接口）
 * @property {string} message_type - 消息类型
 * @property {string} messageType - 消息类型（驼峰命名接口）
 * @property {string} raw_message - 消息内容
 * @property {string} rawMessage - 消息内容（驼峰命名接口）
 * @property {(emojiId: string, set: boolean) => Promise<void>} setEmojiResponse - 设置表情响应
 * @property {(...args: any[]) => any} quick_action - 快速操作方法
 * @property {(...args: any[]) => any} quickAction - 快速操作方法（驼峰命名接口）
 * @property {(text: string) => ContextHelper} text - 设置文本内容并返回上下文助手实例
 * @property {(image: string | Blob | Buffer | Uint8Array, name?: string) => ContextHelper} image - 设置图片内容并返回上下文助手实例
 * @property {(path: string, filename: string) => BotHelper} file - 设置文件内容并返回上下文助手实例
 * @property {(who?: number) => ContextHelper} at - 艾特指定用户并返回上下文助手实例（仅群消息可用）
 * @property {(instance?: any) => ContextHelper} face - 设置表情并返回上下文助手实例
 * @property {() => Promise<void>} go - 执行操作并返回一个 Promise
 * @property {() => Promise<void>} goAutoReply - 执行自动回复操作并返回一个 Promise
 * @property {(onlyText: boolean = true) => string | undefined} getPureMessage - 当获得的消息为纯文本时，返回文本对象。onlyText 为 true 时，当消息包含艾特、图片、表情、文件等信息时，会返回 undefined
 * @property {(parts: string | string[]) => Promise<void>} redirect - 重定向到新的命令（重定向不会激活新命令生命周期的超级命令）
 * @property {boolean} isGroup - 是否为群组消息
 * @property {Context} context - 原始上下文对象
 * @property {NCWebsocket} napcat - 原始 NCWebsocket 对象
 */

/**
 * @typedef {Object} BotHelper - 机器人助手
 * @property {number | undefined} group_id - 群组 ID
 * @property {number | undefined} groupId - 群组 ID（驼峰命名接口）
 * @property {number | undefined} user_id - 用户 ID
 * @property {number | undefined} userId - 用户 ID（驼峰命名接口）
 * @property {boolean | undefined} isGroup - 是否为群组消息
 * @property {(groupId: number | string) => BotHelper} openGroup - 打开群聊
 * @property {(userId: number | string) => BotHelper} openPrivate - 打开私聊
 * @property {(text: string) => BotHelper} text - 设置文本内容并返回上下文助手实例
 * @property {(image: string | Blob | Buffer | Uint8Array, name?: string) => BotHelper} image - 设置图片内容并返回上下文助手实例
 * @property {(path: string, filename: string) => BotHelper} file - 设置文件内容并返回上下文助手实例
 * @property {(who?: number) => BotHelper} at - 艾特指定用户并返回上下文助手实例（仅群消息可用）
 * @property {(instance?: any) => BotHelper} face - 设置表情并返回上下文助手实例
 * @property {() => Promise<void>} go - 执行操作并返回一个 Promise
 */

/**
 * @typedef {Object} SuperCommandConfig
 * @property {string?} description - 超级命令描述
 * @property {("beforeActivate" | "afterActivate" | "onActivateFailed" | "onFinally" | "onGo")?} time - 执行时机
 */

/**
 * @typedef {(name: string, defaultValue: T) => Promise<T>} StoreGetFn
 */

/**
 * @typedef {(name: string, value: T) => Promise<void>} StoreSetFn
 */

/**
 * @typedef {Object} PluginAPIStore
 * @property {StoreGetFn} get 获取插件数据
 * @property {StoreSetFn} set 设置插件数据
 */

/**
 * @typedef {Object} PluginAPISchedule
 * @property {(cron: string, fn: function(): void) => import("node-schedule").Job} create - 创建定时任务
 * @property {(job: import("node-schedule").Job) => void} remove - 删除定时任务
 */

/**
 * @typedef {Object} PluginAPI
 * @property {function(string, EventListener): void} listen - 注册事件监听器
 * @property {function(string, any?): Promise<void>} send - 发送事件
 * @property {function(PluginInterfaceExpose): void} expose - 定义暴露的方法和属性
 * @property {() => BotHelper} createBot - 机器人助手
 * @property {{
 *     [pluginId: string]: PluginInterface,
 *     __plugins: {[pluginId: string]: PluginDefine},
 *     __commands: {
 *         pluginId: string,
 *         fn: (ch: ContextHelper, ...args: string[]) => void | Promise<void>,
 *         config: CommandConfig,
 *         trigger: string[]
 *     }[],
 * }} outside - 外部插件接口
 *
 * @property {(trigger: string | string[], fn: (ch: ContextHelper, ...args: string[]) => void | Promise<void>, config: CommandConfig) => void} cmd - 注册命令
 * @property {(trigger: (ch: ContextHelper | BotHelper, arg: any?) => (boolean | Promise<boolean>), config: SuperCommandConfig) => void} super - 注册超级命令，返回 false 会终止命令的默认执行
 *
 * @property {function(string): boolean} assert - 检查插件是否存在
 * @property {function(string): void} reject - 拒绝插件加载
 * @property {function(...any): void} log - 日志记录器
 * @property {function(): Promise<string | undefined>} getStore - 获取插件持久化数据（已弃用，使用 store 代替）
 * @property {function(string): Promise<void>} setStore - 设置插件持久化数据（已弃用，使用 store 代替）
 * @property {PluginAPIStore} store - 更好的持久化数据（插件间隔离）访问方法
 * @property {PluginAPISchedule} schedule - 定时任务
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
 * @property {boolean} hideInHelpPage - 是否在帮助页面中隐藏（可选）
 * @property {boolean} disabled - 是否禁用插件（可选）
 */

/**
 * @typedef {Object} PluginInfo
 * @property {PluginConfig} config - 插件配置
 * @property {function(PluginAPI): (void | Promise<void>)} setup - 插件初始化函数
 */