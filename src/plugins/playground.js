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
            return;
        }

        async function isActivated(ch) {

            return !!(ch.isGroup && (await api.store.get("groups", [])).includes(ch.groupId.toString()));


        }

        api.cmd(["激活playground"], async (ch, groupId) => {

            if (groupId === undefined) {
                if (ch.isGroup) {
                    groupId = ch.groupId.toString();
                } else {
                    ch.text("请给出群号").go();
                    return;
                }
            }

            /**
             * @type {string[]}
             */
            const groups = await api.store.get("groups", []);
            if (groups.includes(groupId)) {
                ch.text("该群已经激活了好玩的小玩意").goAutoReply();
            } else {
                groups.push(groupId);
                await api.store.set("groups", groups);
                ch.text(`群 ${groupId} 已激活好玩的小玩意`).goAutoReply();
            }
        });

        api.cmd(["解除playground"], async (ch, groupId) => {
            if (groupId === undefined) {
                if (ch.isGroup) {
                    groupId = ch.groupId.toString();
                } else {
                    ch.text("请给出群号").go();
                    return;
                }
            }

            /**
             * @type {string[]}
             */
            const groups = await api.store.get("groups", []);
            if (!groups.includes(groupId)) {
                ch.text("该群没有激活好玩的小玩意").goAutoReply();
            } else {
                groups.splice(groups.indexOf(groupId), 1);
                await api.store.set("groups", groups);
                ch.text(`群 ${groupId} 已解除好玩的小玩意`).goAutoReply();
            }
        });

        api.super(async (ch) => {
            if (await isActivated(ch)) {
                if (Math.random() < 0.008) {
                    api.outside["economy"].addMoney(ch.userId.toString(), 10);
                    ch.text("随机事件触发！获得 10 枫林大肥皂币").goAutoReply();
                }
            }
            return true;
        }, { time: "beforeActivate" });
    }
}