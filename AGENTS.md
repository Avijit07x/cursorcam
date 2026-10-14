# CursorCam

CursorCam records click demo videos of web apps. A user asks their AI agent for a demo video, and the agent explores the app, writes the steps, records, reviews stills and hands back the MP4. Any agent that supports MCP uses the `cursorcam mcp` server, and Claude Code uses the plugin, whose `cursorcam` skill teaches the whole flow. Both run the `cursorcam` CLI: a steps file goes in, and a polished MP4 comes out, with auto-zoom, a smooth cursor and click ripples. The CLI is TypeScript for Node 22.13+. It drives the Chrome, Edge, Chromium or Brave already installed on the machine and never downloads a browser.

## Commands

Use pnpm, never npm or yarn.

- `pnpm check`: formatting, lint, typecheck, unused code and all tests. Run it before calling work done.
- `pnpm check:package`: a clean build, then a check of the published package.
- `pnpm test:unit`: unit tests only, in a few seconds.
- `pnpm test:e2e`: browser tests that record and render real videos. They build `dist/` first.
- `pnpm format`: fixes formatting.
- `node dist/cli/index.js <command>`: runs the CLI after `pnpm build`.
- Never run `pnpm test:crash` locally. It forces browser crashes and runs only on CI machines, because a crash can stop other services on the host.
- `pnpm site:dev`: runs the website locally.
- `pnpm check:site`: checks the website's logo copy, lint and types, then builds it.
- `pnpm site:backgrounds`: builds the CLI, then saves every scene background as an SVG for the website.
- `pnpm sync-version`: writes the package version into the plugin and the skill. `pnpm check` fails when they differ.
- `claude plugin validate ./plugin`: checks the plugin manifest.

The git hooks in `.githooks/` format and lint staged files, check commit messages, and run format, lint and typecheck before a push. Turn them on with `pnpm hooks:install`.

## Layout

- `src/cli/`: one file per command. `src/cli/index.ts` is the bin entry.
- `src/config/`: zod schemas for steps, style and presets. `presets.json` holds the dated platform limits.
- `src/browser/`: finding, launching and watching the browser.
- `src/record/`: the recorder. `actions/` has one file per step action.
- `src/render/`: planning, compositing and encoding. `page/` runs inside the browser. `scene/` draws the scene backgrounds as SVG, from two colors and the window's place.
- `src/camera/` and `src/cursor/`: pure planners.
- `src/inspect/`, `src/runs/`, `src/doctor/`, `src/system/`, `src/shared/`: target lists, run folders and `wait`, environment checks, OS helpers, and shared errors, exit codes, geometry and redaction.
- `src/login/`: the `login` command's browser window and the saved logins, kept as private storage-state files in the user cache.
- `src/mcp/`: the `mcp` command's MCP server over stdio. `protocol.ts` speaks JSON-RPC, `tools.ts` maps each tool to a CLI call with `--json`, run as a child process by `cli-call.ts`, and `instructions.ts` is the short flow the server gives every agent. Long runs start with `--detach` and the agent follows them with `wait`.
- `plugin/`: the Claude Code plugin. `skills/cursorcam/SKILL.md` and its `references/` teach Claude the whole flow, and `hooks/env-guard.sh` blocks commands that print every environment variable. `.claude-plugin/marketplace.json` at the root lists the plugin.
- `agent-plugin/`: the open-standard Agent Plugin for Codex, VS Code and Cursor: `plugin.json`, `mcp.json` (the pinned MCP server), `skills/cursorcam/` and `.cursor-plugin/plugin.json`. It is also the Gemini CLI extension: `gemini-extension.json` and `commands/cursorcam.toml`. Its skill is a copy of the Claude Code skill without the Claude-only fields, written by `pnpm sync-version`; never edit the copy.
- Marketplaces: `.claude-plugin/marketplace.json` (Claude Code), `.agents/plugins/marketplace.json` (Codex), `.github/plugin/marketplace.json` (VS Code and GitHub Copilot, read before the Claude one) and `.cursor-plugin/marketplace.json` (Cursor). `gemini-extension.json` at the root is the Gemini fallback when a release has no Gemini archive.
- `scripts/sync-version.mjs`: keeps every plugin, extension and marketplace on the package version, and copies the skill into `agent-plugin/`.
- `scripts/build-release-assets.mjs`: builds `release/`, the files attached to each GitHub release: `cursorcam.mcpb` for Claude Desktop, with a flat production `node_modules`, checked by starting its server, and `<platform>.cursorcam.tar.gz` for Gemini CLI, which picks the one named for its platform.
- `test/unit/` mirrors `src/`. `test/e2e/` holds browser tests. `test/fixtures/app/` has one page per hard case.
- `site/`: the website, a Next.js app in its own pnpm package. The home page has the hero, the demo video, a toy camera that plays a mock demo drawn with code, a sticker sheet of features, the setup steps and a "That's a wrap!" footer with movie credits. `/docs` shows the guides from `docs/` and a Backgrounds page with every scene in every palette. The old coming-soon page lives on at `/coming-soon`. Light theme only.
  - `DESIGN.md` holds the look: font, colors, logo, background and motion. Read it before you change how the site looks, and update it when a design decision changes.
  - `app/globals.css` holds the colors, the Fredoka font, the scrollbar, and the sticker shadow and sticker text classes.
  - Animations use Motion (`motion/react`). `lib/motion.ts` holds the shared springs, and `MotionProvider` calms motion for people who ask for less.
  - `components/brand/` has the animated sticker logo, the wordmark, the sticker art and the confetti burst. `components/ui/` has the shared background, section, heading, buttons, copy button, command pill and footer. `components/mock-app/` is the little mock app and the stage that acts out its scenes, shared by the toy camera and the sticker sheet. `components/home/` is the home page, one folder per section, `components/docs/` the docs pages and `components/coming-soon/` the coming-soon page. New pages reuse `brand/` and `ui/`.
  - `lib/` holds the shared springs, site links, section ids, the page container, the demo video details and the docs loader. `lib/docs.ts` reads `../docs` at build time, and its guide list comes from `docs/README.md`, where each `##` heading is a group with a table of guides, so a guide added there shows up on the site in that group. `content/` holds the docs pages that live only on the website. The site imports the scene and palette names from `src/config/scenes.ts` as `@cursorcam/scenes`. `hooks/` holds the shared hooks. Buttons that move within the page use `useScrollToSection`, never `#` links.
  - `app/icon.svg` must stay identical to `assets/favicon.svg`, the browser-tab icon. `public/og.png` is the share image, a 1200×630 export of `assets/banner.svg`.
  - `public/backgrounds/` holds every scene background in every palette as a 1920×1080 SVG, for the docs. `pnpm site:backgrounds` saves them again; run it when a scene or palette changes.
  - `public/video/` holds the web copies of `assets/demo.mp4`: the MP4 with fast start, a WebM for browsers without H.264, like the VS Code preview, and `poster.jpg`. Export them again when the README video changes.
  - `demo/` holds the sample app the README video records: `app/`, served by `pnpm demo:app`, with `readme-steps.json` and `style.json`.
- `assets/`: the logo files, and the README video `demo.mp4` with its animated preview `demo.webp`. The logo is a tilted sticker with a white edge and a soft shadow, and the wordmark is lowercase Fredoka Bold, outlined to shapes. `favicon.svg` is an upright version without the shadow, for small sizes. `logo.html` shows every logo file where it is used. `banner.svg` is the 1200×630 banner for posts and the share image. `banner-launch.svg` is the launch version, with a bigger logo, headline and pill, so it reads on a phone.
- `docs/`: the user guides, with steps and style files to copy in `examples/`, and the project notes in `project/`: the design plan `PLAN.md`, `TEST-RESULTS.md` the stable release plan `RELEASE-PLAN.md` and the website plan `SITE-PLAN.md`. The README links to the guides and stays short. The website renders these guides, so keep their tables and heading names in the same form.

## Rules

- Keep modules small and single-purpose, with named constants, clear names and no nested ternaries. Reuse before writing. Every step action goes through the same locate, actionable, move, act and log pipeline.
- Errors are `CursorCamError` with an exit code from `src/shared/exit-codes.ts` and a hint the user can act on.
- Release every listener, timer, server, page and browser through one dispose path.
- Every change comes with tests. New browser behavior gets a fixture page in `test/fixtures/app/`.
- Never write a `$secret:` or `$env:` value, or an `ask` reply, to a file, a log or any output. Pass text that might hold one through `redact()`.
- Keep the skill and the MCP server in step with the CLI. A new command, option, step action, style key or exit code goes into `plugin/skills/cursorcam/`, the MCP tools and instructions in `src/mcp/`, and the guides in `docs/` in the same change. Then run `pnpm sync-version` to copy the skill into `agent-plugin/`. The plugin unit tests check the skill.
- Commit messages use `feat`, `fix`, `perf`, `chore`, `docs`, `refactor`, `test`, `ci`, `build` or `revert`. Anything users will notice gets a line under **Unreleased** in `CHANGELOG.md`.
- Pin every GitHub Action to a full commit with its version note. Keep `zizmor .github/` and actionlint clean.
