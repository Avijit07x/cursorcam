<div align="center">

<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-wordmark-dark.svg" />
    <img alt="CursorCam" src="./assets/logo-wordmark-light.svg" height="64" />
  </picture>
</h1>

**Ask Claude for a demo video.** Claude clicks through your web app and hands back a polished MP4 that zooms in on each click.

[Website](https://cursorcam.vercel.app) &nbsp;·&nbsp; [Changelog](./CHANGELOG.md) &nbsp;·&nbsp; [Contributing](./CONTRIBUTING.md)

<sub>CursorCam is in beta. If something breaks, please [open an issue](https://github.com/Avijit07x/cursorcam/issues).</sub>

<p>
  <a href="https://www.npmjs.com/package/cursorcam"><img alt="npm" src="https://shieldcn.dev/npm/v/cursorcam.svg?variant=secondary&size=xs&theme=zinc" /></a>
  <a href="https://github.com/Avijit07x/cursorcam/stargazers"><img alt="GitHub stars" src="https://shieldcn.dev/github/stars/Avijit07x/cursorcam.svg?variant=secondary&size=xs&theme=zinc" /></a>
  <a href="https://github.com/Avijit07x/cursorcam/graphs/contributors"><img alt="Contributors" src="https://shieldcn.dev/github/contributors/Avijit07x/cursorcam.svg?variant=secondary&size=xs&theme=zinc" /></a>
  <a href="https://github.com/Avijit07x/cursorcam/commits"><img alt="Last commit" src="https://shieldcn.dev/github/last-commit/Avijit07x/cursorcam.svg?variant=secondary&size=xs&theme=zinc" /></a>
  <a href="./LICENSE"><img alt="License Apache-2.0" src="https://shieldcn.dev/github/license/Avijit07x/cursorcam.svg?variant=secondary&size=xs&theme=zinc" /></a>
</p>

</div>

<a href="./assets/demo.mp4"><img alt="A video made with CursorCam: in a sample issue tracker it creates an issue with a title, description, priority and assignee, opens it and posts a comment, zooming in where each action happens" src="./assets/demo.webp" width="100%" /></a>

<p align="center"><sub>Made with CursorCam from 13 steps. <a href="./assets/demo.mp4">Watch the full-quality MP4</a> (1080p, 60 fps).</sub></p>

---

## Setup

You need:

- [Claude Code](https://claude.com/claude-code)
- Node.js 22.13 or newer
- Google Chrome, Microsoft Edge, Chromium or Brave, version 120 or newer

CursorCam records with the browser you already have, in a hidden window. Nothing else is downloaded.

**1. Install the plugin.** Run these in Claude Code:

```
/plugin marketplace add Avijit07x/cursorcam
/plugin install cursorcam@cursorcam
/reload-plugins
```

**2. Ask for a video.** Give the URL and what to show:

```
/cursorcam http://localhost:3000 — sign up, create a project, invite a teammate
```

You can also ask in your own words, like "make a 20 second demo of the checkout flow for LinkedIn".

**3. Get the video.** Claude hands back three files in `cursorcam-output/`:

- `video.mp4`: 1920×1080 at 60 fps, ready to post
- `poster.jpg`: the first frame, for a thumbnail
- the steps file, to record the same video again after the app changes

Add `cursorcam-output/` to your `.gitignore`. To update the plugin later, run `claude plugin update cursorcam@cursorcam` and restart Claude Code.

## How it works

Claude:

1. Starts your dev server if it is not running.
2. Explores the app with `inspect`.
3. Writes the steps and runs `check` until they pass.
4. Records and renders in a hidden browser.
5. Reads stills of the video to check its own work, and fixes what looks wrong.
6. Hands back the MP4, a poster image and the steps file.

When it needs something only you have, like a login or a 2FA code, it asks in a clear format:

```
❓ I need a login for http://localhost:3000 to record the dashboard.
Reply with: email, password
```

A login you give is used for that run only. Claude passes it to the one command that needs it and never writes it to a file, a log or memory. The plugin also blocks commands that would print every environment variable.

## Use the CLI

The plugin runs this CLI. You can run it yourself too.

Check the machine once:

```bash
npx cursorcam@beta doctor
```

Write a steps file, `steps.json`:

```json
{
  "url": "http://localhost:3000",
  "steps": [
    { "click": "role=button[name='Get started']" },
    { "type": "alex@example.com", "into": "label=Email" },
    { "press": "Enter" },
    { "waitFor": "text=Dashboard" }
  ]
}
```

Record and render it:

```bash
npx cursorcam@beta run steps.json
```

The video lands in `cursorcam-output/<name>-<time>-<id>/video.mp4`: 1920×1080, 60 fps, H.264.

## Commands

| Command          | Does                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `doctor`         | Checks Node, the browser, screen capture, the video encoder, crash dumps, disk space and fonts, and prints fixes |
| `inspect <url>`  | Saves the first frame of a page and lists what can be clicked, with targets                                      |
| `check <steps>`  | Dry run that saves one frame per step and stops at the first failure                                             |
| `record <steps>` | Records the steps without rendering                                                                              |
| `render <run>`   | Renders a recorded run into an MP4                                                                               |
| `run <steps>`    | `record` and `render` in one go                                                                                  |
| `stills <run>`   | Saves key-moment stills and a close-up crop of each step                                                         |
| `wait [run]`     | Waits until a run finishes, fails or needs an answer, and says which                                             |
| `answer <run>`   | Passes a reply to a run waiting at an `ask` step                                                                 |
| `login <url>`    | Opens a browser window to log in by hand, and saves the login for recordings                                     |

Add `--json` to most commands for machine-readable output, and `--headed` to `check`, `record` or `run` to watch the browser.

`--detach` starts `check`, `record` or `run` in the background and prints the run folder at once. Follow it with `cursorcam wait <run>`. `check --until 3` checks only the first three steps.

## Steps

Each step does exactly one thing:

| Step                         | Value                                    | Extra keys                    |
| ---------------------------- | ---------------------------------------- | ----------------------------- |
| `goto`                       | path or URL                              |                               |
| `click`, `dblclick`, `hover` | target                                   |                               |
| `type`                       | text                                     | `into`, `paste`, `clear`      |
| `press`                      | key, like `Enter` or `Mod+K`             |                               |
| `select`                     | option label or labels                   | `in`, `showList`              |
| `upload`                     | file path or paths                       | `into`                        |
| `scroll`                     | `{ "to": target }` or `{ "by": pixels }` | `in`                          |
| `drag`                       | target                                   | `to`                          |
| `waitFor`                    | target                                   | `state` (`visible`, `hidden`) |
| `pause`                      | milliseconds                             |                               |
| `ask`                        | what to ask the person running it for    | `into`                        |

Any step also takes `zoom` (1–3, or `false`), `speed`, `pauseAfter` and `dialog`.

**The camera** zooms in for each click and typing. While the next actions stay in the same area, it stays zoomed. When the flow moves somewhere else, or ends, it zooms out to show what changed. It never pans across the page while zoomed. Each step pauses 700 ms after it, and `pauseAfter` changes that.

You can change how it zooms by asking Claude, like "no zoom", "stay zoomed after clicks" or "zoom in on the result at the end". Claude sets these for you:

- `"zoom": false` on a step keeps the whole page in view, and `"zoom": 1.5` sets the level.
- A `hover` step with a `zoom` holds the zoom on that part for the whole step.
- The `zoom` style sets `max`, the closest zoom, and `hold`, how long to stay zoomed after each action.

**Targets** are strings like `role=button[name='Save']`, `label=Email`, `text=Sign in`, `placeholder=Search`, `testid=submit` or plain CSS. When a page has more than one match, pick one with `{ "find": "text=Save", "nth": 0 }`, `within`, `near` or `frame`. Run `cursorcam inspect <url>` to list targets that work.

**Top-level keys:** `url`, `name`, `viewport` (`desktop` or `phone`), `locale`, `timezone`, `colorScheme`, `reducedMotion`, `permissions`, `httpCredentials`, `ignoreHTTPSErrors`, `allowOrigins`, `mask` and `timeout`.

## Logins and secrets

Never put a password in the steps file. Use a placeholder and pass the value to that one command:

```json
{ "type": "$secret:password", "into": "label=Password" }
```

```bash
CURSORCAM_SECRET_PASSWORD='…' npx cursorcam@beta run steps.json
```

- Secret values never reach a file, a log or the terminal output.
- A secret typed into a field that is not a password field is blurred in the video.
- `$env:NAME` reads a variable you already keep in your environment.
- `mask` blurs elements, like `[".user-email"]`, in every frame.
- For a one-time code, add `{ "ask": "2FA code", "into": "label=Code" }`. The run waits, and you pass the code with `printf %s "123456" | cursorcam answer <run>`.

For a site with a captcha or a bot check, log in once by hand:

```bash
npx cursorcam@beta login https://app.example.com/login --profile acme
```

A browser window opens. Log in, then close the window. Record with `--profile acme` from then on. The saved login holds the site's cookies, not your password, in a file only you can read. Delete it with `cursorcam login --profile acme --forget`.

## Rendering

Render a recorded run again with a new look, without recording again:

```bash
npx cursorcam@beta render cursorcam-output/<run> --for x --style '{"background":"sunset"}'
```

| `--for`    | Size      | fps | Rule             |
| ---------- | --------- | --- | ---------------- |
| (default)  | 1920×1080 | 60  | 8 Mbps           |
| `youtube`  | 1920×1080 | 60  | 12 Mbps          |
| `x`        | 1920×1080 | 30  | up to 140 s      |
| `linkedin` | 1920×1080 | 30  | 3 s to 15 min    |
| `discord`  | 1280×720  | 30  | fits under 20 MB |

- `--max-size 10MB` keeps the file under any size.
- `--format square` or `--format vertical`. Vertical needs `"viewport": "phone"` in the steps file.
- `--clean` deletes the raw frames after rendering. Otherwise they are kept for 7 days.
- Each render also saves a poster image, the video's first frame, like `poster.jpg` next to `video.mp4`.

**Style** is a JSON file or inline JSON:

| Key          | Default     | Values                                                                                                 |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------ |
| `background` | `aurora`    | `aurora`, `sunset`, `ocean`, `forest`, `midnight`, `paper`, a hex color, `{ "from", "to", "angle" }` or `{ "image": "bg.png" }` |
| `padding`    | `0.06`      | 0 to 0.3 of the frame                                                                                  |
| `radius`     | `14`        | 0 to 48                                                                                                |
| `shadow`     | `0.45`      | 0 to 1                                                                                                 |
| `browserBar` | `true`      | `false` hides the window bar                                                                           |
| `urlBar`     | page URL    | custom text, or `false`                                                                                |
| `cursor`     | shown       | `{ "show", "size", "ripple" }`                                                                         |
| `zoom`       | on, up to 2 | `{ "enabled", "max", "hold" }`, max 1.3 to 2.5, hold in ms after each action                           |
| `dialogs`    | `true`      | draws browser dialogs as cards                                                                         |
| `trimIdle`   | `true`      | speeds up idle waits                                                                                   |

An image background is a PNG, JPEG or WebP file that covers the frame. A relative path starts from the style file's folder.

## Exit codes

| Code | Meaning                                        |
| ---- | ---------------------------------------------- |
| 0    | ok                                             |
| 1    | unexpected error                               |
| 2    | bad input                                      |
| 3    | no usable browser, or `doctor` found a problem |
| 4    | a step failed                                  |
| 5    | encoding failed                                |
| 6    | timeout                                        |
| 7    | the page did not load                          |
| 8    | disk full                                      |
| 9    | interrupted                                    |
| 10   | blocked, or needs a human                      |
| 11   | the browser crashed                            |

A failed run saves `failure.jpg` and names the step that failed.

## Contributing

Bug reports and pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md). To report a security problem, see [SECURITY.md](./SECURITY.md).

## License

[Apache-2.0](./LICENSE)
