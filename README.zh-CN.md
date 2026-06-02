[**English**](README.md) | 中文

# LLM Translate

> 用大语言模型翻译 Obsidian 笔记。选中翻译、全文翻译都只要一个命令或右键菜单。支持流式输出，自动保留 YAML frontmatter。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Obsidian](https://img.shields.io/badge/Obsidian-%3E%3D0.15.0-purple)](https://obsidian.md)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)](manifest.json)

> **仅限桌面端** — manifest 标注 `isDesktopOnly: true`，iOS/Android 移动端不可用。

---

## 为什么做这个

你把英文文章、YouTube 字幕剪藏到 Obsidian，想直接在编辑器里读中文——不想切换 App，不想复制粘贴。LLM Translate 只做这一件事：一条命令翻译选中文本，一条命令翻译全文，YAML frontmatter 永远不动。

---

## 功能特点

- **翻译选中文本** — 选中 → 命令面板或右键菜单 → AI 翻译并替换选中内容
- **翻译全文** — 自动保留 YAML frontmatter，只翻译正文
- **流式输出** — 译文一个字一个字实时写入编辑器
- **可中断** — 状态栏加载图标悬停后变成 ✕，点击即可取消并恢复原文
- **9 个预置服务商 + 自定义** — DeepSeek、OpenAI、Gemini、豆包、Kimi、通义千问、智谱、SiliconFlow、OpenRouter，或任意 OpenAI 兼容端点
- **命令面板快速切换服务商** — 无需打开设置
- **自定义系统提示词** — 支持 `{{targetLanguage}}` 占位符，可一键恢复默认
- **长文保护** — 超过 20000 字符弹确认框，防止误触翻译大文件

---

## 安装

### 手动安装（当前方式）

该插件**尚未上架** Obsidian 社区插件市场，请手动安装：

1. 前往 [Releases 页面](https://github.com/chenyuxiaojin/obsidian-llm-translate/releases)，下载最新版的 `main.js`、`manifest.json`、`styles.css`。
2. 在 vault 里新建目录 `<你的 vault>/.obsidian/plugins/llm-translate/`（没有就手动创建）。
3. 把三个文件放进这个目录。
4. 重启 Obsidian，进入**设置 → 第三方插件**，找到 **LLM Translate** 并启用。

> 社区插件市场上架计划中，敬请期待。

---

## 配置

1. 打开**设置 → LLM Translate**。
2. 从**添加服务商**下拉菜单里选一个预置（比如 DeepSeek）。
3. 展开刚添加的服务商，填入：
   - **API Key** — 在服务商后台生成
   - **模型名** — 已预填常用值，可按需修改
4. 如需多个服务商，继续添加，用**设为当前**按钮切换。

### 获取 API Key

| 服务商 | 注册地址 | 默认模型 |
|---|---|---|
| DeepSeek | platform.deepseek.com | `deepseek-chat` |
| OpenAI | platform.openai.com | `gpt-4o-mini` |
| Gemini | aistudio.google.com | `gemini-2.0-flash` |
| 豆包 | console.volcengine.com/ark | *(需手动填写)* |
| Kimi | platform.moonshot.cn | `moonshot-v1-8k` |
| 通义千问 | dashscope.console.aliyun.com | `qwen-turbo` |
| 智谱 | bigmodel.cn | `glm-4-flash` |
| SiliconFlow | siliconflow.cn | *(需手动填写)* |
| OpenRouter | openrouter.ai | *(需手动填写)* |

---

## 使用

### 三个命令（Cmd/Ctrl + P）

| 命令 | 适用场景 |
|---|---|
| **翻译选中文本** | 已选中文本时 |
| **翻译全文（保留 Frontmatter）** | 任何时候 |
| **切换 API 服务商** | 快速切换当前服务商 |

### 右键菜单

在编辑器里选中文本后右键，可看到**翻译选中文本**和**翻译全文（保留 Frontmatter）**两项。

### 快捷键绑定（可选）

进入**设置 → 快捷键**，搜索"LLM Translate"，给三个命令各绑一个快捷键，操作更顺滑。

---

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

可在设置页里改写提示词，`{{targetLanguage}}` 会被替换成**目标语言**设置的值（默认"中文"）。点旁边的恢复按钮可回到默认。

---

## 与同类插件对比

| | **LLM Translate**（本插件） | **Translate**（lyc8503/obsidian-translate） | **obsidian-llm-shortcut**（chernodub） |
|---|---|---|---|
| 专注翻译 | 是 | 是 | 否（通用 LLM 快捷指令） |
| 后端 | 仅 OpenAI 兼容 | 多引擎（DeepL、Google、LibreTranslate、LLM…） | OpenAI 兼容 |
| 流式输出 | 有 | 无 | 有 |
| Frontmatter 保留 | 有 | 部分 | 无 |
| 命令切换服务商 | 有 | 无（仅设置） | 无（仅设置） |
| 可中断 | 有（状态栏 ✕） | 无 | 无 |
| 关系 | — | 独立项目 | 本插件基于它改造 |

---

## 常见问题

**Q：翻译到一半能停下来吗？**  
A：可以。状态栏有转圈图标，悬停后变成 ✕，点击即可取消，原文整段恢复。

**Q：移动端（iPhone/Android）能用吗？**  
A：不能。插件 manifest 标注了 `isDesktopOnly: true`，仅支持 macOS、Windows、Linux 桌面端。

**Q：frontmatter 会被翻译吗？**  
A：不会。全文翻译只处理 `---` 分隔符之后的正文，frontmatter 原样保留。

**Q：长文会不会超出模型 context？**  
A：超过 20000 字符会先弹确认框。主流模型上下文都在 128K 以上，20000 字符远在安全范围内，但确认框能防止不小心对超大文件触发翻译全文。

**Q：翻译到一半失败了怎么办？**  
A：常见原因是 API Key 过期、余额不足、模型名拼写错误。插件会弹出带中文提示的错误框，按提示检查设置即可。

**Q：用国产模型（DeepSeek、豆包）需要翻墙吗？哪家比较便宜？**  
A：不需要。DeepSeek（`api.deepseek.com`）、豆包（火山引擎 ARK）、Kimi、通义千问、智谱、SiliconFlow 的 API 端点均可在大陆直连。OpenAI 和 Gemini 的 API 端点需要能访问境外网络。费用方面，DeepSeek `deepseek-chat` 目前是国产模型里性价比最高的选项，翻译质量也很稳定，推荐首选。

**Q：支持哪些目标语言？可以反向翻译（中文 → 英文）吗？**  
A：底层 LLM 支持的语言都可以。在设置里把**目标语言**改成任何语言名称即可，比如 `English`、`日本語`、`Français`。反向翻译（中文 → 英文）同理：把目标语言改成 `English` 就行。

**Q：可以用自托管或第三方 OpenAI 兼容端点吗？**  
A：可以。在服务商下拉菜单里选**自定义**，填入 Base URL（例如 Ollama 的 `http://localhost:11434/v1`）、API Key（如有）和模型名即可。

---

## 环境要求

- Obsidian ≥ 0.15.0
- 仅限桌面端（macOS / Windows / Linux）
- 至少一个支持服务商的 API Key

---

## 许可证

[MIT](LICENSE) — © 2026 xiaochen

---

## 致谢

基于 [obsidian-llm-shortcut](https://github.com/chernodub/obsidian-llm-shortcut)（chernodub）精简改造而来，流式输出层和 OpenAI 兼容请求适配层源自该项目。
