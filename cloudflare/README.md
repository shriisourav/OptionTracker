# Cloudflare Keep-Alive Worker

This Cloudflare Worker pings your OptionTracker backend every 5 minutes to prevent Render's free tier from going to sleep.

## Quick Setup (No CLI Required)

### Step 1: Create Cloudflare Account
1. Go to https://dash.cloudflare.com
2. Sign up for a free account (or log in)

### Step 2: Create Worker
1. In the sidebar, click **"Workers & Pages"**
2. Click **"Create Application"**
3. Click **"Create Worker"**
4. Name it: `optiontracker-keepalive`
5. Click **"Deploy"** (deploys the default "Hello World" worker)

### Step 3: Add Your Code
1. Click **"Edit code"** (in the top right)
2. Delete everything in the editor
3. Copy-paste the entire contents of `keep-alive-worker.js` into the editor
4. Click **"Save and Deploy"** (top right)

### Step 4: Add Cron Trigger (Most Important!)
1. Go back to your Worker's dashboard
2. Click the **"Triggers"** tab
3. Scroll down to **"Cron Triggers"**
4. Click **"Add Cron Trigger"**
5. Enter: `*/5 * * * *` (every 5 minutes)
6. Click **"Add Trigger"**

### Step 5: Verify It Works
1. Go to the **"Quick edit"** tab or your Worker URL
2. You should see a JSON response showing the ping results
3. Check the logs in the **"Logs"** tab to see cron executions

## What It Does

Every 5 minutes, the worker:
1. Pings `/api/health` - Basic health check
2. Pings `/api/price/MSFT` - Warms up the yfinance data fetching

This keeps your Render backend warm 24/7, eliminating the ~30 second cold start.

## Free Tier Limits

Cloudflare Workers free tier includes:
- ✅ 100,000 requests/day (you'll use ~288 for pings)
- ✅ Unlimited cron triggers
- ✅ 10ms CPU time per invocation

More than enough for this use case!

## Alternative: Deploy with Wrangler CLI

If you prefer using the CLI:

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
cd cloudflare
wrangler deploy
```

## Monitoring

Check your Worker's logs to verify pings are working:
1. Go to your Worker dashboard
2. Click **"Logs"** tab
3. Look for scheduled events every 5 minutes

---

**Result:** Your OptionTracker app will now load instantly! 🚀
