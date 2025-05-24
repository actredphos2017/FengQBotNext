// 命令 别名 描述 来自插件

const baseDoc = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>命令详细文档</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }
        .command-card {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 20px;
            margin-bottom: 20px;
            transition: box-shadow 0.3s ease;
        }
        .command-card:hover {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        .command-name {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        .command-description {
            font-size: 16px;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>帮助菜单</h1>
    <div id="command-cards">
        {{$CARDS}}
    </div>
</body>
</html>
`;

// 保存具体的描述卡片模板的变量
const cardTemplate = `
<div class="command-card">
    <div class="command-name">命令: {{$COMMAND}}</div>
    {{$ALIAS}}
    <div class="command-description">描述: {{$DESCRIPTION}}</div>
    <div class="command-description">来自插件: {{$PLUGIN}}</div>
</div>
`;

/**
 * 生成完整的 HTML 代码
 * @param {Array<{ command: string, alias: string, description: string, plugin: string }>} data - 包含命令、别名、描述和插件信息的数组
 * @returns {string} 完整的 HTML 代码
 */
export function generateDOMCode(data) {
    let cards = '';
    for (let item of data) {
        let card = cardTemplate;
        card = card.replace('{{$COMMAND}}', item.command);
        if (item.alias) {
            card = card.replace('{{$ALIAS}}', `<div class="command-description">别名: ${item.alias}</div>`);
        } else {
            card = card.replace('{{$ALIAS}}', '');
        }
        card = card.replace('{{$DESCRIPTION}}', item.description);
        card = card.replace('{{$PLUGIN}}', item.plugin);
        cards += card;
    }
    return baseDoc.replace('{{$CARDS}}', cards);
}
