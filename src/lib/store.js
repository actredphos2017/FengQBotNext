import sqlite3Prototype from 'sqlite3';
const sqlite3 = sqlite3Prototype.verbose();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let db = undefined;

export function initStore() {
    const storeDbPath = path.join(__dirname, '..', 'store.db');
    if (existsSync(storeDbPath)) {
        db = new sqlite3.Database(storeDbPath);
    } else {
        logger.log('数据库 ../store.db 不存在，正在创建...');
        db = new sqlite3.Database(storeDbPath, (err) => {
            if (err) {
                logger.error('中间件初始化失败：创建数据库文件 ../store.db 时出错 ', err);
            }
        });
        db.serialize(databaseInit);
    }
}

function databaseInit() {
    db.run(`DROP TABLE IF EXISTS plugin_store`);
    db.run(`CREATE TABLE plugin_store (plugin_id VARCHAR(64) PRIMARY KEY, data TEXT default "")`);
}

/**
 * @param {string} pluginId
 * @returns {Promise<string | undefined>}
 */
export function getPluginStore(pluginId) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT data FROM plugin_store WHERE plugin_id = ?`, [pluginId], (err, row) => {
            if (err) {
                reject(err);
            } else if (row) {
                resolve(row.data);
            } else {
                resolve(undefined);
            }
        })
    })
}

/**
 * @param {string} pluginId
 * @param {string} data
 * @returns {Promise<void>}
 */
export function setPluginStore(pluginId, data) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT OR REPLACE INTO plugin_store (plugin_id, data) VALUES (?, ?)`, [pluginId, data], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        })
    })
}