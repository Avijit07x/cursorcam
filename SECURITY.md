# Security policy

## Supported versions

Security fixes are released for the latest version of `cursorcam`.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately with GitHub's
[private vulnerability reporting](https://github.com/Avijit07x/cursorcam/security/advisories/new).
Include the version, what an attacker could do, and steps to reproduce.

You will get an acknowledgement as soon as possible. Once the issue is
confirmed, a fix is released and the report is credited, unless you prefer to
stay anonymous.

## What to report

CursorCam types logins into real sites and runs a browser on your machine, so
these count as security problems:

- A `$secret:` or `$env:` value, or an `ask` reply, reaching a file, a log,
  the terminal output or an unblurred frame of the video.
- A download, upload or temp file read or written outside its run folder.
- The local render server answering a request without its random token.
- A browser or other process left running after a run ends.
