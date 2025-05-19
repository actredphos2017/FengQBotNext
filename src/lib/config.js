//读取配置文件
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
async function loadConfig(file) {
    const configPath = path.join(__dirname, `../config/${file}.yml`);  // 保持源码与编译后一致
    return yaml.load(fs.readFileSync(configPath, 'utf8'));
}
export function saveConfig(file, data) {
    const configPath = path.join(__dirname, `../config/${file}.yml`);  // 保持源码与编译后一致
    fs.writeFileSync(configPath, yaml.dump(data));
}
export const Botconfig = await loadConfig('bot');
export const PermissionConfig = await loadConfig('permission');
