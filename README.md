# THESISMATESystem

Capstone management system for PSU Lingayen — ASP.NET Core 10 API (`THESISMATESystem.Server`)
with a React + Vite client (`thesismatesystem.client`).

## First-time setup

The development JWT key and the SMTP credentials are committed in
`THESISMATESystem.Server/appsettings.Development.json`, so a fresh clone sends email with no extra
setup when run in Development. This repository is public, so treat that Gmail app password as
exposed: if it is revoked, generate a new one and update that file.

To override them on one machine without touching the committed file, run from
`THESISMATESystem.Server/` (user-secrets take precedence over `appsettings.Development.json`):

```bash
dotnet user-secrets set "Jwt:Key" "<a long random string, 32+ characters>"
dotnet user-secrets set "Email:Username" "noreply.thesismate.systempsu@gmail.com"
dotnet user-secrets set "Email:Password" "<16-character Gmail app password>"
```

Check what is configured with `dotnet user-secrets list`.

A fresh clone has none of these — user-secrets live in
`%APPDATA%\Microsoft\UserSecrets\8c6c816b-abb6-4934-9cac-4c72caecf331\secrets.json`, outside the
repository. Get the app password from the project owner over a private channel (not GitHub), or copy
that `secrets.json` file to the same path on the new machine. Without it the app still runs in
Development, but no email (verification, 2FA, password reset, notifications) is delivered.

In production, supply the same values as environment variables instead —
`Jwt__Key`, `Email__Username`, `Email__Password` (double underscore, not colon).

### Getting the Gmail app password

Ordinary account passwords are rejected by Gmail's SMTP. Generate an app password at
<https://myaccount.google.com/apppasswords> while signed in as the sender account, and paste it
without spaces.

### Symptoms of missing or stale credentials

| What you see | Cause |
|---|---|
| `JWT Key is not configured` on startup | `Jwt:Key` is unset |
| `SMTP credentials are not configured` in the log | `Email:Username` / `Email:Password` are unset |
| `5.7.0 Authentication Required` | credentials unset — SMTP skipped AUTH entirely |
| `SMTP server rejected the login for …` | the app password is wrong, revoked, or the account is blocked |

Registration is the usual place this surfaces, as
*"Failed to send the verification email. Please check your email address and try again later."*
In Development the account is still created and the verification link is written to the server log
(`DEVELOPMENT ONLY - verification link for …`), so registration can be tested without working SMTP.

## Running

```bash
dotnet run --project THESISMATESystem.Server      # API + launches the Vite dev server
```

The client is served by the SPA proxy at <https://localhost:62535>.

## Dates and times

Every datetime crossing the API is UTC. The client sends `Date.toISOString()` and renders with
`toLocaleString`, so the browser does the Philippine (+8) conversion. Server-side, incoming values
are normalised by `UtcDateTimeConverter` and outgoing ones always carry a `Z` suffix — see
`Helpers/UtcDateTimeConverter.cs` for how offset-less input is handled.
