//PLUGINX

/**
 * @type {import("../types/plugins").PluginInfo}
 */
export default {
    config: {
        id: "simple",
        name: "简易工具箱",
        description: "一个简单的JavaScript插件",
        author: "你的名字",
        version: "1.0.0",
        hideInHelpPage: true,
        disabled: true,
    },
    setup(api) {

        api.cmd(["HW"], async (ch, arg1) => {
            if (!arg1) {
                ch.text("请输入参数").goAutoReply();
                return;
            }

            ch.text(`Hello ${arg1}!`);
            await ch.goAutoReply();
        });
    }
}