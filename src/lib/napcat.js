import { NCWebsocket } from 'node-napcat-ts'
import { Botconfig as config } from './config.js'
import log4js from "log4js"

const logger = log4js.getLogger("NAPCAT");

/**
 * @type {Mountable}
 */
const obj = {
    async init(
        onEvent
    ) {
        logger.log("初始化QQ机器人");
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
        logger.log("机器人详细配置信息：");
        logger.log("协议：", qqBotConfig.protocol);
        logger.log("主机地址：", qqBotConfig.host);
        logger.log("端口号：", qqBotConfig.port);
        logger.log("访问令牌：", qqBotConfig.accessToken);
        logger.log("是否抛出Promise异常：", qqBotConfig.throwPromise);
        logger.log("重连配置：");
        logger.log("  启用重连：", qqBotConfig.reconnection.enable);
        logger.log("  重连尝试次数：", qqBotConfig.reconnection.attempts);
        logger.log("  重连延迟：", qqBotConfig.reconnection.delay);
        const qqBot = new NCWebsocket(qqBotConfig);
        logger.log("机器人初始化完成");
        // 打印初始化信息
        logger.log("正在连接到远程QQ机器人...");
        await qqBot.connect();
        logger.log("连接成功！");
        qqBot.on('message', (context) => {
            onEvent("NAPCAT_MESSAGE", { context });
        });
        obj.qqBot = qqBot;
    }
}

export default obj;