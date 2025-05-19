import axios from "axios";

/**
 * @type {import("../types/plugins").PluginDefine}
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
  },
};

export default plugin;
