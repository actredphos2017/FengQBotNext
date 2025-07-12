
const host = "localhost"
const port = 24357


/**
 * @typedef {Object} Relatedlist
 * @property {string} id - 相关项ID
 * @property {string} author - 作者
 * @property {string} name - 名称
 * @property {string} image - 图片路径
 */

/**
 * @typedef {Object} Detail
 * @property {string} save_path - 保存路径
 * @property {boolean} exists - 是否存在
 * @property {boolean} skip - 是否跳过
 * @property {string} album_id - 专辑ID
 * @property {string} scramble_id - 加密ID
 * @property {string} name - 名称
 * @property {number} page_count - 页面数量
 * @property {string} pub_date - 发布日期
 * @property {string} update_date - 更新日期
 * @property {string} likes - 点赞数
 * @property {string} views - 浏览量
 * @property {number} comment_count - 评论数量
 * @property {string[]} works - 作品列表
 * @property {any[]} actors - 演员列表
 * @property {string[]} tags - 标签列表
 * @property {string[]} authors - 作者列表
 * @property {(number|string)[][]} episode_list - 剧集列表
 * @property {Relatedlist[]} related_list - 相关项列表
 */

/**
 * @typedef {Object} ResponseTarget
 * @property {boolean} success - 请求是否成功
 * @property {string} msg - 请求信息
 * @property {Detail} detail - 详细信息
 * @property {string[]} pdf - PDF文件路径列表
 */


/**
 * @type {import("../types/plugins").PluginInfo}
 */
export default {
    config: {
        id: "jmc",
        name: "禁漫天堂 API",
        author: "Anonymous",
        version: "1.0.0",
    },
    setup(api) {
        if (!api.assert("util")) {
            api.reject("缺少util插件");
            return;
        }

        api.cmd(["jm", "jmc", "禁漫", "禁漫天堂"], async (ch, id, episode) => {

            if (!id) {
                await ch.text("你没告诉我门牌号，我怎么帮你找？").face("疑问").goAutoReply();
                return;
            }

            /**
             * @type {ResponseTarget}
             */
            const target = await new Promise((resolve) => {
                const ws = new WebSocket(`ws://${host}:${port}`);

                ws.onopen = () => {
                    ws.send(JSON.stringify({ id }));
                }

                ws.onmessage = (res) => {
                    const responseData = JSON.parse(res.data)
                    if (responseData["SIGNAL"] === "RESPONSE") {
                        ws.close(1000);
                        resolve(responseData);
                    }
                }
            }).catch(e => {
                console.log(e);
                return void 0;
            });

            if (!target) {
                await ch.text("好像发生了点异常？能联系开发者看看发生什么了吗").face("幽灵").goAutoReply();
                return;
            }

            if (target.success) {
                if (target.pdf.length) {

                    /**
                     * @type {number}
                     */
                    let numberEpisode;
                    if (target.pdf.length > 1) {
                        if (episode === undefined) {
                            const tipCmd = ch.isGroup ? `@机器人 jm ${id} [章节号]` : `jm ${id} [章节号]`;

                            await ch.text("你想看的这部作品貌似不止一章呢，不过没关系，我帮你保存好了")
                                .face("旺旺")
                                .text(`\n现在暂时只发你第一章，如果你想要看其他章节，可以输入 ${tipCmd} 看其他章节哦~`)
                                .goAutoReply();
                            numberEpisode = 1;
                        } else {
                            numberEpisode = Number(episode);
                        }
                    } else {
                        if (episode === undefined) {
                            numberEpisode = 1;
                        } else {
                            await ch.text(`你想看第 ${episode} 章？可是这部作品只有一章`).face("幽灵").goAutoReply();
                            return;
                        }
                    }

                    --numberEpisode;
                    if (Number.isNaN(numberEpisode) || numberEpisode < 0 || numberEpisode >= target.pdf.length) {
                        await ch.text("你想看第几章？我没明白").face("幽灵").goAutoReply();
                    } else {
                        const filename = `${target.detail.episode_list[numberEpisode][2]}.pdf`;
                        await ch.file(target.pdf[numberEpisode], filename).go();
                    }
                } else {
                    await ch.text("找到是找到了，但是不知道为啥是空的").face("大哭").goAutoReply();
                }
            } else {
                await ch.text("寻找时发生异常：" + target.msg).goAutoReply();
            }

        }, {
            description: "你在期待什么？"
        });
    }
}