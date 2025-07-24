//PLUGINX

/**
 * @type {import("../types/plugins").PluginInfo}
 */
export default {
    config: {
        id: "bil",
        name: "哔哩哔哩订阅",
        description: "订阅哔哩哔哩的视频，自动发送最新视频",
        author: "Sakulin",
        version: "1.0.0",
        disabled: true
    },
    setup(api) {
        const scope = api.defineGroupActionScope({
            activateCmd: "激活哔哩哔哩订阅",
            deactivateCmd: "卸载哔哩哔哩订阅",
            defaultEnabledGroups: ["773847213"]
        });

        api.cmd(["订阅B站up主", "upup"], async (ch, upId) => {
            if (!ch.isGroup) {
                await ch.text("请在群聊中使用").go();
                return;
            }
            const originList = await scope.store(ch).get("upId", []);
            if (originList.includes(upId)) {
                await ch.text("已订阅").go();
            } else {
                await scope.store(ch).set("upId", [...originList, upId]);
                await ch.text("订阅成功").go();
            }
        });

        api.cmd(["取消订阅B站up主", "updown"], async (ch, upId) => {
            if (!ch.isGroup) {
                await ch.text("请在群聊中使用").go();
                return;
            }
            const originList = await scope.store(ch).get("upId", []);
            if (originList.includes(upId)) {
                await scope.store(ch).set("upId", originList.filter((id) => id !== upId));
                await ch.text("取消订阅成功").go();
            } else {
                await ch.text("未订阅").go();
            }
        });

        async function mainTask() {
            const bh = api.createBot();
            const groups = await scope.groupsInScope();
            for (const group of groups) {
                bh.openGroup(group.groupId);
                const upIdList = group.store ? (group.store.upId ?? []) : [];
                for (const upId of upIdList) {
                    await bh.text(upId).go();
                }
            }
        }

        api.cmd("testb", mainTask);

        // api.schedule.create("* * * * *", mainTask);

    }
}