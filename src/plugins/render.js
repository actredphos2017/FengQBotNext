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

        async function renderHtml(config) {
            /**
             * @type {string}
             */
            let html = config.html;
            if (!html) {
                if (config.url) {
                    api.log(`正在获取 ${config.url} 的内容`);
                    html = (await axios.get(config.url)).data;
                } else {
                    throw new Error("缺少 html 或 url 参数");
                }
            }

            const browser = await puppeteer.launch({
                executablePath: renderConfig.browser_path ?? undefined,
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(html);
            const bodyheight = await page.evaluate(() => document.body.scrollHeight);
            await page.setViewport({ width: 800, height: bodyheight });
            if (config.delay) {
                await new Promise(resolve => setTimeout(resolve, config.delay));
            }
            const buffer = await page.screenshot({ type: "png", omitBackground: true });
            await browser.close();
            return buffer;
        }

        api.cmd(["网页图片渲染测试"], async (ch) => {
            ch.image(await renderHtml({ html: "<h1>Hello World</h1>" }));
            await ch.go();
        });

        api.expose({ renderHtml });
    }
}