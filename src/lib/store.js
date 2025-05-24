import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/**
 * @type {DatabaseSync}
 */
let db = undefined;

export function initStore() {
    const storeDbPath = path.join(__dirname, '..', 'store.db');
    try {
        let flag = false;
        if (!fs.existsSync(storeDbPath)) {
            flag = true;
        }
        db = new DatabaseSync(storeDbPath);
        if (flag) {
            databaseInit();
        }
    } catch (err) {
        console.error(err);
    }
}

function databaseInit() {
    try {
        db.exec(`DROP TABLE IF EXISTS plugin_store`);
        db.exec(`CREATE TABLE plugin_store (plugin_id VARCHAR(64) PRIMARY KEY, data TEXT default "")`);
    } catch (err) {
        console.error(err);
    }
}

/**
 * @param {string} pluginId
 * @returns {Promise<string | undefined>}
 */
export function getPluginStore(pluginId) {
    try {
        const statement = db.prepare(`SELECT data FROM plugin_store WHERE plugin_id = ?`);
        const row = statement.get(pluginId);
        if (row) {
            return row.data;
        } else {
            return undefined;
        }
    } catch (err) {
        throw err;
    }
}

/**
 * @param {string} pluginId
 * @param {string} data
 * @returns {Promise<void>}
 */
export function setPluginStore(pluginId, data) {
    try {
        const statement = db.prepare(`INSERT OR REPLACE INTO plugin_store (plugin_id, data) VALUES (?, ?)`);
        statement.run(pluginId, data);
    } catch (err) {
        throw err;
    }
}