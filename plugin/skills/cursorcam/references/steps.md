# Steps file reference

A steps file is JSON. It names the page to open and the steps to play, in order.

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

Each step has exactly one action.

| Action | Value | Extra keys |
| --- | --- | --- |
| `goto` | A path like `/settings`, or a full URL on an allowed origin | |
| `click` | Target | |
| `dblclick` | Target | |
| `hover` | Target | |
| `type` | Text to type | `into` (target, required), `paste` (`true` pastes at once), `clear` (`false` keeps what the field has) |
| `press` | A key, like `Enter`, `Tab`, `Escape`, `ArrowDown` or `Mod+K` | |
| `select` | An option label, or a list of labels | `in` (target, required), `showList` (`true` shows the open list in the video) |
| `upload` | A file path, or a list, relative to the steps file | `into` (target, required) |
| `scroll` | `{ "to": target }`, `{ "to": "top" }`, `{ "to": "bottom" }` or `{ "by": pixels }` | `in` (target of a scrolling box) |
| `drag` | Target | `to` (target, required) |
| `waitFor` | Target | `state`: `visible` (default) or `hidden` |
| `pause` | Milliseconds, up to 60000 | |
| `ask` | What to ask the user for, like `2FA code` | `into` (target, required) |

`Mod+` means Cmd on macOS and Ctrl elsewhere. Phones tap instead of click, and cannot `hover` or `drag`.

## Step options

Any step can also have:

| Option | Value |
| --- | --- |
| `zoom` | 1 to 3 zooms the camera to that level for this step. On a `hover`, it zooms on that part for the whole step. `false` keeps the whole page in view |
| `speed` | 0.25 to 4. Changes how fast this step moves the cursor, scrolls and types |
| `pauseAfter` | Milliseconds to wait after the step, up to 60000. 700 by default, and 0 after `pause` and `waitFor`. The video keeps this time |
| `dialog` | How to answer a browser dialog the step opens: `accept` (default), `dismiss`, or `{ "accept": true, "text": "…" }` for a prompt |

## Targets

A target is a string:

| Form | Matches |
| --- | --- |
| `role=button[name='Save']` | An element by its role and accessible name. Roles: `button`, `link`, `textbox`, `checkbox`, `radio`, `combobox`, `tab`, `menuitem`, `option`, `heading` and the rest |
| `label=Email` | A form field by its label |
| `text=Sign in` | An element by its visible text |
| `placeholder=Search` | A field by its placeholder |
| `testid=submit` | `data-testid="submit"` |
| `alt=Logo` | An image by its alt text |
| `title=Settings` | An element by its title |
| `css=.card > button` or `.card > button` | Plain CSS |

Text matching ignores case and matches part of the text. When more than one element matches, the step fails and lists the matches. Then use the object form:

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

Run `cursorcam inspect <url>` to list targets that match exactly one element.

## Secrets and values

- `$secret:NAME` reads `CURSORCAM_SECRET_NAME` from the command's environment. Use it for passwords, emails and keys. A secret typed into a field that is not a password field is blurred in the video.
- `$env:NAME` reads the variable `NAME` the user already has.
- Values never reach a file, a log or the terminal output.

They work in `type` and in `httpCredentials`.

## Examples

Log in, then a 2FA code:

```json
{
  "url": "http://localhost:3000/login",
  "steps": [
    { "type": "$secret:EMAIL", "into": "label=Email" },
    { "type": "$secret:PASSWORD", "into": "label=Password" },
    { "click": "role=button[name='Sign in']" },
    { "ask": "2FA code", "into": "label=Code" },
    { "waitFor": "text=Dashboard", "pauseAfter": 1200 }
  ]
}
```

A phone video:

```json
{
  "url": "http://localhost:3000",
  "viewport": "phone",
  "steps": [
    { "pause": 600 },
    { "click": "role=button[name='Menu']" },
    { "click": "role=link[name='Pricing']", "pauseAfter": 1500 }
  ]
}
```

A long page, a select and an upload:

```json
{
  "url": "http://localhost:3000/settings",
  "steps": [
    { "scroll": { "to": "text=Billing" } },
    { "select": "Yearly", "in": "label=Plan", "showList": true },
    { "upload": "avatar.png", "into": "label=Photo" },
    { "scroll": { "to": "top" }, "pauseAfter": 1000 }
  ]
}
```
