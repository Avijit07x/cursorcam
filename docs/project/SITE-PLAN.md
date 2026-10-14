# CursorCam — Website plan

Make the website feel more finished and trustworthy, and a little cuter, without changing its look. The look stays as [site/DESIGN.md](../../site/DESIGN.md) describes it.

## Status

Updated 2026-10-13.

| Item | State |
| --- | --- |
| F1–F4 | ✅ Done |
| P1 | ✅ Done: the hero line. The FAQ was built, then dropped as not needed |
| P2 | ✅ Done, simpler than planned: the hero's sticker tag shows the package version and links to the changelog. No stars |
| P3, P4 | ✅ Done |
| P5 | ✅ Not needed: the tag reads `v1.0.0` once the version is bumped |
| C1, C2 | ✅ Done: Buddy taps the hero title's full stop and bobs on the 404 page; the header logo lifts on hover |
| C3 | Open: needs real clips |
| Shadows | ✅ Softer and tighter everywhere, for a premium feel |

## 1. Where things stood

Reviewed on 2026-10-13 from screenshots at 1440 px and 390 px wide.

- **Strong:** the sticker style, the toy camera, the sticker sheet and the "That's a wrap!" footer all fit together. Motion is gentle and respects reduced motion.
- **Weak:** a few layout problems on phones, empty space between sections, grey placeholder bars in the mock apps, and nothing that builds trust, like stars, a version or an FAQ.
- **Open issue:** [#7 "Why only Claude?"](https://github.com/Avijit07x/cursorcam/issues/7). The hero says "Ask Claude" and nothing says the CLI works with any agent.

## 2. Phase 1 — Fixes

One pull request. Small changes to existing files.

| # | Problem | Fix | Files |
| --- | --- | --- | --- |
| F1 | On phones, the REC and timecode labels stay fixed in the corners and run through section titles while scrolling | Hide the top labels below `sm`, like the bottom labels already are. Keep the corners | `components/ui/backdrop.tsx` |
| F2 | On phones, Docs, Changelog and GitHub drop onto a second row under the logo | Hide the nav below `md` and keep the logo and Install on one row. The footer links in P4 cover the nav on phones | `components/ui/site-header.tsx` |
| F3 | The sticker section says "Drag … or just tap" twice: in the subtitle and under the window | Keep the subtitle. Change the idle caption to an empty-state line, like "Nothing stuck on yet." | `components/home/stickers/sticker-data.ts` |
| F4 | Big empty gaps between sections, most of all between the stickers and the setup | Measure each gap and use one gap everywhere. `Section` adds `py-16 sm:py-20` on both sides, so neighbors stack to 160 px | `components/ui/section.tsx`, the section files |

## 3. Phase 2 — More professional

One pull request per item.

### P1. Works with any agent, and an FAQ

1. Under the hero buttons, one small line: "Works with any AI agent through the `cursorcam` CLI." Link "CLI" to the CLI guide.
2. A short FAQ section after the setup, in `components/home/faq/`. Use native `<details>` and `<summary>`, styled as white sticker cards. Questions:
   - Does it work with other AI agents?
   - Does my app or my login leave my machine?
   - Is it free?
   - Which systems and browsers does it need?
   - Can I write the steps myself?
3. Add `faq` to `lib/sections.ts`.
4. Update `site/DESIGN.md`: the hero line, the FAQ section, and the layout order. Change "The site leads with Claude" to say the site leads with Claude and names the CLI for other agents.

### P2. Trust row

1. Small sticker pills near the hero: GitHub stars, the npm version and "Apache-2.0".
2. Fetch the stars and the version on the server at build time, with a daily refresh. Hide a pill when its fetch fails. No client-side requests.
3. Decide first whether to show stars while the count is low (see section 6).

### P3. Real text in the mock apps

1. Replace the grey bars in `ISSUE_ROWS` with short titles, like "Fix the login redirect", "Dark mode for settings" and "Faster search".
2. Use the same text size as the new issue row, `4cqh`.
3. Check that it reads at the smallest size, the sticker window on a phone, and that the camera zoom still looks right.

Files: `lib/mock-app.ts`, `components/mock-app/issue-list.tsx`.

### P4. Footer links

1. Add a row of plain text links: Docs, Changelog, npm, Report an issue and License.
2. Keep the DESIGN.md rule: plain text, no pills and no separator dots.
3. Update the Footer part of `site/DESIGN.md`.

File: `components/ui/site-footer.tsx`.

### P5. Drop "Beta"

Remove the Beta tag from the hero when 1.0.0 ships. It goes with the release pull request in [RELEASE-PLAN.md](RELEASE-PLAN.md).

## 4. Phase 3 — Cuter

| # | Idea | Notes |
| --- | --- | --- |
| C1 | Buddy, the stunt cursor, peeks out next to the hero title and waves on the 404 page | Reuse the Buddy art from `components/brand/sticker-art.tsx`. A CSS keyframe loop with `motion-safe:` |
| C2 | The logo sticker's corner peels up a little on hover | Hover only, no click, because the logo is the home link. A transform, no layout change |
| C3 | A "Made with CursorCam" gallery: two or three short clips as tilted polaroid stickers | Needs real videos first. Load posters, and play a clip only when it is in view. Do this last |

## 5. Checks for every change

1. `pnpm check:site`.
2. Look at the running site at 390 px and 1440 px wide: no sideways scroll, a 16 px gutter on phones, and nothing under the viewfinder labels.
3. Turn on reduced motion and check that loops stop.
4. Tab through the page and check that every new link and FAQ item shows the focus ring.
5. Update `site/DESIGN.md` whenever a design decision changes.

## 6. Decisions needed

1. Change the "leads with Claude" rule in DESIGN.md for P1. Recommended: yes, it answers issue #7.
2. Show GitHub stars now or later. A small count can look worse than none. Recommended: show the npm version and license now, and add stars past about 100.
3. Which clips to use for the gallery, C3.
