
function prefix(level) {
    const getCurrentTime = () => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    const levelMap = {
        'log': '日志',
        'error': '错误',
        'warn': '警告',
        'info': '信息'
    };

    return `[${levelMap[level] || '未知'}] [${getCurrentTime()}]`;
}

export default {
    log: function (...message) {
        console.log(prefix('log'), ...message);
    },
    error: function (...message) {
        console.error(prefix('error'), ...message);
    },
    warn: function (...message) {
        console.warn(prefix('warn'), ...message);
    },
    info: function (...message) {
        console.info(prefix('info'), ...message);
    }
}