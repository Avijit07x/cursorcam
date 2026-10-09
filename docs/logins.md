# Logins and secrets

## With Claude

When a flow needs a login, Claude asks:

```
❓ I need a login for http://localhost:3000 to record the dashboard.
Reply with: email, password
```

- The login is used for that run only.
- Claude passes it to the one command that needs it, and never writes it to a file, a log or memory.
- Password fields show dots in the video. Any other secret, like an email, is blurred.
- Use a demo account, not a real one with customer data.

## In a steps file

Never put a password in the steps file. Use a placeholder:

```json
{ "type": "$secret:PASSWORD", "into": "label=Password" }
```

Pass the value to that one command:

```bash
CURSORCAM_SECRET_PASSWORD='…' npx cursorcam@beta run steps.json
```

- `$secret:NAME` reads `CURSORCAM_SECRET_NAME`.
- `$env:NAME` reads a variable you already keep, like `$env:DEMO_EMAIL`.
- Secret values never reach a file, a log or the terminal output.
- They work in `type` and in `httpCredentials`.

To blur other things on screen, like the signed-in email, add `"mask": [".user-email"]` at the top of the steps file.

## 2FA and email codes

Add an `ask` step where the code goes:

```json
{ "ask": "2FA code", "into": "label=Code" }
```

The run stops there and waits up to 5 minutes. Claude asks you for the code. On the CLI, send it to the waiting run:

```bash
printf %s "123456" | npx cursorcam@beta answer cursorcam-output/<run>
```

## HTTP basic auth

```json
{
  "url": "https://staging.example.com",
  "httpCredentials": { "username": "$secret:USER", "password": "$secret:PASS" },
  "steps": []
}
```

## Captchas and bot checks

CursorCam never tries to solve a captcha. Such a page stops the run with exit code 10. Log in once by hand instead:

```bash
npx cursorcam@beta login https://app.example.com/login --profile acme
```

A browser window opens. Log in, then close the window. From then on, add `--profile acme` to `inspect`, `check` and `run`.

- The saved login holds the site's cookies, not your password, in a file only you can read.
- When the site logs you out, run `login` again with the same name.
- Delete it with `npx cursorcam@beta login --profile acme --forget`.
