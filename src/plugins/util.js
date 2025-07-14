const defaultStore = {
  ops: ["1814872986"]
};

/**
 * @type {import("../types/plugins").PluginInfo}
 */
export default {
  config: {
    id: "util",
    name: "内置工具",
    description: "Util",
    author: "Sakulin",
    version: "1.0.0",
    level: "core",
    hideInHelpPage: true,
  },
  setup(api) {

    /**
     * @param {ContextHelper | Context | string} ch
     * @returns {Promise<boolean>}
     */
    async function hasPermission(ch) {
      if (typeof ch === "string" || typeof ch === "number")
        return (await api.store.get("ops", defaultStore.ops)).includes(String(ch));
      else if (ch && (typeof ch.user_id === "string" || typeof ch.user_id === "number"))
        return (await api.store.get("ops", defaultStore.ops)).includes(String(ch.user_id));
      throw new Error("Invalid context");
    }

    async function getOpList() {
      return await api.store.get("ops", defaultStore.ops);
    }

    api.cmd(["op"], async (ch, target) => {
      if (!(await hasPermission(ch))) {
        await ch.text("你没有权限执行此命令！").goAutoReply();
        return;
      }
      const ops = await api.store.get("ops", defaultStore.ops);
      if (ops.includes(target)) {
        await ch.text("用户 " + target + " 已经是管理员了！").goAutoReply();
        return;
      }
      ops.push(target);
      await api.store.set("ops", ops);
      await ch.text("已将用户 " + target + " 添加为管理员").goAutoReply();
    }, { quickCommandRegisterIgnore: true });

    api.cmd(["deop"], async (ch, target) => {
      if (!(await hasPermission(ch))) {
        await ch.text("你没有权限执行此命令！").goAutoReply();
        return;
      }
      if (target === String(ch.userId)) {
        await ch.text("你不能将自己的管理员身份移除！").goAutoReply();
        return;
      }
      let ops = await api.store.get("ops", defaultStore.ops);
      ops = ops.filter(e => e !== target);
      await api.store.set("ops", ops);
      await ch.text("已将用户 " + target + " 移除为管理员").goAutoReply();
    }, { quickCommandRegisterIgnore: true });

    api.cmd(["帮助", "?", "？", "help"], async (ch, pluginId) => {

      const plugins = api.outside.__plugins;

      function getPluginName(pluginId) {
        const plugin = plugins[pluginId];
        if (plugin) {
          return plugin.instance.config.name;
        } else {
          return pluginId;
        }
      }

      function getHideInHelpPage(pluginId) {
        const plugin = plugins[pluginId];
        return plugin ? !!plugin.instance.config.hideInHelpPage : false;
      }

      let commands = api.outside.__commands;

      if (pluginId) {
        commands = commands.filter(e => e.pluginId === pluginId);
      } else {
        commands = commands.filter(e => !getHideInHelpPage(e.pluginId));
      }

      await ch.text(`| 指令 | 别名 | 描述 | 插件 |\n| --- | --- | --- | --- |\n` + commands.map(e => {
        const res = {
          command: e.trigger[0],
          alias: e.trigger.length > 1 ? e.trigger.slice(1).join(" 或 ") : undefined,
          description: e.config.description,
          plugin: getPluginName(e.pluginId)
        };
        return `| ${res.command} | ${res.alias} | ${res.description} | ${res.plugin} |`
      }).join("\n")).goAutoReply();
    });

    api.expose({
      hasPermission,
      getOpList
    });
  },
};
