# CursorCam — Plan

## 1. Goal

A Claude Code skill that records a **click demo video** of any website or web app.

> /cursorcam http://localhost:3000 — sign up, create a project, invite a teammate

Claude then:

1. Explores the app.
2. Writes the steps.
3. Records them in a hidden Chrome.
4. Renders a polished MP4 (auto-zoom on clicks, smooth cursor, click ripples, background, rounded corners, shadow).
5. Checks stills itself.
6. Hands back the file.

## 2. Done when (v1)

1. Works on macOS, Linux and Windows with **Node 22.13+ and an installed Chrome-family browser**. Nothing else to install.
2. The default output is 1920×1080, 60 fps, H.264 MP4, and plays in QuickTime, Safari, Chrome and VLC.
3. Platform presets produce files each platform accepts.
4. The page looks like a real desktop browser:
   - hover effects
   - smooth scrolling
   - no scrollbar strip
   - no white flashes
5. Vertical and square formats work.
6. Every failure gives a clear message and a saved frame. Nothing hangs.
7. Changing the look re-renders without recording again (vertical excepted).
8. A login the user gives is used only to log in for that run. CursorCam never writes it to a file, a log or the video, and Claude never saves it to memory. Other secrets never reach the video, output files or `inspect`/`check` output.
9. The tool can't harm the machine:
   - no orphan browsers
   - no core dumps
   - downloads stay in the run folder
   - big temp files stay outside the project
10. Lint, typecheck, unused-code check, package check and tests pass in CI on all three OSes.
11. Installs as a Claude Code plugin.

## 3. Design

```
steps.json ─► record ─► run cache (frames + events.jsonl + meta.json) ─► render ─► video.mp4
                                                         ▲                  │
                                          style + preset ┘                  └─► stills (Claude checks)
```

### 3.1 Packages

| Package | Used for |
|---|---|
| `playwright-core` | Driving the user's installed browser: launch, contexts, locators, dialogs, tabs, downloads, raw CDP sessions. It never downloads a browser. |
| `mediabunny` | MP4 muxing and WebCodecs encoding inside the render page. Its own unmodified ESM file is served to the page, with its MPL-2.0 notice inside. |
| `commander` | CLI commands and options |
| `zod` | Schemas for steps, style and presets, and JSON Schema export for the skill |
| `env-paths` | Per-OS cache folder |

The first run downloads these packages (tens of MB), and nothing else.

### 3.2 Browser

- **Launch:** `launchPersistentContext` with our own profile folder `cursorcam-<pid>-<random>` in the cache. A saved login profile is passed with `--profile <name>`.
- **Finding the browser:** our finder resolves a path for Chrome, Edge, Chromium or Brave on each OS. `CURSORCAM_BROWSER` overrides it. Old versions are refused.
- **Core dumps:** on Linux and macOS the browser starts through a small launcher script that sets the core-dump limit to 0.
- **Desktop identity:**
  - page 1280×800 at scale 2, with `--force-device-scale-factor=2` so frames are 2560×1600
  - `screen` set to 1280×800
  - a `userAgent` without "Headless"
  - hover and fine pointer: the default for headless here
- **Phone identity:**
  - page 390×844 at scale 3, with the matching launch flag
  - `isMobile` and `hasTouch` on
  - a phone `userAgent`
  - hover and fine pointer replaced by **no hover and a coarse pointer**
- **Context options:** `locale` (default `en-US`), `timezoneId`, `colorScheme` (default `light`), `reducedMotion`, `permissions`, `httpCredentials`, `ignoreHTTPSErrors` (local hosts only by default), and `acceptDownloads` into the run folder.
- **Always-on handlers:**
  - dialogs are answered (defaults below)
  - new tabs are followed
  - the file chooser is intercepted
- **Raw CDP session:** screencast, and scrollbar hiding where needed.
- **Crashes:**
  - A page or browser crash rejects all pending work at once, with exit 11.
  - A liveness ping runs during long quiet stretches.
- **No bypassing:** `navigator.webdriver` stays true. A site that blocks automation ends the run with exit 10.

### 3.3 Recording

- **Start:**
  1. Check that navigation succeeded.
  2. Wait for load and fonts.
  3. Start the screencast and require a first frame.
- **Capture:** JPEG frames written as they arrive. Identical frames are skipped. Each frame carries its time and scroll offset.
- **Events:** appended to `events.jsonl` as they happen, with wall-clock and monotonic times.
- **Locators** only find and wait: role, label, test ID, text, then CSS. Matching is strict, with `nth`, `within`, `near` and `frame`. They never click, fill or scroll, because those move instantly and fail on animated buttons.
- **Before an action**, the element must be:
  - visible, including opacity
  - centered in view with our smooth scroll
  - settled (moves under 4 px, wait capped at 1 s)
  - enabled
  - not covered. The hit check runs again right before pressing.
- **Mouse:** an eased curve through `page.mouse`, so the cursor never jumps.
- **Scroll:** stepped `mouse.wheel` on an ease-in-out curve, at the cursor position. The cursor first moves over the right scroll container.
- **Typing:**
  - one code point at a time, at a steady pace
  - long text typed fast and sped up in the render, or pasted
  - the field's value is checked afterwards
- **Keys:** `Mod+` means Cmd on macOS and Ctrl elsewhere.
- **After an action:**
  - Detect navigation and wait for the new page.
  - Network quiet is a soft wait capped at 3 s: long-lived requests are ignored, and requests from pages that navigated away are dropped.
  - Wait for fonts.
- **Dialogs:** alert, confirm, prompt and leave-page are all accepted by default. A step can override this. The render draws a dialog card.
- **Native selects:** with `showList`, `appearance: base-select` draws the list inside the page and the cursor picks the option. Otherwise the cursor goes to the select and the value is set directly.
- **Things that can't appear in the video** (date/color pickers, tooltips, native context menu): `check` and `inspect` warn about them.
- **Phone mode:** taps instead of clicks, no hover steps, and a warning when the page has no viewport meta.
- **Disk:**
  - check free space before starting
  - stop cleanly when the disk is full
  - frames live in the per-user cache, never in the project

### 3.4 Steps file

```json
{
  "url": "http://localhost:3000",
  "viewport": "desktop",
  "mask": [".user-email"],
  "steps": [
    { "goto": "/" },
    { "click": "role=button[name='Get started']" },
    { "type": "alex@example.com", "into": "label=Email" },
    { "type": "$secret:password", "into": "label=Password" },
    { "press": "Enter" },
    { "ask": "2FA code", "into": "label=Code" },
    { "waitFor": "text=Dashboard" },
    { "select": "Monthly", "in": "label=Billing" },
    { "scroll": { "to": "#faq" } }
  ]
}
```

- **Top level:** `url` (required), `name`, `viewport` (`desktop` | `phone`), `locale`, `timezone`, `colorScheme`, `reducedMotion`, `permissions`, `httpCredentials`, `ignoreHTTPSErrors`, `allowOrigins`, `mask`, `timeout` (per step, default 15 s), `steps`.
- **Actions** (exactly one per step):

  | Step | Value | Extra keys |
  |---|---|---|
  | `goto` | path or URL | |
  | `click`, `dblclick`, `hover` | target | |
  | `type` | text | `into` (target), `paste`, `clear` |
  | `press` | key, e.g. `Enter`, `Mod+K` | |
  | `select` | option label or labels | `in` (target), `showList` |
  | `upload` | file path or paths, relative to the steps file | `into` (target) |
  | `scroll` | `{ "to": target \| "top" \| "bottom" }` or `{ "by": px }` | `in` (target) |
  | `drag` | target | `to` (target) |
  | `waitFor` | target | `state` (`visible` \| `hidden`) |
  | `pause` | milliseconds | |
  | `ask` | what to ask for | `into` (target) |

- **Step options:** `zoom` (1–3, or `false`), `speed` (0.25–4), `pauseAfter` (ms, 700 by default, 0 after `pause` and `waitFor`), `dialog` (`accept` \| `dismiss` \| `{ "accept": true, "text": "…" }`).
- **Pacing:** the cursor rests 200 ms on a target before it clicks, and every step pauses after it, so viewers see what changed.
- **Targets:** a string, or `{ "find", "nth", "within", "near", "frame", "exact" }`.
  - Strings: `role=button[name='Save']`, `label=…`, `text=…`, `placeholder=…`, `testid=…`, `alt=…`, `title=…`, `css=…`, or plain CSS.
  - `nth` picks a match (0 first, -1 last). `within` limits the search to inside another target. `near` picks the match closest to another target. `frame` is the CSS selector of an iframe.
  - More than one match without `nth` or `near` is an error that lists the matches.
- **`goto`:** relative to `url`. Other origins need `allowOrigins`.
- **Logins the user gives** (ID and password):
  - Used only to log in for that run.
  - The tool stores no copy. What the user types in chat stays in the chat history, like any message.
  - The steps hold `$secret:NAME` placeholders only. The values reach the CLI through environment variables of that one command (`CURSORCAM_SECRET_<NAME>`).
  - Never written to a file, a log, `events.jsonl` or memory.
- **`$env:NAME`:** values the user already keeps in their own environment.
- **Masking:**
  - Every secret value is logged as `•••`.
  - A secret typed into a field that isn't a password field is blurred.
  - URL query values with secret-looking names are replaced by `•••`.
- **`ask`:**
  - The run pauses at this step and `status.json` shows what it waits for.
  - Claude asks the user, then passes the reply with `cursorcam answer <run>` (read from stdin, sent over a local socket, never stored).
  - The waiting step times out after 5 minutes.
- **`mask`:** these elements are blurred in recording, `check` and `inspect`.

### 3.5 Rendering

- **Plan in Node:** a pure planner turns the frames and events into one draw command per output frame (source frame, crop, cursor, ripples, dialog card, URL text).
- **Render page:** runs in the same browser, served from `127.0.0.1` behind a random token.
- **Workers:** up to 4 workers each load the frames they need, composite them, and convert to limited-range BT.709 I420:
  - background
  - window, shadow and browser bar (drawn once and reused)
  - the camera view
  - click ripples and the cursor
  - drawn dialogs
- **Encoding:** mediabunny encodes H.264 (VP9 when a browser has no H.264). The output is MP4 with the index at the front and no edit list.
- **Output:** streamed to Node at file positions, so long videos never sit in memory. Written to a `.part` file, then renamed.
- **Checks:** the finished file is read back and checked for size and frame count. A file over its size limit is encoded again at a lower bitrate.
- **Smoothing:**
  - Constant frame rate (the last frame is held).
  - The video starts at the first captured frame.
  - The last good frame is held while a page loads.
  - Idle waits are sped up. Pauses, `pauseAfter` and the ending play at normal speed.
- **Stills:** rendered at output size, plus one 1:1 crop per step.

### 3.6 Camera and cursor

**Camera.** A pure planner turns events into keyframes:
- Zoom in on targets (1.3–2.5×), easing in while the cursor travels, so the zoom lands before the click.
- Hold the zoom while typing. Keep the next actions in one still shot while they fit in the same zoomed view and follow within 2 s.
- Zoom out right after the last action in an area to show what changed. The `hold` style keeps it zoomed longer after each action.
- Zoom out on the way to a far action, never pan across the page while zoomed.
- Zoom on a hover only when its step sets a `zoom`, and then hold for its whole step.
- A step with `"zoom": false` shows the whole page.
- Follow the cursor with a dead zone only after the action, never on the way in.
- Clamp to the page edges.
- Use page coordinates that follow the scroll.
- Cut on page loads and tab switches.
- Keep a minimum shot length.

**Cursor.** A vector arrow with a click ripple, drawn at render time. Phone videos show a touch dot instead.

### 3.7 Style and presets

| Preset | Size | fps | Rule |
|---|---|---|---|
| default | 1920×1080 | 60 | 8 Mbps |
| `youtube` | 1920×1080 | 60 | 12 Mbps |
| `x` | 1920×1080 | 30 | 6 Mbps, ≤ 140 s |
| `linkedin` | 1920×1080 | 30 | 6 Mbps, 3 s – 15 min |
| `discord` | 1280×720 | 30 | fit under 20 MB |

- **Size limits:** `--max-size <size>` fits any limit, for example 10 MB for README embeds.
- **Preset values:** live in a dated `presets.json`, re-checked every release.
- **Formats:**
  - `landscape` and `square` come from the desktop recording.
  - `vertical` comes from a phone recording, shown inside the frame with no cropping.
- **Style options:** background, padding, radius, shadow, browser bar, URL bar text, cursor, zoom, dialog drawing, idle trimming.

### 3.8 Commands

| Command | Does |
|---|---|
| `doctor` | Checks Node, the browser, the encoder, disk, crash-dump setup, fonts and duplicate installs, and prints fixes |
| `inspect <url>` | Saves the frame the video would show, and lists clickable elements with locators. The list is capped and filterable, secret values are redacted, and it warns about things the video can't show. |
| `check <steps>` | Dry run with a frame per step. Stops at the first failure. |
| `record <steps>` | Records into the cache |
| `render <run>` | Renders the MP4 (`--for`, `--max-size`, `--style`, `--format`, `--clean`) |
| `run <steps>` | `record` + `render` |
| `stills <run>` | Key-moment stills and crops |
| `login <url>` | Visible browser for a one-time manual login. When the window closes, the site's cookies and storage are saved as a private file, used with `--profile <name>` |
| `wait [run]` | Waits up to 90 s until a run is done, failed, stopped or waiting for an answer, and says which |
| `answer <run>` | Passes the user's reply to a run waiting at an `ask` step |

- Long commands write `status.json` (with the process ID) and `result.json`.
- `--detach` starts `check`, `record` or `run` as a separate process, prints the run folder at once and exits, so the skill never depends on the Bash time limit. `wait` follows it.
- `check --until <n>` checks only the first steps, so a flow with an `ask` step needs only one code, during the real run.

| Exit | Meaning |
|---|---|
| 0 | ok |
| 1 | unexpected error |
| 2 | bad input |
| 3 | no usable browser, or `doctor` found a problem |
| 4 | step failed |
| 5 | encode failed |
| 6 | timeout |
| 7 | page didn't load |
| 8 | disk full |
| 9 | interrupted |
| 10 | blocked or needs a human |
| 11 | crashed |

**Files:**
- `cursorcam-output/<name>-<time>-<random>/` in the project holds the video, poster, steps, style, stills, downloads and status.
- Raw frames live in the per-user cache. They're deleted by `--clean`, or after 7 days.

### 3.9 Claude skill

**Trigger:** click demos, walkthroughs and recording a real browser session. It is not for launch or promo videos, which other installed video skills may handle.

**Flow:**
1. Use where the user says the video goes to pick the preset. When they don't say, use the default and offer other sizes at the end, since a re-render needs no new recording.
2. Run `doctor` on the first run.
3. Dev server:
   - Reuse a running server only if it's this project.
   - Otherwise start one in the background and read the real URL from its output.
   - Stop only servers Claude started.
4. Explore with `inspect`. Use phone mode for vertical.
5. Write the steps a few at a time.
6. Run `check` until it passes.
7. Run `run --detach`, then `wait` until it is done or needs an answer.
8. Read 4–6 stills and fix the style if needed, without recording again.
9. Deliver: the paths, the file size and one line about the video.

**Asking the user:**
- When the steps need something only the user has, Claude asks directly, then continues. That covers a login, a 2FA or email code, which account to use, or test data.
- The question is short and has a clear format:

  ```
  ❓ I need a login for http://localhost:3000 to record the dashboard.
  Reply with: email, password
  ```

**Logins:**
- A login the user gives is used for that run only.
- It is never written to the steps, a file, a log or memory.
- Password fields show dots, and other secret fields are blurred.

**Safety:**
- Never dump the environment.
- Ask before recording a real account with real data.
- For a captcha, ask the user to log in once with `login`. Never solve a captcha.
- A narrow plugin hook blocks bare environment dumps. It allows everything else, since hooks run in every session.

**Commands:** paths are always quoted.

**How the skill runs the CLI:** a pinned `npx` of the published package. The release step updates the version in the skill.

## 4. Edge cases

**Page:**
- `alert()` or "leave page?" would block input → answered automatically, drawn in the render
- `<select>` list invisible → `showList` (in-page list) or the value set directly
- link opens a new tab or popup → followed; the camera cuts
- the page closes its own tab → clear error, unless it was the last step
- form inside a cross-origin iframe → frame-scoped locators
- button inside shadow DOM → role locators see it
- download link → saved into the run folder
- file input → `upload` step
- self-signed `https://localhost` → allowed for local hosts
- basic auth → `httpCredentials` with `$secret:`
- login page in the flow → Claude asks for a login and types it; it is never stored
- 2FA or email code → the run pauses at `ask`; Claude asks the user and passes the reply
- `@media (hover: hover)` styles → desktop identity keeps hover on
- the phone layout hides links behind a menu → phone steps written in phone mode

**Actions:**
- pulsing or animated button → tolerant settle check
- two "Save" buttons → strict error listing both; use `within`/`nth`
- `opacity:0` element → treated as hidden
- sticky header covers the target → centered scroll, then the hit check names the cover
- cookie bar appears mid-move → hit check right before pressing
- emoji or flags typed → split by code point
- debounced search → steady typing pace; `waitFor` the results
- React controlled input → real keys
- `maxlength` or an input mask changes the text → value check warns
- Cmd vs Ctrl → `Mod+`

**Waiting:**
- app polls every 400 ms or holds SSE → soft 3 s quiet cap
- click starts a page load → navigation detection
- late web font → wait for fonts
- skeleton loader → `waitFor` a real element

**Video:**
- white flash between pages → hold the last good frame
- static page sends no frames → hold, plus a liveness ping
- scroll would jump → stepped wheel
- target bigger than the screen → minimum zoom
- fast clicks far apart → merged into one shot
- dark UI on a player that ignores color tags → limited range
- 10 MB upload limit → `--max-size`

**Machine:**
- Ctrl-C or crash → browser closed, the profile swept on the next run
- browser crash → no core dump; pending work fails at once
- disk fills → clean stop, exit 8
- two runs in the same second → random suffix on the folder
- Node only in interactive shells → `doctor` explains the fix
- folder path with spaces → arguments passed as arrays, commands quoted
- the project's file watcher → no frames in the project

**Claude:**
- huge `inspect` output → capped, with filters
- secret in a text field → redacted in `inspect`, blurred in frames
- the user's login → only in that command's environment, never in a file or memory
- `check` frame differs from the video → `check` uses screencast frames
- Claude's image reader shrinks big stills → stills at output size, plus crops
- the Bash time limit → background runs with a status file

## 5. Code standards

- TypeScript strict, ES modules, Node 22.13+.
- **Small modules:**
  - small, single-purpose modules and functions
  - named constants, no magic numbers
  - no nested ternaries
  - clear names
- **No duplication:** reuse before writing. Shared helpers live in `shared/`, and every action uses the same `locate → actionable → move → act → log` pipeline.
- **Errors:** typed errors carry their exit code. Every external call is checked.
- **No leaks:** every listener, timer, server, page and browser sits behind one `dispose` path.
- **No blocking:** no blocking work on the Node event loop. Pixel work runs in the render page.
- **No comments** in any file. Delete code once nothing uses it.
- **Tests** come with every change. Pure modules (camera, cursor, schemas, presets, redaction) get unit tests. Browser code gets fixture tests.
- **Tooling:**
  - pnpm
  - ESLint with type-aware typescript-eslint, plus Prettier
  - knip
  - publint
  - Vitest with coverage
  - TypeScript below 6.1
  - commitlint and lint-staged behind git hooks in `.githooks/`
- **Commits:** `feat`, `fix`, `perf`, `chore`, `docs`, `refactor`, `test`, `ci`, `build` or `revert`. Every change users notice gets a line under **Unreleased** in `CHANGELOG.md`.

## 6. Repository layout

```
.
├── src/
│   ├── cli/               one file per command, plus the bin entry
│   ├── config/            zod schemas, defaults, presets.json, loaders
│   ├── browser/           finder, launch, identities, handlers, cdp, crash watch
│   ├── record/
│   │   ├── actions/       one file per action, sharing one pipeline
│   │   ├── locate.ts
│   │   ├── actionable.ts
│   │   ├── mouse.ts
│   │   ├── scroll.ts
│   │   ├── keyboard.ts
│   │   ├── waits.ts
│   │   ├── screencast.ts
│   │   └── events.ts
│   ├── render/
│   │   ├── page/          browser modules: workers, compositor, color, encoder
│   │   ├── plan.ts        draw commands per output frame
│   │   ├── timeline.ts    clock correction, frame holding, idle trimming
│   │   ├── layout.ts
│   │   ├── moments.ts     still and crop picks
│   │   ├── fit.ts         presets and size limits
│   │   ├── server.ts
│   │   ├── verify.ts
│   │   └── renderer.ts
│   ├── camera/            pure planner
│   ├── cursor/            pure path and effects
│   ├── doctor/            environment checks
│   ├── inspect/           target list and warnings for `inspect`
│   ├── runs/              run folders, status and result files, wait
│   ├── login/             login window and saved logins
│   ├── system/            paths, disk, processes, cleanup, lifecycle and signals
│   └── shared/            errors, exit codes, geometry, time, redact
├── plugin/
│   ├── .claude-plugin/plugin.json
│   ├── skills/cursorcam/  SKILL.md, references/
│   └── hooks/             secret guard (POSIX sh)
├── test/
│   ├── unit/              mirrors src/
│   ├── e2e/
│   ├── fixtures/app/      one page per hard case
│   └── crash/             CI machines only
├── scripts/               sync-version.mjs
├── docs/                  PLAN.md, TEST-RESULTS.md and other project docs
├── assets/                logo.svg (sticker mark), favicon.svg (upright tab icon), logo-wordmark-light.svg and logo-wordmark-dark.svg (README header)
├── site/                  website (Next.js, light theme): app/ pages and MDX docs, components/, lib/ (reads presets.json and CHANGELOG.md), public/ (demo video, social image), demo/steps.json
├── pnpm-workspace.yaml    the CLI at the root plus site/
├── .github/
│   ├── workflows/         ci.yml (3 OSes), npm-publish.yml (tag → checks → npm via trusted publishing → release notes from CHANGELOG), codeql.yml, zizmor.yml (workflow security), pr-title.yml
│   ├── ISSUE_TEMPLATE/    bug report, feature request; security reports go to private reporting
│   ├── renovate.json      weekly grouped updates, 1-day minimum release age, pinned action commits
│   ├── pull_request_template.md
│   ├── CODEOWNERS
│   └── FUNDING.yml
├── .githooks/             pre-commit (lint-staged), commit-msg (commitlint), pre-push (format, lint, types)
├── .vscode/extensions.json  recommended editor extensions
├── AGENTS.md              guide for coding agents; CLAUDE.md imports it
├── .claude-plugin/marketplace.json
├── package.json           metadata, lint-staged and commitlint config
├── tsconfig.json
├── tsconfig.build.json
├── eslint.config.js
├── .prettierrc.json
├── knip.json
├── vitest.config.ts
├── .editorconfig
├── .gitattributes         LF everywhere, binary media
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
└── LICENSE                Apache-2.0
```

## 7. Milestones

| # | What | Done when | Status |
|---|---|---|---|
| M0 | Tooling, errors, paths, browser finder, launcher and launch, identities, crash watch, cleanup, `doctor` | `doctor` passes on 3 OSes; desktop and phone launches capture a first frame; a killed run leaves no browser and its profile is swept next run; every browser process has a core-dump limit of 0 | ✅ Linux; macOS and Windows on first CI run |
| M1 | Schemas, recorder: handlers, screencast, events, locators, actionability, mouse, scroll, typing, waits, tabs, phone mode, `check`, `inspect` | Every fixture page passes; no step can hang | ✅ Linux; macOS and Windows on first CI run |
| M2 | Render page: decode pool, color, mediabunny streaming output, presets and size fitting | Media probe and full decode pass; color bands within tolerance; every preset meets its rule; the file opens in AVFoundation on macOS | ✅ Linux; AVFoundation needs a Mac |
| M3 | Compositor, frame holding, trimming, stills | Golden stills (Linux) and structural checks (macOS, Windows); render at real time or faster | ✅ Linux: measured pixel checks instead of stored golden images; 1.4× real time |
| M4 | Camera planner and cursor | Unit tests for every camera rule | ✅ |
| M5 | Skill, references, hook, background runs, dev-server flow, asking the user | Claude makes good videos of the fixture app and two public sites; Claude logs in with a given login and asks for a 2FA code in the clear format | ✅ Linux: a sample app, TodoMVC and Sauce Demo, and a two-step login, in real Claude Code sessions |
| M6 | Masking, `$secret:` and `$env:` values, `ask` and `answer`, login profiles, vertical, square, backgrounds, poster, `--clean` | Tests for each; a given login never appears in any file, log or output | ✅ Linux. Masking, values, `ask`/`answer`, vertical, square and `--clean` were built with M1–M3; `login` with saved logins, image backgrounds and the poster now too |
| M7 | Docs, release flow, version sync, preset re-check, v1.0.0-beta.1 | Fresh install works on 3 OSes; manual playback and upload checks pass | Ready to release as a beta: docs, version sync, preset re-check and 1.0.0-beta.1 are done, and a fresh install works on Linux. Left: macOS and Windows on the first CI run, playback on a Mac, uploads to each platform, then the first publish |
| Site | Website on Vercel: landing page with a demo recorded by the CLI, docs, changelog, SEO files | Builds static; every page loads with no errors or sideways scroll; works at phone width; docs facts match the code | ✅ local build; deploy needs the repo on GitHub and the Vercel project |

## 8. Testing

- **Unit:** camera, cursor, schemas, presets and size fitting, URL resolution, typing splitter, redaction, clock correction, request filtering.
- **Fixture app:** one page per edge case in section 4.
- **E2E:** record → render → media-probe checks of codec, size, fps, frame count, duration and color tags (ffprobe when installed, plus the tool's own check).
- **Pixel checks:** color bands measured in the output, within 6 levels. Stored golden images are not used, because font rendering differs between machines.
- **Results:** [TEST-RESULTS.md](TEST-RESULTS.md) lists every test, its result and the problems found.
- **Crash tests:** only on throwaway CI machines. Never run them locally, not even in a container: Linux sends container crash dumps to the host's crash handler.

## 9. Verified

| Item | Result |
|---|---|
| playwright-core with installed Chrome, no browser download | ✅ |
| 2× desktop and 3× phone frames through a raw CDP screencast | ✅ |
| Desktop hover and phone no-hover/coarse identities | ✅ |
| `userAgent` override keeps browser brands | ✅ |
| mediabunny H.264 MP4, index first, no edit list, automatic codec level | ✅ streamed to disk; ffprobe and full decode |
| Limited-range BT.709 output with correct tags and colors | ✅ tags right; worst color error 2 levels (limit 6) |
| Render at real time or faster | ✅ 10 s 1080p60 in 7.1 s on 12 cores |
| In-page `<select>` via `base-select` | ✅ fixture test |
| Stepped wheel scrolling is smooth | ✅ fixture test: page, inner list, no jumps |
| Dialog auto-handling removes hangs | ✅ fixture test; headless Chrome leaves a guarded page without a prompt |
| Typing by code point handles emoji | ✅ fixture test: emoji, flags, family emoji, CJK |
| New tabs and self-closing popups are followed | ✅ fixture test |
| Polling, server events, slow loads and late fonts never hang a step | ✅ fixture test |
| Launcher script sets core-dump limit 0 on every browser process, over the pipe | ✅ |

## 10. Open items

| # | Item | Settled in |
|---|---|---|
| O1 | A forced crash writes no core dump | M0 (CI machine) |
| O2 | Streaming output without holding the file in memory | ✅ M2 |
| O3 | Transfer tag (sRGB vs BT.709) on Safari and QuickTime | M2 (on a Mac) |
| O4 | macOS and Windows behavior | M0 CI |
| O5 | H.264 encoder in plain Chromium builds; VP9 fallback | M2: fallback built, not yet tested on such a build |
| O6 | Platforms accepting MP4 without audio | M7: no platform's published rules ask for an audio track; an upload to each is still to do |

## 11. Decisions

1. **Package name:** `cursorcam` ✅
2. **Publishing:** npm package + Claude plugin marketplace ✅
3. **Claude Desktop chat (MCP)** after v1? Recommended: yes.
4. **Visible browser:** hidden by default, with `--headed`? Recommended: yes.
5. **Vertical:** phone recording rather than cropping? Recommended: yes.
6. **Default fps:** 60, with presets at 30? Recommended: yes.
7. **Mac and test accounts:** for the color check and upload checks.
8. **License:** Apache-2.0, copyright Avijit Dey ✅
9. **Repository:** `Avijit07x/cursorcam`, homepage `cursorcam.vercel.app` ✅
