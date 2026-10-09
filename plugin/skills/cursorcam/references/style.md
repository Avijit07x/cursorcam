# Rendering and style reference

`run` records and renders. `render "<run folder>"` renders a recording again with new options, without recording again. Raw frames are kept for 7 days, or deleted at once with `--clean`.

## Render options

| Option | Does |
| --- | --- |
| `--for <preset>` | Fits a platform, see below |
| `--max-size <size>` | Keeps the file under a size, like `10MB` or `500KB` |
| `--format <format>` | `landscape` (default), `square`, or `vertical` |
| `--style <file or JSON>` | The look, see below |
| `--clean` | Deletes the raw frames after rendering |

| Preset | Size | fps | Limit |
| --- | --- | --- | --- |
| (default) | 1920×1080 | 60 | 8 Mbps |
| `youtube` | 1920×1080 | 60 | 12 Mbps |
| `x` | 1920×1080 | 30 | up to 140 s and 512 MB |
| `linkedin` | 1920×1080 | 30 | 3 s to 15 min |
| `discord` | 1280×720 | 30 | under 20 MB |

- `square` is 1080×1080 and works from any recording.
- `vertical` is 1080×1920 and needs a phone recording: `"viewport": "phone"` in the steps.
- A video too long for its preset fails with exit code 2. Shorten the steps, or render with the default preset.
- A LinkedIn video under 3 s fails. Add a `pause` at the end.

Each render writes `video[-preset][-format].mp4` and a matching `poster[-preset][-format].jpg`, the first frame, in the run folder.

## Style

Pass a JSON file, or inline JSON: `--style '{"background":"sunset","padding":0.08}'`. The run folder keeps the last style in `style.json`, and `stills` uses it.

| Key | Default | Value |
| --- | --- | --- |
| `background` | `aurora` | See below |
| `padding` | `0.06` | Space around the window, 0 to 0.3 of the frame |
| `radius` | `14` | Window corner radius, 0 to 48 |
| `shadow` | `0.45` | Window shadow strength, 0 to 1 |
| `browserBar` | `true` | `false` hides the window bar |
| `urlBar` | the page URL | Text for the address bar, up to 120 characters, or `false` to hide it |
| `cursor` | shown | `{ "show": true, "size": 1, "ripple": true }`, size 0.5 to 3 |
| `zoom` | on, up to 2× | `{ "enabled": true, "max": 2, "hold": 0 }`. `max` is 1.3 to 2.5. `hold` keeps the zoom for that many ms after each action, up to 5000. Nearby actions always share one zoom |
| `dialogs` | `true` | Draws browser dialogs as cards |
| `trimIdle` | `true` | Speeds up idle waits. `pause`, `pauseAfter` and the ending keep their time |

`background` takes one of:

- A gradient name: `aurora`, `sunset`, `ocean`, `forest`, `midnight` or `paper`.
- A hex color, like `"#0f172a"`.
- A custom gradient: `{ "from": "#4f46e5", "to": "#06b6d4", "angle": 135 }`.
- An image: `{ "image": "brand/bg.png" }`, a PNG, JPEG or WebP file. A relative path starts from the style file's folder, or from the current folder for inline JSON. The image covers the frame.

## Fixes from stills

| Problem in the stills | Fix |
| --- | --- |
| Zoom too tight, the action is cut off | Lower `zoom.max`, or `"zoom": 1.3` on that step |
| Zoom hides context the viewer needs | `"zoom": false` on that step, then run again |
| A zoomed shot is mostly empty space | Lower `zoom.max` for the whole video, or `"zoom": false` on that step |
| A result needs a closer look | Add a `hover` on the result with `"zoom": 1.5` and `pauseAfter`. It holds the zoom on that part for the whole step |
| The camera zooms out too soon after a click | `"zoom": { "hold": 1000 }` keeps it zoomed for 1 s after each action |
| Cursor too small on a big screen | `"cursor": { "size": 1.4 }` |
| Address bar shows a local URL | `"urlBar": "app.example.com"` |
| Long waits look slow | Keep `trimIdle` on, and shorten `pause` steps |
| Video over the size limit | `--max-size`, or a shorter flow |
