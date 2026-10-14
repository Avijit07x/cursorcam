# CursorCam — Stable release plan

From `1.0.0-beta.4` to `1.0.0`, then what comes next.

## Status

Updated 2026-10-13. 1.0.0 now also ships the MCP server and the move from Claude-only to any AI agent, in the README, the docs and the site.

| Item | State |
| --- | --- |
| MCP server, `cursorcam mcp` | ✅ Built, with unit and e2e tests and the [MCP guide](../mcp.md) |
| README, docs and site lead with any AI agent | ✅ Done |
| `cursorcam@beta` in the docs (3.1 step 3) | ✅ Changed to `cursorcam` |
| Phase 1 checks by hand | Open |
| Version, changelog heading and tag (3.2 to 3.4) | Open. Rename `## Unreleased` to `## 1.0.0` in `CHANGELOG.md` |
| Native installs for Codex, VS Code, Gemini CLI, Cursor and Claude Desktop | ✅ Built and tested. The release workflow attaches `cursorcam.mcpb` and the Gemini archives |
| Try each install once in the real app | Open. See "Not checked yet" in [TEST-RESULTS.md](TEST-RESULTS.md) |
| Submit the plugin to the Cursor Marketplace | Open, after 1.0.0 is on npm: cursor.com/marketplace/publish |
| List the Gemini extension in the gallery | Open: add the `gemini-cli-extension` topic to the GitHub repo |

## 1. Where things stand

| Area | State |
| --- | --- |
| Code | Done. Every milestone in [PLAN.md](PLAN.md) is built. |
| CI | ✅ Passes on Linux, macOS and Windows. |
| npm | `latest` and `beta` both point at `1.0.0-beta.4`. |
| Publish workflow | Ready. A tag without `-` publishes as `latest` and makes a normal GitHub release. Nothing to change before 1.0.0. |
| Notes | Out of date. [TEST-RESULTS.md](TEST-RESULTS.md) and [PLAN.md](PLAN.md) still say macOS and Windows wait on the first CI run. |
| Issues | One open: [#7 "Why only Claude?"](https://github.com/Avijit07x/cursorcam/issues/7). |

Left from the v1 "done when" list in [PLAN.md](PLAN.md):

| # | Item | Plan |
| --- | --- | --- |
| O3 | Colors on Safari and QuickTime | Check on a Mac (phase 1) |
| O5 | Backup video format on plain Chromium builds | Note as a known limit; test after 1.0.0 |
| O6 | Platforms accept an MP4 with no sound | Upload one test each (phase 1) |

## 2. Phase 1 — Checks by hand

Done by the maintainer. About a day.

### 2.1 Playback on a Mac (O3)

1. Render the README demo: start `pnpm --dir site demo:app`, then run `site/demo/readme-steps.json` with `site/demo/style.json`.
2. Open the MP4 in QuickTime and in Safari.
3. Pass when the colors match Chrome side by side, with no washed-out or too-dark look, and it plays to the end.

### 2.2 Uploads (O6)

Render the same recording once per preset with `cursorcam render <run> --for <preset>`, then upload it as a private or draft post.

| `--for` | Where | Pass when |
| --- | --- | --- |
| `youtube` | YouTube, unlisted | Processes and plays in HD |
| `x` | X, draft | Accepted and plays |
| `linkedin` | LinkedIn, draft | Accepted and plays |
| `discord` | A private Discord channel | Under 20 MB and plays inline |

Write each result into [TEST-RESULTS.md](TEST-RESULTS.md).

### 2.3 Plain Chromium (O5)

Not a blocker. Add a known limit to [troubleshooting.md](../troubleshooting.md): plain Chromium builds may lack the H.264 encoder, and Chrome, Edge or Brave avoid it.

## 3. Phase 2 — Release 1.0.0

One pull request, `release/1.0.0`, after phase 1 passes.

### 3.1 Docs

1. [TEST-RESULTS.md](TEST-RESULTS.md): macOS and Windows pass in CI, plus the phase 1 results.
2. [PLAN.md](PLAN.md): mark M0, M2, M7, O1, O3, O4 and O6 done, and O5 as a known limit.
3. Change `cursorcam@beta` to `cursorcam` everywhere users copy a command:
   - `README.md`
   - `docs/better-videos.md`, `docs/cli.md`, `docs/examples/README.md`, `docs/logins.md`, `docs/steps.md`, `docs/style.md`, `docs/troubleshooting.md`
   - `site/content/backgrounds.md`
4. README: a short "Use with other AI agents" section. The CLI is standalone, so any agent that can write a steps file and run a command can use it. Link [steps.md](../steps.md) and [cli.md](../cli.md).

### 3.2 Version

1. Set `version` in `package.json` to `1.0.0`.
2. `pnpm sync-version` to update the plugin and the skill.
3. `CHANGELOG.md`: a `## 1.0.0` entry. Say it is the first stable release, what changed since `1.0.0-beta.4`, and that installs no longer need `@beta`.

### 3.3 Check and ship

1. `pnpm check` and `pnpm check:package`.
2. `claude plugin validate ./plugin`.
3. `pnpm check:site`, since the site shows the docs.
4. Open the PR with a `chore: release 1.0.0` title and merge it.
5. Push the tag `v1.0.0`. The publish workflow runs the checks and crash tests, publishes to npm as `latest` and creates the GitHub release.

### 3.4 After the tag

1. Confirm `npm view cursorcam dist-tags` shows `latest: 1.0.0`.
2. Fresh install from a clean cache: `npx -y cursorcam@1.0.0 doctor`.
3. Install the plugin fresh in Claude Code and make one video end to end.
4. Reply to issue #7.
5. Remove the "Point latest at the pre-release" step from `.github/workflows/npm-publish.yml`. It does nothing once a stable version exists. Commit as `ci:`.

## 4. Phase 3 — After 1.0.0

One feature per minor release. Each goes through the usual rules: tests, the skill and the guides in the same change, and a changelog line.

| Order | Feature | Why | Size |
| --- | --- | --- | --- |
| 1 | Other agents: rules or plugins for Cursor, Codex and Gemini CLI, made from the skill | Issue #7. The skill is plain markdown, so this is mostly packaging | Small to medium |
| 2 | `--headed`: show the browser while recording | Easier debugging. Recommended in [PLAN.md](PLAN.md) decision 4 | Small |
| 3 | Guide for writing steps by hand | For people not using an AI agent | Small |
| 4 | MCP server | Lets Claude Desktop and other chat apps record. Recommended in [PLAN.md](PLAN.md) decision 3 | Large |
| 5 | Test the backup video format on plain Chromium (O5) | Closes the last open item | Small |

## 5. Decisions needed

1. Who does the Mac and upload checks, and when.
2. Which agents to support first in phase 3.
3. Whether 1.0.0 ships before or after the "other agents" README section. Recommended: in the same PR, since it answers issue #7.
