# Troubleshooting

Every failure prints an `Error:` line and, most of the time, a `Fix:` line. A failed step also saves `failure.jpg` in the run folder. Read the frame before you change anything.

## Exit codes

| Code | Meaning | What to do |
| --- | --- | --- |
| 0 | ok | |
| 1 | unexpected error | Run again once. If it repeats, show the user the error |
| 2 | bad input | Fix the steps file, style or options as the error says |
| 3 | no usable browser, or `doctor` found a problem | Show the user the `Fix:` line from `cursorcam doctor` |
| 4 | a step failed | See the step errors below |
| 5 | encoding failed | Run `cursorcam doctor`, then render again |
| 6 | timeout | A step or an `ask` took too long. See below |
| 7 | the page did not load | Check the app is running at that URL |
| 8 | disk full | Ask the user to free disk space |
| 9 | interrupted | Start the run again |
| 10 | blocked, or needs a human | A captcha or bot check. Use `cursorcam login`, never solve it |
| 11 | the browser crashed | Run again. If it repeats, the page may be too heavy for a hidden browser |

## Step errors

| Error | Fix |
| --- | --- |
| `Could not find <target> within 15 s` | Run `inspect` on that page and copy a target. If the element shows up late, add a `waitFor` before it, or raise `timeout` |
| `<target> matches 2 elements` | The error lists them. Add `within`, `near` or `nth`, or use `"exact": true` |
| `<target> is covered by <element>` | Close the cover first with its own step, like a cookie banner's Accept button |
| `<target> stayed disabled` | A step before it is missing, like a required field |
| `<target> is see-through (opacity 0)` | Target the visible element that shows it instead |
| `<target> disappeared` | The page changed under the cursor. Add a `waitFor` for the new state first |
| `The step did not finish within …` | The page is slow. Raise `timeout` in the steps file |
| `The page closed its own tab` | Remove the steps after the tab closes, or start from another page |
| `A field shows … instead of …` (warning) | A length limit or an input mask changed the text. Type text the field accepts |
| `goto "…" leaves http://…` | Add that origin to `allowOrigins` |
| `The steps use $secret:NAME, but CURSORCAM_SECRET_NAME is not set` | Pass the value to that command, or ask the user for it |
| `Nobody answered "…" within 5 minutes` | The user did not reply in time. Run again and ask again |

## Page problems

| Problem | Fix |
| --- | --- |
| The page answers with HTTP 401 | Add `httpCredentials` with `$secret:` values |
| The page needs a login | Ask the user for one, or use a saved login with `--profile` |
| A captcha or "verify you are human" page | Exit code 10. Ask the user to log in with `cursorcam login`, then use `--profile` |
| Native date or color pickers | They do not show in the video. Type the value into the field instead |
| A native select list | Add `"showList": true` to show the open list in the video |
| Tooltips | They do not show in the video. Show the same information another way |
| The phone layout looks zoomed out | The page has no viewport meta tag. Record on desktop instead |

## Login problems

| Problem | Fix |
| --- | --- |
| `There is no saved login named "x"` | The error lists saved logins. Save one with `cursorcam login <url> --profile x` |
| `Nothing was saved` after `login` | The user closed the window before logging in. Run `login` again |
| `The login window was still open after 9 minutes` | Run `login` again and ask the user to close the window when done |
| A saved login stopped working | The site's session ended. Run `login` again with the same `--profile` name |
