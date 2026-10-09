---
name: cursorcam
description: Records a polished click demo video (MP4) of a web app or website. Claude explores the app, writes the steps, records them in a hidden browser and renders a video with auto-zoom, a smooth cursor and click ripples, then checks stills of the result and hands back the file. Use when the user asks for a demo video, walkthrough, product tour, screen recording or click-through video of a site or a local app, for a README, docs, X, LinkedIn, YouTube or Discord. Not for promo or launch videos with motion graphics, voice-over or music.
argument-hint: <url> — what to show
allowed-tools: Bash(npx -y cursorcam@1.0.0-beta.1 *)
---

# CursorCam

Make a click demo video of a web app with the `cursorcam` CLI. You do the whole job: explore the app, write the steps, record, review your own video and hand it back. Ask the user only for things you cannot find yourself.

## Run the CLI

- Always run it as `npx -y cursorcam@1.0.0-beta.1 <command>`. Below, `cursorcam` is short for that.
- Quote every file and folder path.
- Before the first recording in a session, run `cursorcam doctor`. If a line starts with ✗, show the user that line and its `Fix:` line, then stop.
- It needs Node.js 22.13+ and Chrome, Edge, Chromium or Brave on this machine. It downloads nothing else.

## 1. Understand the request

Find out:

- **The URL**, and **what to show**: one flow, about 10 to 40 seconds.
- **Where it will be posted.** That picks the render options:

| Posted on | Options |
| --- | --- |
| YouTube | `--for youtube` |
| X | `--for x` (up to 140 s) |
| LinkedIn | `--for linkedin` (3 s to 15 min) |
| Discord | `--for discord` (under 20 MB) |
| README or docs | `--max-size 10MB` |
| Square feed post | `--format square` |
| Phone, vertical | `"viewport": "phone"` in the steps, then `--format vertical` |

If the user did not say, use the default (1920×1080, 60 fps) and offer other sizes at the end. A new size renders in seconds and does not record again. Only a vertical video needs a phone recording.

**How it zooms.** By default the camera zooms in for each click and typing, stays zoomed while the next actions are in the same area, and zooms out when the flow moves somewhere else. When the user asks for something else, set it:

| The user asks for | Set |
| --- | --- |
| No zoom | `--style '{"zoom":{"enabled":false}}'` |
| Stay zoomed after clicks | `--style '{"zoom":{"hold":1000}}'`, the time in ms |
| More or less zoom | `--style '{"zoom":{"max":2.5}}'`, 1.3 to 2.5 |
| Zoom on one part, like the result | A `hover` step on it with `"zoom": 1.5` and `pauseAfter` |
| No zoom on one step | `"zoom": false` on that step |

A zoom change renders again in seconds with `render`, without recording again.

## 2. Make sure the app is running

- Check the URL answers: `curl -s -o /dev/null -w "%{http_code}" "<url>"`.
- A local URL that does not answer: find the dev script in `package.json` (`dev` or `start`), start it in the background, read the real URL from its output, and wait until it answers. Note its process ID, so you can stop exactly that process later.
- No URL given: find this project's dev server. Use a running one only if it is this project (its page title or content matches). Otherwise start one as above.

## 3. Explore

`cursorcam inspect "<url>"` saves `frame.jpg`, the first frame of the video, and lists targets that match exactly one element, in page order.

- Read the frame image to see the page.
- `--filter <text>` narrows the list, `--limit <n>` raises the cap, `--phone` shows the phone layout, `--profile <name>` uses a saved login.
- Inspect each page the flow reaches, by its URL.
- When the app's source code is here, read it for route names, button labels and test IDs.

## 4. Write the steps

Save the steps as `cursorcam-output/<short-name>.json`. The full reference is in [references/steps.md](references/steps.md).

```json
{
  "name": "create-issue",
  "url": "http://localhost:3000",
  "steps": [
    { "pause": 600 },
    { "click": "role=button[name='New issue']" },
    { "type": "Add an onboarding checklist", "into": "label=Title", "zoom": 1.5 },
    { "click": "role=button[name='Create issue']", "pauseAfter": 800 },
    { "hover": "text=Add an onboarding checklist", "pauseAfter": 1500 }
  ]
}
```

For a good video:

- Start with `{ "pause": 600 }` so viewers see the page first. End on the result, with `pauseAfter` of 1500 ms or more.
- Show one flow, in 5 to 15 steps, with no detours.
- Use targets from `inspect`. Prefer `role=`, `label=` and `testid=` over CSS.
- Type short, realistic text. Never type real personal data.
- The camera zooms in for each click and typing, stays zoomed while the next actions are in the same area, and zooms out when the flow moves on. Add `"zoom": false` to a step that should show the whole page, and `"zoom": 1.5` to set the level for a step.
- On sparse pages, a button often sits far from the content it acts on, like a checkout's Finish button next to the order summary. Give that click `"zoom": false` or `"zoom": 1.3`, so the content stays in the shot.
- Add `waitFor` for content that loads after an action, so the video never shows a spinner.
- Add a `waitFor` for the result of each important action, like the new item's text or a "1 item left" counter. Then `check` fails when an action does not do what you meant, instead of passing quietly.
- Every step already pauses 700 ms after it. Raise `pauseAfter` to 1200 or more where viewers need to read something.
- Hide personal data on screen with `"mask": [".user-email"]`.
- Never click anything that deletes data, sends messages, pays or changes a real account, unless the user asked for exactly that.
- Never put a password or key in the steps. Use `$secret:NAME` (see Logins).

## 5. Check

`cursorcam check "<steps file>"` runs the steps quickly and saves one frame per step in `<run folder>/check/`.

- On a failure it prints the failed step, the error, a `Fix:` line and the path of `failure.jpg`. Read the frame, fix the steps, run `check` again.
- When it passes, read 2 or 3 of the frames to confirm they show what the user asked for. A pass means every step ran, not that every click had the effect you wanted.
- If the steps have an `ask` step, check only the steps before it, with `--until <step number>`. Each answer is a fresh code from the user, so ask only once, during the real run.
- Exit codes and common fixes are in [references/troubleshooting.md](references/troubleshooting.md).

## 6. Record and render

Start the run with `--detach`. It prints the run folder at once and keeps recording in the background. Then wait for it:

```bash
cursorcam run "cursorcam-output/create-issue.json" --for x --detach
cursorcam wait "<run folder>"
```

`wait` returns within 90 seconds and prints one of these:

- `Done. Video: …`: go to step 7.
- `Still …`: run `wait` again.
- `Waiting for an answer: <what>`: ask the user (see Asking the user). Send the reply with `printf '%s' '<reply>' | cursorcam answer "<run folder>"`, then `wait` again. The run gives up after 5 minutes.
- `Failed …`: read the error, the `Fix:` line and the frame, fix the steps, then start the run again.
- `The run stopped …`: read the log it names, then start the run again.

`check` takes `--detach` too, for long flows.

## 7. Review your own video

`cursorcam stills "<run folder>"` saves stills at video size, plus one close-up crop per step, in `<run folder>/stills/`. Read 4 to 6 of them and check:

- Every step shows on screen, and the cursor lands on the right element.
- Zoomed shots frame the action, and nothing important is cut off.
- No spinners, blank pages, error messages or cookie banners.
- No private data. Mask it, or ask the user.

Never hand back a video with a problem you can see in the stills. A zoomed shot that is mostly empty space, or that cuts off what the step changes, is a problem to fix:

- For the whole video, lower the zoom without recording again: `cursorcam render "<run folder>" --style '{"zoom":{"max":1.4}}'`. Other looks are in [references/style.md](references/style.md).
- For one step, set its `zoom` in the steps file (`false` or `1.3`) and run again.

After 3 tries, stop and tell the user what is still wrong.

## 8. Hand it back

Stop any dev server you started, by the process ID you noted or by stopping its background task. Never use `pkill -f` or `killall`: they can match your own shell.

Then reply in this shape, with the real values:

```
Your demo video is ready: <one line on what it shows>.

Video: <full path of the .mp4> (<size>, <length>, <width>×<height>)
Poster: <full path of the poster .jpg>
Steps: <full path of the steps file>, to record again after the app changes

Other sizes, made from the same recording: <the --for and --format options that fit>
```

If the project uses git and `.gitignore` does not list `cursorcam-output/`, offer to add it.

## Asking the user

When the steps need something only the user has, like a login, a 2FA or email code, which account to use, or test data, ask directly in two lines, then continue:

```
❓ I need a login for http://localhost:3000 to record the dashboard.
Reply with: email, password
```

Ask for everything you need in one message. Ask before you record a real account with real data.

## Logins

- A login the user gives is for this run only. Never write it in the steps, a file, a log or memory, and never repeat it back in chat.
- In the steps, use placeholders: `{ "type": "$secret:EMAIL", "into": "label=Email" }` and `{ "type": "$secret:PASSWORD", "into": "label=Password" }`.
- Pass the values only to the one command that needs them: `CURSORCAM_SECRET_EMAIL='…' CURSORCAM_SECRET_PASSWORD='…' cursorcam check …`, and the same for `run`. Never `export` them. Write a `'` inside a value as `'\''`.
- Password fields show dots. Any other secret value is blurred in the video.
- For a 2FA or email code, add `{ "ask": "2FA code", "into": "label=Code" }` where the code goes.
- For HTTP basic auth, add `"httpCredentials": { "username": "$secret:USER", "password": "$secret:PASS" }`.
- A captcha or bot check ends the run with exit code 10. Never try to solve it. Tell the user a browser window will open and that they should log in there and close the window. Then run `cursorcam login "<login page url>" --profile <name>` in the foreground with a 10 minute timeout. Add `--profile <name>` to `inspect`, `check` and `run` from then on. The saved login holds the site's cookies, not the password. Never open or print the saved login file.

## Safety

- Never print the whole environment, for example with `env`, `printenv`, `set` or `export -p`.
- Never solve a captcha or get around a bot check.
- Record only what the user asked for.
