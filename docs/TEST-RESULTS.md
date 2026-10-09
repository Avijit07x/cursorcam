# Test results

What each phase tests, the result of the latest run, and the problems the tests found.

**Latest run:** 2026-10-09 on Linux (12 cores), Google Chrome 154.0.8037.97, Node 24.11.0.

| Check | Result |
|---|---|
| `pnpm check` (format, lint, typecheck, unused code, plugin version, all tests) | ✅ 65 test files, 330 tests passed |
| `pnpm check:package` (build + package lint) | ✅ |
| `claude plugin validate` on the plugin and the marketplace, with `--strict` | ✅ no warnings |
| Workflow scans: zizmor and actionlint (with shellcheck) | ✅ no findings |
| Browsers or temp folders left after the run | ✅ none |
| macOS and Windows | ⏳ first CI run |

Browser tests use the pages in `test/fixtures/app/`, one page per hard case.

## M0 — Browser, launch and `doctor`

| Test | What it checks | Result |
|---|---|---|
| Browser finder | Finds Chrome, Edge, Chromium or Brave on each OS; honors `CURSORCAM_BROWSER`; clear error when none | ✅ |
| Version check | Reads the version on each OS; refuses versions below 120 | ✅ |
| Identity | Desktop and phone user agents without "Headless"; launch flags for scale and pointer | ✅ |
| Launcher | Written atomically, rewritten when changed, skipped on Windows | ✅ |
| Desktop launch | 2560×1600 frames, hover and fine pointer, brands present | ✅ |
| Phone launch | 1170×2532 frames, no hover, coarse pointer, touch | ✅ |
| Crash dumps | Every browser process has a core-dump limit of 1 byte | ✅ Linux |
| Killed run | No browser left; the next run removes the old profile | ✅ |
| Lifecycle and signals | Cleanup runs in reverse, once, even after errors | ✅ |
| `doctor` | All checks pass on this machine | ✅ |
| Forced crash writes no core dump | CI machines only | ⏳ next CI run, after the 1-byte fix below |

**Found and fixed**

| Problem | Cause | Fix |
|---|---|---|
| A browser crash could write large core dumps | No core-dump limit on browser processes | The browser starts through a launcher that sets the limit to 0, checked in `/proc` for every process |
| The first CI run still found a Chrome core dump | Ubuntu pipes core dumps to `systemd-coredump`, which ignores a limit of 0 | The launcher sets the limit to 1 byte with `prlimit`, the one value that stops piped dumps too |
| A local crash test stopped another service on the machine | Crash dumps go to a host-wide handler | Crash tests run only on throwaway CI machines |
| Browser brands were missing in tests | `about:blank` has no `userAgentData` | Tests load a real page from a local server |

## M1 — Recorder, `check` and `inspect`

| Test | What it checks | Result |
|---|---|---|
| Steps schema | Every action and option; one action per step; clear errors that point at the field | ✅ |
| Locator syntax | `role=`, `label=`, `text=`, `testid=` and the rest; bad syntax refused | ✅ |
| Secrets in steps | `$secret:` and `$env:` read from the environment, checked before launch, hidden from output | ✅ |
| URLs | `goto` stays on the steps origin unless listed; local hosts detected | ✅ |
| Basic flow | Click, type, select, hover, then a link to a second page | ✅ 9 steps in 10.5 s, 64 frames (3.6 MB) |
| Smooth cursor | Many cursor samples per move, no jump over 80 px | ✅ |
| Animated targets | Pulsing button, fade-in, button enabled late | ✅ |
| Hidden target | `opacity: 0` counts as hidden | ✅ |
| Covered target | Sticky header avoided by centered scroll; cookie banner named in the error | ✅ |
| Unclear target | Two "Save" buttons listed in the error; `nth`, `within` and `near` pick one | ✅ |
| Shadow DOM and iframes | Button in shadow DOM; form in a cross-origin iframe | ✅ |
| Select | In-page list with `showList`; missing option lists the real options | ✅ |
| Drag | HTML drag and drop works | ✅ |
| Dialogs | Alert, confirm (dismiss) and prompt (with text) answered; a guarded page still leaves | ✅ |
| Tabs | Follows a new tab and returns when it closes itself | ✅ |
| Downloads and uploads | Download saved in the run folder; upload through a styled picker and a plain input | ✅ |
| Typing | Emoji, flags, family emoji, CJK and accents typed exactly; length limit warned | ✅ |
| Debounced search and controlled input | Search gets the full word once; controlled state matches | ✅ |
| Waiting | Polling, server events, slow page, late font and skeleton never hang a step | ✅ under 25 s |
| Scrolling | Page and inner list scroll by wheel, more than 10 positions, no jump over 400 px | ✅ |
| Phone | Taps instead of clicks; no cursor | ✅ |
| Challenge page | Ends with exit 10 | ✅ |
| Page load failure | HTTP 404 ends with exit 7 | ✅ |
| No hanging | A target that never shows fails within the step time | ✅ |
| Secrets in the video and files | Secret field blurred; `mask` blurred; secret never in events, status or result files | ✅ |
| `ask` step | Waits, takes the answer over a local socket, never logs it | ✅ |
| Frame store | Skips repeated frames; stops with exit 8 when the disk runs low | ✅ |
| Liveness | A page that stops answering ends the run | ✅ |
| `check` command | One frame per step; on failure, exit code, step number and `failure.jpg` | ✅ |
| `answer` command | A recording waits at `ask`; `answer` sends the code by stdin; the code is in no run file | ✅ |
| `inspect` command | First frame saved; working locators in page order; filter and limit; frames and shadow DOM; warnings | ✅ about 2 s per page |

**Found and fixed**

| Problem | Cause | Fix |
|---|---|---|
| The frame index was saved inside the frames folder | Wrong path | Saved next to `events.jsonl` |
| `inspect` listed a date input before the select on the same line | Sorted by top edge only | Targets on the same line are sorted left to right |
| An icon button with a title got no tooltip warning | The title counted as its name | Warn when a title exists and there is no visible text |
| Tiny scroll moves and `-0` deltas | Rounding | Moves under 2 px are skipped |
| New tabs opened by links had no opener | Chrome adds `noopener` to `target=_blank` | The session also follows tabs with no opener |
| No leave-page prompt in headless Chrome | Chrome behavior | Test checks the page still leaves without hanging |

## M2 — Encoding, presets and size limits

| Test | What it checks | Result |
|---|---|---|
| Color conversion | Exact limited-range BT.709 values for white, black, grey, red, green and blue | ✅ |
| Default video | H.264 High, 1920×1080, 60 fps, `yuv420p`, range `tv`, BT.709 tags, frame count matches | ✅ checked by the tool itself and by ffprobe |
| File layout | Index (`moov`) before data, no edit list | ✅ |
| Full decode | ffmpeg decodes every frame without errors | ✅ |
| Color bands | 8 bands measured in the output | ✅ worst error 2 levels (limit 6) |
| X preset | 30 fps | ✅ |
| Discord preset | 1280×720, under 20 MB | ✅ |
| `--max-size` | 400 KB limit met | ✅ |
| LinkedIn | Videos under 3 s refused | ✅ |
| Presets file | Matches the published limits; square and vertical sizes | ✅ |
| Size math | Sizes like `10MB`; bitrate fits the limit with a floor; retry bitrate | ✅ |
| Bad options | Unknown preset exits with 2 | ✅ |
| Opens in QuickTime (AVFoundation) | Needs a Mac | ⏳ |

**Found and fixed**

| Problem | Cause | Fix |
|---|---|---|
| Chrome's own color conversion makes full-range video | Browser default; players that ignore tags crush dark scenes | Own limited-range BT.709 conversion |
| One thread converted only 61 fps | Pixel read and conversion on one thread | Conversion moved to up to 4 workers (100 fps in the benchmark) |
| A 10 s 1080p60 video took 11.4 s | The page drew every frame and copied it to the workers (10.6 ms per frame) | Each worker loads, draws and converts its own frames: 7.1 s |
| Small files showed "0 MB" | Binary MB, no KB | Decimal units like the platforms use, KB for small files |

## M3 — Compositor, frame holding, idle trimming and stills

| Test | What it checks | Result |
|---|---|---|
| Layout | Window and bar centered inside the padding; no bar when off; phone fits a vertical video | ✅ |
| Frame times | Browser times moved onto the recorder clock | ✅ |
| Frame holding | Last good frame held while a page loads; late frames from a closed tab dropped | ✅ |
| Idle trimming | Idle waits squeezed; pauses, `pauseAfter` and the ending kept; `ask` waits squeezed | ✅ |
| Dialog cards | Picture held while the card shows, only when dialogs are on | ✅ |
| Job plan | One draw command per frame, URL bar text, cursor, ripples, dialog card, style options | ✅ |
| Square and vertical | 1080×1080 and 1080×1920; vertical from a desktop recording refused | ✅ |
| Stills | Stills at 1920×1080 and one sharp crop per step | ✅ about 1 s |
| Re-render | New look without recording again; clear error when the frames are gone | ✅ |
| Render speed | 10 s 1080p60 video, browser start included | ✅ 7.1 s (1.4× real time); 720p30 in 3.1 s |
| `run`, `render`, `stills` commands | Together from the CLI, with JSON output and status files | ✅ |
| `--clean` | Deletes the raw frames; a later render explains they are gone (exit 2) | ✅ |

**Found and fixed**

| Problem | Cause | Fix |
|---|---|---|
| After a page change, the video kept the old page | Frames that arrived while loading were dropped for good | They are held, then the newest is shown once loading ends; the URL bar switches at the same moment |
| Idle time was never sped up when no step had finished | The "keep the ending" rule covered the whole video | Only the time after the last step is kept; `pauseAfter` is now recorded and kept |
| Two near-identical crops for each typing step | One crop per event | One crop per step |

## M4 — Camera and cursor

| Test | What it checks | Result |
|---|---|---|
| Zoom level | Small targets zoom to the limit; huge targets don't zoom | ✅ |
| Shots | Ease in before an action; hold after; pan between nearby actions; zoom out after long gaps; merge fast clicks | ✅ |
| Typing and step options | Hold while typing; `zoom` number and `false` per step | ✅ |
| Cuts | A page load or tab switch ends the shot and cuts to the full view | ✅ |
| Smooth motion | No jump over 40 px between samples; zoom over 1.9× at the click | ✅ |
| Cursor follow | A moving cursor stays inside the zoomed view | ✅ |
| Crop | Stays inside the frame and follows the scroll | ✅ |
| Cursor track | Hidden until the first move; smooth between samples; pressed state; fading ripple; touch dot on phones | ✅ |
| Visual check | Contact sheet of a real render reviewed | ✅ |

**Found and fixed**

| Problem | Cause | Fix |
|---|---|---|
| After a page change, the camera stayed zoomed on the old link (a blank area) | Shots crossed page loads | Shots end at page loads and tab switches |
| Zoom reached only 1.67× of 2× at the click | The camera started easing in 550 ms before the action | It starts 900 ms before and settles faster |

## M5 — Claude Code plugin and skill

| Test | What it checks | Result |
|---|---|---|
| Plugin files | `plugin.json` and `marketplace.json` pass `claude plugin validate --strict`; the plugin version is the package version | ✅ |
| Skill file | Name, description under the 1,536-character limit, under 500 lines, every linked reference exists | ✅ |
| Skill matches the CLI | Every `cursorcam <command>` and `--option` in the skill and its references exists in the CLI; every step action, option, target form, top-level key, style key, background, preset and exit code is documented | ✅ |
| Env guard hook | 22 commands that print every variable are blocked (`env`, `printenv`, `set`, `export -p`, `declare -x`, `/proc/*/environ`, `console.log(process.env)` and more); 16 normal commands pass (`printenv HOME`, `env FOO=1 cmd`, `export FOO=bar`, `set -e`) | ✅ about 3 ms per command, 41 ms for a 200 KB command |
| Hook in a real session | Claude Code with the plugin loaded runs `env`; the hook blocks it with the CursorCam message | ✅ |
| `run --detach` | Prints the run folder and returns in under 0.5 s; the run goes on in its own process and writes `log.txt` | ✅ |
| `wait` | Reports progress, done (video, poster, size, length), failed (step, error, fix, frame), waiting for an answer, and a run whose process died | ✅ |
| Detached run with `ask` | `wait` shows the question; `answer` sends the code; the run finishes; the code and the secret are in no file, `log.txt` included | ✅ |
| `check --until` | Checks only the first steps, so a 2FA code is asked for once | ✅ |
| Fresh install | `npx -y cursorcam@1.0.0` from a clean npm cache, through a local registry serving the packed tarball: installs in 4 s, `doctor` all ✓ | ✅ Linux |

**Real Claude Code sessions.** Claude Code 2.1.291 with Sonnet and the plugin loaded with `--plugin-dir`. The skill ran its own `npx -y cursorcam@1.0.0`, installed from the packed tarball through a local registry. Each prompt was the user's first message.

| Session | What Claude did | Result |
|---|---|---|
| Sample issue tracker, dev server not running: "make a short demo of creating an issue with High priority, then opening it, for LinkedIn" | Found the `dev` script and started it, inspected, wrote 8 steps, `check` passed, `run --for linkedin --detach`, `wait`, read 4 stills, stopped the server | ✅ 14.3 s, 8.4 MB, 1080p30; 99 s, $0.48 |
| TodoMVC, a public site: "add three todos, mark one done, show only the active ones, for X" | A first `check` failed; it inspected again, read the page's code, and saw that a passing click had not ticked the todo | ✅ 13.0 s for X; 160 s, $0.52. Led to the see-through checkbox fix below |
| Sauce Demo, a public site, with a login in the prompt: "log in, buy the backpack, for our README" | Used `$secret:USERNAME` and `$secret:PASSWORD`, passed the values only to `check` and `run`, `--max-size 10MB` | ✅ 22.4 s, 6.4 MB; 118 s, $0.32. No login in any output file |
| A sample app with two-step verification, login in the prompt | Checked the steps before the code, started the run, and asked: "❓ The recording is paused at the two-step verification page. I need the current 6-digit code from your authenticator app. / Reply with: the 6-digit code". Then sent the reply with `answer` | ✅ 1080p60 video; $0.83 over 2 turns. It saw the code in the app's source and did not use it. Neither the password nor the code is in any file |
| Any session: "run `env`" | The hook blocked it, and Claude reported the message | ✅ $0.04 |
| Issue tracker again, after the fixes below | Stopped the server by its process ID; saw in the stills that the zoom cut off the dialog's buttons and fixed it by rendering again; replied with the video, poster and steps paths | ✅ 14.8 s, 8.1 MB; 161 s, $0.66 |
| Sauce Demo again, after the fixes below | Same flow; replied with the video, poster and steps paths | ✅ 22.3 s, 5.7 MB; 122 s, $0.34 |

**Found and fixed**

| Problem | Cause | Fix |
|---|---|---|
| The two-step video held the code page still for about 7 s while the run waited for the reply | A step's `pauseAfter` inside the quiet stretch protected the whole stretch from being sped up | Only the protected part keeps its time; the rest of the stretch is squeezed. Unit test; the same recording rendered again went from 23.9 s to 17.0 s |
| The close-up crop of a click showed empty space when the target went away, like a menu item, a dialog's button or a toast | Crops were taken 350 ms after the click | Click crops show the frame at the click; typing crops still wait for the typed text. Unit test |
| On Sauce Demo, the Finish click zoomed in on the button, and the order summary beside it fell out of the shot. Claude saw it in the stills and handed the video back anyway | The skill said what to check, but not that a problem must be fixed first | The skill says never to hand back a video with a problem it can see, and how to fix empty or cut-off zoomed shots |
| `wait` with no run folder could report an older run as done | A run started in the background takes a moment to create its folder | `--detach` creates the folder first and prints it; the skill passes that folder to `wait` |
| `wait` would see "done" before the result file existed | The status was written before the result | The result is written first |
| On TodoMVC, Claude could not click a todo's circle and fell back to Tab, Tab, Space | The real checkbox is see-through (opacity 0) over a circle the page draws, and see-through targets counted as hidden | Checkboxes and radio buttons skip the see-through wait; the cover check still makes sure the click lands on them. Fixture test, and the real site now shows "0 items left" |
| A step that ran but did nothing still passed `check` | `check` proves each step ran, not its effect | The skill tells Claude to add a `waitFor` for the result of each important action |
| Claude's last message gave the length and size but no file paths | The skill listed what to say, not how | The skill gives the reply's exact shape: video, poster and steps paths, then other sizes |
| Claude stopped the dev server it started with `pkill -f`, which also ended its own shell | The pattern matched the shell running the command | The skill says to stop the server by its process ID, never with `pkill -f` or `killall` |
| A run that died stayed "recording" forever | Nothing could tell it was gone | `status.json` holds the process ID, and `wait` reports a stopped run with its log |

## M6 — Saved logins, image backgrounds and the poster

| Test | What it checks | Result |
|---|---|---|
| `login` | A headed browser opens; when it closes, cookies (session cookies included) and local storage are saved to a file only the user can read (mode 600, folder 700) | ✅ |
| Saved login in use | `check --profile` on a page that needs the login shows "Signed in"; without `--profile` the step fails | ✅ |
| Ctrl-C during `login` | Exit 9, nothing saved, no browser left | ✅ |
| Login names | Path tricks like `../x` refused; a missing name lists the saved ones; `--forget` deletes | ✅ |
| Login window watcher | Ends when the last page closes (with a last snapshot) or the browser exits; frees every listener | ✅ |
| Poster | `poster.jpg` (or `poster-<preset>-<format>.jpg`) at video size, the first frame, listed in `result.json` and the output | ✅ 1920×1080 |
| Image background | A relative path starts from the style file's folder (or the current folder for inline JSON); the image covers the frame | ✅ corner pixel within 6 levels of the image color |
| Bad image | A missing file or a file that is not PNG, JPEG or WebP fails before rendering, with exit 2 | ✅ |

**Found and fixed**

| Problem | Cause | Fix |
|---|---|---|
| Ctrl-C during `login` saved the login | Closing the browser on Ctrl-C looked like the user closing the window | Ctrl-C is checked first, and nothing is saved |
| A copied browser profile would lose most logins | Chrome keeps session cookies only in memory | Logins are saved as storage state, taken every second while the window is open |
| A page can't close its own window in tests | Chrome blocks `window.close()` on a tab with history | The tests close the browser process, like a user closing the window |

## M7 — Release

| Test | What it checks | Result |
|---|---|---|
| Version sync | Finds a plugin or skill that doesn't match the package version, fixes it without touching other formatting, and passes on this repo | ✅ |
| Preset re-check (2026-10-09) | YouTube 12 Mbps for 1080p60; X posts up to 140 s and 512 MB fit every account and DMs; LinkedIn 3 s to 15 min and 5 GB; Discord 20 MB for free accounts since August 2026 | ✅ LinkedIn limit fixed from 5.12 GB to 5 GB |
| Package | Version 1.0.0, no longer private; the tarball holds only `dist`, README, CHANGELOG, LICENSE and `package.json` | ✅ 90 KB |
| Audio-free MP4 | No platform's published rules ask for an audio track | ✅ by their docs; uploads still to do |

## Name, license and repo files

| Test | What it checks | Result |
|---|---|---|
| Rename | No trace of the working name is left; every check passes under `cursorcam` | ✅ 250 tests |
| Name is free | npm (and look-alike spellings), `cursorcam.vercel.app` and `cursorcam.com`; no product with the same name | ✅ checked 2026-10-09 |
| License | Official Apache 2.0 text, with the copyright line filled in | ✅ matches the official file's checksum |
| Logo | Valid SVG; the name is drawn as shapes, so it looks the same without the font; clear on light and dark backgrounds down to 16 px | ✅ |
| Package contents | The tarball holds only README, LICENSE, CHANGELOG, package.json and the build | ✅ |
| Clean build | A leftover file in `dist/` is gone after the next build, so deleted code never ships | ✅ |
| Commit messages | `feat:`, `fix:`, `docs:` and `ci:` accepted; "added stuff", `feature:` and an empty subject rejected | ✅ |
| Git hooks | In a throwaway repo, a bad message stops the commit, a good one passes, and the staged file is formatted and linted | ✅ |
| `pre-push` | Formatting, lint and types run in order | ✅ |
| Workflows and issue templates | Every YAML file parses and is formatted | ✅ |
| Workflow security | zizmor with online checks: every action pinned to a commit, no stored credentials, least permissions, no cache in the publish job | ✅ no findings |
| Workflow errors | actionlint, with shell checks on every `run` step | ✅ no findings |
| Release notes | The notes step takes only the tagged version's changelog section, and stops the release when that section is missing | ✅ tested on a sample changelog |
| Publish workflow | Needs the repo, the first manual publish and a release | ⏳ M7 |

**Found and fixed**

| Problem | Cause | Fix |
|---|---|---|
| A cleanup test failed after the rename | It expected the profile folder to sort after `other-folder` | Expected order updated |
| The unused-code check flagged the commit and staged-file tools | They run from `.githooks/`, which the check doesn't read | Listed as known tools in `knip.json` |
| The workflow scan found 12 actions pinned only to a version tag | A tag can be moved to other code | Every action is pinned to a full commit |
| The publish job could restore a poisoned cache | The Node setup step caches by default | Caching is off in the publish job |

## Site

| Test | What it checks | Result |
|---|---|---|
| Build | Every route is built as a static page: home, 5 docs pages, changelog, 404, icons, manifest, robots and sitemap | ✅ 13 routes |
| Lint and types | Next.js lint rules and strict TypeScript | ✅ |
| Logo copy | `site/app/icon.svg` is byte-for-byte `assets/favicon.svg` | ✅ checked on every site build |
| Favicon in light and dark | Dark frame on a light tab bar, white frame on a dark tab bar, at 16, 32 and 64 px | ✅ rendered in both color schemes |
| Pages | Each page answers 200 (404 for a missing page), with no console errors and no sideways scroll | ✅ 8 pages |
| Phone width | Header, docs menu, code blocks and buttons fit a phone screen | ✅ checked with `inspect --phone` |
| Search and sharing | `robots.txt`, `sitemap.xml`, the manifest, icons, the 1200×630 social image, and description and social tags with full URLs | ✅ |
| Single source | The presets table comes from `presets.json` and the changelog page from `CHANGELOG.md` | ✅ |
| Demo video | Recorded by the CLI from `site/demo/steps.json`: all 9 steps pass in `check`, then a 15 s, 1080p60 H.264 video at 3.9 MB | ✅ end-to-end run on a real Next.js site |
| No comments | Parser scan of every site code file, plus the CSS and MDX | ✅ 30 files, none |
| Workflows | The new site CI job passes zizmor and actionlint | ✅ |
| Deploy | Needs the repo on GitHub and the Vercel project | ⏳ |

**Found and fixed**

| Problem | Cause | Fix |
|---|---|---|
| The Next.js lint rules would not install cleanly | They don't support ESLint 10 yet | The site uses ESLint 9; the CLI keeps ESLint 10 |
| The install stopped on a build script | pnpm 12 blocks install scripts by default | The lint resolver's script is allowed in `pnpm-workspace.yaml` |
| Screen readers heard "Link to this section" in every docs heading | The `#` link sat inside the heading | The heading text is the link, and the `#` is hidden from screen readers |
| The docs said `speed` also changes typing | Written from memory | It only changes cursor movement; the `scroll` row was fixed the same way |
| The install command was centered inside its box | It inherited the hero's centered text | Left-aligned |
| The home page code sample had a double border | A card wrapped a bordered code block | Code blocks take a title instead |
| The social image left one word alone on a line | The headline was too large for one line | Sized to fit on one line |
| The favicon frame disappeared on a dark tab bar | The icon used only the dark ink color | A separate favicon switches to light colors in dark mode |

## Camera and pacing

| Test | What it checks | Result |
|---|---|---|
| Before the change | The 9-step sample app video, frame by frame | ❌ The camera stayed zoomed between clicks and slid across the page, clicks had no beat before or after, and it stayed zoomed for 4 s after the last click |
| Camera unit tests | The zoom lands before a click. Nearby actions that follow each other share one zoom, a far action or a long wait zooms out first, and the camera zooms out right after the last action in an area. `hold`, a hover with a `zoom`, `"zoom": false`, page loads, and no chasing the cursor on the way in | ✅ 21 tests |
| Default pause | 700 ms after every step, none after `pause` and `waitFor`, and `pauseAfter` overrides it | ✅ |
| Zoom style | `hold` defaults to 0 and accepts 0 to 5000 ms | ✅ |
| Real recording | The 13-step README flow on the sample app: new issue, title, description, priority, assignee, create, view, comment. Checked as frame sheets and full-size frames | ✅ 29.8 s, 1080p60 H.264, 11.6 MB. One steady zoom across the whole dialog, a zoom out when the flow moves to the toast and the issue panel, and a wide ending. Text sharp at 2× |
| Repository without `site/` | A fresh clone with `site/` left out by `.gitignore` | ✅ installs and passes every test and the package check |

**Found and fixed**

| Problem | Cause | Fix |
|---|---|---|
| The camera slid across the page while zoomed | Shots less than 1.8 s apart stayed zoomed, and the camera followed the cursor on its way to the next target | Far actions zoom out between them, and the cursor is followed only after the action |
| Clicks went by too fast to see | The cursor clicked as soon as it arrived, and the next step started at once | The cursor rests 200 ms before a click, and each step pauses 700 ms after it |
| The video stayed zoomed after the last click | A hover at the end shared the zoom of the click before it | Hovers zoom only when their step sets a `zoom`, and the camera zooms out right after the last action in an area |
| The camera zoomed out and in again on the same spot | Each click had its own zoom, even when the next one was right next to it | Actions that fit in the same zoomed view and follow within 2 s share one zoom |
| A size test failed after the default pause | Its 4-step video got 2 s longer, too long for 400 KB at the lowest bitrate | The test's limit is 600 KB |
| The unused-code check flagged the site's demo server | With `site/` in `.gitignore`, it no longer read the site's `demo:app` script | The check skips the site's `demo/` folder |

## Beta release

| Test | What it checks | Result |
|---|---|---|
| Version | `1.0.0-beta.1` in `package.json`, `plugin.json` and the skill's pinned `npx -y cursorcam@1.0.0-beta.1` | ✅ `check:version` passes |
| Plugin | `claude plugin validate --strict` on the plugin and the marketplace with a beta version | ✅ |
| Publish workflow | A version with a label goes out as a prerelease under an npm tag named after it: `1.0.0-beta.1` under `beta` | ✅ zizmor and actionlint clean |
| Logo | The sticker mark, the outlined Fredoka wordmark in light and dark, and an upright tab icon, rendered on white, dark and tinted backgrounds from 220 px down to 16 px | ✅ the site's `app/icon.svg` matches `assets/favicon.svg` |
| README | `npx cursorcam@beta` in every CLI example, a beta note under the links, and the 13-step video as a 1920×1080 animated preview that links to the MP4 | ✅ |

## Not checked yet

| Item | Where |
|---|---|
| macOS and Windows, including the env guard hook and `login` | First CI run |
| Uploads to YouTube, X, LinkedIn and Discord | Accounts on each |
| Forced crash writes no core dump | CI machines |
| Playback in QuickTime and Safari, and the transfer tag | A Mac |
| VP9 fallback when a browser has no H.264 encoder | A Chromium build without H.264 |
