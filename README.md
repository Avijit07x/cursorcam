<div align="center">

<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-wordmark-dark.svg" />
    <img alt="CursorCam" src="./assets/logo-wordmark-light.svg" height="64" />
  </picture>
</h1>

**Ask Claude for a demo video.** Claude clicks through your web app and hands back a polished MP4 that zooms in on each click.

[Website](https://cursorcam.vercel.app) &nbsp;·&nbsp; [Changelog](./CHANGELOG.md) &nbsp;·&nbsp; [Contributing](./CONTRIBUTING.md)

<sub>CursorCam is in beta. If something breaks, please [open an issue](https://github.com/Avijit07x/cursorcam/issues).</sub>

<p>
  <a href="https://www.npmjs.com/package/cursorcam"><img alt="npm" src="https://shieldcn.dev/npm/v/cursorcam.svg?variant=secondary&size=xs&theme=zinc" /></a>
  <a href="https://github.com/Avijit07x/cursorcam/stargazers"><img alt="GitHub stars" src="https://shieldcn.dev/github/stars/Avijit07x/cursorcam.svg?variant=secondary&size=xs&theme=zinc" /></a>
  <a href="https://github.com/Avijit07x/cursorcam/graphs/contributors"><img alt="Contributors" src="https://shieldcn.dev/github/contributors/Avijit07x/cursorcam.svg?variant=secondary&size=xs&theme=zinc" /></a>
  <a href="https://github.com/Avijit07x/cursorcam/commits"><img alt="Last commit" src="https://shieldcn.dev/github/last-commit/Avijit07x/cursorcam.svg?variant=secondary&size=xs&theme=zinc" /></a>
  <a href="./LICENSE"><img alt="License Apache-2.0" src="https://shieldcn.dev/github/license/Avijit07x/cursorcam.svg?variant=secondary&size=xs&theme=zinc" /></a>
</p>

</div>

<a href="./assets/demo.mp4"><img alt="A video made with CursorCam: in a sample issue tracker it creates an issue with a title, description, priority and assignee, opens it and posts a comment, zooming in where each action happens" src="./assets/demo.webp" width="100%" /></a>

<p align="center"><sub>Made with CursorCam from 13 steps. <a href="./assets/demo.mp4">Watch the full-quality MP4</a> (1080p, 60 fps).</sub></p>

---

## Setup

You need [Claude Code](https://claude.com/claude-code), Node.js 22.13 or newer, and Google Chrome, Microsoft Edge, Chromium or Brave, version 120 or newer. CursorCam records with the browser you already have, in a hidden window. Nothing else is downloaded.

**1. Install the plugin.** Run these in Claude Code:

```
/plugin marketplace add Avijit07x/cursorcam
/plugin install cursorcam@cursorcam
/reload-plugins
```

**2. Ask for a video.** Give the URL and what to show:

```
/cursorcam http://localhost:3000 — sign up, create a project, invite a teammate
```

You can also ask in your own words, like "make a 20 second demo of the checkout flow for LinkedIn".

**3. Get the video.** Claude hands back `video.mp4` (1920×1080, 60 fps), a `poster.jpg` thumbnail and the steps file, in `cursorcam-output/`. Add that folder to your `.gitignore`.

## How it works

Claude starts your dev server if needed, explores the app, writes the steps and checks them. Then it records in a hidden browser, reviews stills of its own video, fixes what looks wrong and hands back the MP4.

When it needs something only you have, like a login or a 2FA code, it asks. A login you give is used for that run only and never saved.

## Use the CLI

The plugin runs the `cursorcam` CLI. You can run it yourself too:

```bash
npx cursorcam@beta doctor
npx cursorcam@beta run steps.json
```

```json
{
  "url": "http://localhost:3000",
  "steps": [
    { "click": "role=button[name='Get started']" },
    { "type": "alex@example.com", "into": "label=Email" },
    { "press": "Enter" },
    { "waitFor": "text=Dashboard" }
  ]
}
```

## Docs

| Guide | Covers |
| --- | --- |
| [Getting started](./docs/getting-started.md) | Install the plugin and make your first video |
| [Better videos](./docs/better-videos.md) | How to ask Claude, with example requests and tips |
| [Steps file](./docs/steps.md) | Every action, target and option |
| [Look and size](./docs/style.md) | Presets for X, LinkedIn, YouTube and Discord, formats, backgrounds and zoom |
| [Logins and secrets](./docs/logins.md) | Passwords, 2FA codes and saved logins |
| [CLI](./docs/cli.md) | Every command, the run folder and exit codes |
| [Troubleshooting](./docs/troubleshooting.md) | Common errors and how to fix them |
| [Examples](./docs/examples/) | Steps and style files to copy and edit |

## Contributing

Bug reports and pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md). To report a security problem, see [SECURITY.md](./SECURITY.md).

## License

[Apache-2.0](./LICENSE)
