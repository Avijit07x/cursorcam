# Better videos

Claude does the whole job, but a clear request gets a better video on the first try.

## Say what to show

A good request names:

- **The page**, like `http://localhost:3000`.
- **The flow**, from where it starts to the result you want viewers to see.
- **The length**, like "about 20 seconds".
- **Where it will be posted**, like X, LinkedIn, YouTube, Discord or a README.
- **What to hide**, like an email address in the header.

```
/cursorcam http://localhost:3000 — create an issue called "Add onboarding",
set it to high priority, assign it to Maya, and end on the new issue.
About 25 seconds, for X.
```

```
Make a demo of our checkout for LinkedIn. Add a product to the cart, pay with
the test card 4242 4242 4242 4242, and end on the "Payment received" page.
Hide the email in the top bar.
```

```
Record the settings page on a phone, as a vertical video for Instagram.
```

| Instead of | Try |
| --- | --- |
| "Make a demo of the app" | "Make a 30 second demo of creating a project, from the dashboard to the new project page" |
| "Show all the features" | Three short videos, one for each feature |
| "Record the login" | "Log in with the demo account, then show the dashboard" |
| "Make it look nice" | "Use the midnight background and show app.example.com in the address bar" |

## Keep it short

- Show **one flow** per video, about 10 to 40 seconds.
- Three short videos work better than one long one. Viewers stop watching long demos.
- End on the result: the new item, the saved setting, the success message.

## Prepare the app

- **Use realistic demo data.** An empty list looks dull, and real customer data must never be in a video.
- **Use a demo account.** Claude asks for a login when it needs one, and never saves it. See [Logins and secrets](logins.md).
- **Remove things that cover the page,** like cookie banners, chat widgets and framework dev overlays. They show up in the video. You can also ask Claude to close them first.
- **Say the window you want:** "on a phone" records the phone layout, and "in dark mode" switches the color scheme.

## Zoom and pacing

The camera zooms in for each click and typing. It stays zoomed while the next actions are in the same area, and zooms out when the flow moves somewhere else. Ask for something else in plain words:

| Ask | What Claude changes |
| --- | --- |
| "No zoom" | Turns zoom off for the whole video |
| "Stay zoomed after clicks" | Holds the zoom for a moment after each action |
| "Zoom in more" or "zoom in less" | Changes the closest zoom, from 1.3× to 2.5× |
| "Zoom in on the chart at the end" | Adds a close-up on that part |
| "Show the whole page when I click Save" | Turns zoom off for that one step |
| "Slow down at the results" | Waits longer on that step, so viewers can read |

## Change the look without recording again

A new look or size renders in seconds from the same recording:

```
Make an X version too.
Use the sunset background.
Show app.example.com in the address bar instead of localhost.
Make the cursor a bit bigger.
Keep it under 10 MB, it's for the README.
Make a square version for the feed.
```

All the options are in [Look and size](style.md).

## Record again after the app changes

Claude saves the steps in `cursorcam-output/`. After the app changes, ask:

```
Record cursorcam-output/create-issue.json again.
```

If a button was renamed, Claude finds the new one and updates the steps.

## Check before you post

Claude looks at stills of its own video before it hands it back. To look yourself, ask for the stills, or run:

```bash
npx cursorcam@beta stills cursorcam-output/<run>
```

It saves key moments and a close-up of each step in the run folder's `stills/` folder.
