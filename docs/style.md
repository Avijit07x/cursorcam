# Look and size

`run` records and renders. `render` renders a recording again, with a new size or look, in seconds and without recording again.

```bash
npx cursorcam@beta render cursorcam-output/<run> --for x --style '{"background":"sunset"}'
```

Raw frames are kept for 7 days, so you can render again. `--clean` deletes them at once.

## Where it will be posted

| `--for` | Size | fps | Limit |
| --- | --- | --- | --- |
| (default) | 1920×1080 | 60 | 8 Mbps |
| `youtube` | 1920×1080 | 60 | 12 Mbps |
| `x` | 1920×1080 | 30 | up to 140 s |
| `linkedin` | 1920×1080 | 30 | 3 s to 15 min |
| `discord` | 1280×720 | 30 | under 20 MB |

- `--max-size 10MB` keeps the file under any size. Use it for a README or docs.
- `--format square` makes a 1080×1080 video from any recording.
- `--format vertical` makes a 1080×1920 video. It needs a phone recording, with `"viewport": "phone"` in the steps.
- A video too long for its preset fails. Shorten the steps, or use the default.

Each render writes a video and a poster, its first frame, named after the preset and format, like `video-x.mp4` and `poster-x.jpg`.

## Style

Pass a JSON file, or inline JSON:

```bash
npx cursorcam@beta run steps.json --style brand.json
npx cursorcam@beta run steps.json --style '{"background":"midnight","padding":0.08}'
```

| Key | Default | Value |
| --- | --- | --- |
| `background` | `aurora` | See below |
| `padding` | `0.06` | Space around the window, 0 to 0.3 of the frame |
| `radius` | `14` | Window corner radius, 0 to 48 |
| `shadow` | `0.45` | Window shadow strength, 0 to 1 |
| `browserBar` | `true` | `false` hides the window bar |
| `urlBar` | the page URL | Text for the address bar, up to 120 characters, or `false` to hide it |
| `cursor` | shown | `{ "show": true, "size": 1, "ripple": true }`, size 0.5 to 3 |
| `zoom` | on, up to 2× | See below |
| `dialogs` | `true` | Draws browser dialogs as cards |
| `trimIdle` | `true` | Speeds up idle waits. `pause`, `pauseAfter` and the ending keep their time |

### Background

- A gradient name: `aurora`, `sunset`, `ocean`, `forest`, `midnight` or `paper`.
- A hex color, like `"#0f172a"`.
- A custom gradient: `{ "from": "#4f46e5", "to": "#06b6d4", "angle": 135 }`.
- An image: `{ "image": "brand/bg.png" }`, a PNG, JPEG or WebP file that covers the frame. A relative path starts from the style file's folder.
- A scene drawn from two colors: `{ "scene": "glow", "colors": "indigo" }`.

#### Scenes

Each scene fits every video shape and window size.

| Scene | Look |
| --- | --- |
| `mesh` | Soft blended clouds of both colors |
| `glow` | A dark base with light glowing out from behind the window |
| `split` | Two tones split by one smooth curve |
| `dunes` | Layered soft waves, from light to deep |
| `aurora` | Soft light streaks on a dark sky |
| `glass` | Soft shapes behind a frosted glass frame around the window |
| `ripple` | Rings spreading out from the window |
| `contours` | Thin map lines |
| `grid` | A fine grid that fades out, with a glow behind the window |
| `ribbons` | Wide bands flowing across |
| `beams` | Light rays from the top corner |
| `shapes` | Big flat circles and a pill on a light base |
| `halftone` | Print-style dots in two corners |
| `cursor` | A giant, faint cursor with click rings |

`colors` is a palette, `indigo`, `iris`, `ocean`, `teal`, `plum`, `sunset`, `graphite`, `peach` or `paper`, `indigo` by default. Or give two hex colors, deep then light: `{ "scene": "dunes", "colors": ["#1e3a8a", "#38bdf8"] }`.

### Zoom

`"zoom": { "enabled": true, "max": 2, "hold": 0 }`

- `enabled: false` turns zoom off for the whole video.
- `max` is the closest zoom, from 1.3 to 2.5.
- `hold` keeps the zoom for that many ms after each action, up to 5000.

To change one step instead, set `zoom` on it in the [steps file](steps.md#the-camera).

## Fixes from the stills

| What you see | Fix |
| --- | --- |
| The zoom is too tight and cuts off the action | Lower `zoom.max`, or `"zoom": 1.3` on that step |
| The zoom hides something viewers need | `"zoom": false` on that step |
| A zoomed shot is mostly empty space | Lower `zoom.max`, or `"zoom": false` on that step |
| The result needs a closer look | A `hover` on it with `"zoom": 1.5` and `pauseAfter` |
| The camera zooms out too soon after a click | `"zoom": { "hold": 1000 }` |
| The cursor is too small | `"cursor": { "size": 1.4 }` |
| The address bar shows `localhost` | `"urlBar": "app.example.com"` |
| Long waits look slow | Keep `trimIdle` on, and shorten `pause` steps |
| The file is too big | `--max-size`, or a shorter flow |

Ready-made styles are in [examples](examples/).
