/**
 * @type {import("../types/plugins").PluginDefine}
 */
export default {
    config: {
        id: "test",
        name: "测试",
        description: "Test",
        author: "Sakulin",
        version: "1.0.0"
    },
    async setup(api) {
        if (!api.assert("util")) {
            api.reject("This plugin need util plugin.");
            return;
        }
        api.withPlugin("util", (util) => {
            util.http("");
        });
        api.cmd({
            alias: ["test", "ping"],
            description: "测试命令",
            fn: (ctx) => {
                ctx.reply("pong");
            }
        });
    }
}