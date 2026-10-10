# cursorcam

## 1.0.0-beta.2

### Minor Changes

- New scene backgrounds: `"background": { "scene": "glow", "colors": "indigo" }`. Pick from 14 scenes, like `mesh`, `glow`, `dunes` and `glass`, and color them with one of 9 palettes or any two hex colors. Each scene fits every video shape and window size.

### Patch Changes

- Opening a page now gets at least 30 seconds, even when the steps set a shorter `timeout`. A short timeout meant for steps no longer fails a slow first page with "Could not open".

## 1.0.0-beta.1

### Major Changes

- First beta release. Ask Claude for a demo video: the Claude Code plugin adds the `cursorcam` skill, so `/cursorcam http://localhost:3000 — sign up and create a project` makes Claude explore the app, write the steps, check them, record and render in a hidden browser, review stills of its own video and hand back the MP4.
  - Install it with `/plugin marketplace add Avijit07x/cursorcam`, then `/plugin install cursorcam@cursorcam`.
  - Claude starts the app's dev server when it is not running, and stops only the servers it started.
  - When the steps need something only you have, like a login, a 2FA code or which account to use, Claude asks in two clear lines: what it needs and why, then `Reply with:` and the format.
  - A login you give is used for that run only. Claude passes it to the one command that needs it and never writes it to a file, a log or memory.
  - The plugin blocks commands that would print every environment variable, like `env` or `printenv`, in every session. Everything else runs as before.
- The `cursorcam` CLI records a click demo of any web app from a steps file and renders a polished MP4: zoom on each click and typed text, a smooth cursor with click ripples, a gradient or image background, rounded corners, a shadow and a browser bar with the page URL.
- Ten commands:
  - `doctor` checks Node, the browser, screen capture, the video encoder, crash dumps, disk space and fonts, and prints a fix for each problem.
  - `inspect <url>` saves the first frame of a page and lists what can be clicked, with a target for each that is checked to match exactly one element. `--filter` and `--limit` narrow the list, and it warns about things a video can't show, such as native date pickers and tooltips.
  - `check <steps>` is a dry run that saves one frame per step and stops at the first failure.
  - `record <steps>` records without rendering, `render <run>` renders a recording, and `run <steps>` does both.
  - `stills <run>` saves key-moment stills at video size and one close-up crop per step.
  - `wait [run]` waits until a run finishes, fails or needs an answer, and says which in one line.
  - `answer <run>` passes a reply to a run waiting at an `ask` step.
  - `login <url>` opens a browser window to log in by hand, for sites with a captcha or a bot check, and saves the login. Record with `--profile <name>` from then on. The saved login holds the site's cookies, not the password, in a file only you can read, and `--forget` deletes it.
- `--detach` starts `check`, `record` or `run` in the background and prints the run folder at once, and `check --until <step>` checks only the first steps.
- Recording uses the Chrome, Edge, Chromium or Brave already on the machine, version 120 or newer, in a hidden window. Nothing else is downloaded. Desktop runs capture at 2560×1600 and phone runs at 1170×2532, so zoomed shots stay sharp.
- The page behaves like a real browser on camera: hover effects work, scrolling is smooth wheel scrolling, scrollbars are hidden and pages never flash white.
- Steps support `goto`, `click`, `dblclick`, `hover`, `type`, `press`, `select`, `upload`, `scroll`, `drag`, `waitFor`, `pause` and `ask`. Every step also takes `zoom`, `speed`, `pauseAfter` and `dialog`.
- The camera zooms in while the cursor travels, so the zoom lands before the click. It stays zoomed while the next actions are in the same area, and zooms out when the flow moves somewhere else or ends. It never pans across the page while zoomed. `"zoom": { "hold": 1000 }` in the style keeps it zoomed after each action, and a `hover` step with a `zoom` holds on that part for the whole step.
- Each step pauses 700 ms after it, so viewers see what changed. `pauseAfter` sets a longer or shorter pause, and `"zoom": false` keeps the whole page in view for a step.
- Targets read like the page: `role=button[name='Save']`, `label=Email`, `text=Sign in`, `placeholder=…`, `testid=…` or plain CSS. When a page has two matches, the error lists both, and `nth`, `within` or `near` picks one. Targets inside iframes (`frame`) and shadow DOM work too.
- Checkboxes and radio buttons that the page draws itself, over an invisible input, can be clicked like any other target.
- Steps never hang. Each step waits for its target to be visible, still, enabled and uncovered, then for page loads, network requests and fonts to settle, with a time limit (`timeout`, 15 s by default). A cookie banner in the way is named in the error.
- New tabs are followed and left when they close. Alerts, confirms and prompts are answered by the step's `dialog` option, downloads are saved in the run folder, and uploads work with styled file pickers.
- Typing is exact for emoji, flags, CJK and accented text, and the field value is checked after typing.
- Phone recordings (`"viewport": "phone"`) tap instead of click and show a touch dot instead of a cursor.
- Logins stay private:
  - `$secret:NAME` reads `CURSORCAM_SECRET_NAME` from that one command, and `$env:NAME` reads a variable you already have. Values never reach a file, a log or the terminal output.
  - A secret typed into a field that is not a password field is blurred in the video, and `mask` blurs any element in every frame.
  - An `ask` step waits for a one-time code, passed with `cursorcam answer`. The code is never stored.
- Bot checks and captcha pages stop the run with exit code 10 instead of recording a blocked page.
- Videos are 1920×1080 at 60 fps, H.264 with standard BT.709 color. Each file is read back after encoding to check its size and frame count.
- `--for youtube`, `x`, `linkedin` and `discord` match each platform's size, frame rate and limits, and `--max-size 10MB` fits any file size limit.
- `--format square` makes a 1080×1080 video, and `--format vertical` makes a 1080×1920 video from a phone recording.
- The camera holds while typing and cuts on page loads and tab switches. `zoom` sets the level per step, or turns it off.
- Idle waits are sped up, while `pause`, `pauseAfter` and the ending play at normal speed. While a page loads, the last good frame is held.
- `--style` changes the background (six gradients, any color, a custom gradient or an image file), padding, corner radius, shadow, browser bar, URL text, cursor size, ripples, zoom limit, dialog cards and idle trimming. An image path in a style file starts from that file's folder.
- Each render also saves a poster image, the video's first frame, next to the video, like `poster.jpg` for `video.mp4`.
- A recording can be rendered again with a new look or preset without recording again. Raw frames are kept for 7 days, or deleted right away with `--clean`.
- Every run gets its own folder in `cursorcam-output/`, with `status.json` while it runs and `result.json` when it ends, and `--json` prints the result for scripts.
- Each failure has its own exit code and a clear message with a hint, and a failed step saves `failure.jpg`.
- A run never leaves a browser running, writes no crash dumps, and stops cleanly when the disk runs low.
