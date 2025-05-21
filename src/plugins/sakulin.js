//PLUGINX

import axios from "axios";
import { ApiKey as apiConfig } from "../lib/config.js";

const aiAutoReplyAssistant = `
消息是一段聊天记录，你需要扮演一名聊天群友，决定是否参加群友互动，详细信息：
- 消息中[我]开头的内容是过去的你说的话，在这里你要判断你是否需要参与群交流；
- 消息中[AT:...]是在引用（艾特）他人，其中[AT:我]是指在艾特你。

如果你觉得不需要参与群交流，请只需返回 false ，不需要返回其他内容。
如果你觉得需要参与群交流，便可回复具体的消息内容，回复的详细要求：
- 控制发言频率，如果意识到发言过于频繁，请尽可能选择不发言（返回 false）；
- 不用 Markdown 格式，使用正常文本格式，不要前缀或终止符；
- 回复内容不超过 100 字，最好在 20 字左右；
- 若需引用(艾特)某个人，使用 \"[AT:这个人的ID]\" 格式，例如：\"嘿！[AT:123456789] 你好！\"；
- 请尽量不要重复你之前说的话；
- 一次只解决一个人的问题，最好不要一次跟多个人互动；
- 优先跟靠后的消息互动。
`.trim();

const aiHardReplyAssistant = `
消息是一段聊天记录，你需要扮演一名聊天群友，决定是否参加群友互动，详细信息：
- 消息中[我]开头的内容是过去的你说的话，在这里你要判断你是否需要参与群交流；
- 消息中[AT:...]是在引用（艾特）他人，其中[AT:我]是指在艾特你。

请你回复具体的消息内容，回复的详细要求：
- 不用 Markdown 格式，使用正常文本格式，不要前缀或终止符；
- 回复内容不超过 100 字，最好在 20 字左右；
- 若需引用(艾特)某个人，使用 \"[AT:这个人的ID]\" 格式，例如：\"嘿！[AT:123456789] 你好！\"；
- 请尽量不要重复你之前说的话；
- 一次只解决一个人的问题，最好不要一次跟多个人互动；
- 优先跟靠后的消息互动。
`.trim();

const aiConfig = {
    timeRange: -1,
    maxCount: 30,
    selfQQ: "161009029"
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
        name: "红磷的工具箱",
        description: "",
        author: "Sakulin",
        version: "1.0.2"
    },
    setup(api) {

        if (!api.assert("util")) {
            api.reject("这个插件依赖 util 插件运行！");
            return;
        }

        /**
         * @param {any} config
         * @returns {Promise<string>}
         */
        async function aliyunChat(config) {
            config = {
                model: config.model ?? "qwen-plus",
                message: config.message,
                assistant: config.assistant,
                enable_thinking: config.enable_thinking ?? false,
            }

            const messages = [{
                role: "user",
                content: config.message
            }];

            if (config.assistant) {
                messages.push({
                    role: "assistant",
                    content: config.assistant
                })
            }

            const axiosRequest = {
                url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + apiConfig.aliyun_ai,
                    "Content-Type": "application/json"
                },
                data: {
                    messages,
                    model: config.model,
                    enable_thinking: config.enable_thinking
                }
            };

            api.log(axiosRequest);

            const response = await axios(axiosRequest);

            const responseContent = response.data.choices[0].message.content;

            return responseContent;
        }

        async function aiResponse(ch) {
            if (!ch.isGroup) {
                await ch.text("Emmm...不好意思哈，这个功能只能在群里可以使用哦~ >_<").go();
                return;
            }

            const content = await aliyunChat({
                message: (await getMessages(ch.groupId, 10)).replaceAll(aiConfig.selfQQ, "我"),
                assistant: aiHardReplyAssistant,
                model: "deepseek-r1"
            });

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
        }

        async function aiAutoResponse(ch) {
            if (!ch.isGroup) return true;
            if (!(await api.store.get("acitvatedGroups", [])).includes(String(ch.groupId))) return true;

            const responseContent = (await aliyunChat({
                message: (await getMessages(ch.groupId, 10)).replaceAll(aiConfig.selfQQ, "我"),
                assistant: aiAutoReplyAssistant,
                enable_thinking: true
            })).trim();

            if (responseContent.toLowerCase().indexOf("false") !== -1) {
                api.log(`[AI智能回复] 我的想法是 ${responseContent} ，因此我选择保持沉默！`);
                return true;
            } else {
                api.log("[AI智能回复] 我认为自己需要发言！");
                for (let part of responseContent.split(/(\[AT:\d+])/)) {
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
                return false;
            }
        }

        async function pushMessage(who, groupId, message) {
            if (/^\s*$/.test(message)) return;
            groupId = String(groupId);
            const messageStore = await api.store.get("message", {});
            if (!messageStore[groupId]) {
                messageStore[groupId] = [];
            }
            messageStore[groupId].push({
                message: `[${who}] ${message}`,
                timestamp: Date.now()
            });
            while (messageStore[groupId].length > aiConfig.maxCount) {
                messageStore[groupId].shift();
            }
            await api.store.set("message", messageStore);
        }

        /**
         * @returns {Promise<string>}
         */
        async function getMessages(groupId, countLimit = aiConfig.maxCount, timeRange = aiConfig.timeRange) {
            let res = ((await api.store.get("message"))[String(groupId)] ?? []);
            if (timeRange > 0) {
                 res = res.filter(e => e.timestamp > Date.now() - timeRange);
            }

            res = res.map(e => `[${timestampToDate(e.timestamp)}] ${e.message}`);
            while (res.length > countLimit) {
                res.shift();
            }
            return res.join("\n");
        }

        api.cmd(["强制说话"], aiResponse);

        api.cmd(["ai激活"], async (ch, group = undefined) => {
            const hasPermission = api.withPlugin("util", async (util) => await util.hasPermission(ch));
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
            const store = await api.store.get("acitvatedGroups", []);
            if (store.includes(groupId)) {
                await ch.text("该群聊已经激活了 AI 功能！").goAutoReply();
            } else {
                store.push(groupId);
                await api.store.set("acitvatedGroups", store);
                await ch.text(`群 ${groupId} 的 AI 功能已激活！`).goAutoReply();
            }
        });

        api.cmd(["ai禁用"], async (ch, group = undefined) => {
            const hasPermission = api.withPlugin("util", async (util) => await util.hasPermission(ch));
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
            const store = await api.store.get("acitvatedGroups", []);
            if (!store.includes(groupId)) {
                await ch.text("该群聊没有激活 AI 功能！").goAutoReply();
            } else {
                store.splice(store.indexOf(groupId), 1);
                await api.store.set("acitvatedGroups", store);
                await ch.text(`群 ${groupId} 的 AI 功能已禁用！`).goAutoReply();
            }
        });

        api.cmd(["删除历史记录"], async (ch, groupId = undefined) => {
            const hasPermission = api.withPlugin("util", async (util) => await util.hasPermission(ch));
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
            const store = await api.store.get("message", {});
            if (!store[groupId]) {
                await ch.text("该群聊没有历史记录！").goAutoReply();
            } else {
                store[groupId] = [];
                await api.store.set("message", store);
                await ch.text(`群 ${groupId} 的历史记录已删除！`).goAutoReply();
            }
        });

        api.super(async (ch) => {
            if (ch.isGroup) await pushMessage(ch.userId, ch.groupId, ch.getPureMessage(false));
            return true;
        }, { time: "beforeActivate" });

        api.super(aiAutoResponse, { time: "onActivateFailed" });
    }
}