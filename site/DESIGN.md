# CursorCam website design

This is how the CursorCam website looks and moves. Read it before you change how the site looks, and update it when a design decision changes.

## Feel

- Cute, soft and friendly: rounded shapes, sticker edges and playful motion. Nothing harsh, sharp or loud.
- Light theme only.
- The site leads with Claude. The headline is "Ask Claude for a demo video."

## Font

Fredoka for all text, loaded with `next/font/google` in `app/layout.tsx`. Do not add another font, not even a monospace one.

| Weight        | Use                                |
| ------------- | ---------------------------------- |
| Regular, 400  | Body text                          |
| Medium, 500   | Small labels                       |
| Semibold, 600 | Headings, buttons, pills and links |
| Bold, 700     | The wordmark and big display text  |

Text sizes grow with the window between a phone and a laptop size. Keep each level clearly smaller than the one above it.

| Level             | Size        | Weight   | Color                        |
| ----------------- | ----------- | -------- | ---------------------------- |
| Wordmark          | 44 to 72 px | Bold     | `ink`, with "cam" in `brand` |
| Heading           | 20 to 26 px | Semibold | `ink`                        |
| Coming soon label | 16 to 18 px | Semibold | `brand`                      |
| Body text         | 16 to 18 px | Regular  | `body`                       |
| Pills and buttons | 14 to 16 px | Semibold | `ink`, or white on `brand`   |
| Footer            | 14 px       | Regular  | `muted`                      |
| Viewfinder labels | 12 to 14 px | Semibold | `muted`, with REC in `rec`   |

## Colors

The colors are tokens in `app/globals.css`. Pick from these. Only small illustrations, like the mini demo and the sticker art, may add other pastel colors.

| Token          | Hex       | Use                                                            |
| -------------- | --------- | -------------------------------------------------------------- |
| `ink`          | `#1e1b4b` | Headings and strong text                                       |
| `body`         | `#4c4a73` | Body text                                                      |
| `muted`        | `#7c7aa3` | The footer, captions and small labels                          |
| `page`         | `#faf9ff` | The page background                                            |
| `brand`        | `#4f46e5` | The blue: "cam" in the wordmark, buttons and links             |
| `brand-strong` | `#4338ca` | Button hover                                                   |
| `brand-soft`   | `#c7d2fe` | The viewfinder corners, focus rings, the scrollbar, selections |
| `brand-tint`   | `#eef2ff` | Soft fills and hovers                                          |
| `rec`          | `#ef4444` | The recording dot and the REC label                            |
| `rose`         | `#fb7185` | Small accents, like hearts                                     |
| `mint`         | `#86efac` | The battery in the viewfinder                                  |

## Logo

- The logo is a sticker: viewfinder corners in `ink`, a blue cursor and a red dot, tilted by 7°, with a white die-cut edge and a soft shadow. The files are in `assets/`, and `assets/logo.html` shows each one where it is used.
- The wordmark is lowercase "cursorcam" in Fredoka Bold, with "cursor" in `ink` and "cam" in `brand`.
- `app/icon.svg` must stay a copy of `assets/favicon.svg`.
- On the page, `StickerMark` is the animated logo and `BouncyWordmark` is the animated name.

## Sticker style

- Text that should look like a sticker uses `.sticker-text`: a thick white edge and a soft shadow.
- Cards, pills and buttons are white or `brand`, fully rounded, with `.sticker-shadow`.

## Background

- The page is plain `page` color inside a camera viewfinder: rounded corners in `brand-soft`, a blinking REC at the top left, a running timer at the top right, "1080p · 60 fps" at the bottom left and a battery at the bottom right. It lives in `components/ui/backdrop.tsx`.
- The frame stays in place while the page scrolls, and it never catches clicks. On phones, the two bottom labels are hidden.
- No patterns, like dots, plus signs, grids, hearts or confetti. No gradients and no glow blobs. These were all tried and turned down.
- No focus box that jumps around the text.

## Coming soon label

- Plain `brand` text between two twinkling sparkles, with no box around it. It lives in `components/coming-soon/sparkle-badge.tsx`.
- The old white pill with a pulsing red dot was turned down.

## Motion

All animation uses Motion (`motion/react`). Reuse the springs in `lib/motion.ts`:

| Spring   | Use                                              |
| -------- | ------------------------------------------------ |
| `POP`    | Things that pop in, and replies to hover and tap |
| `BOUNCE` | The wordmark letters                             |
| `SOFT`   | Text and cards that fade up                      |
| `FLOAT`  | Slow, endless floating                           |

- `MotionProvider` calms motion for people who ask for less.
- Keep motion gentle. Plain links and icons, like the GitHub link, do not animate.

## Layout

- The coming-soon page fits in one window with no scrolling. The logo sits above the name, and the mini demo takes the height that is left, shrinking on short screens.
- On phones, keep a 16 px side gutter and no sideways scrolling.

## Footer and links

- The footer says "Designed & built by @avijit07x", linked to the GitHub profile, then "Follow on GitHub" with the GitHub logo.
- Links are plain text, with no badge or pill around them and no separator dot between them.

## Scrollbar

A thin, rounded scrollbar in `brand-soft`. It darkens on hover and turns `brand` while dragged.

## New pages

Build new pages from `components/brand/`, the logo and sticker art, and `components/ui/`, the background, buttons and footer. The full home page replaces `ComingSoon` in `app/page.tsx`.

## Saved ideas

Ideas that were liked but have no place yet. Try them on the full site.

- **Sticker tag**: a small `brand` label with white bold text, a 3 px white edge, 14 px corners and `.sticker-shadow`. It tilts by -4° and wiggles every few seconds. It suits a short tag like "New" or "Beta". There was no room for it on the coming-soon page.
