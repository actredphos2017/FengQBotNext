
/**
 * @param {string} botQQId
 * @returns {((context: Context) => (string[] | undefined))}
 */
export function atMessageActivate(botQQId) {
    return (context) => {
        let message = undefined;

        if (context.message_type === "group") {
            if (context.message.length < 2) return undefined;
            const key = context.message[0];
            if (!(key && key.type === "at" && key.data && key.data.qq === botQQId)) {
                return undefined;
            }
            message = context.message.slice(1);
        } else if (context.message_type === "private") {
            if (context.message.length < 1) return undefined;
            message = context.message;
        }

        const parts = [];

        message.forEach((msg) => {
            if (msg.type === "text") {
                parts.push(...msg.data.text.trim().split(/\s+/));
            } else if (msg.type === "at") {
                parts.push(msg.data.qq);
            }
        });
        if (parts.length === 0) return undefined;
        return parts;
    }
}

