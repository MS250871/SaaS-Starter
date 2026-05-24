I’ll outline this as a production-ready flow for your Next.js SaaS starter, not just “install provider and done.” I’ll cover Google Cloud setup, callback routes, database models, workflows, cookies/session, and security checks.

Thought for 7s

For your SaaS starter, add Google Auth as a separate OAuth login/signup flow that eventually creates the same final session your OTP flow creates.

Google’s official web-server OAuth flow is: create OAuth credentials, redirect the user to Google, receive an authorization code, exchange it for tokens, read/verify user identity, then create your own app session. Google’s docs describe this as the OAuth 2.0 web server flow.

1. Create OAuth app in Google Cloud

Go to Google Cloud Console → APIs & Services → OAuth consent screen.

Set:

App name
Support email
Developer contact email
Authorized domains
Privacy policy URL
Terms URL

For basic login, keep scopes minimal:

openid
email
profile

Then go to APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application. Google requires a client ID for OAuth apps, and for server-side web apps you also get a client secret.

Add redirect URIs:

Development:
http://localhost:3000/api/auth/google/callback

Production:
https://yourdomain.com/api/auth/google/callback

Workspace/custom domain, if needed:
https://tenant.yourdomain.com/api/auth/google/callback
https://clientdomain.com/api/auth/google/callback

For your multi-tenant SaaS, the redirect URI strategy is important. Google does not allow unlimited dynamic callback URLs unless each one is registered. So the cleaner production strategy is usually:

https://app.yourplatform.com/api/auth/google/callback

Then pass the original tenant/workspace context inside state.

2. Add environment variables
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
   GOOGLE_OAUTH_STATE_SECRET="some-long-random-secret"

For Vercel production:

GOOGLE_REDIRECT_URI="https://app.yourplatform.com/api/auth/google/callback" 3. Use these routes

In Next.js App Router, route handlers live under app/.../route.ts and can handle methods like GET and POST.

Create:

app/api/auth/google/start/route.ts
app/api/auth/google/callback/route.ts

The start route redirects the user to Google.

The callback route receives:

code
state
error

Then it exchanges the code for tokens.

4. Add “Continue with Google” button

Your button should simply navigate to:

/api/auth/google/start?intent=login

or:

/api/auth/google/start?intent=signup

For your app, you can include more context:

/api/auth/google/start?intent=signup&entry=workspace&inviteToken=...

But do not trust query params directly. Put them inside a signed/encrypted state.

5. Build the OAuth state

The state must protect against CSRF and must also carry your app context.

For your SaaS starter, the state can contain:

type GoogleOAuthState = {
nonce: string;
intent: "login" | "signup";
entry: "platform" | "workspace";
mode: "normal" | "invite";
workspaceId?: string;
workspaceSlug?: string;
inviteToken?: string;
returnTo?: string;
createdAt: number;
};

Sign or encrypt it before sending to Google.

You already have cookie/context architecture, so the safest approach is:

Generate state payload.
Store nonce in an httpOnly cookie.
Send signed/encrypted state to Google.
On callback, decrypt/verify state.
Compare state.nonce with the cookie nonce.
Reject if expired. 6. Start route logic

The start route should build this URL:

https://accounts.google.com/o/oauth2/v2/auth

With params:

client_id
redirect_uri
response_type=code
scope=openid email profile
state
access_type=offline
prompt=select_account

Use prompt=select_account so users can choose the correct Google account.

7. Callback route logic

When Google redirects back:

/api/auth/google/callback?code=...&state=...

Your callback should:

Validate state.
Exchange code for tokens.
Verify/read the Google ID token.
Extract user profile:
googleSub
email
emailVerified
name
picture
Find or create your local user identity.
Link the Google account to your OAuthAccount table.
Build your app session.
Redirect to post-login/dashboard.

Google’s web-server OAuth flow includes exchanging the authorization code for tokens, then using the token response in the server app.

8. Database handling in your schema

You already have Identity, AuthAccount, OAuthAccount, Session, Membership, etc. So Google Auth should mainly use OAuthAccount.

Recommended unique constraints:

model OAuthAccount {
id String @id @default(uuid()) @db.Uuid

provider OAuthProvider
providerAccountId String @map("provider_account_id") // Google sub

identityId String? @map("identity_id") @db.Uuid
identity Identity? @relation(fields: [identityId], references: [id])

customerId String? @map("customer_id") @db.Uuid
customer Customer? @relation(fields: [customerId], references: [id])

email String?
emailVerified Boolean @default(false) @map("email_verified")
name String?
avatarUrl String? @map("avatar_url")

accessToken String? @map("access_token") // only store if you actually need Google APIs
refreshToken String? @map("refresh_token") // avoid unless needed
expiresAt DateTime? @map("expires_at")

createdAt DateTime @default(now()) @map("created_at")
updatedAt DateTime @updatedAt @map("updated_at")

@@unique([provider, providerAccountId])
@@map("oauth_accounts")
}

enum OAuthProvider {
GOOGLE
}

Important: For login only, you usually do not need to store Google access/refresh tokens. You only need Google’s stable sub value, email, and profile metadata.

9. Account linking rules

This is the part you should decide carefully.

Case A: Google account already linked
OAuthAccount(provider=GOOGLE, providerAccountId=googleSub) exists

Then login that identity/customer.

Case B: Email exists as verified AuthAccount
AuthAccount(type=EMAIL, identifier=email, isVerified=true) exists

Then you can link Google to the same identity.

Case C: Email exists but not verified

Do not automatically trust it unless Google says email_verified = true.

If Google email is verified, you may mark the email auth account verified or create a verified email auth account.

Case D: No local account exists

For signup mode, create:

Identity
AuthAccount EMAIL verified
OAuthAccount GOOGLE
Session

For login mode, either allow just-in-time signup or return an error like:

No account found. Please sign up first.

For a SaaS product, I usually recommend allowing Google login to create an account only when the flow intent is clearly signup or when your product allows open self-signup.

10. Integrate with your existing workflow layer

Given your architecture, I would not put all logic inside the route handler.

Use this structure:

auth/
google/
route.ts only receives/redirects
services.ts
workflows.ts

Suggested workflows:

googleOAuthStartWorkflow()
googleOAuthCallbackWorkflow()
buildFinalSessionWorkflow()
postLoginWorkflow()

The callback route should call:

await googleOAuthCallbackWorkflow({
code,
state,
requestContext,
});

Then your workflow should call the same session builder that OTP login uses.

This keeps Google login and OTP login converging into one final session system.

11. Cookie/session handling

Because your app uses cookie-based auth, after callback you should set your own session cookie.

In Next.js, cookie modification must happen in a Route Handler or Server Function because the server sends Set-Cookie headers to the browser.

Your callback route can:

const response = NextResponse.redirect(new URL("/post-login", request.url));

response.cookies.set("session", sessionToken, {
httpOnly: true,
secure: process.env.NODE_ENV === "production",
sameSite: "lax",
path: "/",
maxAge: 60 _ 60 _ 24 \* 30,
});

return response;

Since OAuth is a cross-site redirect back from Google, sameSite: "lax" is usually appropriate for the main auth cookie.

12. Multi-tenant handling

For your SaaS starter, do not let Google decide tenant context.

Google only proves identity.

Your system decides:

Which workspace?
Which membership?
Which customer context?
Which permissions?
Which post-login step?

So your callback should produce an identity session first, then run your existing post-login logic.

Possible outcomes:

Platform user → /dashboard
Workspace user with membership → /app
User has multiple workspaces → /select-workspace
Signup without workspace → /create-workspace
Invite flow → accept invite → create membership → /app 13. Security checklist

Use this checklist:

Use HTTPS in production.
Use signed/encrypted state.
Validate state nonce.
Expire state quickly, for example 5–10 minutes.
Verify Google ID token audience equals GOOGLE_CLIENT_ID.
Use Google sub as providerAccountId, not email.
Do not store Google tokens unless needed.
Do not trust returnTo blindly; allow only internal paths.
Do not auto-link unverified emails.
Use httpOnly, secure, sameSite cookies.
Log OAuth login in audit logs. 14. Recommended implementation sequence

I would implement it in this order:

1. Create Google Cloud OAuth client.
2. Add env variables.
3. Create /api/auth/google/start route.
4. Create signed/encrypted state helper.
5. Create /api/auth/google/callback route.
6. Exchange code for token.
7. Verify ID token.
8. Create googleOAuthCallbackWorkflow.
9. Link/create Identity + OAuthAccount.
10. Reuse existing final session builder.
11. Redirect to post-login.
12. Add Google button on login/signup pages.
13. Test normal login, signup, invite flow, and workspace flow.

The most important design point: Google Auth should only replace the OTP identity-verification step. It should not bypass your post-login, workspace, membership, permission, or final-session workflow.
