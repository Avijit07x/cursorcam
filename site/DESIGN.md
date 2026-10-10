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

| Level               | Size                                 | Weight   | Color                                              |
| ------------------- | ------------------------------------ | -------- | -------------------------------------------------- |
| Hero title          | 42 to 76 px                          | Bold     | `ink`, with "demo video." in `brand`, sticker text |
| Wordmark            | 28 px in the header, 44 to 72 px big | Bold     | `ink`, with "cam" in `brand`                       |
| Section title       | 30 to 44 px                          | Bold     | `ink`, sticker text                                |
| Card title          | 18 to 22 px                          | Semibold | `ink`                                              |
| Coming-soon tagline | 20 to 26 px                          | Semibold | `ink`                                              |
| Wrap title          | 28 to 40 px                          | Bold     | `ink`, with "wrap!" in `brand`, sticker text       |
| Sparkle label       | 16 to 18 px                          | Semibold | `brand`                                            |
| Body text           | 16 to 20 px                          | Regular  | `body`                                             |
| Pills and buttons   | 14 to 16 px                          | Semibold | `ink`, or white on `brand`                         |
| Footer              | 14 px                                | Regular  | `muted`                                            |
| Viewfinder labels   | 12 to 14 px                          | Semibold | `muted`, with REC in `rec`                         |

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
| `shade`        | `ink` 32% | The pressed shadow under the toy camera's buttons and knobs    |

## Logo

- The logo is a sticker: viewfinder corners in `ink`, a blue cursor and a red dot, tilted by 7°, with a white die-cut edge and a soft shadow. The files are in `assets/`, and `assets/logo.html` shows each one where it is used.
- The wordmark is lowercase "cursorcam" in Fredoka Bold, with "cursor" in `ink` and "cam" in `brand`.
- `app/icon.svg` must stay a copy of `assets/favicon.svg`.
- On the page, `StickerMark` is the animated logo and `BouncyWordmark` is the animated name.

## Sticker style

- Text that should look like a sticker uses `.sticker-text`: a thick white edge and a soft shadow. The hero title and section titles use it.
- Cards, pills and buttons are white or `brand`, fully rounded, with `.sticker-shadow`. Cards that hold steps tilt by less than 1°.
- Big boxes, like the toy camera, its card and the mock app windows, use `.sticker-box`: the same shadow as a box shadow, which costs less than a filter around anything that moves inside.
- **Sticker tag**: a small `brand` label with white bold text, a 3 px white edge, 14 px corners and `.sticker-shadow`. It tilts by -4° and wiggles every few seconds. It marks the hero as "Beta". It lives in `components/ui/sticker-tag.tsx`.
- Commands sit in purple chat-bubble pills with a round white copy button, from `components/ui/command-pill.tsx`.

## Background

- The page is plain `page` color inside a camera viewfinder: rounded corners in `brand-soft`, a blinking REC at the top left, a running timer at the top right, "1080p · 60 fps" at the bottom left and a battery at the bottom right. It lives in `components/ui/backdrop.tsx`.
- The frame stays in place while the page scrolls, and it never catches clicks. On phones, the two bottom labels are hidden.
- No patterns, like dots, plus signs, grids, hearts or confetti. No gradients and no glow blobs. These were all tried and turned down.
- No focus box that jumps around the text.

## Sparkle label

- Plain `brand` text between two twinkling sparkles, with no box around it. It lives in `components/ui/sparkle-label.tsx`.
- It sits above each section title, like "Peel & stick" and "Get started", and says "Website coming soon" on the coming-soon page.
- The old white pill with a pulsing red dot was turned down.

## Floating stickers

- On the coming-soon page, sticker art floats around the page and can be dragged. It lives in `components/coming-soon/floating-stickers.tsx`.
- On phones, only the heart and the REC sticker show, one on each side of the logo. They hang off the logo, not the page, so they never crowd the viewfinder labels at the top.

## Motion

All animation uses Motion (`motion/react`). Reuse the springs in `lib/motion.ts`:

| Spring   | Use                                              |
| -------- | ------------------------------------------------ |
| `POP`    | Things that pop in, and replies to hover and tap |
| `BOUNCE` | The wordmark letters                             |
| `SOFT`   | Text and cards that fade up                      |
| `DETENT` | A knob settling into its notch, firm and calm   |

- `MotionProvider` calms motion for people who ask for less.
- Endless decorative loops, like the sparkles, the tag wiggle, the REC blink, the logo, the cursor bob and the floating stickers, are CSS keyframes in `app/globals.css`, used as `motion-safe:animate-*`. They run off the main thread and stop for people who ask for less motion. Motion handles entrances, gestures, drags and the scripted demos.
- Animate transforms and opacity, never `left`, `top`, `width` or `height` in a loop.
- Keep motion gentle. Plain links and icons, like the GitHub link, do not animate.

## Layout

- The home page runs top to bottom: the header, the hero, the demo video, the toy camera, the sticker sheet, the setup steps and the footer. Each section lives in its own folder in `components/home/`.
- The hero puts the title on the left and the line and buttons on the right, and stacks them on phones.
- The demo video section plays the real README video in an `ink` frame with a white sticker edge, viewfinder corners and a bar with play, REC, the timecode and "1080p · 60 fps".
- The toy camera's screen plays a mock demo drawn with code, not a video. The mock app sits on the indigo `dunes` scene background, like the demo video. It opens New issue, types a title and creates the issue, and the camera zooms in on each step. Its dial, shape switch and zoom knob are the real settings: the knob sets how close the zoom goes, Square shrinks the window and Tall switches to a phone layout. The shutter says "Ask Claude" and hands out the request to copy.
- The sticker sheet shows the features. Dragging or tapping a sticker sticks it on a little app window, which acts the feature out. It does not repeat what the camera shows, like the platform sizes.
- The setup has its title and what you need on the left, and three tilted cards with numbered stickers on the right, joined by a short line.
- Every home section keeps the same gap between its heading and its content, `SECTION_BODY` in `lib/layout.ts`.
- Buttons that move within the page, like "Install" and "Watch the demo", scroll smoothly to the section and move keyboard focus there, without changing the address. With reduced motion the jump is instant. They use `ScrollButton`, never `#` links.
- Every focusable element uses the `focus-ring` class from `app/globals.css`: no outline, and a 4 px `brand-soft` ring for keyboard focus.
- The coming-soon page, at `/coming-soon`, fits in one window with no scrolling. The logo sits above the name, and the mini demo takes the height that is left, shrinking on short screens.
- On windows under 608 px tall, like phones turned sideways or laptops with a short browser window, the mini demo hides so the rest still fits. The `short:` variant in `app/globals.css` marks these windows.
- On phones, keep a 16 px side gutter and no sideways scrolling.

## Docs

- The docs live at `/docs`, inside the same viewfinder frame, header and footer as the home page. The header's "Install" button opens Getting started.
- Each guide is its markdown file in `docs/`, rendered at build time, so the website and GitHub always say the same thing. The guides, their groups and their order come from `docs/README.md`: each `##` heading is a group, with a table of its guides. The groups are Start here, Make great videos and Reference. Links between guides stay on the site, and links to `examples/` open GitHub.
- The overview opens with the title and one line, then one part per group. Start here shows the same three setup steps as the home page, then the Getting started card. Each group lists its guides as white sticker cards that tilt a little, each with a round number, a title and one line. The numbers run on across the groups.
- A sidebar lists the guides as round pills under small uppercase group labels. The open one is a solid `brand` pill with white text and no shadow. It stays below the viewfinder labels while the page scrolls, and on phones it folds into a menu above the page.
- The page title uses sticker text. Tables sit in white rounded cards, and on phones each row stacks into a small card with a label above each value, so nothing scrolls sideways. Every code block, from a request to Claude to a terminal command or a JSON file, sits in the same `ink` card in Fredoka, with a copy button, and long lines wrap.
- Numbered lists show each number in a round `brand` sticker.
- Each guide shows its group as a sparkle label above the title, like the home sections, and ends with links to the guide before and after it.
- **Backgrounds** is a page for the website only, from `content/backgrounds.md`. It shows how to use a scene background, then every scene in a grid. A sticky row of palette pills recolors every preview, and each preview has a copy button for its style. Each preview shows the scene behind a white window, where the app sits in a real video. The scene names and looks come from the table in `docs/style.md`, and the palettes from the package. The Look and size guide links to it from its Scenes part.

## Footer and links

- On the home page, the footer opens with an end card that says "That's a wrap!" next to a clapperboard sticker with a face. The board claps shut with confetti when it scrolls into view, and again on each click. Under it, movie credits pop in as small tilted stickers: Starring your web app, Directed by Claude in `brand`, Camera CursorCam, and Stunt cursor Buddy with the buddy cursor. It lives in `components/home/wrap/`. The coming-soon page keeps the plain footer, so it still fits one window.
- The footer then says "Designed & built by @avijit07x", linked to the GitHub profile, then "Follow on GitHub" with the GitHub logo.
- Links are plain text, with no badge or pill around them and no separator dot between them.

## Scrollbar

A thin, rounded scrollbar in `brand-soft`. It darkens on hover and turns `brand` while dragged.

## New pages

Build new pages from `components/brand/`, the logo, wordmark, sticker art and confetti, and `components/ui/`, the background, section, heading, buttons, command pill and footer.
