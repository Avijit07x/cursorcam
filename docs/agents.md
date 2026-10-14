# Your AI agent

CursorCam works with any AI agent. Most get a native install that adds the CursorCam tools and the skill that teaches the whole flow. Pick yours.

| Agent | Install |
| --- | --- |
| [Claude Code](#claude-code) | Plugin |
| [Codex](#codex) | Plugin |
| [VS Code and GitHub Copilot](#vs-code-and-github-copilot) | Plugin |
| [Gemini CLI](#gemini-cli) | Extension |
| [Cursor](#cursor) | One-click MCP install |
| [Claude Desktop](#claude-desktop) | One-click extension |
| [Windsurf and other apps](#windsurf-and-other-apps) | MCP server |

Every way in needs Node.js 22.13 or newer and Chrome, Edge, Chromium or Brave 120 or newer. Claude Desktop brings its own Node.js.

## Claude Code

Run these in Claude Code:

```
/plugin marketplace add Avijit07x/cursorcam
/plugin install cursorcam@cursorcam
/reload-plugins
```

Or run this in a terminal, then start Claude Code:

```bash
claude plugin marketplace add Avijit07x/cursorcam && claude plugin install cursorcam@cursorcam
```

Then ask for a video, or use `/cursorcam http://localhost:3000 sign up and create a project`.

## Codex

Add the CursorCam marketplace and install the plugin:

```bash
codex plugin marketplace add Avijit07x/cursorcam
codex plugin add cursorcam@cursorcam
```

Start a new Codex session to use it. You can also install it from `/plugins` inside Codex.

## VS Code and GitHub Copilot

Add the CursorCam marketplace to your VS Code settings:

```json
{
  "chat.plugins.marketplaces": ["Avijit07x/cursorcam"]
}
```

Then open the Extensions view, search for `@agentPlugins`, and install **cursorcam**. For the MCP server alone, run:

```bash
code --add-mcp '{"name":"cursorcam","command":"npx","args":["-y","cursorcam","mcp"]}'
```

## Gemini CLI

```bash
gemini extensions install https://github.com/Avijit07x/cursorcam
```

Restart Gemini CLI. It adds the tools, the skill and a `/cursorcam` command. Gemini starts MCP servers only in folders you trust, so trust your project folder when it asks.

## Cursor

Install the MCP server with one click: [Add CursorCam to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=cursorcam&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImN1cnNvcmNhbSIsIm1jcCJdfQ==).

Or add it by hand to `.cursor/mcp.json` in your project, or to `~/.cursor/mcp.json` for every project:

```json
{
  "mcpServers": {
    "cursorcam": { "command": "npx", "args": ["-y", "cursorcam", "mcp"] }
  }
}
```

## Claude Desktop

Download [cursorcam.mcpb](https://github.com/Avijit07x/cursorcam/releases/latest/download/cursorcam.mcpb) and open it. Claude Desktop shows what it does, then installs it with one click. Videos go into `cursorcam-output/` in your home folder.

## Windsurf and other apps

Any app that supports MCP servers can run CursorCam. [MCP server](mcp.md) has the setup for Windsurf and the rest, and lists every tool.

## Then ask for a video

```
Make a 20 second demo of http://localhost:3000: sign up and create a project.
```

The agent explores your app, writes the steps, checks them, records, looks at stills of its own video and hands back the file. Videos go into `cursorcam-output/` in your project, or in your home folder with Claude Desktop. [Better videos](better-videos.md) has example requests.
