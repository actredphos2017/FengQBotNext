import {defineMiddleware} from "../core/middleware.js";
import path from "path";
import crypto from 'crypto';
import {promises as fsPromises} from 'fs';
import {fileURLToPath} from "node:url";
import {Botconfig as config} from "../lib/config.js";
import pipe from "../core/pipe.js";
import { getLoadLevel } from "../types/plugins.js";
import { logger } from "../core/logger.js";
import { getFace } from "../lib/faces.js";

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
 *     fn: (ch: ContextHelper, ...args: string[]) => void | Promise<void>,
 *     config: import("../types/plugins").CommandConfig,
 *     trigger: string[]
 * }[]} commands - 插件注册的命令
 */

/**
 * @type {{ [key: string]: PluginDefine }}
 */
const plugins = {};

/**
 * @type {{ [key: string]: {
 *     pluginId: string,
 *     command: {
 *         fn: (ch: ContextHelper, ...args: string[]) => void | Promise<void>,
 *         description: string,
 *         trigger: string[]
 *     }
 * } }}
 */
const quickCommands = {};

async function loadPlugins() {
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
                    const existingPlugin = plugins[pluginInstance.config.id];
                    if (existingPlugin && existingPlugin.hash === currentMD5) {
                        logger.log(`插件 ${pluginInstance.config.id} 未发生更改，无需重新加载`);
                        continue;
                    }

                    plugins[pluginInstance.config.id] = {
                        instance: pluginInstance,
                        loaded: false,
                        hash: currentMD5,
                        error: false,
                        api: undefined,
                        level: pluginInstance.config.level,
                        rejected: false,
                        commands: []
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

    const pluginList = Object.values(plugins).map(e => { e.level = getLoadLevel(e.level); return e; });

    for (const plugin of pluginList.toSorted((a, b) => b.level - a.level)) {
        if (!plugin.loaded) {
            try {
                await loadPlugin(plugin);
                plugin.loaded = true;
                logger.log(`插件 ${plugin.instance.config.id} 已成功加载`);
            } catch (error) {
                plugin.error = true;
                logger.error(`加载插件 ${plugin.instance.config.id} 时出错:`, error);
            }
        }
    }

    for (const plugin of pluginList) {
        if (plugin.loaded && !plugin.rejected) {
            for (const command of plugin.commands) {
                if (command.config.quickCommandRegisterIgnore === true) {
                    continue;
                }
                for (const trigger of command.trigger) {
                    if (quickCommands[trigger] && quickCommands[trigger].pluginId !== plugin.instance.config.id) {
                        logger.error(`为插件 ${plugin.instance.config.id} 注册快捷命令 ${trigger} 时出错：该命令已被插件 ${quickCommands[trigger].pluginId} 注册`);
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
        }
    });

    return pluginDefine;
}

/**
 * @param {Context} ctx - 上下文对象，包含消息相关信息和操作方法。
 * @param {Object} qqBot
 * @returns {import("../types/plugins.js").ContextHelper}
 */
function contextHelper(ctx, qqBot) {

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
        isGroup: ctx.message_type === "group"
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

    config = {
        activate: config.activate ?? ((context) => {
            if (context.message[0].type !== 'text')
                return undefined;
            return context.message[0].data.text.trim().split(/\s+/);
        })
    }

    return [
        {
            type: "middleware",
            value: defineMiddleware("afterInit", () => {
                loadPlugins();
            })
        },
        {
            type: "trigger",
            value: {
                event: "NAPCAT_MESSAGE",
                handler: async ({ context, qqBot }) => {

                    logger.log("收到消息：", JSON.stringify(context.message));

                    if (context.message.length < 1) {
                        return;
                    }

                    const parts = config.activate(context);
                    if (!parts) {
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
                        return;
                    }
                    logger.log(`命令 ${cmdName} 已找到`);

                    try {
                        await command.fn(contextHelper(context, qqBot), ...args);
                    } catch (e) {
                        logger.error(`命令 ${cmdName} 执行出错：`, e);
                    }
                }
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