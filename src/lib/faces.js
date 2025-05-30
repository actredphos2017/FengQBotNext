export const faceMap = {

    ww: 277,
    "旺旺": 227,

    nzqk: 307,
    "喵喵": 307,

    youl: 187,
    "幽灵": 187,

    wx: 14,
    "微笑": 14,

    dk: 9,
    "大哭": 9,

    nkt: 262,
    "脑阔疼": 262,

    yiw: 32,
    "疑问": 32,

    doge: 179,

    xyx: 178,
    "斜眼笑": 178
}

const defaultFaceId = 14;

export function getFace(face) {
    if (typeof face === "string") {
        face = faceMap[face];
        if (face === undefined) {
            face = defaultFaceId;
        }
    }
    return { "type": "face", "data": { "id": String(face), "raw": { "faceIndex": face, "faceText": null, "faceType": 2, "packId": null, "stickerId": null, "sourceType": null, "stickerType": null, "resultId": null, "surpriseId": null, "randomType": null, "imageType": null, "pokeType": null, "spokeSummary": null, "doubleHit": null, "vaspokeId": null, "vaspokeName": null, "vaspokeMinver": null, "pokeStrength": null, "msgType": null, "faceBubbleCount": null, "oldVersionStr": null, "pokeFlag": null, "chainCount": null }, "resultId": null, "chainCount": null } }
}