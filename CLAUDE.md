# CLAUDE.md

## 项目说明

基于 obsidian-llm-shortcut 精简改造的 Obsidian 翻译插件，只做两件事：
1. 翻译选中文本（选中 → AI 翻译 → 替换）
2. 翻译全文（保留 YAML frontmatter，翻译正文）

支持多 Provider 切换（DeepSeek/OpenAI/Gemini/豆包/Kimi/千问/智谱/SiliconFlow/OpenRouter）。

## 背景

- 用户从网页/YouTube 剪藏英文内容到 Obsidian，需要翻译成中文阅读
- 之前尝试魔改 Text Generator 插件（textgenerator-zh），因功能臃肿已放弃
- 调研后选择 obsidian-llm-shortcut 作为基础，砍掉 Prompt 文件系统，只留 API 调用+流式输出

## 参考仓库

- LLM Shortcut 源码：`~/项目/参考仓库/obsidian-llm-shortcut/`（核心参考，复制 API 调用和流式输出逻辑）
- cc-switch 源码：`~/项目/参考仓库/cc-switch/`（参考 Provider 预置和管理方式）

## 技术栈

- TypeScript + esbuild 构建
- openai SDK（v6.8.1）调用 API
- Obsidian Plugin API
- 中文 UI

## 开发计划

详见 `PLAN.md`，分 7 个 Phase 实施。

## 常用命令

```bash
npm install        # 安装依赖
npm run build      # 构建
npm run dev        # 开发模式（watch）
```

## 构建产物部署

构建后将 `main.js` + `manifest.json` 复制到：
`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/.obsidian/plugins/obsidian-translate/`
