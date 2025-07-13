//PLUGINX

/**
 * @type {import("../types/plugins").PluginInfo}
 */
export default {
    config: {
        id: "economy",
        name: "枫林肥皂币经济系统",
        author: "Sakulin",
        level: "functional"
    },
    setup(api) {

        async function addMoney(userId, money) {
            await setMoney(userId, (await getMoney(userId)) + money);
        }

        async function getMoney(userId) {
            const eco = await api.store.get("money", {});
            return eco[String(userId)] ?? 0;
        }

        async function spendMoney(userId, money) {
            const userMoney = await getMoney(userId);
            if (userMoney < money) {
                return false;
            }
            await setMoney(userId, userMoney - money);
            return true;
        }

        async function setMoney(userId, money) {
            const eco = await api.store.get("money", {});
            eco[String(userId)] = money;
            await api.store.set("money", eco);
        }

        api.cmd(["我有多少钱？", "我有多少钱?", "我有多少钱", "money"], async (ch) => {
            const userMoney = await getMoney(ch.userId);
            await ch.text(`你有 ${userMoney} 个枫林肥皂币`).goAutoReply();
        });

        api.cmd(["给他钱", "给她钱", "给它钱"], async (ch, ...arg) => {
            if (!(await api.outside.util.hasPermission(ch))) {
                await ch.text("我凭什么听你的？").face("ww").goAutoReply();
                return;
            }
            if (arg.length < 2) {
                await ch.text("你要给谁多少钱？我不理解").face("dk").goAutoReply();
                return;
            }

            const userId = Number(arg[0]);
            const money = Number(arg[1]);
            if (isNaN(userId) || isNaN(money)) {
                await ch.text("你要干什么？我不理解").face("dk").goAutoReply();
                return;
            }
            await setMoney(userId, (await getMoney(userId)) + money);
            await ch.text(`Ding~ 转账成功！`).at(userId).text(`你现在总共有 ${await getMoney(userId)} 个枫林肥皂币`).goAutoReply();
        });

        api.cmd(["给我钱"], async (ch, arg) => {
            if (!(await api.outside.util.hasPermission(ch))) {
                await ch.text("我凭什么听你的？").face("ww").goAutoReply();
                return;
            }

            const money = Number(arg);
            if (isNaN(money)) {
                await ch.text("你要多少？我不理解").face("dk").goAutoReply();
                return;
            }
            await setMoney(ch.userId, (await getMoney(ch.userId)) + money);
            await ch.text(`Ding~ 转账成功！你现在总共有 ${await getMoney(ch.userId)} 个枫林肥皂币`).goAutoReply();
        });

        api.expose({
            getMoney,
            spendMoney,
            addMoney
        });
    }
}