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
            ch.addAt();
            ch.addText("昂？");
            await ch.goAutoReply();
        });
    }
}

