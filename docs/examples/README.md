# Examples

Steps and style files to copy and edit. Change the `url` and the targets to match your app. `npx cursorcam@beta inspect <url>` lists targets that work on a page.

You can also hand one to Claude:

```
Use docs/examples/checkout.json as a starting point for our checkout.
```

## Try it on a famous site

These run on public sites, so you can try CursorCam before you point it at your own app:

| File | Shows |
| --- | --- |
| [try-todomvc.json](try-todomvc.json) | TodoMVC: adds three todos, completes one, then shows only the active ones |
| [try-wikipedia.json](try-wikipedia.json) | Wikipedia: searches for Alan Turing and scrolls to his early life |
| [try-hacker-news.json](try-hacker-news.json) | Hacker News: opens Show HN, then the jobs page |

```bash
npx cursorcam@beta run docs/examples/try-todomvc.json
```

Public sites change their pages now and then. If a step stops working, run `npx cursorcam@beta inspect <url>` and update the target.

## Steps for your own app

| File | Shows |
| --- | --- |
| [create-issue.json](create-issue.json) | The steps behind the video at the top of the README: a form, two menus, then a comment |
| [sign-up.json](sign-up.json) | A sign-up form with a `$secret:` password, ending on the welcome page |
| [checkout.json](checkout.json) | A payment form, a whole-page view for the Pay button, and a close-up of the result |
| [login-2fa.json](login-2fa.json) | A login that waits for a 2FA code with `ask` |
| [phone-menu.json](phone-menu.json) | A phone recording, for a vertical video |
| [settings.json](settings.json) | Dark mode, scrolling to a section, a select list and a checkbox |

Run one:

```bash
CURSORCAM_SECRET_PASSWORD='…' npx cursorcam@beta run docs/examples/sign-up.json
```

## Styles

| File | Look |
| --- | --- |
| [style-brand.json](style-brand.json) | A custom gradient, more space around the window, your domain in the address bar |
| [style-calm.json](style-calm.json) | A paper background, a soft shadow and no zoom |
| [style-close-up.json](style-close-up.json) | A dark background, a closer zoom that holds after each action, and a bigger cursor |

Use one, or render an existing recording with it:

```bash
npx cursorcam@beta run steps.json --style docs/examples/style-brand.json
npx cursorcam@beta render cursorcam-output/<run> --style docs/examples/style-calm.json
```

Every key is in [Steps file](../steps.md) and [Look and size](../style.md).
