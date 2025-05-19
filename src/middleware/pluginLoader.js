import {defineMiddleware} from "../core/middleware.js";
import path from "path";
import crypto from 'crypto';
import {promises as fsPromises} from 'fs';
import {fileURLToPath} from "node:url";
import {Botconfig as config} from "../lib/config.js";
import pipe from "../core/pipe.js";
import { getLoadLevel } from "../types/plugins.js";

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
 *     fn: (context: Context) => void | Promise<void>,
 *     description: string,
 *     trigger: string[]
 * }[]} commands - 插件注册的命令
 */

const CMD_PREFIX = config?.cmd?.prefix ?? '#';

/**
 * @type {{ [key: string]: PluginDefine }}
 */
const plugins = {};

async function loadPlugins() {
    try {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const pluginsDir = path.join(__dirname, '..', 'plugins');

        const files = await fsPromises.readdir(pluginsDir);

        for (const file of files) {
            if (file.endsWith('.js')) {
                const pluginPath = path.join(pluginsDir, file);
                try {
                    console.log(`尝试加载插件: ${pluginPath}`);
                    const module = await import(`${pluginPath}?t=${Date.now()}`);
                    const pluginInstance = module.default;
                    const currentMD5 = crypto.createHash('md5').update(await fsPromises.readFile(pluginPath)).digest('hex');
                    const existingPlugin = plugins[pluginInstance.config.id];
                    if (existingPlugin && existingPlugin.hash === currentMD5) {
                        console.log(`插件 ${pluginInstance.config.id} 未发生更改，无需重新加载`);
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

                    console.log(`插件 ${pluginInstance.config.id} 将被加载`);
                } catch (error) {
                    console.error(`加载插件 ${file} 时出错:`, error);
                }
            }
        }

    } catch (error) {
        console.error('加载插件目录失败:', error);
    }

    for (const plugin of Object.values(plugins).map(e => { e.level = getLoadLevel(e.level); return e; }).toSorted((a, b) => b.level - a.level)) {
        if (!plugin.loaded) {
            try {
                await loadPlugin(plugin);
                plugin.loaded = true;
                console.log(`插件 ${plugin.instance.config.id} 已成功加载`);
            } catch (error) {
                plugin.error = true;
                console.error(`加载插件 ${plugin.instance.config.id} 时出错:`, error);
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
            console.log(`插件 ${pluginId} 注册了事件监听器: ${event}`);
            pipe.addTrigger({
                event,
                handler: listener
            });
        },
        send: (event, data) => {
            console.log(`插件 ${pluginId} 发送了事件: ${event}`, data);
            pipe.emit(event, data);
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
                console.error(`插件 ${pluginId} 试图寻找 ${pluginId} 但未找到`);
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
            command.trigger = Array.isArray(trigger) ? trigger : [trigger];
            console.log(`插件 ${pluginId} 注册了命令: `, ...trigger);
            pluginDefine.commands.push({
                trigger,
                fn,
                description: config.description ?? ""
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
            console.error(`插件 ${pluginId} 拒绝加载: ${reason}`);
            pluginDefine.rejected = true;
        },
        logger: {
            info: (message) => {
                console.log(`插件 ${pluginId} 信息: ${message}`);
            },
            warn: (message) => {
                console.warn(`插件 ${pluginId} 警告: ${message}`);
            },
            error: (message) => {
                console.error(`插件 ${pluginId} 错误: ${message}`);
            },
            debug: (message) => {
                console.debug(`插件 ${pluginId} 调试: ${message}`);
            }
        }
    });

    return pluginDefine;
}

export default [
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
            handler: async (context) => {
                if (context.message[0].type !== 'text') {
                    return;
                }

                const msg = context.message[0].data.text;

                if (!msg.startsWith(CMD_PREFIX)) {
                    return;
                }

                const parts = msg.slice(CMD_PREFIX.length).trim().split(/\s+/);
                const pluginId = parts[0];
                const cmdName = parts[1];

                console.log("可用插件：");
                Object.entries(plugins).forEach(([pluginId, plugin]) => {
                    console.log(` - [${pluginId}]: ${plugin.instance.config.name}`);
                });

                const plugin = plugins[pluginId];
                if (!plugin) {
                    console.log(`插件 ${pluginId} 未找到`);
                    return;
                }

                console.log(`插件 ${pluginId} 已找到`);
                console.log(`可用命令：`);
                plugin.commands.forEach((command) => {
                    console.log(`  [${command.trigger.join(", ")}]: ${command.description}`);
                });
                const command = plugin.commands.find((command) => {
                    return command.trigger.includes(cmdName);
                });

                if (!command) {
                    console.log(`命令 ${cmdName} 未找到`);
                    return;
                }
                console.log(`命令 ${cmdName} 已找到`);

                command.fn(context);
            }
        }
    }
];