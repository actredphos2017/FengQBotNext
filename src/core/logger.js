/**
 * @typedef {{
 *     info: function(...string): void,
 *     warn: function(...string): void,
 *     error: function(...string): void,
 *     debug: function(...string): void,
 *     log: function(...string): void,
 * }} Logger
 */

/**
 * @type {{
 *     instance: Logger
 * }}
 */
const _logger = {
    instance: console
};

/**
 * @param {Logger} logger
 */
export function setLogger(logger) {
    _logger.instance = logger;
}

export const logger = new Proxy(_logger, {
    get(target, prop) {
        if (prop in target.instance) {
            return target.instance[prop];
        } else {
            return (...args) => {
                target.instance.log(...args);
            };
        }
    }
});