/**
 * @typedef {
 *     "beforeInit" | "afterInit" | "beforeEvent" | "afterEvent"
 * } MiddlewareLifecycleId
 */


/**
 * @typedef {{
 *     lifecycleId: MiddlewareLifecycleId,
 *     handler: function(any): any
 * }} Middleware
 */

/**
 * @param {MiddlewareLifecycleId} lifecycleId 生命周期
 * @param {function(any): any} handler 中间件
 * @returns {Middleware}
 */
function defineMiddleware(lifecycleId, handler) {
    return {
        lifecycleId,
        handler
    };
}

export {
    defineMiddleware
};