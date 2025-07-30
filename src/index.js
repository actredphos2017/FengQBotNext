import { createApp } from "./core/app.js";
import napcat from "./lib/napcat.js";
import { pluginLoader } from "./middleware/pluginLoader.js";
import { atMessageActivate } from "./utils/activate.js";

import log4js from "log4js";

log4js.configure({
    appenders: {
        console: {
            type: 'console' // 控制台输出
        },
        filesave: {
            type: "file",
            filename: "logs/default",
            pattern: "yyyy-MM-dd.log",
            alwaysIncludePattern: true,
            compress: true
        }
    },
    categories: {
        default: {
            appenders: ['console', "filesave"],
            level: 'info' // 默认日志级别
        }
    }
});

const botQQId = "161009029";

const app = createApp();

app.use(pluginLoader({ activate: atMessageActivate(botQQId) }));

app.mount(napcat);
