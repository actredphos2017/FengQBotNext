//PLUGINX

import Segment from "segment";

const segment = new Segment();

segment.useDefault();

/**
 * 获取分词
 * @param {string} text
 * @returns {string[]}
 */
function getSegments(text) {
    return segment.doSegment(text, {
        simple: true,
        stripPunctuation: true
    });
}

/**
 * @param {string[]} arr
 * @returns {string[]}
 */
function findMostFrequent(arr) {
    const frequencyMap = {};
    let maxFrequency = 0;
    const result = [];

    // 统计每个元素的频率
    for (const num of arr) {
        frequencyMap[num] = (frequencyMap[num] || 0) + 1;
        if (frequencyMap[num] > maxFrequency) {
            maxFrequency = frequencyMap[num];
        }
    }

    // 找出所有频率等于最大频率的元素
    for (const num in frequencyMap) {
        if (frequencyMap[num] === maxFrequency) {
            result.push(num);
        }
    }

    return result;
}

/**
 * @typedef {Object} TextCloud
 * @property {string} w - 话题名
 * @property {string[]} s - 发送者
 * @property {number} t - 话题创建时间
 * @property {string} f - 第一次发起该话题的消息
 */

/**
 * @type {import("../types/plugins").PluginInfo}
 */
export default {
    config: {
        id: "wordcloud",
        name: "词云",
        description: "词云收集器",
        author: "Sakulin",
        version: "1.0.0"
    },
    setup(api) {

        const scope = api.defineGroupActionScope({
            activateCmd: "激活词云",
            deactivateCmd: "卸载词云"
        });

        api.super(async (ch) => {

            const msg = ch.pureMessage;
            if (Array.isArray(msg) && msg.length > 0 && !msg.some(e => typeof e !== "string")) {
                const store = scope.store(ch);

                /**
                 * @type {any[]}
                 */
                const record = await store.get("history", []);

                /**
                 * @type {string[]}
                 */
                const segments = ch.pureMessage.reduce((target, it) => {
                    target.push(...getSegments(it));
                    return target;
                }, []);

                segments.forEach(word => {
                    const target = record.find(e => e.w === word);
                    if (target) {
                        target.s.push(ch.userId);
                    } else {
                        record.push({
                            w: word,
                            s: [ch.userId],
                            t: Date.now(),
                            f: msg.join(" ")
                        });
                    }
                });

                await store.set("history", record);
            }

            return true;

        }, { time: "onActivateFailed" });

        api.schedule.create("0 22 * * 0", async () => {
            const bot = api.createBot();
            for (const group of await scope.groupsInScope()) {
                /**
                 * @type {TextCloud[]}
                 */
                const textClouds = group.store.get("history", []);
                const total = textClouds.reduce((target, it) => (target + it.s.length), 0);
                const view = [...textClouds].sort((a, b) => a.s.length - b.s.length).slice(0, 10).map(e => ({
                    word: e.w,
                    firstSend: {
                        sender: e.s[0],
                        time: e.t,
                        msg: e.f
                    },
                    maxSender: findMostFrequent(e.s),
                    precent: Math.round(e.s.length * 10000 / total) / 100
                }));

                await bot.openGroup(group.groupId)
                    .text([
                        "本周热词 TOP10",
                        ...(view.map((e, index) => `${index + 1}. ${e.word} ${e.precent}%`))
                    ].join("\n"))
                    .go();
            }

            await scope.clearStore();
        });
    }
}
