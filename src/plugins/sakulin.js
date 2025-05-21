//PLUGINX
import axios from "axios";
import {ApiKey as apiConfig} from "../lib/config.js";


const imgSourceMap = {
    "二次元": "https://app.zichen.zone/api/acg/api.php",
    "原神": "https://t.alcy.cc/ysz",
    "三次元": "https://api.lolimi.cn/API/tup/xjj.php",
    "碧蓝档案": "https://image.anosu.top/pixiv/direct?r18=0&keyword=bluearchive",
    "碧蓝航线": "https://image.anosu.top/pixiv/direct?r18=0&keyword=azurlane",
    "明日方舟": "https://image.anosu.top/pixiv/direct?r18=0&keyword=arknights",
    "公主连接": "https://image.anosu.top/pixiv/direct?r18=0&keyword=princess",
    "东方": "https://image.anosu.top/pixiv/direct?r18=0&keyword=touhou"
};

const defaultSource = "二次元";

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

        /**
         * @template T
         * @param {*} key
         * @param {T} defaultValue
         * @returns {Promise<T>}
         */
        async function getStore(key, defaultValue = undefined) {
            const store = await api.getStore();
            if (!store) {
                return defaultValue;
            } else {
                try {
                    const res = JSON.parse(store)[String(key)];
                    if (res) {
                        return res;
                    } else {
                        return defaultValue;
                    }
                } catch (e) {
                    return defaultValue;
                }
            }
        }

        async function setStore(key, value) {
            const store = await api.getStore();
            if (!store) {
                await api.setStore(JSON.stringify({[key]: value}));
            } else {
                try {
                    const res = JSON.parse(store);
                    if (!res) {
                        await api.setStore(JSON.stringify({[key]: value}));
                    } else {
                        res[key] = value;
                        await api.setStore(JSON.stringify(res));
                    }
                } catch (e) {
                    await api.setStore(JSON.stringify({[key]: value}));
                }
            }
        }

        api.cmd(["image", "tu", "图"], async (ch, type) => {
            const source = type ? (imgSourceMap[type] ?? imgSourceMap[defaultSource]) : imgSourceMap[defaultSource];
            try {
                const response = await fetch(source);
                if (!response.ok) {
                    ch.text(`获取时发生错误：${response.status} ${response.statusText}`);
                } else {
                    ch.image(await response.blob());
                }
            } catch (e) {
                ch.text(`获取时发生错误：${JSON.stringify(e)}`);
            } finally {
                await ch.goAutoReply();
            }
        }, {description: "看看图，可添加不同图源作为参数，例如发送 “#saku 图 原神” ，可选的图源有：" + Object.keys(imgSourceMap).map(e => ((e == defaultSource) ? (e + "（默认）") : e)).join("、")});

        api.cmd(["ai"], async (ch, ...msg) => {
            await ch.text(await aliyunChat({
                message: msg.join(" "),
                assistant: "你是一个群友，在群里聊天，回答不用 markdown，100字以内，用可爱的风格，另外说话简短一点，模仿正常的群友打字回复，回答尽量在20字以内"
            })).goAutoReply();
        });

        async function pushMessage(who, groupId, message) {
            if (/^\s*$/.test(message)) return;
            groupId = String(groupId);
            const messageStore = await getStore("message", {});
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
            await setStore("message", messageStore);
        }

        /**
         * @returns {Promise<string>}
         */
        async function getMessages(groupId, countLimit = aiConfig.maxCount, timeRange = aiConfig.timeRange) {
            let res = ((await getStore("message"))[String(groupId)] ?? []);
            if (timeRange > 0) {
                 res = res.filter(e => e.timestamp > Date.now() - timeRange);
            }

            res = res.map(e => `[${timestampToDate(e.timestamp)}] ${e.message}`);
            res = res.map(e => `[${e.timestamp}] ${e.message}`);
            while (res.length > countLimit) {
                res.shift();
            }
            return res.join("\n");
        }

        api.super(async (ch) => {
            if (ch.isGroup) await pushMessage(ch.userId, ch.groupId, ch.getPureMessage(false));
            return true;
        }, { time: "beforeActivate" });

        async function aiResponse(ch) {
            const content = await aliyunChat({
                message: await getMessages(ch.groupId),
                assistant: `你是一个群友，在群里聊天，回答不用 markdown，100字以内，用可爱的风格，另外说话简短一点，模仿正常的群友打字回复，回答尽量在20字以内；如果需要引用某个人，请使用\"[AT:这个人的ID]\"代替。例如：\"嘿！[AT:123456789]你好！\"，其中， ${aiConfig.selfQQ}  是你`,
                model: "qwen-plus"
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

        api.cmd(["强制说话"], async (ch) => {
            if (!ch.isGroup) await ch.text("Emmm...不好意思哈，这个功能只能在群里可以使用哦~ >_<").go();
            else await aiResponse(ch);
        });

        api.super(async (ch) => {
            if (!ch.isGroup) return true;
            if (!(await getStore("acitvatedGroups", [])).includes(String(ch.groupId))) return true;

            const responseContent = (await aliyunChat({
                message: await getMessages(ch.groupId, 10),
                assistant: `你是聊天群友，你只能返回 true 或 false ，不需要返回其他内容。消息是一段聊天记录，在这里你要判断你是否需要参与群交流，其中的 ${aiConfig.selfQQ} 是你，如果有人 AT 你，你大概率需要参与群交流。如果你觉得需要参与群交流，请返回 true ，否则返回 false。此外，你需要控制你的发言频率`,
            })).trim().toLowerCase();

            if (responseContent.indexOf("true") !== -1) {
                api.log("[AI] 我认为自己需要发言！");
                await aiResponse(ch);
                return false;
            }
            api.log(`[AI] 我的想法是 ${responseContent} ，因此我选择保持沉默！`);
            return true;
        }, { time: "onActivateFailed" });

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
            const store = await getStore("acitvatedGroups", []);
            if (store.includes(groupId)) {
                await ch.text("该群聊已经激活了 AI 功能！").goAutoReply();
            } else {
                store.push(groupId);
                await setStore("acitvatedGroups", store);
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
            const store = await getStore("acitvatedGroups", []);
            if (!store.includes(groupId)) {
                await ch.text("该群聊没有激活 AI 功能！").goAutoReply();
            } else {
                store.splice(store.indexOf(groupId), 1);
                await setStore("acitvatedGroups", store);
                await ch.text(`群 ${groupId} 的 AI 功能已禁用！`).goAutoReply();
            }
        });
    }
}