# Obsidian 翻译插件开发计划

## Context

用户需要一个 Obsidian 翻译插件，用于将剪藏的英文内容（YouTube 逐字稿、网页文章、论文）翻译成中文阅读。之前尝试魔改 Text Generator 插件但发现过于臃肿已放弃。现在基于轻量的 obsidian-llm-shortcut 精简改造，只保留 API 调用+流式输出核心，砍掉 Prompt 文件系统，新增多 Provider 管理和翻译专用逻辑。

## 插件定位

**三个命令：**

1. **翻译选中文本** — 选中一段/一句/一个词 → AI 翻译 → 替换选中
2. **翻译全文** — 保留 YAML frontmatter，翻译正文部分 → 流式替换
3. **切换 API 服务商** — 命令面板快速切换当前 Provider，避免每次打开设置页

## 关键决定（2026-04-11 确认）

- **取消恢复原文**：流式开始前用 `editor.getValue()` 缓存整篇原文，用户点取消时走 `AbortError` → `editor.setValue(originalText)` 恢复。**不保留"已翻译的部分"**，整段还原。
- **Provider 快速切换**：除设置页外，注册一个命令面板命令"切换 API 服务商"，弹出 Obsidian 原生 Suggester 列出所有已配置 Provider，选中后立刻生效。
- **超长文本软警告**：全文翻译前检查正文字符数，超过 **20000 字符**弹原生 Modal 确认："正文较长（X 字符），可能消耗较多 tokens，是否继续？"。阈值写死在代码里，不做设置项。

## 项目位置

`~/项目/自己的应用/obsidian-translate/`

## 文件结构

```
obsidian-translate/
├── manifest.json                          # 插件元数据
├── package.json                           # 依赖：openai SDK
├── esbuild.ts                             # 构建配置（从 LLM Shortcut 复制）
├── tsconfig.json                          # TypeScript 配置（从 LLM Shortcut 复制）
├── config/
│   └── rename-file-esbuild-plugin.ts      # esbuild 插件（复制）
└── src/
    ├── main.ts                            # 插件入口：2 个命令 + 流式写入编辑器
    ├── settings.ts                        # 设置接口和默认值
    ├── setting-tab.ts                     # 设置页 UI（中文）
    ├── logger.ts                          # 日志（复制）
    ├── globals.d.ts                       # 类型声明（复制）
    │
    ├── providers/
    │   ├── types.ts                       # ProviderConfig, ProviderPreset 接口
    │   └── presets.ts                     # 9 个预置 Provider
    │
    ├── llm/
    │   ├── llm-client.ts                  # OpenAI SDK 流式调用（简化）
    │   └── error-handler.ts              # 错误处理（中文化）
    │
    ├── translation/
    │   ├── prompt.ts                      # 翻译系统提示词构建
    │   ├── extract-body.ts               # YAML frontmatter 分离
    │   ├── translate-selection.ts         # 选中翻译逻辑
    │   └── translate-document.ts          # 全文翻译逻辑
    │
    ├── ui/
    │   ├── loader-strategy.ts             # 加载指示器（复制）
    │   ├── loading-status/                # 加载状态 UI（复制）
    │   ├── spinner/                       # 加载动画（复制）
    │   └── user-notifications.ts          # 通知（中文化）
    │
    └── utils/
        ├── abort-error.ts                 # 中断错误（复制）
        ├── constants.ts                   # PLUGIN_NAME 等常量
        ├── next-frame.ts                  # requestAnimationFrame 封装
        ├── assertions/                    # assert-exists（复制）
        └── obsidian/
            ├── obsidian-fetch-adapter.ts  # CORS-free fetch（复制）
            ├── map-cursor-position-to-idx/ # 光标工具（复制）
            ├── map-idx-to-cursor-position/ # 索引工具（复制）
            └── trim-selection/            # 选区修剪（复制）
```

## 从 LLM Shortcut 的取舍

### 保留（复制或小改）
| 文件 | 行数 | 说明 |
|------|------|------|
| `llm/llm-client.ts` | 82 | 简化：接收预构建的 messages 而非自己拼装 |
| `ui/loader-strategy.ts` | ~80 | 原样复制，桌面/移动端加载指示 |
| `ui/loading-status/`, `ui/spinner/` | ~60 | 原样复制 |
| `utils/obsidian/obsidian-fetch-adapter.ts` | ~60 | 原样复制，解决 CORS |
| `utils/obsidian/` 下的光标/选区工具 | ~100 | 原样复制 |
| `main.ts` 中 `updateEditorContentWithResponse` | ~30 | 流式写入编辑器的核心逻辑 |

### 删除（不带入新项目）
| 文件/模块 | 说明 |
|-----------|------|
| `src/prompt/` 整个目录 | Prompt 文件系统、frontmatter 解析、macro 标记 |
| `src/ui/info-modal/` | 弹窗显示模式 |
| `src/ui/prompt-modal/` | 自定义 Prompt 输入框 |
| `main.ts` 中命令扫描逻辑 | 文件夹递归、文件监听、动态命令注册 |

### 新增
| 文件 | 说明 |
|------|------|
| `providers/presets.ts` | 9 个预置 Provider（DeepSeek/OpenAI/Gemini/豆包/Kimi/千问/智谱/SiliconFlow/OpenRouter） |
| `translation/prompt.ts` | 内置翻译提示词，支持 `{{targetLanguage}}` 变量 |
| `translation/extract-body.ts` | 分离 YAML frontmatter 和正文 |
| `translation/translate-selection.ts` | 选中翻译命令 |
| `translation/translate-document.ts` | 全文翻译命令 |
| `setting-tab.ts` | 全新设置页：Provider 管理 + 翻译设置 |

## 核心设计

### Provider 数据结构

```typescript
interface ProviderConfig {
  id: string;        // 唯一标识
  name: string;      // 显示名 "DeepSeek"
  baseUrl: string;   // "https://api.deepseek.com/v1"
  apiKey: string;    // 用户的 API Key
  model: string;     // "deepseek-chat"
}

interface PluginSettings {
  providers: ProviderConfig[];
  activeProviderId: string;
  targetLanguage: string;              // 默认 "中文"
  translationSystemPrompt: string;     // 可编辑的翻译提示词
}
```

### 预置 Provider 列表

| 名称 | Base URL | 默认模型 |
|------|----------|----------|
| DeepSeek | `https://api.deepseek.com/v1` | deepseek-chat |
| OpenAI | `https://api.openai.com/v1` | gpt-4o-mini |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | gemini-2.0-flash |
| 豆包 | `https://ark.cn-beijing.volces.com/api/v3` | （需用户填写） |
| Kimi | `https://api.moonshot.cn/v1` | moonshot-v1-8k |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | qwen-turbo |
| 智谱 | `https://open.bigmodel.cn/api/paas/v4` | glm-4-flash |
| SiliconFlow | `https://api.siliconflow.cn/v1` | （需用户填写） |
| OpenRouter | `https://openrouter.ai/api/v1` | （需用户填写） |

### 默认翻译提示词

```
你是一个专业翻译引擎。请将以下内容翻译为{{targetLanguage}}。

规则：
- 保持原文的段落结构和 Markdown 格式
- 专有名词、技术术语首次出现时保留英文原文并括号注明中文
- 不要添加解释、总结或评论，只输出翻译结果
- 保持原文的语气和风格
- 数字、URL、代码片段保持不变
```

### 设置页布局（中文 UI）

**第一部分：API 服务商**
- 已添加的 Provider 列表，每个可展开编辑（名称/URL/Key/Model）
- 当前激活的 Provider 有标记
- "添加服务商"按钮 → 下拉选预置或自定义
- "删除"按钮

**第二部分：翻译设置**
- 目标语言（文本框，默认"中文"）
- 翻译提示词（大文本框，可编辑，附"恢复默认"按钮）

### API 调用方式

用 `system` 角色（不用 `developer`），兼容所有 OpenAI 兼容 API：
```
messages: [
  { role: "system", content: "翻译提示词（targetLanguage 已替换）" },
  { role: "user", content: "要翻译的文本" }
]
```

### 全文翻译：frontmatter 处理

检测 `---` 分隔的 YAML frontmatter → 只选中正文部分 → 翻译替换 → frontmatter 不动。

### 长文本策略

不分段。3000 词 ≈ 5000 tokens，远小于主流模型 128K 上下文。一次请求 + 流式输出 + 可中断。

超过 20000 字符时弹 Modal 软警告，确认后才发请求。

## 实施步骤

### Phase 1：项目骨架
1. 创建 `~/项目/自己的应用/obsidian-translate/` 目录
2. 复制构建配置：`esbuild.ts`、`tsconfig.json`、`config/`
3. 创建 `package.json`、`manifest.json`
4. `npm install`

### Phase 2：复制工具层
5. 复制 `utils/` 下所有工具文件（fetch adapter、光标工具、abort-error 等）
6. 复制 `ui/` 下加载指示器（loader-strategy、loading-status、spinner）
7. 创建 `utils/constants.ts`、`utils/next-frame.ts`
8. 复制 `logger.ts`、`globals.d.ts`

### Phase 3：Provider 和设置
9. 创建 `providers/types.ts` 和 `providers/presets.ts`
10. 创建 `settings.ts`（接口 + 默认值）
11. 创建 `setting-tab.ts`（中文设置页）

### Phase 4：LLM 层
12. 简化复制 `llm/llm-client.ts`（接收预构建 messages）
13. 中文化 `llm/error-handler.ts`

### Phase 5：翻译逻辑
14. 创建 `translation/prompt.ts`（提示词构建）
15. 创建 `translation/extract-body.ts`（frontmatter 分离）
16. 创建 `translation/translate-selection.ts`
17. 创建 `translation/translate-document.ts`

### Phase 6：主入口
18. 创建 `main.ts`（注册 3 个命令 + 流式写入逻辑 + AbortError 时 editor.setValue 恢复）

### Phase 7：构建测试
19. `npm run build` 构建
20. 复制产物到 Obsidian 插件目录测试
21. 用之前的 YouTube 逐字稿文件实测全文翻译

## 验证方式

1. **构建通过**：`npm run build` 无错误，产出 `main.js` + `manifest.json`
2. **安装验证**：复制到 Obsidian plugins 目录，启用后设置页正常显示
3. **Provider 配置**：添加一个 Provider（如 DeepSeek），填入 Key，验证保存
4. **选中翻译测试**：选中一段英文 → 命令面板执行"翻译选中文本" → 流式输出中文替换
5. **全文翻译测试**：打开 `Planning In Claude Code Just Got a Huge Upgrade.md` → 执行"翻译全文" → frontmatter 不动，正文翻译成中文
6. **中断测试**：全文翻译中点击取消 → 恢复原文
7. **Provider 切换**：添加第二个 Provider，切换后翻译正常
