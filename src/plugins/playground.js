//PLUGINX

/**
 * @type {import("../types/plugins").PluginInfo}
 */
export default {
    config: {
        id: "playground",
        name: "好玩的功能",
        author: "Sakulin"
    },
    setup(api) {

        if (!api.assert("economy")) {
            api.reject("缺少economy插件");
        }

        const scope = api.defineGroupActionScope();

        api.super(async (ch) => {
            if (await scope.isInScope(ch)) {
                if (Math.random() < 0.008) {
                    await api.outside["economy"].addMoney(String(ch.userId), 10);
                    await ch.text("随机事件触发！获得 10 枫林大肥皂币").goAutoReply();
                }
            }
            return true;
        }, { time: "beforeActivate" });
    }
}