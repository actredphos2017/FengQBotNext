//读取配置文件
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
async function loadConfig(file) {
    const configPath = path.join(__dirname, `../config/${file}.yml`);
    try {
        return yaml.load(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        console.error(`Error loading config file ${file}:`, error);
        return {};
    }
}

export function saveConfig(file, data) {
    const configPath = path.join(__dirname, `../config/${file}.yml`);  // 保持源码与编译后一致
    fs.writeFileSync(configPath, yaml.dump(data));
}
export const Botconfig = await loadConfig('bot');
export const ApiKey = await loadConfig('api_key');
export const RenderConfig = await loadConfig('render');
