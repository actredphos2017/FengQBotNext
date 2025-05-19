import pipe from "./pipe.js";

/**
 * @typedef {{
 *     instance: {middlewares: {[key: import("./middleware.js").MiddlewareLifecycleId]: ((base: any)=>(any))[]}},
 *     middleware: (mw: (import("./middleware.js").Middleware) | import("./middleware.js").Middleware[]) => AppInstance,
 *     mount: (obj: Mountable) => Promise<AppInstance>;
 *     trigger: (trigger: import("./pipe.js").EventTrigger) => AppInstance;
 *     use: (items: any) => AppInstance;
 * }} AppInstance
 */

/**
 * @returns {AppInstance}
 */
function createApp() {
    /**
     * @type {AppInstance}
     */
    const app = {
        instance: {
            middlewares: {},
            triggers: [],
            target: null
        },
        use(items) {
            if (Array.isArray(items)) {
                for (const item of items) {
                    if (item.type === "middleware") {
                        this.middleware(item.value);
                    } else if (item.type === "trigger") {
                        this.trigger(item.value);
                    }
                }
            }
        },
        trigger(trigger) {
            this.instance.triggers.push(trigger);
            return this;
        },
        middleware(mw) {
            if (!Array.isArray(mw)) {
                mw = [mw];
            }
            for (const item of mw) {
                if (typeof item.handler !== "function") {
                    throw new Error("Middleware handler must be a function");
                }
                if (!this.instance.middlewares[item.lifecycleId]) {
                    this.instance.middlewares[item.lifecycleId] = [];
                }
                this.instance.middlewares[item.lifecycleId].push(item.handler);
            }
            return this;
        },
        async mount(obj) {

            const middlewareCount = Object.values(this.instance.middlewares).reduce((sum, handlers) => sum + handlers.length, 0);
            console.log(`已启用的中间件 ${middlewareCount} 个`);
            const triggerCount = this.instance.triggers.length;
            for (const trigger of this.instance.triggers) {
                pipe.addTrigger(trigger);
            }
            console.log(`已启用的触发器 ${triggerCount} 个`);

            this.instance.target = obj;

            if (Array.isArray(this.instance.middlewares.beforeInit)) {
                for (const item of this.instance.middlewares.beforeInit) {
                    if (typeof item === "function") {
                        obj = item(obj);
                    }
                }
            }

            console.log(`开始挂载实例...`);

            await obj.init(async (flag, data) => {

                let eventData = { flag, data };

                if (Array.isArray(this.instance.middlewares.beforeEvent)) {
                    for (const item of this.instance.middlewares.beforeEvent) {
                        if (typeof item === "function") {
                            eventData = item(eventData);
                        }
                    }
                }

                pipe.emit(eventData.flag, eventData.data);

                if (Array.isArray(this.instance.middlewares.afterEvent)) {
                    for (const item of this.instance.middlewares.afterEvent) {
                        if (typeof item === "function") {
                            eventData = item(eventData);
                        }
                    }
                }
            });

            if (Array.isArray(this.instance.middlewares.afterInit)) {
                for (const item of this.instance.middlewares.afterInit) {
                    if (typeof item === "function") {
                        obj = item(obj);
                    }
                }
            }

            return this;
        }
    };
    console.log("App 实例已完成创建");
    return app;
}

export { createApp };
