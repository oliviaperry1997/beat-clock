# AGENTS.md — beat-clock

Agent instruction file. Every line answers: "would an agent miss this without help?"

---

## Two independent packages

This repo has two completely separate Node packages with **separate `node_modules`** and no shared monorepo tooling:

| Package | Root | Purpose |
|---------|------|---------|
| Browser app | `/` (root) | Webpack + Vitest, deployed to `docs/` via GitHub Pages |
| AI agent CLI | `agent/` | TypeScript Node CLI, OpenRouter + Anthropic, run with `tsx` |

**Always `npm install` in both directories independently.** Changes to root `package.json` do not affect `agent/` and vice versa.

---

## Root app — commands

```sh
npm start              # webpack dev server (http://localhost:8080)
npm test               # vitest run (one-shot)
npm run test:watch     # vitest watch mode
npm run build          # production build → docs/  (NOT dist/)
node scripts/filter-cities.js  # regenerate src/data/cities.json from worldcities npm pkg
```

**Build output is `docs/`**, not `dist/`. This is the GitHub Pages deploy root. Never commit changes to `docs/` manually — the pre-commit hook and `npm run build` own it.

**`src/data/cities.json` is generated.** Do not edit it by hand. Run `node scripts/filter-cities.js` to rebuild it from the `worldcities` npm package (filters to pop > 50 000, ~10 K cities, ≤ 2 MB).

---

## Pre-commit hook (main branch only)

`.git/hooks/pre-commit` runs automatically on the `main` branch:
1. Runs `npm run build` (fails the commit if the build fails)
2. Stages `docs/` automatically

On any other branch the hook exits immediately — no build is triggered.

**Implication:** commits to `main` will be rejected if the build is broken. Fix the build before committing, or commit on a feature branch.

`npm prepare` installs the hook by chmoding `.git/hooks/pre-commit` to 755 on `npm install`.

---

## Tests

- Runner: **vitest** with `globals: true`, environment **jsdom**, CSS disabled
- Test files live in **`tests/`** (not co-located), mirroring `src/`:
  - `tests/pure/` — pure chronometer unit tests
  - `tests/alarms/` — alarm engine, store, evaluator, UI
  - `tests/converters/`, `tests/formats/`, `tests/location/` — module-level tests
  - `tests/integration/` — alarm-flow and composer integration tests
  - `tests/visual/` — sky gradient tests
- Run a single file: `npx vitest run tests/pure/beats.test.js`
- Run a directory: `npx vitest run tests/alarms`

---

## Architecture (root app)

```
src/index.js                  ← app entrypoint (webpack entry)
src/chronometers/index.js     ← compose(date, location) → { holocene, beats, solar, lunisolar }
src/formats/registry.js       ← renderer registry (pluggable format renderers)
src/alarms/engine.js          ← alarm engine, tick-driven at 864 ms (1 centibeat)
src/alarms/astro-cache.js     ← astronomical cache, invalidated on location change
src/location/ui.js            ← location system init, drives the main update loop
src/sky.js                    ← sky gradient colors from sun position
src/data/cities.json          ← generated city list (do not edit)
```

The tick rate constant `TICK_RATE_MS = 864` is defined in `src/index.js:72`.

---

## Agent CLI (`agent/`)

### Setup

```sh
cd agent
npm install          # separate install required
```

### Running

```sh
# Ink TUI (interactive)
npm start            # or: tsx src/cli.tsx

# Plain readline REPL (headless, scriptable)
npm run start:headless   # or: tsx src/headless.ts

# Watch mode (auto-restarts on file change)
npm run dev
```

No compile step needed — `tsx` runs TypeScript directly.

### Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENROUTER_API_KEY` | one of these two | OpenRouter provider |
| `ANTHROPIC_API_KEY` | one of these two | Anthropic provider |
| `AGENT_PROVIDER` | optional | Force provider: `openrouter` or `anthropic` |
| `AGENT_MODEL` | optional | Override model (e.g. `claude-opus-4-5`, `anthropic/claude-3-5-sonnet`) |

**Provider auto-detection order** (when `AGENT_PROVIDER` is unset):
1. `OPENROUTER_API_KEY` present → OpenRouter (`openrouter/auto` default model)
2. `ANTHROPIC_API_KEY` present → Anthropic (`claude-opus-4-5` default model)
3. Neither set → startup error

### Provider / model examples

```sh
# Use Anthropic with a specific model
ANTHROPIC_API_KEY=sk-... AGENT_MODEL=claude-opus-4-5 npm start

# Use OpenRouter with a specific model
OPENROUTER_API_KEY=sk-... AGENT_MODEL=anthropic/claude-3-5-sonnet npm start

# Force Anthropic even if OPENROUTER_API_KEY is also set
AGENT_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-... npm start
```

### Agent source structure

```
agent/src/provider.ts   ← Provider interface + OpenRouterProvider + AnthropicProvider + createProvider()
agent/src/agent.ts      ← Agent class (EventEmitter), provider-agnostic
agent/src/tools.ts      ← timeTool, calculatorTool, gsdTool
agent/src/cli.tsx       ← Ink TUI
agent/src/headless.ts   ← readline REPL
```

### Adding a new provider

Implement the `Provider` interface from `agent/src/provider.ts`:

```ts
export interface Provider {
  readonly name: string;
  readonly defaultModel: string;
  chat(messages: ChatMessage[], config: ProviderConfig): AsyncGenerator<StreamEvent>;
}
```

Then add detection logic in `createProvider()` or pass an instance directly via `createAgent({ provider: myProvider })`.

---

## GSD skills (any model, any session)

This repo uses [GSD](https://github.com/anomalyco/gsd) skills available via OpenCode. Any model driving an OpenCode session can invoke GSD commands as slash commands.

### In an OpenCode session (any model)

```
/gsd-progress          # check project progress and route to next action
/gsd-plan-phase        # create a PLAN.md for the next phase
/gsd-execute-phase     # execute a planned phase with wave-based parallelization
/gsd-next              # advance to the next logical workflow step
/gsd-check-todos       # list pending todos
/gsd-discuss-phase     # gather context before planning (--auto to skip questions)
/gsd-fast              # trivial task inline, no subagents
/gsd-quick             # quick task with GSD guarantees, skip optional agents
```

The `gsd` tool registered in `agent/src/tools.ts` lets the **AI agent CLI** invoke GSD commands programmatically (shells out to `opencode` on PATH). Example tool call: `{ command: "gsd-progress" }`.

### GSD planning files

GSD state lives in `.planning/` at the repo root (not committed unless you choose to). The ROADMAP, phase plans, and todos are tracked there.

---

## Deploy

```sh
npm run deploy   # = npm run build && git add docs/ && git status --short docs/
```

After running, manually review the staged `docs/` diff and commit. GitHub Pages serves from the `docs/` directory on `main`.
