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

/**
 * @type {import("../types/plugins").PluginInfo}
 */
export default {
    config: {
        id: "saku",
        name: "红磷的工具箱",
        description: "看看图，可添加不同图源作为参数，例如发送 “#saku 图 原神” ，可选的图源有：" + Object.keys(imgSourceMap).map(e => ((e == defaultSource) ? (e + "（默认）") : e)).join("、"),
        author: "Sakulin",
        version: "1.0.0"
    },
    setup(api) {
        api.cmd(["image", "tu", "图"], async (ch) => {
            const source = imgSourceMap[defaultSource];
            try {
                const response = await fetch(source);
                if (!response.ok) {
                    api.logger.error(`获取时发生错误: ${response.status} ${response.statusText}`);
                    ch.addText(`获取时发生错误：${response.status} ${response.statusText}`);
                } else {
                    api.logger.log(`图片获取成功`);
                    await ch.addImage(await response.blob());
                }
            } catch (e) {
                api.logger.error(`获取时发生错误: ${JSON.stringify(e)}`);
                ch.addText(`获取时发生错误：${JSON.stringify(e)}`);
            } finally {
                await ch.go();
                api.logger.log(`图片获取结束`);
            }
        });
    }
}