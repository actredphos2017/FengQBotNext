//PLUGINX

/**
 * @type {import("../types/plugins").PluginInfo}
 */
export default {
    config: {
        id: "test",
        name: "测试",
        description: "Test",
        author: "Sakulin",
        version: "1.0.0",
        hideInHelpPage: true,
        disabled: true
    },
    setup(api) {
        if (!api.assert("util")) {
            api.reject("这个插件依赖于 Util 插件");
            return;
        }
        api.cmd(["test", "ping", "在？"], async (ch) => {
            await ch.at().text("你干嘛？").face("ww").goAutoReply();
        });

        api.cmd(["ContextHelper", "获取上下文小帮手"], async (ch) => {
            await ch.text(JSON.stringify(ch)).go();
        });
    }
}

