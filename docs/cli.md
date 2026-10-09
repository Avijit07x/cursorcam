# CLI

The plugin runs the `cursorcam` CLI for you. You can run it yourself too. Every example uses `npx cursorcam@beta`.

## A typical session

1. Check the machine once: `npx cursorcam@beta doctor`
2. See the page and its targets: `npx cursorcam@beta inspect http://localhost:3000`
3. Try the steps quickly: `npx cursorcam@beta check steps.json`
4. Record and render: `npx cursorcam@beta run steps.json`
5. Look at key moments: `npx cursorcam@beta stills cursorcam-output/<run>`
6. Make another size: `npx cursorcam@beta render cursorcam-output/<run> --for linkedin`

## Commands

| Command | Does |
| --- | --- |
| `doctor` | Checks Node, the browser, screen capture, the video encoder, crash dumps, disk space and fonts, and prints fixes |
| `inspect <url>` | Saves the first frame of a page and lists what can be clicked, with targets |
| `check <steps>` | A quick dry run that saves one frame per step and stops at the first failure |
| `record <steps>` | Records the steps without rendering |
| `render <run>` | Renders a recorded run into an MP4 |
| `run <steps>` | `record` and `render` in one go |
| `stills <run>` | Saves key-moment stills and a close-up of each step |
| `wait [run]` | Waits until a run finishes, fails or needs an answer, and says which |
| `answer <run>` | Sends a reply to a run waiting at an `ask` step |
| `login <url>` | Opens a browser window to log in by hand, and saves the login for recordings |

## Options

| Option | On | Does |
| --- | --- | --- |
| `--for <preset>` | `run`, `render`, `stills` | `youtube`, `x`, `linkedin` or `discord`. See [Look and size](style.md) |
| `--max-size <size>` | `run`, `render` | Keeps the file under a size, like `10MB` |
| `--format <format>` | `run`, `render`, `stills` | `landscape`, `square` or `vertical` |
| `--style <file-or-json>` | `run`, `render`, `stills` | The look of the video |
| `--clean` | `run`, `render` | Deletes the raw frames after rendering |
| `--profile <name>` | `inspect`, `check`, `record`, `run` | Uses a login saved with `login` |
| `--headed` | `check`, `record`, `run` | Shows the browser window |
| `--detach` | `check`, `record`, `run` | Runs in the background and prints the run folder. Follow it with `wait` |
| `--until <step>` | `check` | Checks only up to that step number |
| `--out <dir>` | `inspect`, `check`, `record`, `run` | Folder for run folders, instead of `cursorcam-output` |
| `--phone`, `--filter <text>`, `--limit <n>`, `--mask <selectors...>` | `inspect` | Phone layout, filter or cap the list, blur elements |
| `--count <n>` | `stills` | How many key moments, 6 by default |
| `--timeout <seconds>` | `wait` | How long to wait, 90 by default |
| `--json` | most commands | Machine-readable output |

## The run folder

Each run gets its own folder, `cursorcam-output/<name>-<time>-<id>/`:

| File | Holds |
| --- | --- |
| `video.mp4`, `poster.jpg` | The video and its first frame. Other presets and formats add their own, like `video-x.mp4` |
| `steps.json` | A copy of the steps that made it |
| `result.json` | The outcome: the video, its size and length, or the error |
| `failure.jpg` | The frame where a step failed |
| `check/` | One frame per step from `check` |
| `stills/` | Key moments and close-ups from `stills` |
| `log.txt` | The output of a run started with `--detach` |

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | ok |
| 1 | unexpected error |
| 2 | bad input |
| 3 | no usable browser, or `doctor` found a problem |
| 4 | a step failed |
| 5 | encoding failed |
| 6 | timeout |
| 7 | the page did not load |
| 8 | disk full |
| 9 | interrupted |
| 10 | blocked, or needs a human |
| 11 | the browser crashed |

What to do for each one is in [Troubleshooting](troubleshooting.md).
