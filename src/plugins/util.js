import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "node:url";
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { generateDOMCode } from '../utils/help.js';

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

    api.cmd(["reload"], async (ch) => {
      if (!(await hasPermission(ch))) {
        await ch.text("你没有权限执行此命令！").goAutoReply();
        return;
      }
      await ch.text("正在重载插件...").goAutoReply();
      await api.send("PLUGIN_RELOAD");
      await ch.text("插件已完成重载！").goAutoReply();
    }, { quickCommandRegisterIgnore: true });

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
        await ch.text("你不能将自己移除为管理员！").goAutoReply();
        return;
      }
      const ops = await api.store.get("ops", defaultStore.ops);
      ops = ops.filter(e => e !== target);
      await api.store.set("ops", ops);
      await ch.text("已将用户 " + target + " 移除为管理员").goAutoReply();
    }, { quickCommandRegisterIgnore: true });

    api.super(async (ch) => {
      if (!(await hasPermission(ch))) {
        return true;
      }
      let text = ch.getPureMessage();
      if (!text) {
        if (ch.isGroup) {
          const file = ch.context.message.filter(e => e.type === "file");
          if (file.length > 0) {
            /**
             * @type {string}
             */
            const fileName = file[0].data.file;
            const fileDownloadUrl = file[0].data.url;
            api.log(`已收到来自用户 ${ch.userId} 的插件定义文件文件详情：`);
            api.log(`  文件名：${fileName}`);
            api.log(`  文件下载地址：${fileDownloadUrl}`);
            if (fileName.endsWith(".js")) {
              api.log(`该文件已锁定，开始下载...`);
              const response = (await axios.get(fileDownloadUrl));
              api.log("文件下载响应：", response);
              text = response.data;
            }
          }
        }
      }
      if (!text) return true;
      if (!text.startsWith("//PLUGINX")) return true;

      api.log(`已收到来自用户 ${ch.userId} 的插件安装请求，正在验证...`);

      let pluginId = undefined;

      let success = false;

      let tempFilePath;

      try {
        // 尝试将文本当作 JS 模块导入
        const tempDir = path.join(__dirname, '..', 'temp');

        // 检查临时目录是否存在，不存在则创建
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // 生成临时文件路径
        tempFilePath = path.join(tempDir, `${uuidv4()}.js`);
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
            success = true;
          } else {
            api.log('验证失败，缺少必要的配置信息或 setup 函数。');
            await ch.text(`插件验证失败，缺少必要的配置信息或 setup 函数。`).go();
          }
        } else {
          api.log('验证失败，未找到默认导出对象。');
          await ch.text(`插件验证失败，未找到默认导出对象。`).go();
        }
      } catch (error) {
        api.log('验证失败，严重模块导入功能时出错:', error);
        await ch.text(`插件验证失败，严重模块导入功能时出错: ${error}`).go();
      } finally {
        if (tempFilePath) {
          try {
            fs.unlinkSync(tempFilePath);
            api.log(`临时文件已删除: ${tempFilePath}`);
          } catch (deleteError) {
            api.log(`删除临时文件时出错: ${deleteError}`);
          }
        }
      }

      if (!success) return false;

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

    api.cmd(["帮助", "?", "？"], async (ch) => {
      /**
       * @type {{[pluginId: string]: import("../types/plugins").PluginDefine}}
       */
      const plugins = api.outside.__plugins;

      function getPluginName(pluginId) {
        const plugin = plugins[pluginId];
        if (plugin) {
          return plugin.instance.config.name;
        } else {
          return pluginId;
        }
      }

      /**
      * @type {{
      *     pluginId: string,
      *     fn: (ch: ContextHelper, ...args: string[]) => void | Promise<void>,
      *     config: import("../types/plugins").CommandConfig,
      *     trigger: string[]
      * }[]}
      */
      const commands = api.outside.__commands;

      const img = await api.outside.render.renderHtml({
        html: generateDOMCode(commands.map(e => ({
          command: e.trigger[0],
          alias: e.trigger.length > 1 ? e.trigger.slice(1).join(" 或 ") : undefined,
          description: e.config.description,
          plugin: getPluginName(e.pluginId)
        })))
      })

      await ch.image(img).goAutoReply();
    });

    api.expose({
      hasPermission,
      getOpList
    });
  },
};

export default plugin;
