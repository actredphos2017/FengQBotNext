import axios from "axios";

/**
 * @type {import("../types/plugins").PluginInfo}
 */
const plugin = {
  config: {
    id: "util",
    name: "内置工具",
    description: "Util",
    author: "Sakulin",
    version: "1.0.0",
    level: "core"
  },
  setup(api) {
    api.expose({
      http: axios
    });

    api.cmd(["reload"], async (ch) => {
      await ch.text("正在重载插件...").goAutoReply();
      await api.send("PLUGIN_RELOAD");
      await ch.text("插件已完成重载！").goAutoReply();
    }, { quickCommandRegisterIgnore: true });
  },
};

export default plugin;
