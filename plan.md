# Agentinc site crawler and map builder

Short, actionable plan (TypeScript + Playwright + Node visualizer)

Goal
- Crawl a site, discover clickable actions, build a directed graph of pages and transitions.
- Record node metadata (title, url/route, dom_hash, summary, full screenshot) and edges (source, destination, action selector, action text, element screenshot, form values).

Storage and outputs (priority)
- Primary: structured JSON files (one file per crawl or per site) containing nodes and edges. This is the canonical source of truth for PoC.
- Secondary: images stored in a dedicated `images/` directory with readable filenames, e.g. `main_page.png`, `scheduling_step1_questions.png`, `book_visit_button.png`.
- Optionally later migrate JSON -> SQLite or a graph DB for scale.

Tech
- Runtime: Node.js + TypeScript
- Browser automation: Playwright
- Use Playwright MCP APIs (Playwright's mcp integration) for robust instrumentation and tracing where available.
- Storage: local SQLite (or JSONL for PoC) + images folder
- Visualizer: small Node + static UI using Cytoscape.js or vis-network

Data shapes (examples)
- Page node: { id, url, title, dom_hash, summary, screenshot }
- Edge: { id, source_id, dest_id, action: { type, selector, text }, element_screenshot, form_values }

Notes on naming and JSON layout
- Node `screenshot` and edge `element_screenshot` should be paths under `images/` with human-readable names. For deterministic names use `{crawlId}_{nodeId}_full.png` or semantic names when available (e.g. `main_page.png`, `scheduling_step1_questions.png`).
- The JSON output should include a top-level `metadata` block with crawl seed, timestamp, profile used, and version of the toolset.

File layout (minimal)
- package.json, tsconfig.json
- src/
	- cli.ts           # entry: seeds, limits, profile
	- crawler.ts       # queue, BFS/DFS, dedupe
	- browserAgent.ts  # Playwright MCP wrapper: load, click, wait, element screenshot, tracing
	- actionExtractor.ts # find clickable elements, build stable selectors
	- formFiller.ts    # map profile -> inputs, safe fills for scheduling/quizzes
	- graphStore.ts    # sqlite wrapper: nodes, edges, images
	- visualizer/
		- server.ts      # serves static UI + graph API
		- ui/            # simple page using cytoscape.js to render graph

Minimal commands (zsh)
```bash
npm init -y
npm install -D typescript ts-node @types/node
npm install playwright better-sqlite3 express cytoscape
npx playwright install
```

LLM integration (optional)
- Use an LLM to generate short page `title` or `summary` when page content is long or noisy. Example flow: extract visible text -> call LLM with prompt "Summarize this page in 1-2 sentences and suggest a short name" -> store results in node.summary and node.guessed_name.
- Keep LLM calls optional and behind a config flag; require API key via env var (e.g. OPENAI_API_KEY). Record LLM model and prompt version in crawl metadata for reproducibility.

High level crawl flow (pooled)
1. seed -> enqueue
2. dequeue page: load with Playwright (networkidle + mutation-stable wait)
3. capture page screenshot and dom_hash; create/get node
4. extract candidate actions (a[href], button, role=button, elements with click handlers)
5. for each action (bounded per page): capture element screenshot, build stable selector, attempt action (click or form submit) using profile values when needed
6. detect navigation (url change or significant DOM change), capture destination node, create edge recording action metadata and form values
7. dedupe nodes by dom_hash + canonical URL; obey depth/limits

Notes and heuristics
- Prefer data-* / aria / id based selectors; fall back to robust path selectors
- For SPAs: listen to history API and compute route identifier (pathname + dom_hash)
- Record exact values used for forms so transitions can be replayed
- Respect robots.txt, rate limits, and do not bypass CAPTCHAs

Next step
- I can scaffold this project in the workspace (create package.json, tsconfig, and the src files above with a small PoC) and run a smoke test against a seed URL you provide. Tell me to proceed and give preferred seed URL and any profile data for forms.
