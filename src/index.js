import { createApp } from "./core/app.js";
import napcat from "./lib/napcat.js";
import { pluginLoader } from "./middleware/pluginLoader.js";
import { atMessageActivate } from "./utils/activate.js";
import myLogger from "./utils/myLogger.js";

const botQQId = "161009029";

const app = createApp();

app.logger(myLogger);

app.use(pluginLoader({activate: atMessageActivate(botQQId)}));

app.mount(napcat);
