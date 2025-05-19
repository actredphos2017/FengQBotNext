import {NCWebsocket} from 'node-napcat-ts'
import {Botconfig as config} from './config.js'

/**
 * @type {Mountable}
 */
export default {
    async init(
        onEvent
    ) {
        console.log("初始化QQ机器人");
        const qqBotConfig = {
            protocol: config.bot.protocol,
            host: config.bot.host,
            port: config.bot.port,
            accessToken: config.bot.accessToken,
            throwPromise: config.bot.throwPromise,
            reconnection: {
                enable: config.bot.reconnection.enable,
                attempts: config.bot.reconnection.attempts,
                delay: config.bot.reconnection.delay
            }
        };
        console.log("机器人详细配置信息：");
        console.log("协议：", qqBotConfig.protocol);
        console.log("主机地址：", qqBotConfig.host);
        console.log("端口号：", qqBotConfig.port);
        console.log("访问令牌：", qqBotConfig.accessToken);
        console.log("是否抛出Promise异常：", qqBotConfig.throwPromise);
        console.log("重连配置：");
        console.log("  启用重连：", qqBotConfig.reconnection.enable);
        console.log("  重连尝试次数：", qqBotConfig.reconnection.attempts);
        console.log("  重连延迟：", qqBotConfig.reconnection.delay);
        const qqBot = new NCWebsocket(qqBotConfig);
        console.log("机器人初始化完成");
        // 打印初始化信息
        console.log("正在连接到远程QQ机器人...");
        await qqBot.connect();
        console.log("连接成功！");
        qqBot.on('message', (context) => {
            onEvent("NAPCAT_MESSAGE", context);
        });
    }
}