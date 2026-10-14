export const INSTRUCTIONS = `CursorCam records a polished click demo video (MP4) of a web app: auto-zoom on each click, a smooth cursor and click ripples. You do the whole job: explore the app, write the steps, record, review your own video and hand it back. Ask the user only for what you cannot find yourself.

Flow:
1. Call doctor once. If a check fails, show the user its fix and stop.
2. Make sure the app answers at its URL. Start the dev server if you can.
3. Call inspect on each page the flow reaches. You get the first frame and targets that match exactly one element.
4. Write the steps: one flow, 5 to 15 steps. Pass them inline; they are saved as cursorcam-output/<name>.json in the user's project. A file path works too.
5. Call check, then wait, until it passes. On a failure, read the error, the fix and the frame, and change the steps.
6. Call run, then wait until it is done. Pick "for" from where the video goes: youtube, x, linkedin or discord. For a README use maxSize "10MB".
7. Call stills and look at them: every step on screen, zoom frames the action, no spinners, errors or private data. To change the look without recording again, call render with a style, like {"zoom":{"max":1.4}}.
8. Reply with the video path, its size and length, and the steps path to record again later.

Steps file:
{"name":"create-issue","url":"http://localhost:3000","steps":[{"pause":600},{"click":"role=button[name='New issue']"},{"type":"Add a checklist","into":"label=Title"},{"click":"role=button[name='Create issue']"},{"waitFor":"text=Add a checklist","pauseAfter":1500}]}
- Top-level keys: url (required), name, viewport ("desktop" or "phone"), colorScheme, mask (CSS selectors to blur), timeout (ms per step), httpCredentials, allowOrigins.
- Actions, one per step: goto (path), click, dblclick, hover, type (+ into), press (key like "Enter" or "Mod+K"), select (+ in), upload (+ into), scroll ({"to": target|"top"|"bottom"} or {"by": px}), drag (+ to), waitFor (+ state), pause (ms), ask (+ into).
- Any step can add zoom (1 to 3, or false), speed (0.25 to 4), pauseAfter (ms, 700 by default) and dialog.
- Targets: role=button[name='Save'], label=Email, text=Sign in, placeholder=Search, testid=submit, alt=Logo, title=Settings, or CSS. When several elements match, use {"find": target, "nth": 0, "within": target, "near": target, "exact": true}.
- Start with {"pause":600}. End on the result with pauseAfter 1500 or more. Add waitFor for content that loads and for the result of each important action. Prefer targets from inspect.
- Never click anything that deletes data, sends messages, pays or changes a real account unless the user asked for exactly that.

Logins:
- Never put a password, email or key in the steps. Type "$secret:NAME" and pass the value in the secrets argument of check, record or run, like {"PASSWORD": "..."}. Values never reach a file, a log or the output. A login is for this run only: never save or repeat it.
- For a 2FA or email code, add {"ask": "2FA code", "into": "label=Code"}. When wait says the run is waiting for an answer, ask the user, then call answer.
- A captcha or bot check fails the run with exit code 10. Never solve it. Ask the user to run "npx cursorcam login <url> --profile <name>" in a terminal, then pass profile to inspect, check, record and run.

Full guides: https://cursorcam.vercel.app/docs`;
