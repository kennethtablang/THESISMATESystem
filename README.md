# THESISMATESystem

Capstone management system for PSU Lingayen — ASP.NET Core 10 API (`THESISMATESystem.Server`)
with a React + Vite client (`thesismatesystem.client`).

## First-time setup

The JWT signing key and the SMTP credentials are **not** in `appsettings.json` — they are secrets,
and a committed Gmail app password is a live credential for anyone with repo access. Each developer
sets them locally, once, and they persist across `git clean` and branch switches.

Run from `THESISMATESystem.Server/`:

```bash
dotnet user-secrets set "Jwt:Key" "<a long random string, 32+ characters>"
dotnet user-secrets set "Email:Username" "noreply.thesismate.system@gmail.com"
dotnet user-secrets set "Email:Password" "<16-character Gmail app password>"
```

Check what is configured with `dotnet user-secrets list`.

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
