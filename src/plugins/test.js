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
    async setup(api) {
        if (!api.assert("util")) {
            api.reject("This plugin need util plugin.");
            return;
        }
        api.cmd(["test", "ping"], (ctx) => {
            ctx.quick_action([{
                type: "text",
                data: {
                    text: "pong"
                }
            }]);
        });
    }
}