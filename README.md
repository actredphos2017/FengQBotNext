# 插件文档

最简单的插件示范：

```js
//PLUGINX <- 这是插件识别前缀，用于识别和自动安装（必要）

export default {
	config: {
		id: "temp", // 你的插件 ID ，全局唯一标识（必要）
		name: "测试名称", // 你的插件名称（必要）
		author: "Sakulin" // 作者（必要）
	},
	setup() {
		// 插件初始化函数（必要）
	}
}
```

`config.id` 、 `config.name` 、 `config.author` 、 `setup` 这四个字段是必要字段，必须提供，否则机器人会拒绝安装。

直接将这段代码文件复制到机器人的私聊（如果代码不长、可以发送的话）进行安装，也可以将 js 代码文件上传到包含机器人的群聊进行安装。

## 插件 API

`PluginAPI` 是一个功能丰富的插件 API ，你能够通过它来实现很多功能。

你可以通过以下方式拿到 `PluginAPI` ：

```js
//PLUGINX

export default {
	config: { /* ... */ },
	setup(api) { // 通过 setup 函数的第一个参数来获取 PluginAPI
		api.log("Hello World!");
	}
}
```

## 快速开始

在 setup 函数中，你可以使用 `api.cmd(string[], function)` 来定义命令。

```js
//PLUGINX

export default {
	config: { /* ... */ },
	setup(api) {

		async function testCmd(ch, ...args) {
			// 这里是你的命令代码
		}

		// 定义命令
		api.cmd(["测试命令"], testCmd);
	}
}
```

这样以来，你就可以通过通过以下方式调用命令：
- **私聊** 通过给机器人发送 `测试命令` 来调用命令。
- **群聊** 通过给在群内发送 `@机器人 测试命令` 来调用命令。

你可以借助 `ch` 参数（`ContextHelper`）实现模拟机器人行为来生成回复，例如：

```js
// 正常调用
async function testCmd(ch) {

	ch.text("你好！"); // 输入文本 “你好”

	ch.face("ww"); // 输入表情 “汪汪”（狗头）

	await ch.go(); // 发送消息
}

// 链式调用
async function testCmd(ch) {
	await ch.text("你好！").face("ww").go();
}
```

你也可以在一次命令中发送多条信息。

```js

ch.text("你好，这是第一条信息");

await ch.go(); // 执行后，虚拟输入框会清空

ch.text("你好，这是第二条信息");

await ch.go();

```

### `ContextHelper` 的高级功能

你可以通过 `ch.userId` 或 `ch.user_id` 来获取发送这个命令的用户 QQ 号。

```js
await ch.text(`你好，${ch.userId}`).go();

// 注意，ch.userId 和 ch.user_id 得到的QQ号是一个数字，而不是字符串。
```

你可以通过 `ch.isGroup` 来获取当前的上下文类型。

```js
if (ch.isGroup) {

	/* 群聊逻辑 */

} else {

	/* 私聊逻辑 */

}
```

当处于群聊时，你可以通过 `ch.groupId` 或 `ch.group_id` 来获取当前群聊的群号。

```js
if (ch.isGroup) {

	const groupId = ch.groupId;

	/* 其他逻辑 */

}
```

处于群聊时，你可以通过 `ch.at()` 来艾特其他人，或者使用 `ch.reply()` 来回复信息。

```js
// 群聊环境

ch.reply();

ch.at(); // 不提供参数时，会艾特发送者

// ch.at(123456789); 提供QQ号时，会艾特指定的QQ号（如果在群里）

ch.text("你好，这是一条艾特消息");

await ch.go(); // 回复: @发送者 你好，这是一条艾特消息
```

你可以使用完成封装的 `ch.goAutoReply()` 来自动回复信息。

```js
await ch.text("你好！").goAutoReply();

// 群聊环境： 回复: @发送者 你好！
// 私聊环境： 你好！
```

### 使用 Napcat 模块

你可以通过 `ch.context` 来获取 Napcat 提供的原始上下文对象；使用 `ch.napcat` 获取 `NCWebsocket` 对象，以此实现更多功能。

## 高级功能

### 持久化存储

`PluginAPI` 提供了 `api.store` 对象来实现持久化存储。

```js
const store = api.store;

const data = await store.get("data", {}); // 获取数据，第二个参数为默认值，如果不存在则返回默认值。

await store.set("data", { key: "value" }); // 设置数据。
```

> 需要注意，底层存储方式为 Node 原生 JSON ，所以你需要保证存储的数据能够通过 `JSON.stringify` 方法序列化，并通过 `JSON.parse` 反序列化。

### 组件成员暴露与访问

`PluginAPI` 提供了 `api.expose` 方法来暴露组件成员。

```js
//PLUGINX

export default {
	config: { /* ... */ },
	setup(api) {

		function myMethod() {
			// 实现一些独有功能
		}

		api.expose({ myMethod }); // 暴露组件成员
	}
}
```

通过 `api.withPlugin` 方法可以访问其他插件的组件成员。

```js
//PLUGINX

export default {
	config: { /* ... */ },
	setup(api) {
		async function myCmd(ch) {
			const hasPermission = await api.withPlugin("util", async (util) => {
				return await util.hasPermission(ch.userId);
			});

			/* ... */
		}

		// [警告]请不要像下面这样做！
		let util;
		await api.withPlugin("util", async (u) => {
			util = u;
		});
		// 为什么：如 util 插件更新，你手上的 util 对象可能指向已经被删除的对象。
	}
}
```

如果你的插件强依赖于其他插件，可运行 `api.assert` 方法来确保其他插件已安装，也可以用 `api.reject` 方法来在合适的时间阻止自己的安装。

```js
//PLUGINX

export default {
	config: { /* ... */ },
	setup(api) {
		if (!api.assert("util")) {
			api.reject("本插件依赖于 Util 插件运行"); // 阻止自己的安装
			return;
		}

		/* ... */
	}
}
```

需要注意的时，如果你强依赖于其他插件，必须保证你的插件在其他插件之后安装。

通过设置 `config` 的可选参数 `level` 来控制插件安装顺序，插件加载器的具体加载顺序如下：

![doc_img/level.png](doc_img/level.png)

例如：对于下面两个插件

```js
//PLUGINX

export default {
	config: {
		id: "a",
		name: "插件 A",
		author: "Sakulin",
		level: "functional" // functional 对应值 150
	},
	setup(api) {
		api.log("加载插件 A！");
		api.log(api.assert("b"));
	}
}
```

```js
//PLUGINX

export default {
	config: {
		id: "b",
		name: "插件 B",
		author: "Sakulin",
		level: 120 // 显式定义插件等级
	},
	setup(api) {
		api.log("加载插件 B！");
		api.log(api.assert("a"));
	}
}
```

插件 B 会在插件 A 之后加载，输出如下：

```
加载插件 A！
false
加载插件 B！
true
```

