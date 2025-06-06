/**
 * @typedef {{
 *     event: string,
 *     handler: (data: any) => void | Promise<void>,
 * }} EventTrigger
 */

export default {
    /**
     * 存储 EventTrigger 的数组。
     * @type {EventTrigger[]}
     */
    eventTriggers: [],

    /**
     * 为指定事件添加监听器。
     * @param {EventTrigger} trigger - 要添加的事件触发器。
     */
    addTrigger: function(trigger) {
        this.eventTriggers.push(trigger);
    },

    /**
     * 触发指定事件，并将参数传递给所有监听器。
     * @param {string} event - 要触发的事件名称。
     * @param {any} data - 传递给监听器的参数。
     */
    emit: async function (event, data) {
        for (const trigger of this.eventTriggers.filter((trigger) => (trigger.event === event))) {
            try {
                const res = trigger.handler(data);
                if (res instanceof Promise) {
                    await res.catch((error) => {
                        console.error(`执行事件 ${trigger.event} 的处理器时发生错误:`, error);
                    });
                }
            } catch (error) {
                console.error(`执行事件 ${trigger.event} 的处理器时发生错误:`, error);
            }
        }
    },

    /**
     * 移除指定事件的监听器。
     * @param {EventTrigger} trigger - 要移除的事件触发器。
     */
    removeTrigger: function(trigger) {
        this.eventTriggers = this.eventTriggers.filter((existingTrigger) => {
            return !(existingTrigger.event === trigger.event && existingTrigger.handler === trigger.handler);
        });
    }
};
