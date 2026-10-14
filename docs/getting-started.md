# Getting started

## What you need

- Node.js 22.13 or newer
- Google Chrome, Microsoft Edge, Chromium or Brave, version 120 or newer
- An AI agent, like Claude Code, Codex, VS Code with GitHub Copilot, Gemini CLI, Cursor or Claude Desktop. Or none: the CLI works on its own.

CursorCam records with the browser you already have, in a hidden window. It downloads nothing else.

## Set it up

Install CursorCam in your agent:

| Agent | Install |
| --- | --- |
| Claude Code | `/plugin marketplace add Avijit07x/cursorcam`, then `/plugin install cursorcam@cursorcam` and `/reload-plugins` |
| Codex | `codex plugin marketplace add Avijit07x/cursorcam`, then `codex plugin add cursorcam@cursorcam` |
| VS Code and GitHub Copilot | Add `Avijit07x/cursorcam` to `chat.plugins.marketplaces`, then install it from `@agentPlugins` |
| Gemini CLI | `gemini extensions install https://github.com/Avijit07x/cursorcam` |
| Cursor | [One-click MCP install](agents.md#cursor) |
| Claude Desktop | Open [`cursorcam.mcpb`](https://github.com/Avijit07x/cursorcam/releases/latest/download/cursorcam.mcpb) |
| Any other app | The MCP server, `npx -y cursorcam mcp`. See the [MCP guide](mcp.md) |

[Your AI agent](agents.md) has each one step by step.

No agent? Write a [steps file](steps.md) and run the CLI yourself:

```bash
npx cursorcam doctor
npx cursorcam run steps.json
```

## Make your first video

Start your app, then ask your agent for the video, with the URL and what to show:

```
Make a 20 second demo of http://localhost:3000: sign up, create a project, invite a teammate.
```

In Claude Code and Gemini CLI you can also use the command:

```
/cursorcam http://localhost:3000 sign up, create a project, invite a teammate
```

The agent then:

1. Looks at each page the flow reaches.
2. Writes the steps and checks that they work.
3. Records and renders in a hidden browser.
4. Looks at stills of its own video, and fixes what looks wrong.
5. Hands back the video.

If it needs something only you have, like a login or a 2FA code, it asks you.

## Try it on a famous site

No app running yet? Ask for one of these:

```
Make a demo of https://todomvc.com/examples/react/dist/: add three todos, complete one, then show only the active ones.
```

```
Make a demo of https://en.wikipedia.org: search for Alan Turing and scroll to his early life.
```

```
Make a demo of https://news.ycombinator.com: open Show HN, then the jobs page.
```

The same flows are ready as steps files in [examples](examples/#try-it-on-a-famous-site).

## What you get

Everything goes into `cursorcam-output/` in your project, in its own run folder for each video:

- `video.mp4`: 1920×1080 at 60 fps, ready to post
- `poster.jpg`: the first frame, for a thumbnail
- the steps file, to record the same video again later

Add `cursorcam-output/` to your `.gitignore`.

## Next

- [Better videos](better-videos.md): how to ask for exactly the video you want.
- [Look and size](style.md): versions for X, LinkedIn, YouTube or Discord, made from the same recording.
