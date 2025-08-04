//PLUGINX

/**
 * @type {import("../types/plugins").PluginInfo}
 */
export default {
    config: {
        id: "debugHelper",
        name: "调试助手",
        author: "Sakulin",
        version: "1.0.0",
        hideInHelpPage: true
    },
    setup(api) {
        if (!api.assert("core")) {
            api.reject("缺少core插件");
            return;
        }

        api.cmd("r", async (ch) => {
            ch.redirect(["$core", "reload"]);
        });
    }
}