# Resend SMTP setup for Supabase Auth

## Scope and security boundary

This configures **Supabase Auth** email (password recovery, confirmations, and
future invitations). Supabase sends these messages, so enter the Resend API key
only in the Supabase dashboard. Do not add it to `.env.local`, Git, GitHub, or
Vercel. Application-originated operational email is a separate future feature.

## Temporary controlled test configuration

In Supabase Dashboard for project `ctpctcymjbtyxpdawrgh`, open **Authentication
> SMTP Settings** and enable custom SMTP:

| Field | Test value |
| --- | --- |
| Sender email | `onboarding@resend.dev` |
| Sender name | `Evo Rentals` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Your Resend API key (paste directly in Supabase) |

Save it, then use **Authentication > URL Configuration**:

- Site URL: `https://evorentals.vercel.app`
- Add `https://evorentals.vercel.app/auth/callback` to redirect URLs.
- Add `https://evorentals.vercel.app/update-password` to redirect URLs.
- For local work, retain `http://localhost:3000/**`.
- Add the tightly-scoped Vercel preview wildcard only if previews need recovery
  tests: `https://*-wephotons1.vercel.app/**`.

In **Authentication > Email Templates**, set:

| Template | Subject | Repository source |
| --- | --- | --- |
| Reset Password | `Reset your Evo Rentals password` | `supabase/auth-templates/password-recovery.html` |
| Confirm signup | `Confirm your Evo Rentals email` | `supabase/auth-templates/confirm-signup.html` |

Paste the file body unchanged. `{{ .ConfirmationURL }}` is the Supabase-owned,
single-use action URL, and must not be replaced by an application URL.

## Controlled smoke test

1. Use a test mailbox you control, not a customer mailbox.
2. Request a reset once at `https://evorentals.vercel.app/forgot-password`.
3. Confirm the message is from `Evo Rentals <onboarding@resend.dev>` and that
   the button opens `/auth/callback?next=/update-password`.
4. Set a new password, sign in, and record only pass/fail in the task queue.
5. Do not repeatedly request messages: Supabase and providers rate-limit Auth
   email, and each new recovery request can invalidate prior links.

If a security scanner consumes the email link before the user opens it, use an
OTP-based confirmation design in a later dedicated task rather than weakening
the recovery flow.

## Production cutover

`onboarding@resend.dev` is not a production sender. Before customer or employee
onboarding:

1. Verify an Evo Rentals domain in Resend (SPF/DKIM records).
2. Change the Supabase sender to an address on that verified domain, for example
   `noreply@evorentals.in`.
3. Repeat the controlled password-reset test and record the outcome.
4. Keep click tracking disabled for Supabase Auth templates so it does not
   rewrite one-time authentication URLs.

Only after this cutover should D4-06 be marked completed and D4-04/D6-03 be
unblocked for end-to-end email flows.
