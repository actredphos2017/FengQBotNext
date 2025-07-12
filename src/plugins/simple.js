
/**
 * @type {import("../types/plugins").PluginInfo}
 */
export default {
    config: {
        id: "simple",
        name: "simple",
        description: "一个简单的JavaScript插件",
        author: "你的名字",
        version: "1.0.0",
        hideInHelpPage: true,
        disabled: true
    },
    setup: (api) => {
        if (!api.assert("util")) {
            api.reject("缺少util插件");
            return;
        }
        // 插件初始化代码
        api.log("插件已加载");


        api.schedule.create("0 50 22 * * *", async () => {
            for (const op of await api.outside.util.getOpList()) {
                api.log(`正在向用户 ${op} 发送消息`);
                await api.createBot()
                    .openPrivate(op)
                    .text(`定时任务测试：正在向管理员 ${op} 发送消息`)
                    .go();
            }
        });


        api.cmd(["test"], async (ch) => {
            ch.text("测试命令已执行");
            await ch.go();
        });
    }
}