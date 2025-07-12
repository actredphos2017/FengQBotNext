import fs from 'fs';


/**
 * 将本地文件转换为 Base64 编码
 * @param {string} filePath - 本地文件的绝对路径
 * @returns {Promise<string>} - 返回文件的 Base64 编码
 */
export function fileToBase64(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data.toString('base64'));
            }
        });
    });
}

