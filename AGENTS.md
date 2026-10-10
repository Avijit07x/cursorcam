# CursorCam

CursorCam records click demo videos of web apps. It is a Claude Code plugin: the `cursorcam` skill lets a user ask Claude for a demo video, and Claude explores the app, writes the steps, records, reviews stills and hands back the MP4. The skill runs the `cursorcam` CLI: a steps file goes in, and a polished MP4 comes out, with auto-zoom, a smooth cursor and click ripples. The CLI is TypeScript for Node 22.13+. It drives the Chrome, Edge, Chromium or Brave already installed on the machine and never downloads a browser.

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
- `plugin/`: the Claude Code plugin. `skills/cursorcam/SKILL.md` and its `references/` teach Claude the whole flow, and `hooks/env-guard.sh` blocks commands that print every environment variable. `.claude-plugin/marketplace.json` at the root lists the plugin.
- `scripts/sync-version.mjs`: keeps the plugin and skill on the package version.
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
- `assets/`: the logo files, and the README video `demo.mp4` with its animated preview `demo.webp`. The logo is a tilted sticker with a white edge and a soft shadow, and the wordmark is lowercase Fredoka Bold, outlined to shapes. `favicon.svg` is an upright version without the shadow, for small sizes. `logo.html` shows every logo file where it is used. `banner.svg` is the 1200×630 banner for posts and the share image.
- `docs/`: the user guides, with steps and style files to copy in `examples/`, and the project notes in `project/`: the design plan `PLAN.md` and `TEST-RESULTS.md`. The README links to the guides and stays short. The website renders these guides, so keep their tables and heading names in the same form.

## Rules

- Keep modules small and single-purpose, with named constants, clear names and no nested ternaries. Reuse before writing. Every step action goes through the same locate, actionable, move, act and log pipeline.
- Errors are `CursorCamError` with an exit code from `src/shared/exit-codes.ts` and a hint the user can act on.
- Release every listener, timer, server, page and browser through one dispose path.
- Every change comes with tests. New browser behavior gets a fixture page in `test/fixtures/app/`.
- Never write a `$secret:` or `$env:` value, or an `ask` reply, to a file, a log or any output. Pass text that might hold one through `redact()`.
- Keep the skill in step with the CLI. A new command, option, step action, style key or exit code goes into `plugin/skills/cursorcam/` and the guides in `docs/` in the same change. The plugin unit tests check the skill.
- Commit messages use `feat`, `fix`, `perf`, `chore`, `docs`, `refactor`, `test`, `ci`, `build` or `revert`. Anything users will notice gets a line under **Unreleased** in `CHANGELOG.md`.
- Pin every GitHub Action to a full commit with its version note. Keep `zizmor .github/` and actionlint clean.
