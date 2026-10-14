# Backgrounds

CursorCam can draw a scene behind the app window from two colors. Every scene fits wide, square and tall videos.

## How to use them

Name the scene and the palette when you ask your agent:

```
Make a demo of http://localhost:3000: sign up and create a project, on the dunes background in ocean.
```

Or put it in a style file:

```json
{
  "background": { "scene": "dunes", "colors": "ocean" }
}
```

```bash
npx cursorcam run steps.json --style style.json
```

To try another one on a video you already made, render it again. It takes seconds and records nothing new:

```bash
npx cursorcam render cursorcam-output/<run> --style '{"background":{"scene":"glow","colors":"plum"}}'
```

- Leave out `colors` to get `indigo`.
- For your own colors, give two hex colors, deep then light: `{ "scene": "dunes", "colors": ["#1e3a8a", "#38bdf8"] }`.
- The other style options are in [Look and size](style.md).

## Every scene

Pick a palette to see every scene in it. The copy button on a scene copies its style, ready to use.
