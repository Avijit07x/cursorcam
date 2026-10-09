# Getting started

## What you need

- [Claude Code](https://claude.com/claude-code)
- Node.js 22.13 or newer
- Google Chrome, Microsoft Edge, Chromium or Brave, version 120 or newer

CursorCam records with the browser you already have, in a hidden window. It downloads nothing else.

## Install the plugin

Run these in Claude Code:

```
/plugin marketplace add Avijit07x/cursorcam
/plugin install cursorcam@cursorcam
/reload-plugins
```

To update it later, run `claude plugin update cursorcam@cursorcam` and restart Claude Code.

## Make your first video

Start your app, then give Claude the URL and what to show:

```
/cursorcam http://localhost:3000 — sign up, create a project, invite a teammate
```

You can also ask in your own words:

```
Make a 20 second demo of the checkout flow for LinkedIn.
```

Claude then:

1. Starts your dev server if it is not running.
2. Looks at each page the flow reaches.
3. Writes the steps and checks that they work.
4. Records and renders in a hidden browser.
5. Looks at stills of its own video, and fixes what looks wrong.
6. Hands back the video.

If it needs something only you have, like a login or a 2FA code, it asks in two lines:

```
❓ I need a login for http://localhost:3000 to record the dashboard.
Reply with: email, password
```

## Try it on a famous site

No app running yet? Try one of these:

```
/cursorcam https://todomvc.com/examples/react/dist/ — add three todos, complete one, then show only the active ones
```

```
/cursorcam https://en.wikipedia.org — search for Alan Turing and scroll to his early life
```

```
/cursorcam https://news.ycombinator.com — open Show HN, then the jobs page
```

The same flows are ready as steps files in [examples](examples/#try-it-on-a-famous-site).

## What you get

Everything goes into `cursorcam-output/`:

- `video.mp4`: 1920×1080 at 60 fps, ready to post
- `poster.jpg`: the first frame, for a thumbnail
- the steps file, to record the same video again later

Add `cursorcam-output/` to your `.gitignore`.

## Next

- [Better videos](better-videos.md): how to ask for exactly the video you want.
- [Look and size](style.md): versions for X, LinkedIn, YouTube or Discord, made from the same recording.
