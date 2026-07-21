Cloudflare Worker for reCAPTCHA verification

This tiny Cloudflare Worker receives a POST with JSON { token: '...' } and forwards it to Google's reCAPTCHA verify endpoint using the secret stored in the Worker environment as `RECAPTCHA_SECRET`.

Deployment (manual steps you should run locally):

1. Install Wrangler (Cloudflare CLI) if you haven't already:

```bash
npm install -g wrangler
```

2. Authenticate and select your account:

```bash
wrangler login
```

3. Add the secret to your Worker (do NOT commit the secret):

```bash
wrangler secret put RECAPTCHA_SECRET
```

4. Deploy the Worker:

```bash
wrangler deploy
```

5. Use the published URL as the verification endpoint in your frontend. Example default placeholder in `captcha.js`:

```
https://your-worker-subdomain.workers.dev/verify-captcha
```

Notes:
- Keep `RECAPTCHA_SECRET` private. Do not check it into git.
- You can also bind the secret and route via a custom path using Cloudflare Pages / Routes if desired.
