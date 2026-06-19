# Deploying Lingo (and using it on your iPhone)

The goal: get a public `https://…` URL you can open in Safari on your phone.
The easiest host for a Next.js app is **Vercel** (free tier is plenty).

## 1. Push the code (already done)

The app lives on the branch `claude/lingq-copy-app-efpxra` in your GitHub repo.

## 2. Import the project into Vercel

1. Go to **https://vercel.com** and sign in with GitHub.
2. **Add New… → Project**, pick the `docs` repo.
3. When asked which branch to deploy, choose `claude/lingq-copy-app-efpxra`
   (or merge it into `main` first and deploy `main`).
4. Framework preset: **Next.js** (auto-detected). Leave build settings default.
5. Click **Deploy**. In ~1 minute you get a URL like
   `https://lingo-xxxx.vercel.app`.

## 3. Open it on your iPhone

- Open the Vercel URL in **Safari**.
- Tap **Share → Add to Home Screen** — it then opens full-screen like a native app.

## 4. Make your data persist (important)

Vercel runs the app on serverless functions with a **read-only / ephemeral
filesystem**. Without external storage, your lessons and saved words reset on
every cold start. To keep data, point the app at an **S3 bucket**:

In Vercel → your project → **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `S3_BUCKET` | your bucket name |
| `S3_PREFIX` | `lingo` |
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_ACCESS_KEY_ID` | an IAM key with read/write to that bucket |
| `AWS_SECRET_ACCESS_KEY` | the secret for that key |

Redeploy. The app now stores `lessons/index.json` and `words/<lang>.json` in
S3. (The IAM user only needs `s3:GetObject` / `s3:PutObject` on
`arn:aws:s3:::<bucket>/lingo/*`.)

## 5. (Optional) Turn on AI grammar feedback

Add one more environment variable to enable the **Practice** page's
AI corrections:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your Claude API key |

Without it, every other feature still works — the Practice page just shows that
AI feedback is off.

---

## Running locally instead

```bash
npm install
npm run dev          # http://localhost:3000
```

To open it on your phone over the same WiFi, run with your machine's IP:

```bash
npm run dev -- -H 0.0.0.0
# then on your phone visit http://<your-computer-ip>:3000
```

This only works while your computer is on and on the same network.
