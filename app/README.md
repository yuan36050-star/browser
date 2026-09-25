# Cove

A mobile-first chat client for any LLM API — in the spirit of the Claude mobile app — that runs entirely in your browser and deploys to GitHub Pages. No server, no account: providers, keys, chats and logs live in the browser's IndexedDB.

**Highlights**

- **Chat** — streaming Markdown (tables, KaTeX math, highlighted code with copy + HTML/SVG preview), extended thinking with effort levels, edit & resend, regenerate, stop, auto titles, export to Markdown, pinned chats, search.
- **Files & images** — photos, camera, any file, paste and drag-and-drop. Images are downscaled client-side; PDFs go as documents; text/code files are inlined.
- **Providers ("suppliers")** — add as many as you want, in **Anthropic** (`/v1/messages`) or **OpenAI** (`/chat/completions`) format: Anthropic, OpenAI, OpenRouter, DeepSeek, Gemini, Ollama, cc-bridge, any proxy. Each provider has a **key pool** (failover or round-robin), custom headers, extra body JSON, model fetching and a connection test.
- **Connectors (MCP)** — remote MCP servers over Streamable HTTP or SSE, with no auth, Bearer, Basic or **OAuth** (dynamic client registration). Two modes: this browser connects (works with every provider), or **Anthropic's MCP connector** connects server-side (Anthropic providers, no CORS needed). Per-tool on/off, "trust this connector".
- **Projects** — instructions, knowledge files (text into the system prompt; images/PDFs attached), default model, their own connector set.
- **Pods** — small key-value stores shared by you and the AI. The AI can create, read, write and delete them with tools, so they work as its memory, journal or a vault. Per-pod AI access (none / use / read / write), secret pods (masked in the UI), pinned pods (included in every new chat), and `{{pod:NAME/KEY}}` references that let keys be *used* without being *shown*.
- **AI operates the app** — built-in tools for pods, projects, providers, connectors, settings, chat history, logs, a sandboxed JavaScript runner and web fetch. A Claude-Code-style permission mode (Ask / Auto reads / Auto all) with inline Allow · Always · Deny.
- **Logs** — every request (model, status, tokens, duration, errors), tool call and MCP event, plus journal entries the AI writes itself. Filter, search, export as JSON.
- **PWA** — add to the home screen; light/dark themes; English and 中文.

---

## Deploy to GitHub Pages

1. Push this repository to GitHub (the app lives in `app/`, the workflow in `.github/workflows/deploy-app.yml`).
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or run the workflow by hand from the **Actions** tab). The site appears at `https://<user>.github.io/<repo>/`.
4. On your phone, open it and use **Share → Add to Home Screen** (iOS) or **Install app** (Android).

> GitHub Pages on a *private* repository needs a paid plan. Nothing secret is in the build — keys are only ever typed into the app — so a public repo is fine.

The build uses a relative base path, so it also works on a custom domain or any static host (`npm run build`, then serve `app/dist`).

## Develop

```bash
cd app
npm install
npm run dev     # http://localhost:5173
npm run mock    # optional fake backend on http://localhost:8787 (no API key needed)
npm run build   # type-check + production build into dist/
```

`npm run mock` serves an Anthropic-format API (`http://localhost:8787`, models `mock-claude`, `mock-claude-mini`), an OpenAI-format API (`http://localhost:8787/v1`) and an MCP server (`http://localhost:8787/mcp`, tools `echo` and `pixel`). Mention "pod", "mcp", "js", "slow" or "fail" in a message to exercise tool calls and error handling.

## Connecting things

### Providers and CORS

The app calls APIs straight from the browser, so each endpoint must allow cross-origin requests:

| Endpoint | Works directly? |
|---|---|
| Anthropic API | Yes (the app sends `anthropic-dangerous-direct-browser-access`). |
| OpenAI, OpenRouter, DeepSeek, Gemini | Usually yes. |
| Your own proxy / cc-bridge / Ollama | Only if it sends CORS headers (Ollama: `OLLAMA_ORIGINS=https://<user>.github.io`). |

If an endpoint does not allow CORS, deploy the tiny proxy in [`extras/cors-proxy.js`](extras/cors-proxy.js) (a Cloudflare Worker), put its URL in **Settings › Network › CORS proxy**, and turn on **Use CORS proxy** for that provider or connector. Only use a proxy you control — it sees your keys.

### cc-bridge

Pick **cc-bridge** when adding a provider. Most Claude Code bridges speak the OpenAI format: base URL ending in `/v1`, model ids like `sonnet` / `opus` (or whatever the bridge lists — use **Fetch**). If your bridge exposes `/v1/messages`, switch the format to **Anthropic**. The bridge must be reachable from your phone (not `localhost`) over HTTPS, and it must allow CORS from your Pages origin.

### The browser MCP server in this repo

The repository root contains a Playwright browser MCP server (noVNC + `/mcp`). To use it from Cove:

1. Set `CORS_ORIGIN` on the server to your Cove origin, e.g. `CORS_ORIGIN=https://yuan36050-star.github.io` (no path). Without it, browsers are not allowed to call `/mcp`.
2. If `VNC_PASS` is set (recommended on the public internet), choose **Basic** auth in the connector and enter `user:password` (`VNC_USER` defaults to `shushu`).
3. In Cove: **Connectors → + → Browser (this repo)**, set the URL to `https://<your-host>/mcp`, tap **Test**.

### Pods and secrets

- `{{pod:keys/openai}}` works in provider API keys, connector tokens/headers/URLs and in the AI's `fetch_url` tool. The value is substituted locally; with access set to **Use**, the AI can use it but never read it.
- **Pinned** pods are snapshotted into the system prompt when a chat starts (kept stable so prompt caching keeps working).

### Permissions

- **Ask** — every tool call needs your approval.
- **Auto reads** (default) — read-only tools run freely; anything that writes asks first.
- **Auto all** — the AI runs everything without asking.

"Always" on an approval adds that tool to the always-allowed list (reset it in Settings). Network and permission settings can only be changed by you, not by the AI.

## Security notes

- Keys and chats are stored unencrypted in this browser's IndexedDB. Anyone with access to the unlocked device/browser profile can read them. Export backups **without** keys unless you keep the file safe.
- Model output is rendered as Markdown without raw HTML. HTML previews and the JavaScript tool run in sandboxed, opaque-origin iframes that cannot read the app's storage.
- MCP servers and fetched pages can contain prompt injections. Keep "Auto reads" (or "Ask") unless you trust every connector.

## Code map

```
app/
  src/lib/agent.ts            the agent loop: stream → run tools (with approvals) → loop
  src/lib/providers/          anthropic.ts (official SDK), openai.ts (fetch + SSE), key pool + logging in index.ts
  src/lib/mcp/                MCP client (Streamable HTTP / SSE), OAuth provider + redirect handling
  src/lib/tools/              built-in tools, JS sandbox, tool registry + permission check
  src/lib/store.ts, db.ts     zustand state persisted to IndexedDB
  src/lib/pods.ts             pod helpers and {{pod:…}} resolution
  src/components/, screens/   UI (chat, composer, sheets, settings screens)
  src/i18n/                   en.ts / zh.ts (zh is type-checked against en)
  dev/mock-server.mjs         offline mock backend
  extras/cors-proxy.js        optional CORS proxy (Cloudflare Worker)
```

---

## 中文说明

Cove 是一个仿 Claude 手机版体验的 API 前端，纯静态网页，部署在 GitHub Pages 上，所有数据只保存在你的浏览器里。

- **部署**：仓库 Settings → Pages → Source 选 “GitHub Actions”，推送到 `main` 后自动发布到 `https://<用户名>.github.io/<仓库名>/`。手机上用“添加到主屏幕”即可像 App 一样使用。
- **供应商**：可以随意添加，支持 Anthropic 格式和 OpenAI 格式（OpenAI、OpenRouter、DeepSeek、Ollama、cc-bridge、各种中转）。每个供应商可以放多个密钥组成密钥池，自动故障切换或轮询。
- **cc-bridge**：多数桥接是 OpenAI 格式（Base URL 以 `/v1` 结尾）；如果提供 `/v1/messages` 就切到 Anthropic 格式。桥接服务要能从手机访问（HTTPS），并允许来自你 Pages 域名的 CORS 请求。
- **连接器（MCP）**：支持 Streamable HTTP / SSE，鉴权支持 Bearer、Basic、OAuth。可以由浏览器直连（需要服务器开 CORS），或者让 Anthropic API 代为连接（无需 CORS，仅限 Anthropic 供应商）。本仓库的 browser 服务器设置环境变量 `CORS_ORIGIN=https://<用户名>.github.io` 即可被 Cove 直连；设置了 `VNC_PASS` 的话，连接器选 Basic，填 `用户名:密码`。
- **小舱（Pods）**：你和 AI 共用的小仓库，AI 能用工具自由地建、读、写、删——当它的记忆、日记或保险箱。可以按舱设置 AI 权限（不可见 / 仅使用 / 只读 / 读写）、保密、置顶（新对话自动带上）。`{{pod:名称/键}}` 引用可以让 AI 使用密钥而看不到内容。
- **AI 参与**：内置工具让 AI 直接管理小舱、项目、供应商、连接器、设置、历史对话和日志，还能跑沙盒 JavaScript、发网页请求。权限模式：每次询问 / 只读自动 / 全部自动。
- **日志**：记录每次请求（模型、状态、token、耗时、错误）、工具调用、MCP 事件，以及 AI 自己写的日记；可筛选、搜索、导出。
- **本地开发**：`cd app && npm install && npm run dev`；`npm run mock` 启动不需要密钥的模拟后端。
