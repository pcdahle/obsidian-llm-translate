# LLM Translate

用大语言模型翻译 Obsidian 笔记。选中翻译、全文翻译都只要一个命令或右键菜单。

支持多个 OpenAI 兼容的服务商：DeepSeek、OpenAI、Gemini、豆包、Kimi、通义千问、智谱、SiliconFlow、OpenRouter，也可以自定义任意 OpenAI 兼容端点。

## 功能特点

- **翻译选中文本** — 选中一段英文 → 命令面板或右键菜单 → AI 翻译并替换选中
- **翻译全文** — 自动保留 YAML frontmatter，只翻译正文。长文（> 20000 字符）会先弹确认框
- **流式输出** — 翻译过程中实时看到译文一点点写入编辑器
- **可中断** — 状态栏有加载图标，悬停后点击即可取消，取消后整段恢复原文
- **多服务商** — 内置 9 个预置 + 自定义，可随时通过命令面板快速切换
- **自定义提示词** — 翻译用的 system 提示词可编辑，支持 `{{targetLanguage}}` 占位符

## 安装

### 方式一：Obsidian 社区插件市场（推荐）

1. 打开 **设置 → 第三方插件 → 浏览**
2. 搜索 "LLM Translate"
3. 点击 **安装**，然后 **启用**

### 方式二：手动安装

1. 下载最新的 [Release](https://github.com/chenhuajinchj/obsidian-llm-translate/releases) 里的 `main.js`、`manifest.json`、`styles.css`
2. 放到 vault 的 `.obsidian/plugins/llm-translate/` 目录里（没有就新建）
3. 重启 Obsidian，到 **设置 → 第三方插件** 启用 LLM Translate

## 配置

首次使用需要添加一个服务商并填入 API Key。

1. 打开 **设置 → LLM Translate**
2. 从 **添加服务商** 下拉菜单里选一个预置（比如 DeepSeek）
3. 展开刚添加的服务商，填入：
   - **API Key**：从服务商后台生成
   - **模型名**：默认已填常用值，可按需改
4. 如需多个服务商，继续添加，用 **设为当前** 按钮切换

### 获取 API Key

| 服务商 | 注册地址 | 推荐模型 |
|---|---|---|
| DeepSeek | platform.deepseek.com | `deepseek-chat` |
| OpenAI | platform.openai.com | `gpt-4o-mini` |
| Gemini | aistudio.google.com | `gemini-2.0-flash` |
| Kimi | platform.moonshot.cn | `moonshot-v1-8k` |
| 通义千问 | dashscope.console.aliyun.com | `qwen-turbo` |
| 智谱 | bigmodel.cn | `glm-4-flash` |

## 使用

### 三个命令（命令面板 Ctrl/Cmd + P）

- **翻译选中文本** — 选中后触发
- **翻译全文（保留 Frontmatter）** — 任何时候都可触发
- **切换 API 服务商** — 在多个服务商之间快速切换

### 右键菜单

在编辑器里选中文本后右键，会看到 **翻译选中文本** 和 **翻译全文（保留 Frontmatter）** 两项。

### 快捷键绑定（可选）

进入 **设置 → 快捷键**，搜索 "LLM Translate"，给三个命令各绑一个快捷键，用起来更顺滑。

## 自定义翻译提示词

默认提示词：

```
你是一个专业翻译引擎。请将以下内容翻译为{{targetLanguage}}。

规则：
- 保持原文的段落结构和 Markdown 格式
- 专有名词、技术术语首次出现时保留英文原文并括号注明中文
- 不要添加解释、总结或评论，只输出翻译结果
- 保持原文的语气和风格
- 数字、URL、代码片段保持不变
```

可以在设置页里改写提示词，`{{targetLanguage}}` 会被替换成 **目标语言** 设置里的值（默认 "中文"）。改完想回到默认，点旁边的恢复按钮即可。

## 常见问题

**Q：翻译一半能停下来吗？**
A：可以。桌面端状态栏会有一个转圈图标，悬停后变成 X，点击即可取消，原文会整段恢复。

**Q：长文会不会超出模型 context？**
A：超过 20000 字符会先弹确认框。主流模型上下文都在 128K 以上，20000 字符远在安全范围内，但确认框能防止你不小心对一个超大文件按了翻译全文。

**Q：frontmatter 会被翻译吗？**
A：不会。全文翻译只处理 `---` 分隔符之后的正文，frontmatter 原样保留。

**Q：为什么翻译到一半失败了？**
A：常见原因是 API Key 过期、余额不足、模型名拼写错误。插件会弹一个带中文提示的错误框，按提示检查设置即可。

## 许可证

MIT

## 致谢

基于 [obsidian-llm-shortcut](https://github.com/chernodub/obsidian-llm-shortcut) 精简改造而来，保留了它的流式输出和请求适配层。
