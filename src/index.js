import { createApp } from "./core/app.js";
import napcat from "./lib/napcat.js";
import plugins from "./middleware/pluginLoader.js";

const app = createApp();

app.use(plugins);

app.mount(napcat);
