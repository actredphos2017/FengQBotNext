//PLUGINX

import axios from "axios";
import { RenderConfig as renderConfig } from "../lib/config.js";
import puppeteer from "puppeteer";


/**
 * @type {import("../types/plugins").PluginInfo}
 */
export default {
    config: {
        id: "render",
        name: "内置工具",
        description: "Util",
        level: "functional"
    },
    setup(api) {

        if (!renderConfig.browser_path) {
            api.reject("缺少浏览器路径");
            return;
        }

        async function renderHtml(config) {
            /**
             * @type {string}
            */
            let html = config.html;
            if (!html) {
                if (config.url) {
                    html = (await axios.get(config.url)).data;
                } else {
                    throw new Error("缺少 html 或 url 参数");
                }
            }

            const browser = await puppeteer.launch({
                executablePath: renderConfig.browser_path
            });
            const page = await browser.newPage();
            await page.setContent(html);
            const buffer = await page.screenshot({ type: "png" });
            await browser.close();
            return buffer;
        }

        api.cmd(["网页图片渲染测试"], async (ch) => {
            ch.image(await renderHtml({ html: "<h1>Hello World</h1>" }));
            ch.go();
        });

        api.expose({ renderHtml });
    }
}