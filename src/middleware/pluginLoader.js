import {defineMiddleware} from "../core/middleware.js";
import path from "path";
import crypto from 'crypto';
import {promises as fsPromises, existsSync} from 'fs';
import {fileURLToPath} from "node:url";
import pipe from "../core/pipe.js";
import { getLoadLevel } from "../types/plugins.js";
import { logger } from "../core/logger.js";
import { getFace } from "../lib/faces.js";
import sqlite3Prototype from 'sqlite3';
import schedule from 'node-schedule';

let qqBot = undefined;

const sqlite3 = sqlite3Prototype.verbose();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let db = undefined;

function databaseInit() {
    db.run(`DROP TABLE IF EXISTS plugin_store`);
    db.run(`CREATE TABLE plugin_store (plugin_id VARCHAR(64) PRIMARY KEY, data TEXT default "")`);
}

/**
 * @param {string} pluginId
 * @returns {Promise<string | undefined>}
 */
function getPluginStore(pluginId) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT data FROM plugin_store WHERE plugin_id = ?`, [pluginId], (err, row) => {
            if (err) {
                reject(err);
            } else if (row) {
                resolve(row.data);
            } else {
                resolve(undefined);
            }
        })
    })
}

/**
 * @param {string} pluginId
 * @param {string} data
 * @returns {Promise<void>}
 */
function setPluginStore(pluginId, data) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT OR REPLACE INTO plugin_store (plugin_id, data) VALUES (?, ?)`, [pluginId, data], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        })
    })
}

/**
 * @type {{ [key: string]: schedule.Job[] }}
 */
const jobs = {};

/**
 * @param {string?} pluginId
 */
function clearJobs(pluginId = undefined) {
    if (pluginId) {
        if (!jobs[pluginId]) {
            return;
        }
        jobs[pluginId].forEach(job => {
            job.cancel();
        });
    } else {
        Object.values(jobs).forEach(job => {
            job.forEach(job => {
                job.cancel();
            });
        });
    }
}


/**
 * 创建一个定时任务。
 *
 * @param {string} pluginId - 插件的唯一标识符，用于在任务执行失败时记录日志。
 * @param {string} cron - 定时任务的执行时间。
 * @param {Function} fn - 定时任务执行时要调用的异步函数。
 * @returns {schedule.Job} 返回一个由 node-schedule 创建的定时任务实例。
 */
function createJob(pluginId, cron, fn) {
    const job = schedule.scheduleJob(cron, async () => {
        try {
            await fn();
        } catch (e) {
            logger.error(`插件 ${pluginId} 的定时任务 ${time} 执行失败: ${e.message}`);
        }
    });
    if (!jobs[pluginId]) {
        jobs[pluginId] = [];
    }
    jobs[pluginId].push(job);
    return job;
}

/**
 *  移除一个定时任务。
 * @param {string} pluginId - 插件的唯一标识符。
 * @param {schedule.Job} job - 要移除的定时任务实例。
 * @returns {void}
 */
function removeJob(pluginId, job) {
    if (jobs[pluginId]) {
        const index = jobs[pluginId].indexOf(job);
        if (index !== -1) {
            job.cancel();
            jobs[pluginId].splice(index, 1);
        }
    }
}

/**
 * @typedef {Object} PluginDefine
 * @property {import("../types/plugins").PluginInfo} instance - 插件实例
 * @property {boolean} loaded - 插件是否已加载
 * @property {string} hash - 插件文件的 MD5 哈希值
 * @property {boolean} error - 插件加载是否出错
 * @property {import("../types/plugins").PluginInterface | undefined} api - 插件暴露的接口
 * @property {import("../types/plugins").LoadLevel} level - 加载等级
 * @property {boolean} rejected - 插件是否拒绝加载
 * @property {{
 *     fn: (ch: import("../types/plugins").ContextHelper, ...args: string[]) => void | Promise<void>,
 *     config: import("../types/plugins").CommandConfig,
 *     trigger: string[]
 * }[]} commands - 插件注册的命令
 * @property {{time: string, fn: (ch: ContextHelper) => (boolean | Promise<boolean>)}[]} superCommands - 插件注册的超级命令
 */

/**
 * @type {{ [key: string]: PluginDefine }}
 */
const plugins = {};

const emptyQuickCommand = {};

/**
 * @type {{ [key: string]: {
 *     pluginId: string,
 *     command: {
 *         fn: (ch: ContextHelper, ...args: string[]) => void | Promise<void>,
 *         config: import("../types/plugins").CommandConfig,
 *         trigger: string[]
 *     }
 * } }}
 */
let quickCommands = emptyQuickCommand;

/**
 * @typedef {(ch: ContextHelper) => (boolean | Promise<boolean>)} SuperCommandFn
 */

const emptySuperCommand = {
    beforeActivate: [],
    afterActivate: [],
    onActivateFailed: [],
    onFinally: []
};

/**
 * @type {{
 *     beforeActivate: { [pluginId: string]: SuperCommandFn }[]
 *     afterActivate: { [pluginId: string]: SuperCommandFn }[]
 *     onActivateFailed: { [pluginId: string]: SuperCommandFn }[]
 *     onFinally: { [pluginId: string]: SuperCommandFn }[]
 * }}
 */
let superCommands = emptySuperCommand;

async function loadPlugins(hard = false) {
    try {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const pluginsDir = path.join(__dirname, '..', 'plugins');

        const files = await fsPromises.readdir(pluginsDir);

        for (const file of files) {
            if (file.endsWith('.js')) {
                const pluginPath = path.join(pluginsDir, file);
                try {
                    logger.log(`尝试加载插件: ${pluginPath}`);
                    const module = await import(`file://${pluginPath}?t=${Date.now()}`);
                    const pluginInstance = module.default;
                    const currentMD5 = crypto.createHash('md5').update(await fsPromises.readFile(pluginPath)).digest('hex');
                    if (!hard) {
                        const existingPlugin = plugins[pluginInstance.config.id];
                        if (existingPlugin && existingPlugin.hash === currentMD5) {
                            logger.log(`插件 ${pluginInstance.config.id} 未发生更改，无需重新加载`);
                            continue;
                        }
                    }

                    plugins[pluginInstance.config.id] = {
                        instance: pluginInstance,
                        loaded: false,
                        hash: currentMD5,
                        error: false,
                        api: undefined,
                        level: pluginInstance.config.level,
                        rejected: false,
                        commands: [],
                        superCommands: []
                    }

                    logger.log(`插件 ${pluginInstance.config.id} 将被加载`);
                } catch (error) {
                    logger.error(`加载插件 ${file} 时出错:`, error);
                }
            }
        }
    } catch (error) {
        logger.error('加载插件目录失败:', error);
    }

    /**
     * @type {PluginDefine[]}
     */
    const pluginList = Object.values(plugins).map(e => { e.level = getLoadLevel(e.level); return e; }).toSorted((a, b) => b.level - a.level);

    superCommands = emptySuperCommand;
    quickCommands = emptyQuickCommand;

    for (const plugin of pluginList) {
        if (!plugin.loaded) {
            try {
                clearJobs(plugin.instance.config.id);
                await loadPlugin(plugin);
                if (plugin.rejected) {
                    logger.log(`插件 ${plugin.instance.config.id} 拒绝加载`);
                    continue;
                }
                plugin.loaded = true;
                logger.log(`插件 ${plugin.instance.config.id} 已成功加载`);
            } catch (error) {
                plugin.error = true;
                logger.error(`加载插件 ${plugin.instance.config.id} 时出错:`, error);
            }
        }

        if (plugin.loaded && !plugin.rejected) {
            plugin.superCommands.forEach(e => {
                superCommands[e.time][plugin.instance.config.id] = e.fn;
            });
        }
    }

    for (const plugin of pluginList.reverse()) {
        if (plugin.loaded && !plugin.rejected) {
            for (const command of plugin.commands) {
                if (command.config.quickCommandRegisterIgnore === true) {
                    continue;
                }
                for (const trigger of command.trigger) {
                    if (quickCommands[trigger] && quickCommands[trigger].pluginId !== plugin.instance.config.id) {
                        logger.error(`为插件 ${plugin.instance.config.id} 注册快捷命令 ${trigger} 时出错：同名命令已被插件 ${quickCommands[trigger].pluginId} 注册`);
                        continue;
                    }
                    const isCovered = quickCommands[trigger];
                    quickCommands[trigger] = {
                        pluginId: plugin.instance.config.id,
                        command: command
                    };
                    logger.log(`已为插件 ${plugin.instance.config.id} ` + (isCovered ? "重新" : "") + `注册快捷命令 ${trigger}`);
                }
            }
        }
    }
}

/**
 * @param {PluginDefine} pluginDefine
 * @returns {Promise<PluginDefine>}
 */
async function loadPlugin(pluginDefine) {

    const pluginId = pluginDefine.instance.config.id;

    await pluginDefine.instance.setup({
        listen: (event, listener) => {
            logger.log(`插件 ${pluginId} 注册了事件监听器: ${event}`);
            pipe.addTrigger({
                event,
                handler: listener
            });
        },
        send: async (event, data = {}) => {
            logger.log(`插件 ${pluginId} 发送了事件: ${event}`, data);
            await pipe.emit(event, data);
        },
        expose: (api) => {
            pluginDefine.api = { ...(pluginDefine.api ?? {}), ...api };
        },
        createBot: botHelper(),
        withPlugin: (pluginId, func) => {
            const plugin = plugins[pluginId];
            let api;
            if (plugin) {
                api = plugin.api;
            } else {
                logger.error(`插件 ${pluginId} 试图寻找 ${pluginId} 但未找到`);
                api = undefined;
            }
            return new Promise(async (resolve, reject) => {
                if (api) {
                    const a = func(api);
                    if (a instanceof Promise) {
                        a.then(resolve).catch(reject);
                    } else {
                        resolve(a);
                    }
                } else {
                    reject(`插件 ${pluginId} 未找到`);
                }
            });
        },
        cmd: (trigger, fn, config = {}) => {
            trigger = Array.isArray(trigger) ? trigger : [trigger];
            logger.log(`插件 ${pluginId} 注册了命令: `, ...trigger);
            pluginDefine.commands.push({
                trigger,
                fn,
                config
            });
        },
        super: (fn, config) => {
            const time = config?.time ?? "afterActivate";
            if (typeof time === "string" && !Object.keys(superCommands).includes(time)) {
                logger.error(`插件 ${pluginId} 试图注册超级命令，但时机 ${time} 不存在`);
                return;
            }
            logger.log(`插件 ${pluginId} 在 ${time} 时机注册了超级命令`);
            pluginDefine.superCommands.push({time, fn});
        },
        assert: (pluginId) => {
            const plugin = plugins[pluginId];
            if (plugin) {
                return plugin.loaded;
            } else {
                return false;
            }
        },
        reject: (reason) => {
            logger.error(`插件 ${pluginId} 拒绝加载: ${reason}`);
            pluginDefine.rejected = true;
        },
        logger,
        log(...args) {
            logger.log(...args);
        },
        getStore: async () => {
            return await getPluginStore(pluginId);
        },
        setStore: async (data) => {
            await setPluginStore(pluginId, data);
        },
        store: {
            async get(key, defaultValue) {
                const target = await getPluginStore(pluginId);
                if (!target) {
                    return defaultValue;
                } else {
                    try {
                        const res = JSON.parse(target)[String(key)];
                        if (res) {
                            return res;
                        } else {
                            return defaultValue;
                        }
                    } catch (e) {
                        return defaultValue;
                    }
                }
            },
            async set(key, value) {
                const target = await getPluginStore(pluginId);
                if (!target) {
                    await setPluginStore(pluginId, JSON.stringify({ [key]: value }));
                } else {
                    try {
                        const res = JSON.parse(target);
                        if (!res) {
                            await setPluginStore(pluginId, JSON.stringify({[key]: value}));
                        } else {
                            res[key] = value;
                            await setPluginStore(pluginId, JSON.stringify(res));
                        }
                    } catch (e) {
                        await setPluginStore(pluginId, JSON.stringify({[key]: value}));
                    }
                }
            }
        },
        schedule: {
            create: (cron, fn) => {
                return createJob(pluginId, cron, fn);
            },
            remove: (job) => {
                removeJob(pluginId, job);
            }
        }
    });

    return pluginDefine;
}

/**
 * @param {Context} ctx - 上下文对象，包含消息相关信息和操作方法。
 * @returns {import("../types/plugins.js").ContextHelper}
 */
function contextHelper(ctx) {

    let requestBuffer = [];

    return {
        group_id: ctx.group_id,
        groupId: ctx.group_id,
        user_id: ctx.user_id,
        userId: ctx.user_id,
        message_type: ctx.message_type,
        messageType: ctx.message_type,
        quick_action(...args) {
            return ctx.quick_action(...args);
        },
        quickAction(...args) {
            return ctx.quick_action(...args);
        },
        text(text) {
            requestBuffer.push({type: "text", data: {text}});
            return this;
        },
        image(image, name = undefined) {
            requestBuffer.push({type: "image", data: {image, name}});
            return this;
        },
        at(who = ctx.user_id) {
            if (this.isGroup)
                requestBuffer.push({ type: "at", data: { who } });
            return this;
        },
        face(instance) {
            if (typeof instance === "string" || typeof instance === "number") {
                const faceInstance = getFace(instance);
                if (faceInstance) {
                    instance = faceInstance;
                }
            }
            requestBuffer.push({ type: "instance", data: { instance } });
            return this;
        },
        async go() {
            const message = [];
            for (const item of requestBuffer) {
                if (item.type === "text") {
                    message.push({type: "text", data: {text: String(item.data.text)}});
                } else if (item.type === "image") {
                    let image = item.data.image;
                    const name = item.data.name;
                    if (typeof image !== 'string') {
                        if (image instanceof Blob) {
                            image = Buffer.from(await image.arrayBuffer()).toString("base64");
                        } else if (image instanceof Buffer) {
                            image = image.toString('base64');
                        }
                    } else {
                        logger.error('不支持的图片类型');
                        continue;
                    }

                    if (!image.startsWith("base64://"))
                        image = `base64://${image}`;

                    message.push({
                        type: "image",
                        data: { file: image, name }
                    });
                } else if (item.type === "at") {
                    message.push({ type: "at", data: { qq: item.data.who } });
                    message.push({ type: "text", data: { text: " " } });
                } else if (item.type === "reply") {
                    message.push({ type: "reply", data: { id: item.data.id } });
                } else if (item.type === "instance") {
                    message.push(item.data.instance);
                }
            }

            let prepareLog = JSON.stringify(message);
            if (prepareLog.length > 50) {
                prepareLog = prepareLog.slice(0, 50) + "...";
            }
            logger.log("发送消息：", prepareLog);
            if (this.isGroup) {
                await qqBot.send_group_msg({
                    group_id: ctx.group_id,
                    message
                });
            } else {
                await qqBot.send_private_msg({
                    user_id: ctx.user_id,
                    message
                });
            }
            requestBuffer = [];
        },
        async goAutoReply() {
            if (this.isGroup) {
                requestBuffer = [{ type: "reply", data: { id: ctx.message_id } }, ...requestBuffer];
            }
            return await this.go();
        },
        isGroup: ctx.message_type === "group",
        context: ctx,
        napcat: qqBot,
        getPureMessage(onlyText = true) {
            if (onlyText && ctx.message.some(e => (e.type !== "text"))) return undefined;
            return ctx.message.map(e => {
                if (e.type === "text") {
                    return String(e.data.text);
                } else if (e.type === "file") {
                    return "[FILE]";
                } else if (e.type === "at") {
                    return `[AT:${e.data.qq}]`;
                } else if (e.type === "face") {
                    return `[EMOJI]`;
                } else if (e.type === "image") {
                    return "[IMAGE]";
                } else {
                    return "";
                }
            }).join();
        }
    }
}

/**
 * @returns {import("../types/plugins.js").BotHelper}
 */
function botHelper() {
    let requestBuffer = [];
    let virtualContext = undefined;

    return {
        openGroup(groupId) {
            virtualContext = {
                id: groupId,
                isGroup: true
            };
            requestBuffer = [];
            return this;
        },
        openPrivate(userId) {
            virtualContext = {
                id: userId,
                isGroup: false
            };
            requestBuffer = [];
        },
        text(text) {
            requestBuffer.push({type: "text", data: {text}});
            return this;
        },
        image(image, name = undefined) {
            requestBuffer.push({type: "image", data: {image, name}});
            return this;
        },
        at(who) {
            if (virtualContext.isGroup)
                requestBuffer.push({ type: "at", data: { who } });
            return this;
        },
        face(instance) {
            if (typeof instance === "string" || typeof instance === "number") {
                const faceInstance = getFace(instance);
                if (faceInstance) {
                    instance = faceInstance;
                }
            }
            requestBuffer.push({ type: "instance", data: { instance } });
            return this;
        },
        async go() {
            const message = [];
            for (const item of requestBuffer) {
                if (item.type === "text") {
                    message.push({type: "text", data: {text: String(item.data.text)}});
                } else if (item.type === "image") {
                    let image = item.data.image;
                    const name = item.data.name;
                    if (typeof image !== 'string') {
                        if (image instanceof Blob) {
                            image = Buffer.from(await image.arrayBuffer()).toString("base64");
                        } else if (image instanceof Buffer) {
                            image = image.toString('base64');
                        }
                    } else {
                        logger.error('不支持的图片类型');
                        continue;
                    }

                    if (!image.startsWith("base64://"))
                        image = `base64://${image}`;

                    message.push({
                        type: "image",
                        data: { file: image, name }
                    });
                } else if (item.type === "at") {
                    message.push({ type: "at", data: { qq: item.data.who } });
                    message.push({ type: "text", data: { text: " " } });
                } else if (item.type === "reply") {
                    message.push({ type: "reply", data: { id: item.data.id } });
                } else if (item.type === "instance") {
                    message.push(item.data.instance);
                }
            }

            let prepareLog = JSON.stringify(message);
            if (prepareLog.length > 50) {
                prepareLog = prepareLog.slice(0, 50) + "...";
            }
            logger.log("发送消息：", prepareLog);
            if (virtualContext.isGroup) {
                await qqBot.send_group_msg({
                    group_id: virtualContext.id,
                    message
                });
            } else {
                await qqBot.send_private_msg({
                    user_id: virtualContext.id,
                    message
                });
            }
            requestBuffer = [];
        }
    }

}

/**
 * @typedef {Object} PluginLoaderConfig
 * @property {((context: Context) => (string[] | undefined))?} activate
 */

/**
 * @param {PluginLoaderConfig} config
 * @returns {any}
 */

export function pluginLoader(config = {}) {

    const storeDbPath = path.join(__dirname, '..', 'store.db');
    if (existsSync(storeDbPath)) {
        db = new sqlite3.Database(storeDbPath);
    } else {
        logger.log('数据库 ../store.db 不存在，正在创建...');
        db = new sqlite3.Database(storeDbPath, (err) => {
            if (err) {
                logger.error('中间件初始化失败：创建数据库文件 ../store.db 时出错 ', err);
            }
        });
        db.serialize(databaseInit);
    }

    config = {
        activate: config.activate ?? ((context) => {
            if (context.message[0].type !== 'text')
                return undefined;
            return context.message[0].data.text.trim().split(/\s+/);
        })
    }

    const mainHander = async ({ context }) => {

        logger.log("收到消息：", JSON.stringify(context.message));

        // 超级命令
        for (const [pluginId, fn] of Object.entries(superCommands.beforeActivate)) {
            const res = await fn(contextHelper(context));
            if (res === false) {
                logger.log(`插件 ${pluginId} 的超级命令在 beforeActivate 时机阻止了命令默认执行`);
                return;
            }
        }

        if (context.message.length < 1) {
            return;
        }

        const parts = config.activate(context);
        if (!parts) {
            // 超级命令
            for (const [pluginId, fn] of Object.entries(superCommands.onActivateFailed)) {
                const res = await fn(contextHelper(context));
                if (res === false) {
                    logger.log(`插件 ${pluginId} 的超级命令在 onActivateFailed 时机阻止了命令默认执行`);
                    return;
                }
            }
            return;
        }

        logger.log("消息已命中，关键字：", parts.join(", "));

        let command, cmdName;
        let args = [];

        if (parts[0].startsWith("$")) {
            // 具名模式
            logger.log(`正在使用具名模式搜索`);
            const pluginId = parts[0].slice(1);
            cmdName = parts[1];
            const plugin = plugins[pluginId];
            if (!plugin) {
                logger.log(`插件 ${pluginId} 未找到`);
                return;
            }
            logger.log(`插件 ${pluginId} 已找到`);
            command = plugin.commands.find((command) => {
                return command.trigger.includes(cmdName);
            });
            args = parts.slice(2);
        } else {
            // 快捷模式
            logger.log(`正在使用快捷模式搜索`);
            cmdName = parts[0];
            const quickCmd = quickCommands[cmdName];
            if (quickCmd) {
                command = quickCmd.command;
            }
            args = parts.slice(1);
        }


        if (!command) {
            // 超级命令
            for (const [pluginId, fn] of Object.entries(superCommands.onActivateFailed)) {
                const res = await fn(contextHelper(context));
                if (res === false) {
                    logger.log(`插件 ${pluginId} 的超级命令在 onActivateFailed 时机阻止了命令默认执行`);
                    return;
                }
            }
            return;
        } else {
            logger.log(`命令 ${cmdName} 已找到`);
            // 超级命令
            for (const [pluginId, fn] of Object.entries(superCommands.afterActivate)) {
                const res = await fn(contextHelper(context));
                if (res === false) {
                    logger.log(`插件 ${pluginId} 的超级命令在 afterActivate 时机阻止了命令默认执行`);
                    return;
                }
            }
        }

        try {
            await command.fn(contextHelper(context), ...args);
        } catch (e) {
            logger.error(`命令 ${cmdName} 执行出错：`, e);
        }

        // 超级命令
        for (const [pluginId, fn] of Object.entries(superCommands.onFinally)) {
            const res = await fn(contextHelper(context));
            if (res === false) {
                logger.log(`插件 ${pluginId} 的超级命令在 onFinally 时机阻止了命令默认执行`);
                return;
            }
        }
    };

    return [
        {
            type: "middleware",
            value: defineMiddleware("afterInit", (obj) => {
                if (obj.qqBot) {
                    qqBot = obj.qqBot;
                    loadPlugins();
                } else {
                    logger.error("未找到QQ机器人实例");
                }
                return obj;
            })
        },
        {
            type: "trigger",
            value: {
                event: "NAPCAT_MESSAGE",
                handler: mainHander
            }
        },
        {
            type: "trigger",
            value: {
                event: "PLUGIN_RELOAD",
                handler: async () => {
                    await loadPlugins();
                }
            }
        }
    ];
}