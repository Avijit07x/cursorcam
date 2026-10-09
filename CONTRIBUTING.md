# Contributing to CursorCam

Thank you for your interest in contributing!

CursorCam records click demo videos of web apps. It is a Claude Code plugin with a skill, in `plugin/`, and the `cursorcam` CLI that the skill runs. Bug fixes, new step actions, render improvements, skill improvements, tests and documentation are all welcome.

## Prerequisites

- Node.js 22.13 or newer.
- pnpm, the version in `package.json` (`corepack enable` sets it up).
- Google Chrome, Microsoft Edge, Chromium or Brave, version 120 or newer. Browser tests skip when none is found.

Please use pnpm, not npm or yarn, to keep one lockfile.

## Getting started

Fork the repository, clone your fork, then:

```bash
pnpm install
pnpm hooks:install
pnpm build
node dist/cli/index.js doctor
```

## Checks

Run these before opening a pull request:

| Command              | Runs                                                   |
| -------------------- | ------------------------------------------------------ |
| `pnpm check`         | Formatting, lint, typecheck, unused code and all tests |
| `pnpm check:package` | Build, then a check of the published package           |
| `pnpm test:unit`     | Unit tests only, in a few seconds                      |
| `pnpm test:e2e`      | Browser tests that record and render real videos       |
| `pnpm coverage`      | Unit test coverage report                              |
| `pnpm check:site`    | Website logo copy, lint, typecheck and build           |
| `pnpm check:version` | The plugin and skill pin the package version           |

`pnpm test:crash` forces browser crashes to prove no crash dump is written. It runs only in CI, because crashing on your own machine can stop other services.

## Plugin and skill

The plugin lives in `plugin/`, and `.claude-plugin/marketplace.json` lists it.

- `plugin/skills/cursorcam/SKILL.md` is what Claude reads. Keep it under 500 lines, and put details in `references/`.
- The skill runs the CLI as `npx -y cursorcam@<version>`. `pnpm sync-version` writes the package version into the skill and `plugin.json`, and `pnpm check` fails when they differ.
- `plugin/hooks/env-guard.sh` blocks commands that print every environment variable. It runs before every Bash command in every session, so keep it fast and narrow, and add each new case to `test/unit/plugin/env-guard.test.ts`.
- Unit tests check that the skill names only real commands and options, and documents every step action, style key, preset and exit code.

To try the plugin, check it, then load it into one session:

```bash
claude plugin validate ./plugin
claude --plugin-dir ./plugin
```

The skill runs the published package. To make it run your build instead, point `npm_config_registry` at a local registry that serves your `pnpm pack` tarball.

## Website

The website lives in `site/`, a Next.js app in its own pnpm package. Run it with `pnpm site:dev`. For now it shows a coming-soon page. Read `site/DESIGN.md` before you change how it looks.

- The site uses the light theme only, with the colors and the Fredoka font in `site/app/globals.css`.
- Animations use Motion. Reuse the springs in `site/lib/motion.ts`, so every page moves the same way.
- Build new pages from `site/components/brand/`, the sticker logo and art, and `site/components/ui/`, the background, button and footer. The full home page replaces `ComingSoon` in `site/app/page.tsx`.

The README video records a sample app in `site/demo/app/`. To record it again:

1. Run `pnpm build`, then `pnpm --filter cursorcam-site demo:app`. It serves the sample app on port 4310.
2. In a second terminal, run `node dist/cli/index.js run site/demo/readme-steps.json --style site/demo/style.json`.
3. Copy its `video.mp4` to `assets/demo.mp4`, and make its animated preview with rounded corners:

   ```bash
   ffmpeg -f lavfi -i color=white:s=1920x1080 -vf "format=gray,geq=lum='255*clip(40.5-hypot(max(max(40-X-0.5,X+0.5-W+40),0),max(max(40-Y-0.5,Y+0.5-H+40),0)),0,1)'" -frames:v 1 mask.png
   ffmpeg -i assets/demo.mp4 -loop 1 -framerate 30 -t "$(ffprobe -v error -show_entries format=duration -of csv=p=0 assets/demo.mp4)" -i mask.png -filter_complex "[0:v]fps=30,scale=1920:-1:flags=lanczos,format=rgba[v];[1:v]format=gray[m];[v][m]alphamerge,format=yuva420p" -c:v libwebp_anim -quality 90 -compression_level 4 -loop 0 assets/demo.webp
   rm mask.png
   ```

On Vercel, set the project's Root Directory to `site` and keep "Include files outside the root directory" on. To build with the pnpm version in `package.json`, add the environment variable `ENABLE_EXPERIMENTAL_COREPACK=1`.

## Git hooks and commits

`pnpm hooks:install` turns on the hooks once:

- **pre-commit** formats and lints the files you stage.
- **commit-msg** checks the message against the convention: `feat`, `fix`, `perf`, `chore`, `docs`, `refactor`, `test`, `ci`, `build` or `revert`, for example `fix(record): wait for fonts before typing`.
- **pre-push** checks formatting, lint and types.

Once the repository is public, CI runs every check again, the crash test, and the browser tests on Linux, macOS and Windows. Until then, run `pnpm check` before you push. Every release still runs all the checks and the crash test before it publishes.

## Project structure

| Folder               | Holds                                                           |
| -------------------- | --------------------------------------------------------------- |
| `src/cli/`           | One file per command                                            |
| `src/config/`        | Schemas for steps, style and presets                            |
| `src/browser/`       | Finding, launching and watching the browser                     |
| `src/record/`        | The recorder, with one file per step action in `actions/`       |
| `src/render/`        | Planning, compositing and encoding; `page/` runs in the browser |
| `src/camera/`        | The camera planner                                              |
| `src/cursor/`        | Cursor path and click effects                                   |
| `src/inspect/`       | The target list for `inspect`                                   |
| `src/runs/`          | Run folders and status files                                    |
| `src/system/`        | Paths, disk, processes, cleanup and signals                     |
| `src/shared/`        | Errors, exit codes, geometry and redaction                      |
| `test/unit/`         | Unit tests, mirroring `src/`                                    |
| `test/e2e/`          | Browser tests                                                   |
| `test/fixtures/app/` | One page per hard case, like covered buttons or slow fonts      |
| `site/`              | The website, a Next.js app                                      |
| `assets/`            | The logo files and the README video                             |
| `docs/`              | User guides and examples, the plan and the test results         |

## Code style

- TypeScript in strict mode, small single-purpose modules, named constants and clear names.
- No code comments. Explain the reason in the commit message instead.
- Reuse before you write. Every step action goes through the same locate, check, move and act pipeline.
- Every change comes with a test. Browser behavior gets a fixture page in `test/fixtures/app/`.
- Every listener, timer, page and browser is cleaned up through one dispose path.
- Errors carry their exit code and a hint the user can act on.

## Pull requests

- Keep each pull request to one topic.
- Make sure `pnpm check` passes.
- Add a line under **Unreleased** in [CHANGELOG.md](./CHANGELOG.md) for anything users will notice.
- For changes to the video, attach a still or a short clip.
- The pull request title follows the same convention as commit messages.

## Releasing

Maintainers release from `main`:

1. Re-check the platform limits in `src/config/presets.json` against each platform's help pages, and update its `checked` date.
2. Rename **Unreleased** in `CHANGELOG.md` to the new version, like `## 1.2.0`, and commit it.
3. Run `npm version 1.2.0 -m "chore: release %s"`. It updates `package.json`, writes the same version into the plugin and the skill, commits, and tags `v1.2.0`.
4. Run `git push --follow-tags`.

The tag starts the publish workflow. It checks that the tag matches `package.json`, runs every check, publishes to npm with provenance, and creates a release with that version's changelog section as the notes. Versions with a hyphen go out as prereleases, under an npm tag named after their label: `1.3.0-beta.1` goes out under `beta`.

npm can only trust the workflow for a package that already exists, so the very first version is published by hand:

1. Run `pnpm check:package`, then `npm publish --access public`. For a beta, like `1.0.0-beta.1`, add `--tag beta`.
2. On npmjs.com, open the package settings and add a trusted publisher. Use the repository `Avijit07x/cursorcam`, the workflow `npm-publish.yml` and the environment `release`.
3. Push the tag. The workflow sees that the version is already on npm, skips publishing, and creates the release.

By contributing, you agree that your contributions are licensed under the [Apache-2.0 License](./LICENSE).
