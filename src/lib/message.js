
function createTextMessage(text) {
    return {
        type: "text",
        data: {
            text: text,
        }
    };
}

function createImageMessage(base64Data) {
    return {
        type: "image",
        data: {
            file: base64Data.startsWith('base64://') ? base64Data : `base64://${base64Data}`
        }
    };
}

