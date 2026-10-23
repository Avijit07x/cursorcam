# MCP server

Any AI agent that supports MCP can make videos with CursorCam. The server runs on your machine and records with the browser you already have.

Most agents have a quicker install, a plugin or an extension that adds the server and the skill together. See [Your AI agent](agents.md) first. This page is the manual setup, and the reference for the tools.

## What you need

- Node.js 22.13 or newer
- Google Chrome, Microsoft Edge, Chromium or Brave, version 120 or newer
- An app that supports MCP servers

## Add it to your app

Every app starts the server with the same command: `npx -y cursorcam mcp`.

### Cursor

Add this to `.cursor/mcp.json` in your project, or to `~/.cursor/mcp.json` for every project:

```json
{
  "mcpServers": {
    "cursorcam": { "command": "npx", "args": ["-y", "cursorcam", "mcp"] }
  }
}
```

### VS Code

Add this to `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "cursorcam": { "type": "stdio", "command": "npx", "args": ["-y", "cursorcam", "mcp"] }
  }
}
```

### Codex

Add this to `~/.codex/config.toml`:

```toml
[mcp_servers.cursorcam]
command = "npx"
args = ["-y", "cursorcam", "mcp"]
```

### Gemini CLI

Add this to `~/.gemini/settings.json`, or to `.gemini/settings.json` in your project:

```json
{
  "mcpServers": {
    "cursorcam": { "command": "npx", "args": ["-y", "cursorcam", "mcp"] }
  }
}
```

### Windsurf

Add this to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "cursorcam": { "command": "npx", "args": ["-y", "cursorcam", "mcp"] }
  }
}
```

### Claude Desktop

The [one-click extension](agents.md#claude-desktop) is the easiest way. To set it up by hand, open Settings, then Developer, then Edit Config, and add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cursorcam": { "command": "npx", "args": ["-y", "cursorcam", "mcp"] }
  }
}
```

### Claude Code

Install the [plugin](agents.md#claude-code) instead. It teaches Claude the whole flow. To use the MCP server anyway, run `claude mcp add cursorcam -- npx -y cursorcam mcp`.

### Other apps

Use `npx` as the command and `-y cursorcam mcp` as its arguments. On Windows, if the app cannot find `npx`, use `cmd` as the command and `/c npx -y cursorcam mcp` as its arguments.

## Ask for a video

Restart the app, then ask in your own words:

```
Make a 20 second demo of the sign-up flow at http://localhost:3000 for LinkedIn.
```

The server tells the agent the whole flow. It explores your app, writes the steps, checks them, records, looks at stills of its own video and hands back the file. [Better videos](better-videos.md) has example requests.

## Tools

| Tool | Does |
| --- | --- |
| `doctor` | Checks that this machine can record |
| `inspect` | Opens a page and returns its first video frame as an image, with the targets on it |
| `check` | Dry-runs the steps in the background and saves one frame per step |
| `record` | Records the steps in the background, without rendering |
| `run` | Records and renders the MP4 in the background |
| `render` | Renders a recording again with a new size or look, in seconds |
| `stills` | Returns key moments of the video as images, to review it |
| `wait` | Waits up to 45 seconds for a background run, and says what to do next |
| `answer` | Sends your reply, like a 2FA code, to a run that asked for one |

Steps can be passed inline as JSON or as a file path. Inline steps are saved as `cursorcam-output/<name>.json`, so you can record them again later. The [steps guide](steps.md) has every action and option.

To show the agent a flow instead of describing it, run `npx cursorcam capture <url>` in a terminal, click through the flow and close the window. Then ask the agent to record `cursorcam-output/capture.json`. See [Click through it yourself](steps.md#click-through-it-yourself).

## Logins

- The agent writes `$secret:NAME` in the steps and passes the value in the `secrets` argument of `check`, `record` or `run`. Values never reach a file, a log or the tool output. See [Logins and secrets](logins.md).
- For a 2FA or email code, the run stops and the agent asks you. It sends your reply with `answer`.
- A captcha or bot check stops the run. Log in by hand once with `npx cursorcam login <url> --profile <name>` in a terminal, then ask the agent to use that profile.

## Where videos go

Videos go into `cursorcam-output/` in your project. The server asks your app which folder is open. When the app does not say, it uses the folder the app started it in, or your home folder when a plugin started it or that folder cannot be written. To use another folder, say so in your request.

## Good to know

- Recordings run in the background, and the agent checks on them with `wait`. No tool call runs long enough to time out.
- `stills` returns up to 4 MB of images per call. The rest are listed by path.
- The tools run the same `cursorcam` CLI, so [Troubleshooting](troubleshooting.md) and the [exit codes](cli.md#exit-codes) apply.
