# Steps file

Claude writes the steps for you. Read this to edit them by hand, or to run the [CLI](cli.md) yourself.

A steps file is JSON. It names the first page and the steps to play, in order:

```json
{
  "name": "sign-up",
  "url": "http://localhost:3000",
  "steps": [
    { "pause": 600 },
    { "click": "role=link[name='Sign up']" },
    { "type": "alex@example.com", "into": "label=Email" },
    { "type": "$secret:PASSWORD", "into": "label=Password" },
    { "press": "Enter" },
    { "waitFor": "text=Welcome", "pauseAfter": 1500 }
  ]
}
```

More are in [examples](examples/).

## Tips for a good video

- Start with `{ "pause": 600 }`, so viewers see the page first.
- End on the result, with `"pauseAfter": 1500` or more.
- Show one flow, in 5 to 15 steps, with no detours.
- Add a `waitFor` for content that loads after an action, so the video never shows a spinner.
- Add a `waitFor` for the result of each important action, like the new item's text. Then `check` fails when a click does not do what you meant.
- Type short, realistic text. Never type real personal data.
- Every step pauses 700 ms after it. Raise `pauseAfter` to 1200 or more where viewers need to read.
- Prefer `role=`, `label=` and `testid=` targets over CSS. They keep working when the design changes.

## Top-level keys

| Key | Default | Value |
| --- | --- | --- |
| `url` | required | The first page, `http` or `https` |
| `name` | the file name | Run folder name, up to 60 characters |
| `viewport` | `desktop` | `desktop` (1280×800) or `phone` (390×844) |
| `locale` | `en-US` | Browser language |
| `timezone` | the machine's | Like `Europe/Berlin` |
| `colorScheme` | `light` | `light` or `dark` |
| `reducedMotion` | not set | `reduce` or `no-preference` |
| `permissions` | none | Like `["clipboard-read", "geolocation"]` |
| `httpCredentials` | none | `{ "username": …, "password": … }` for HTTP basic auth |
| `ignoreHTTPSErrors` | on for local hosts | Accept self-signed certificates |
| `allowOrigins` | none | Other origins `goto` may open, like `["https://auth.example.com"]` |
| `mask` | none | CSS selectors to blur in every frame, like `[".user-email"]` |
| `timeout` | `15000` | Time limit per step in ms, 1000 to 120000. Opening a page always gets at least 30000 |

## Actions

Each step does exactly one thing.

| Action | Value | Extra keys |
| --- | --- | --- |
| `goto` | A path like `/settings`, or a full URL on an allowed origin | |
| `click` | Target | |
| `dblclick` | Target | |
| `hover` | Target | |
| `type` | Text to type | `into` (target, required), `paste` (`true` pastes at once), `clear` (`false` keeps what the field has) |
| `press` | A key, like `Enter`, `Tab`, `Escape`, `ArrowDown` or `Mod+K` | |
| `select` | An option label, or a list of labels | `in` (target, required), `showList` (`true` shows the open list) |
| `upload` | A file path, or a list, relative to the steps file | `into` (target, required) |
| `scroll` | `{ "to": target }`, `{ "to": "top" }`, `{ "to": "bottom" }` or `{ "by": pixels }` | `in` (a scrolling box) |
| `drag` | Target | `to` (target, required) |
| `waitFor` | Target | `state`: `visible` (default) or `hidden` |
| `pause` | Milliseconds, up to 60000 | |
| `ask` | What to ask for, like `2FA code` | `into` (target, required) |

`Mod+` means Cmd on macOS and Ctrl elsewhere. On a phone, clicks are taps, and `hover` and `drag` are not available.

## Step options

Any step can also have:

| Option | Value |
| --- | --- |
| `zoom` | 1 to 3 sets the zoom for this step. On a `hover`, it holds the zoom on that part for the whole step. `false` keeps the whole page in view |
| `speed` | 0.25 to 4. How fast this step moves the cursor, scrolls and types |
| `pauseAfter` | Milliseconds to wait after the step, up to 60000. 700 by default, and 0 after `pause` and `waitFor` |
| `dialog` | How to answer a browser dialog: `accept` (default), `dismiss`, or `{ "accept": true, "text": "…" }` for a prompt |

## The camera

The camera zooms in for each click and typing. While the next actions stay in the same area, it stays zoomed. When the flow moves somewhere else, or ends, it zooms out to show what changed. It never pans across the page while zoomed.

- `"zoom": false` on a step keeps the whole page in view. Use it for a button that sits far from the content it changes, like a Pay button next to an order summary.
- `"zoom": 1.5` sets the level for one step.
- A `hover` on a result with `"zoom": 1.5` and `"pauseAfter": 1500` makes a close-up at the end.
- The whole-video zoom settings are in [Look and size](style.md#zoom).

## Targets

A target is a string:

| Form | Matches |
| --- | --- |
| `role=button[name='Save']` | An element by its role and accessible name, like `button`, `link`, `textbox`, `checkbox`, `tab` or `menuitem` |
| `label=Email` | A form field by its label |
| `text=Sign in` | An element by its visible text |
| `placeholder=Search` | A field by its placeholder |
| `testid=submit` | `data-testid="submit"` |
| `alt=Logo` | An image by its alt text |
| `title=Settings` | An element by its title |
| `css=.card > button` or `.card > button` | Plain CSS |

Text matching ignores case and matches part of the text. When more than one element matches, the step fails and lists the matches. Pick one with the object form:

```json
{ "click": { "find": "text=Save", "within": "role=dialog", "exact": true } }
```

| Key | Does |
| --- | --- |
| `find` | The target, required |
| `nth` | Picks one match: `0` is the first, `-1` the last |
| `within` | Only looks inside this other target |
| `near` | Picks the match closest to this other target |
| `frame` | CSS selector of the iframe to look in |
| `exact` | `true` matches the whole text, case included |

`npx cursorcam@beta inspect <url>` lists targets that match exactly one element on a page.
