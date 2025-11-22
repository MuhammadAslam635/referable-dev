# Setup Instructions

## 🚨 IMMEDIATE FIXES NEEDED

### 1. Fix Database Connection

Your current `DATABASE_URL` is incorrect. Follow these steps:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Project Settings** → **Database**
4. Copy the **Connection String (Pooler)** - it looks like:
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
5. Replace `DATABASE_URL` in `.env` with the correct string

### 2. Build the Client First

Before running the server, you need to build the React frontend:

```bash
# Build the client
npm run build
```

This creates the `server/public` folder that the server needs.

### 3. Update Environment Variables

Update your `.env` file:

**For Local Development:**
```env
NODE_ENV=development
FRONTEND_URL=http://localhost:5000
```

**For Production (Render/Heroku/etc):**
```env
NODE_ENV=production
FRONTEND_URL=https://your-actual-domain.com
```

## 📋 COMPLETE STARTUP SEQUENCE

```bash
# 1. Install dependencies (already done)
npm install

# 2. Fix your .env file (see above)
# Edit .env and add correct DATABASE_URL

# 3. Build the client
npm run build

# 4. Run the server
npm run dev
```

## 🔍 Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `FRONTEND_URL` | Main URL for webhooks & redirects | `http://localhost:5000` (dev) or `https://yourapp.com` (prod) |
| `DATABASE_URL` | Supabase/PostgreSQL connection | Get from Supabase dashboard |
| `TWILIO_ACCOUNT_SID` | Twilio Account ID | `AC...` (you have this) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `...` (you have this) |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Server port | `3000` (default) |

## 🎯 What Changed?

- ✅ Added `FRONTEND_URL` - Used by the new webhook configuration system
- ✅ Changed `NODE_ENV` to `development` for local testing
- ✅ Removed `TWILIO_WEBHOOK_URL` - Now auto-generated from `FRONTEND_URL`
- ⚠️ You need to fix `DATABASE_URL` with correct Supabase password

## 🐛 Troubleshooting

### Error: "Tenant or user not found"
**Fix:** Your `DATABASE_URL` password is wrong. Get the correct one from Supabase.

### Error: "Could not find build directory"
**Fix:** Run `npm run build` to build the React client first.

### Error: "Twilio client not initialized"
**Fix:** Check that `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set in `.env`

## 🚀 For Production Deployment

When deploying to Render/Heroku/Railway:

1. Set environment variables in the platform's dashboard
2. Set `NODE_ENV=production`
3. Set `FRONTEND_URL=https://your-actual-domain.com`
4. Ensure `DATABASE_URL` points to your production database
5. The build command should be: `npm run build`
6. The start command should be: `npm start` or `npm run dev`

## 📞 Twilio Webhook Configuration

With the new system, webhooks are automatically configured:
- SMS Inbound: `{FRONTEND_URL}/api/sms/inbound`
- SMS Status: `{FRONTEND_URL}/api/sms/status`
- SMS Fallback: `{FRONTEND_URL}/api/sms/inbound`

No need to manually set webhook URLs anymore!
