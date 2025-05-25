//PLUGINX

import axios from "axios";
import { ApiKey as apiConfig } from "../lib/config.js";


// 公共回复要求部分
const commonReplyRequirements = `
消息内容的回复详细要求：
-不用 Markdown 格式，使用正常文本格式，不要前缀或终止符；
-回复的消息内容不超过 100 字，最好在 20 字左右；
-若需引用(艾特)某个人，使用 "[AT:这个人的ID]" 格式，例如："嘿！[AT:123456789] 你好！"；
-不要频繁地引用某个人；
-不要重复你之前说的话；
-优先延续其他人的话题；
-一次只解决一个人的问题，最好不要一次跟多个人互动；
-优先跟靠后的消息互动。
`;

// 自动回复特有的部分
const autoReplySpecific = `
消息是一段聊天记录，你需要扮演一名聊天群友，决定是否参加群友互动，详细信息：
-你要自行判断是否需要参与群交流；
-消息中[AT:...]是在引用（艾特）他人，其中[AT:你]是指在艾特你。
-在返回回复对象时， reply 代表你是否参与交流，为 true 时代表参与，为 false 代表忽略。
-当你决定参与交流时， msg 字段为你作为聊天群友说的话的内容。
`;

// 强制回复特有的部分
const hardReplySpecific = `
消息是一段聊天记录，你需要扮演一名聊天群友，参加群友互动，详细信息：
-消息中[你]开头的内容是过去的你说的话，在这里你要判断你是否需要参与群交流；
-消息中[AT:...]是在引用（艾特）他人，其中[AT:你]是指在艾特你。
`;

const withInterfaceSpecific = `
作为机器人，你的开发者为你提供了许多插件接口，你可以通过这些接口来为群友们提供更多功能，你在回复消息对象时，可以按照需要调用接口，接口是可选的，你可以选择不使用插件接口。
如果你想调用接口，请在回复里包含一个 call 字段，这个字段是一个字符串，用类似 shell 运行命令一样调用所需要的插件命令。

有这些插件接口提供给你：
`

/**
 * @param {boolean} hard
 * @param {{
 *     cmd: string,
 *     description: string
 * }[]} interfaces
 * @returns {string}
 */
function cueWord(hard = false, interfaces = []) {
    let responseExamples = [{
        "msg": "你好！"
    }];
    let res = "";
    if (hard) {
        res += hardReplySpecific;
    } else {
        res += autoReplySpecific;
        const prepareExample = [];
        responseExamples.forEach((example) => {
            prepareExample.push({
                "reply": true,
                ...example
            });
        });
        prepareExample.push({
            "reply": false,
            "msg": ""
        });
        responseExamples = prepareExample;
    }
    if (interfaces.length > 0) {
        res += withInterfaceSpecific;
        interfaces.forEach((interface_) => {
            res += `\n- ${interface_.cmd}: ${interface_.description}`;
        });
        const prepareExample = [];
        responseExamples.forEach((example) => {
            prepareExample.push({
                "call": "看看图 原神",
                ...example
            });
        });
        responseExamples = prepareExample;
    }
    res += commonReplyRequirements;
    res += "\n回复对象的格式为一个 JSON 对象，注意，你只用返回一个 JSON 对象，其他什么都不用返回：\n";
    res += responseExamples.map(JSON.stringify).join("或");
    res = res.trim().replace(/\s+/g, " ");
    return res;
}

const aiConfig = {
    timeRange: 1000 * 60 * 60 * 24, // 一天
    maxCount: 30, // 最多 30 条消息
    selfQQ: "161009029" // 自己的 QQ 号
}

function timestampToDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * @type {import("../types/plugins").PluginInfo}
 */
export default {
    config: {
        id: "sakulin",
        name: "红磷的聊天机器人",
        description: "一个 AI 的聊天机器人插件，支持在群聊中自动回复和强制说话功能，可对群聊的 AI 功能进行激活、禁用操作，还能控制群聊的历史记录。",
        author: "Sakulin",
        version: "1.0.2"
    },
    setup(api) {

        if (!api.assert("util")) {
            api.reject("这个插件依赖 util 插件运行！");
            return;
        }

        async function getIntefaces(ch) {
            const interfaces = [];
            /**
             * @type {{ [key: string]: import("../types/plugins.js").PluginDefine }}
             */
            const plugins = api.outside.__plugins;
            const enabledPlugins = (await api.store.get("aiPluginInterfaces", {}))[String(ch.groupId)];
            if (!enabledPlugins) return [];
            enabledPlugins.forEach((pluginId) => {
                const targetPlugin = plugins[pluginId];
                if (!targetPlugin) {
                    api.log.warn(`插件 ${pluginId} 不存在`);
                } else {
                    targetPlugin.commands.forEach((cmd) => {
                        if (cmd.config.aiExpose) {
                            interfaces.push({
                                cmd: cmd.trigger[0],
                                description: cmd.config.description
                            });
                        }
                    });
                }
            });
            return interfaces;
        }

        /**
         * @param {any} config
         * @returns {Promise<string>}
         */
        async function chat(data) {
            data = {
                messages: data.messages,
                model: data.model ?? "deepseek-r1",
                enable_thinking: data.enable_thinking ?? true,
            }

            const axiosRequest = {
                url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + apiConfig.aliyun_ai,
                    "Content-Type": "application/json"
                },
                data
            };

            api.log(axiosRequest);

            const response = await axios(axiosRequest);

            const responseContent = response.data.choices[0].message.content;

            return responseContent;
        }

        /**
         * @param {string} question
         */
        async function aiAnswer(question) {
            return await chat({
                messages: [{
                    role: "user",
                    content: question
                }]
            });
        }

        const chatLock = {};

        async function aiResponse(ch) {
            if (!ch.isGroup) {
                await ch.text("Emmm...不好意思哈，这个功能只能在群里可以使用哦~ >_<").go();
                return;
            }

            if (chatLock[ch.groupId]) {
                return;
            }

            chatLock[ch.groupId] = true;

            try {
                const messages = await getMessages(ch.groupId);
                if (messages[messages.length - 1].role === "assistant") return true;

                const responseObjectJson = await chat({
                    messages: [...messages.map(e => ({
                        role: e.role,
                        content: e.content.replaceAll(aiConfig.selfQQ, "你")
                    })), {
                        role: "assistant",
                        content: cueWord(true, await getIntefaces(ch))
                    }]
                });
                api.log(`[AI智能回复] 我的回应是 ${responseObjectJson}`);

                const responseObject = JSON.parse(responseObjectJson);
                const content = responseObject.msg;

                for (let part of content.split(/(\[AT:\d+])/)) {
                    if (part.startsWith('[AT:') && part.endsWith(']')) {
                        const id = part.slice(4, -1);
                        try {
                            ch.at(Number(id));
                        } catch (_) {
                        }
                    } else if (part) {
                        if (/^\s*$/.test(part)) continue;
                        ch.text(part);
                    }
                }
                await ch.go();
                await pushMessage(aiConfig.selfQQ, ch.groupId, content);
                if (typeof responseObject.call === "string") {
                    await ch.redirect(responseObject.call);
                }
            } catch (e) {
                api.log.error(e);
            } finally {
                chatLock[ch.groupId] = false;
            }
        }

        async function aiAutoResponse(ch) {
            if (!ch.isGroup) return true;
            if (!(await api.store.get("aiAcitvatedGroups", [])).includes(String(ch.groupId))) return true;

            if (chatLock[ch.groupId]) {
                return true;
            }

            chatLock[ch.groupId] = true;

            try {
                const messages = await getMessages(ch.groupId);
                if (messages[messages.length - 1].role === "assistant") return true;

                const responseContent = (await chat({
                    messages: [...messages.map(e => ({
                        role: e.role,
                        content: e.content.replaceAll(aiConfig.selfQQ, "你")
                    })), {
                        role: "assistant",
                        content: cueWord(false, await getIntefaces(ch))
                    }]
                })).trim();

                api.log(`[AI智能回复] 我的回应是 ${responseContent}`);

                try {
                    /**
                     * @type {{reply: boolean, msg: string}}
                     */
                    const responseObject = JSON.parse(responseContent);
                    if (responseObject.reply === true && responseObject.msg) {
                        const content = responseObject.msg;
                        api.log("[AI智能回复] 我认为自己需要发言！");
                        for (let part of content.split(/(\[AT:\d+])/)) {
                            if (part.startsWith('[AT:') && part.endsWith(']')) {
                                const id = part.slice(4, -1);
                                try {
                                    ch.at(Number(id));
                                } catch (_) {
                                }
                            } else if (part) {
                                if (/^\s*$/.test(part)) continue;
                                ch.text(part);
                            }
                        }
                        await ch.go();
                        await pushMessage(aiConfig.selfQQ, ch.groupId, content);
                        if (typeof responseObject.call === "string") {
                            await ch.redirect(responseObject.call);
                        }
                        return false;
                    } else {
                        api.log(`[AI智能回复] 我选择保持沉默！`);
                        if (typeof responseObject.call === "string") {
                            await ch.redirect(responseObject.call);
                            return false;
                        }
                        return true;
                    }
                } catch (e) {
                    api.log(`[AI智能回复] 我选择保持沉默！`);
                    api.log.error(e);
                    return true;
                }
            } catch (e) {
                api.log.error(e);
            } finally {
                chatLock[ch.groupId] = false;
            }
        }

        async function pushMessage(who, groupId, message) {
            if (/^\s*$/.test(message)) return;
            groupId = String(groupId);
            const messageStore = await api.store.get("historyMessages", {});
            if (!messageStore[groupId]) {
                messageStore[groupId] = [];
            }
            messageStore[groupId].push({
                message,
                who,
                timestamp: Date.now()
            });
            while (messageStore[groupId].length > aiConfig.maxCount) {
                messageStore[groupId].shift();
            }
            await api.store.set("historyMessages", messageStore);
        }

        /**
         * @returns {Promise<{role: string, content: string}[]>}
         */
        async function getMessages(groupId, countLimit = aiConfig.maxCount, timeRange = aiConfig.timeRange) {
            let res = ((await api.store.get("historyMessages"))[String(groupId)] ?? []);
            if (timeRange > 0) {
                 res = res.filter(e => e.timestamp > Date.now() - timeRange);
            }

            res = res.map(e => ({
                role: (String(e.who) === aiConfig.selfQQ) ? "assistant" : "user",
                content: (String(e.who) === aiConfig.selfQQ) ? e.message : `[${e.who}] 在${timestampToDate(e.timestamp)}的时候说：${e.message}`
            }));
            while (res.length > countLimit) {
                res.shift();
            }
            return res;
        }

        api.cmd(["强制说话"], aiResponse, {
            description: "强制让机器人在群聊中说话，让她没有办法保持沉默，必须说话。",
        });

        api.cmd(["ai激活"], async (ch, group = undefined) => {
            api.outside.util.hasPermission(ch)
            const hasPermission = await api.outside.util.hasPermission(ch);
            if (!hasPermission) {
                await ch.text("你没有权限执行此命令！").goAutoReply();
                return;
            }
            if (group === undefined) {
                if (ch.isGroup) {
                    group = ch.groupId;
                } else {
                    await ch.text("请指定一个群聊！").goAutoReply();
                    return;
                }
            }
            const groupId = String(group);
            const store = await api.store.get("aiAcitvatedGroups", []);
            if (store.includes(groupId)) {
                await ch.text("该群聊已经激活了 AI 功能！").goAutoReply();
            } else {
                store.push(groupId);
                await api.store.set("aiAcitvatedGroups", store);
                await ch.text(`群 ${groupId} 的 AI 功能已激活！`).goAutoReply();
            }
        }, { description: "[管理员命令] 在一个群中激活 AI 功能，让机器人可以在群聊中参与互动。" });

        api.cmd(["ai禁用"], async (ch, group = undefined) => {
            const hasPermission = await api.outside.util.hasPermission(ch);
            if (!hasPermission) {
                await ch.text("你没有权限执行此命令！").goAutoReply();
                return;
            }
            if (group === undefined) {
                if (ch.isGroup) {
                    group = ch.groupId;
                } else {
                    await ch.text("请指定一个群聊！").goAutoReply();
                    return;
                }
            }
            const groupId = String(group);
            const store = await api.store.get("aiAcitvatedGroups", []);
            if (!store.includes(groupId)) {
                await ch.text("该群聊没有激活 AI 功能！").goAutoReply();
            } else {
                store.splice(store.indexOf(groupId), 1);
                await api.store.set("aiAcitvatedGroups", store);
                await ch.text(`群 ${groupId} 的 AI 功能已禁用！`).goAutoReply();
            }
        }, {
            description: "[管理员命令] 在一个群中禁用 AI 功能，让机器人不再参与群聊互动。",
        });

        api.cmd(["删除历史记录"], async (ch, groupId = undefined) => {
            const hasPermission = await api.outside.util.hasPermission(ch);
            if (!hasPermission) {
                await ch.text("你没有权限执行此命令！").goAutoReply();
                return;
            }
            if (groupId === undefined) {
                if (ch.isGroup) {
                    groupId = ch.groupId;
                } else {
                    await ch.text("请指定一个群聊！").goAutoReply();
                    return;
                }
            }
            const store = await api.store.get("historyMessages", {});
            if (!store[groupId]) {
                await ch.text("该群聊没有历史记录！").goAutoReply();
            } else {
                store[groupId] = [];
                await api.store.set("historyMessages", store);
                await ch.text(`群 ${groupId} 的历史记录已删除！`).goAutoReply();
            }
        }, {
            description: "[管理员命令] 删除一个群聊的历史记录，让机器人忘记之前的聊天记录。",
        });

        api.super(async (ch) => {
            if (ch.isGroup) await pushMessage(ch.userId, ch.groupId, ch.getPureMessage(false));
            return true;
        }, { time: "beforeActivate" });

        api.cmd(["ai提供插件接口"], async (ch, pluginId, groupId) => {
            if (!(await api.outside.util.hasPermission(ch))) {
                await ch.text("你没有权限执行此命令！").goAutoReply();
                return;
            }
            if (!pluginId) {
                await ch.text("请指定一个插件 ID！").goAutoReply();
                return;
            }
            if (!groupId) {
                if (ch.isGroup) {
                    groupId = String(ch.groupId);
                } else {
                    await ch.text("请指定一个群聊！").goAutoReply();
                    return;
                }
            }
            const aiPluginInterfaces = await api.store.get("aiPluginInterfaces", {});
            const target = aiPluginInterfaces[groupId] ?? [];
            if (target.includes(pluginId)) {
                await ch.text("该插件已经向 AI 暴露了接口！").goAutoReply();
                return;
            }
            target.push(pluginId);
            aiPluginInterfaces[groupId] = target;
            await api.store.set("aiPluginInterfaces", aiPluginInterfaces);
            await ch.text(`现在 AI 可以访问插件 ${pluginId} 的接口！`).goAutoReply();
        });

        api.cmd(["ai移除插件接口"], async (ch, pluginId, groupId) => {
            if (!(await api.outside.util.hasPermission(ch))) {
                await ch.text("你没有权限执行此命令！").goAutoReply();
                return;
            }
            if (!pluginId) {
                await ch.text("请指定一个插件 ID！").goAutoReply();
                return;
            }
            if (!groupId) {
                if (ch.isGroup) {
                    groupId = String(ch.groupId);
                } else {
                    await ch.text("请指定一个群聊！").goAutoReply();
                    return;
                }
            }
            const aiPluginInterfaces = await api.store.get("aiPluginInterfaces", {});
            const target = aiPluginInterfaces[groupId] ?? [];
            if (!target.includes(pluginId)) {
                await ch.text("AI 没有获得该插件的接口！").goAutoReply();
                return;
            }
            target.splice(target.indexOf(pluginId), 1);
            aiPluginInterfaces[groupId] = target;
            await api.store.set("aiPluginInterfaces", aiPluginInterfaces);
            await ch.text(`已停止向 AI 提供插件 ${pluginId} 的接口！`).goAutoReply();
        });

        api.super(aiAutoResponse, { time: "onActivateFailed" });

        api.expose({ aiAnswer });
    }
}