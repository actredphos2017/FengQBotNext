const faceMap = {
    ww: 277,
    nzqk: 307,
    youl: 187,
    wx: 14,
    dk: 9
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