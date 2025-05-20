import axios from "axios";
import {ApiKey as config} from "../lib/config.js";

//PLUGINX
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
    timeRange: 1000 * 60 * 30, // 30 分钟内
    maxCount: 30, // 最多 30 条消息
}

/**
 * @type {{
 *     message: {
 *         [groupId: string]: {
 *             message: string,
 *             timestamp: number
 *         }[]
 *     }
 * }}
 */
const defaultStore = {
    message: {}
};

/**
 * @type {import("../types/plugins").PluginInfo}
 */
export default {
    config: {
        id: "sakulin",
        name: "红磷的工具箱",
        description: "看看图，可添加不同图源作为参数，例如发送 “#saku 图 原神” ，可选的图源有：" + Object.keys(imgSourceMap).map(e => ((e == defaultSource) ? (e + "（默认）") : e)).join("、"),
        author: "Sakulin",
        version: "1.0.2"
    },
    setup(api) {

        async function getStore() {
            const store = await api.getStore();
            if (!store) {
                await api.setStore(JSON.stringify(defaultStore));
                return defaultStore;
            } else {
                return JSON.parse(store);
            }
        }

        async function setStore(data) {
            await api.setStore(JSON.stringify(data));
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
        });

        api.cmd(["ai"], async (ch, ...msg) => {
            const response = await axios({
                url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + config.aliyun_ai,
                    "Content-Type": "application/json"
                },
                data: {
                    "messages": [
                        {
                            "role": "user",
                            "content": msg.join(" ")
                        },
                        {
                            "role": "assistant",
                            "content": "你是一个群友，在群里聊天，回答不用 markdown，100字以内，用可爱的风格，另外说话简短一点，模仿正常的群友打字回复，回答尽量在20字以内"
                        }
                    ],
                    model: "qwen-plus",
                    enable_thinking: false
                }
            });
            // 从 response 中提取 content
            api.log(response.data);
            const content = response.data.choices[0].message.content;
            // 调用 ch.text 方法将 content 发送给用户
            ch.text(content).goAutoReply();
        });

        async function pushMessage(who, groupId, message) {
            if (/^\s*$/.test(message)) return;
            const store = await getStore();
            if (!store.message[String(groupId)]) {
                store.message[String(groupId)] = [];
            }
            store.message[groupId].push({
                message: `[${who}] ${message}`,
                timestamp: Date.now()
            });
            while (store.message[groupId].length > aiConfig.maxCount) {
                store.message[groupId].shift();
            }
            await setStore(store);
        }

        api.super(async (ch) => {
            if (ch.isGroup) await pushMessage(String(ch.userId), String(ch.groupId), ch.getPureMessage(false));
            return true;
        }, { time: "beforeActivate" });

        api.cmd(["你觉得呢", "你觉得呢？", "你怎么看", "你怎么看？", "说说话？", "说说话", "说话", "说话！"], async (ch) => {
            if (!ch.isGroup) {
                await ch.text("Emmm...不好意思哈，这个功能只能在群里可以使用哦~ >_<").go();
                return;
            }

            const ctx = ((await getStore()).message[String(ch.groupId)] ?? []).filter(e => e.timestamp > Date.now() - aiConfig.timeRange).map(e => e.message).join("\n");

            const response = await axios({
                url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + config.aliyun_ai,
                    "Content-Type": "application/json"
                },
                data: {
                    "messages": [
                        {
                            "role": "user",
                            "content": ctx
                        },
                        {
                            "role": "assistant",
                            "content": "你是一个群友，在群里聊天，回答不用 markdown，100字以内，用可爱的风格，另外说话简短一点，模仿正常的群友打字回复，回答尽量在20字以内；如果需要引用某个人，请使用\"[AT:这个人的ID]\"代替。例如：\"嘿！[AT:123456789]你好！\"，其中， 161009029 是你"
                        }
                    ],
                    model: "qwen-plus",
                    enable_thinking: false
                }
            });
            const content = response.data.choices[0].message.content;

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

            await pushMessage("你", String(ch.groupId), content);
        });
    }
}