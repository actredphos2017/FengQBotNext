/**
 * @type {import("../types/plugins").PluginInfo}
 */
export default {
    config: {
        id: "test",
        name: "测试",
        description: "Test",
        author: "Sakulin",
        version: "1.0.0"
    },
    setup(api) {
        if (!api.assert("util")) {
            api.reject("这个插件依赖于 Util 插件");
            return;
        }
        api.cmd(["test", "ping"], async (ch) => {
            await ch.at().text("干嘛？").face("ww").goAutoReply();
        });
    }
}

