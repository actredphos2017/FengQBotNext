//PLUGINX

const imgSourceMap = {
    "二次元": "https://app.zichen.zone/api/acg/api.php",
    "原神": "https://t.alcy.cc/ysz",
    "三次元": "https://api.lolimi.cn/API/tup/xjj.php",
    "碧蓝档案": "https://image.anosu.top/pixiv/direct?r18=0&keyword=bluearchive",
    "碧蓝航线": "https://image.anosu.top/pixiv/direct?r18=0&keyword=azurlane",
    "明日方舟": "https://image.anosu.top/pixiv/direct?r18=0&keyword=arknights",
    "公主连接": "https://image.anosu.top/pixiv/direct?r18=0&keyword=princess",
    "东方": "https://image.anosu.top/pixiv/direct?r18=0&keyword=touhou",
    "每日一图": "https://acg.yaohud.cn/dm/acg.php"
};

const defaultSource = "二次元";

async function getImage(source = defaultSource) {
    let url = imgSourceMap[String(source)];
    if (!url) {
        if (typeof source === "string") {
            url = `https://image.anosu.top/pixiv/direct?r18=0&keyword=${source.trim()}`;
        } else {
            url = imgSourceMap[defaultSource];
        }
    }
    const response = await fetch(url);
    if (response.status >= 300 || response.status < 200) {
        throw new Error(`请求失败，状态码：${response.status}`);
    }
    return await response.blob();
}

/**
 * @type {import("../types/plugins").PluginInfo}
 */
export default {
    config: {
        id: "dailyImage",
        name: "每日一图",
        description: "整合各种图片获取功能",
        author: "Sakulin",
        version: "1.0.0"
    },
    setup(api) {

        const scope = api.defineGroupActionScope({
            activateCmd: "激活每日一图",
            deactivateCmd: "卸载每日一图"
        });

        api.cmd(["看看图"], async (ch, param = undefined) => {
            try {
                await ch.image(await getImage(param)).go();
            } catch (e) {
                await ch.text("哎呀，图片获取失败了呢...").face("dk").go();
            }
        }, {
            description: "看看图，可添加不同图源作为参数，调用方式：“看看图 [可选：关键字]”，例如发送 “看看图 原神”",
            aiExpose: true
        });

        const putDailyImage = async () => {
            const enabledGroups = await scope.groupsInScope();
            if (enabledGroups.length) {
                const bot = api.createBot();
                const image = await getImage("每日一图");
                for (const { groupId } of enabledGroups) {
                    bot.openGroup(groupId);
                    bot.text("今日的每日一图已发送，请各位群友及时查收~");
                    await bot.go();
                    bot.image(image);
                    await bot.go();
                }
            }
        };

        api.schedule.create("0 0 22 * * *", putDailyImage);
    }
}