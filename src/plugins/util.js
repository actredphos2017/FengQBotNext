import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "node:url";
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultStore = {
  ops: ["1814872986"]
};

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

    async function getStore() {
      const store = await api.getStore();
      if (!store) {
        return defaultStore;
      }
      return JSON.parse(store);
    }

    async function setStore(data) {
      await api.setStore(JSON.stringify(data));
    }

    /**
     * @param {ContextHelper | Context | string} ch
     * @returns {Promise<boolean>}
     */
    async function hasPermission(ch) {
      if (typeof ch === "string" || typeof ch === "number")
        return (await getStore()).ops.includes(String(ch));
      else if (ch && (typeof ch.user_id === "string" || typeof ch.user_id === "number"))
        return (await getStore()).ops.includes(String(ch.user_id));
      throw new Error("Invalid context");
    }

    api.cmd(["reload"], async (ch) => {
      if (!(await hasPermission(ch))) {
        ch.text("你没有权限执行此命令！").goAutoReply();
        return;
      }
      await ch.text("正在重载插件...").goAutoReply();
      await api.send("PLUGIN_RELOAD");
      await ch.text("插件已完成重载！").goAutoReply();
    }, { quickCommandRegisterIgnore: true });

    api.cmd(["op"], async (ch, target) => {
      if (!(await hasPermission(ch))) {
        ch.text("你没有权限执行此命令！").goAutoReply();
        return;
      }
      const store = await getStore();
      if (store.ops.includes(target)) {
        ch.text("用户 " + target + " 已经是管理员了！").goAutoReply();
        return;
      }
      store.ops.push(target);
      await setStore(store);
      ch.text("已将用户 " + target + " 添加为管理员").goAutoReply();
    }, { quickCommandRegisterIgnore: true });

    api.cmd(["deop"], async (ch, target) => {
      if (!(await hasPermission(ch))) {
        ch.text("你没有权限执行此命令！").goAutoReply();
        return;
      }
      if (target === ch.userId) {
        ch.text("你不能将自己移除为管理员！").goAutoReply();
        return;
      }
      const store = await getStore();
      store.ops = store.ops.filter(e => e !== target);
      await setStore(store);
      ch.text("已将用户 " + target + " 移除为管理员").goAutoReply();
    }, { quickCommandRegisterIgnore: true });

    api.super(async (ch) => {
      if (!(await hasPermission(ch))) {
        return true;
      }
      let text = ch.getPureMessage();
      if (!text) {
        if (ch.isGroup) {
          const file = ch.context.message.filter(e => e.type === "file");
          if (file.length > 0 && file[0].data && file[0].data.file.endsWith(".js") && file[0].data.url) {
            text = (await axios.get(file[0].data.url)).data;
          }
        }
      }
      if (!text) return true;
      if (!text.startsWith("//PLUGINX\n")) return true;

      api.log(`已收到来自用户 ${ch.userId} 的插件安装请求，正在验证...`);

      let pluginId = undefined;

      try {
        // 尝试将文本当作 JS 模块导入
        const tempFilePath = path.join(tmpdir(), `${uuidv4()}.js`);
        api.log(`插件临时文件已创建在 ${tempFilePath}`);
        fs.writeFileSync(tempFilePath, text);
        const importedModule = await import(`file://${tempFilePath}`);

        // 获取默认导出对象
        const defaultExport = importedModule.default;

        if (defaultExport) {
          const { config, setup } = defaultExport;
          if (config && typeof config.id === 'string' && typeof config.name === 'string' && typeof config.author === 'string' && typeof setup === 'function') {
            api.log('验证通过，配置信息如下：');
            api.log('ID:', config.id);
            api.log('名称:', config.name);
            api.log('作者:', config.author);
            pluginId = config.id;
          } else {
            api.log('验证失败，缺少必要的配置信息或 setup 函数。');
            await ch.text(`插件验证失败，缺少必要的配置信息或 setup 函数。`).go();
            return false;
          }
        } else {
          api.log('验证失败，未找到默认导出对象。');
          await ch.text(`插件验证失败，未找到默认导出对象。`).go();
          return false;
        }
      } catch (error) {
        api.log('验证失败，严重模块导入功能时出错:', error);
        await ch.text(`插件验证失败，严重模块导入功能时出错: ${error}`).go();
        return false;
      }

      try {
        const filePath = path.join(__dirname, `${pluginId}.js`);
        fs.writeFileSync(filePath, text);
        api.log(`已成功创建文件: ${filePath}`);
      } catch (fileError) {
        api.log(`创建文件时出错: ${fileError}`);
        await ch.text(`保存插件文件时出错: ${fileError}`).go();
        return false;
      }
      await ch.text(`插件 ${pluginId} 已完成安装`).go();
      await api.send("PLUGIN_RELOAD");
      await ch.text("插件列表已完成重载！").go();
      return false;

    }, { time: "beforeActivate" });
    
    api.expose({
      hasPermission
    });
  },
};

export default plugin;
