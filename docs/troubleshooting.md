# Troubleshooting

Every failure prints an `Error:` line and, most of the time, a `Fix:` line. A failed step also saves `failure.jpg` in the run folder. Look at it first.

If Claude is making the video, it reads these and fixes most problems itself.

## By exit code

| Code | Meaning | What to do |
| --- | --- | --- |
| 1 | unexpected error | Run again once. If it happens again, [open an issue](https://github.com/Avijit07x/cursorcam/issues) with the error |
| 2 | bad input | Fix the steps file, style or option the error names |
| 3 | no usable browser, or `doctor` found a problem | Run `npx cursorcam@beta doctor` and follow its `Fix:` lines |
| 4 | a step failed | See the step errors below |
| 5 | encoding failed | Run `doctor`, then render again |
| 6 | timeout | A step or an `ask` took too long. See below |
| 7 | the page did not load | Check that the app is running at that URL |
| 8 | disk full | Free some disk space. Recording uses up to 1 GB per minute |
| 9 | interrupted | Start the run again |
| 10 | blocked, or needs a human | A captcha or bot check. Log in by hand with `login`, see [Logins and secrets](logins.md#captchas-and-bot-checks) |
| 11 | the browser crashed | Run again. If it happens again, the page may be too heavy for a hidden browser |

## Step errors

| Error | Fix |
| --- | --- |
| `Could not find <target>` | Run `inspect` on that page and copy a target. If the element shows up late, add a `waitFor` before it, or raise `timeout` |
| `<target> matches 2 elements` | The error lists them. Add `within`, `near` or `nth`, or `"exact": true` |
| `<target> is covered by <element>` | Close the cover first, like a cookie banner's Accept button |
| `<target> stayed disabled` | A step before it is missing, like a required field |
| `<target> is see-through (opacity 0)` | Target the visible element instead |
| `<target> disappeared` | The page changed under the cursor. Add a `waitFor` for the new state first |
| `The step did not finish within …` | The page is slow. Raise `timeout` in the steps file |
| `A field shows … instead of …` | A length limit or input mask changed the text. Type text the field accepts |
| `goto "…" leaves http://…` | Add that origin to `allowOrigins` |
| `The steps use $secret:NAME, but CURSORCAM_SECRET_NAME is not set` | Pass the value to that command |
| `Nobody answered "…" within 5 minutes` | Run again and send the answer sooner |

## Page problems

| Problem | Fix |
| --- | --- |
| HTTP 401 | Add `httpCredentials` with `$secret:` values |
| The page needs a login | Give Claude a demo login, or save one with `login` and use `--profile` |
| Native date or color pickers | They do not show in the video. Type the value into the field instead |
| A native select list | Add `"showList": true` to show the open list |
| Tooltips | They do not show in the video. Show the same thing another way |
| The phone layout looks zoomed out | The page has no viewport meta tag. Record on desktop instead |

## The video

| Problem | Fix |
| --- | --- |
| The zoom cuts off what changed | Lower the zoom, see [Look and size](style.md#fixes-from-the-stills) |
| A spinner or blank page shows | Add a `waitFor` for the content before the next step |
| A cookie banner covers the page | Add a step that closes it, at the start |
| Private data shows | Add `"mask": [".selector"]` to the steps file |
| The file is too big | Render again with `--max-size` |
