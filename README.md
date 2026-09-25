# browser

Two things live in this repository:

| Path | What it is |
|---|---|
| `/` (Dockerfile, `main.py`, `nginx.conf`, `start.sh`) | A Playwright browser exposed as an MCP server at `/mcp`, with noVNC at `/` for taking over by hand. |
| [`app/`](app/README.md) | **Cove** — a mobile-first chat client for any LLM API (Anthropic, OpenAI-compatible, cc-bridge) with MCP connectors, projects, AI-operable pods and logs. Deployed to GitHub Pages by `.github/workflows/deploy-app.yml`. |

## Browser MCP server — environment variables

| Variable | Effect |
|---|---|
| `VNC_PASS` (+ optional `VNC_USER`, default `shushu`) | Turns on nginx Basic Auth for everything (noVNC and `/mcp`). Required before exposing the server publicly. |
| `CORS_ORIGIN` | Allows web pages from this origin (e.g. `https://yuan36050-star.github.io`) to call `/mcp` from the browser — needed for Cove's connectors. Preflight requests are answered before Basic Auth. Unset = no CORS (previous behaviour). |

Connect it from Cove with **Connectors → + → Browser (this repo)**, URL `https://<host>/mcp`, and **Basic** auth `user:password` when `VNC_PASS` is set.
