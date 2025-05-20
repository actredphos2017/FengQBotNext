export function atMessageActivate(botQQId) {
    return (context) => {
        let message = undefined;

        if (context.message_type === "group") {
            if (context.message.length < 2) return undefined;
            const key = context.message[0];
            if (!(key && key.type === "at" && key.data && key.data.qq === botQQId)) {
                return undefined;
            }
            message = context.message[1];
        } else if (context.message_type === "private") {
            if (context.message.length < 1) return undefined;
            message = context.message[0];
        }

        if (message && message.type === "text" && message.data && typeof message.data.text === "string") {
            return message.data.text.trim().split(/\s+/);
        }
        return undefined;
    }
}