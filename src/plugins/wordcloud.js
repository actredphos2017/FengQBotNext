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

            if (scope.isInScope(ch)) {
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
            }

            return true;

        }, { time: "onActivateFailed" });
    }
}
