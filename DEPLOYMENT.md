# Production Deployment Guide

## Step 1: Push to GitHub

```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

## Step 2: Deploy to Vercel

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your `self-tape` repository
5. Configure project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `pnpm build`
   - Output Directory: .next

## Step 3: Environment Variables

In Vercel Project Settings → Environment Variables, add ALL of these:

### Database
```
DATABASE_URL=postgres://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>?sslmode=require
DIRECT_DATABASE_URL=postgres://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>?sslmode=require
DIRECT_SHADOW_DATABASE_URL=postgres://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>?sslmode=require
```

### Stripe
```
STRIPE_SECRET_KEY=<STRIPE_SECRET_KEY>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<STRIPE_PUBLISHABLE_KEY>
STRIPE_WEBHOOK_SECRET=<STRIPE_WEBHOOK_SECRET>
STRIPE_READER_PRICE_ID=<STRIPE_READER_PRICE_ID>
```

### Email
```
RESEND_API_KEY=<RESEND_API_KEY>
FROM_EMAIL=Reader Marketplace <booking@yourdomain.com>
```

### Calendar OAuth
```
GOOGLE_CLIENT_ID=<GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<GOOGLE_CLIENT_SECRET>
GOOGLE_REDIRECT_URI=https://YOUR-VERCEL-URL.vercel.app/api/calendar/google/callback

MS_CLIENT_ID=<MS_CLIENT_ID>
MS_CLIENT_SECRET=<MS_CLIENT_SECRET>
MS_REDIRECT_URI=https://YOUR-VERCEL-URL.vercel.app/api/calendar/microsoft/callback
```

### Daily.co
```
DAILY_API_KEY=<DAILY_API_KEY>
```

### Public URL (IMPORTANT!)
```
NEXT_PUBLIC_URL=https://YOUR-VERCEL-URL.vercel.app
```

## Step 4: Update External Services

### A. Google Cloud Console
1. Go to https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client ID
3. Add to "Authorized redirect URIs":
   ```
   https://YOUR-VERCEL-URL.vercel.app/api/calendar/google/callback
   ```

### B. Microsoft Azure Portal
1. Go to https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps
2. Find your app → Authentication
3. Add redirect URI:
   ```
   https://YOUR-VERCEL-URL.vercel.app/api/calendar/microsoft/callback
   ```

### C. Stripe Webhooks
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://YOUR-VERCEL-URL.vercel.app/api/webhooks/stripe`
4. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
5. Copy the **Signing secret** and update `STRIPE_WEBHOOK_SECRET` in Vercel

### D. Stripe Reader Subscription Webhook
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://YOUR-VERCEL-URL.vercel.app/api/webhooks/stripe/subscription`
4. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

## Step 5: Deploy

1. Click "Deploy" in Vercel
2. Wait for build to complete (~2-3 minutes)
3. You'll get a URL like: `https://your-project-abc123.vercel.app`

## Step 6: Test in Production

1. Visit your Vercel URL
2. Sign up as a new reader
3. Connect Google Calendar
4. Set availability
5. Subscribe (Stripe test mode)
6. Book a session as actor
7. Verify emails arrive
8. Check calendar events created

## Step 7: Custom Domain (Optional)

1. Buy a domain (Namecheap, GoDaddy, etc.)
2. In Vercel → Settings → Domains
3. Add your custom domain
4. Update DNS records as instructed
5. Update all URLs in:
   - Vercel env vars (`NEXT_PUBLIC_URL`)
   - Google OAuth redirect URI
   - Microsoft OAuth redirect URI
   - Stripe webhooks

## Troubleshooting

### Build Fails
- Check Vercel build logs
- Make sure all dependencies in `package.json`
- Prisma may need: `prisma generate` in build command

### Database Connection Issues
- Vercel Postgres may have connection limits
- Consider upgrading plan or using connection pooling

### OAuth Redirects Fail
- Double-check redirect URIs match exactly
- Make sure HTTPS (not HTTP) in production

### Emails Not Sending
- Check Resend dashboard for delivery status
- Verify FROM_EMAIL domain is verified in Resend
- Check spam folders

### Webhooks Not Working
- Test webhook endpoint: `curl -X POST https://your-url.vercel.app/api/webhooks/stripe`
- Check Stripe webhook logs
- Verify signing secret matches

## Going Live (Production Mode)

When ready to accept real payments:

1. Switch Stripe to Live Mode:
   - Get live API keys from Stripe
   - Update all `STRIPE_*` env vars in Vercel
   - Recreate webhooks with live mode
   
2. Update Google Calendar OAuth (if needed):
   - Submit for OAuth verification if using sensitive scopes
   
3. Configure production database:
   - Consider dedicated Postgres instance
   - Set up backups
   - Monitor connection pooling

## Monitoring

- **Vercel Analytics**: Built-in traffic monitoring
- **Stripe Dashboard**: Payment tracking
- **Resend Dashboard**: Email delivery rates
- **Vercel Logs**: Real-time application logs

## Cost Estimates (Starting Out)

- **Vercel Hobby**: Free (for personal projects)
- **Vercel Postgres**: $20/month (if using Vercel DB)
- **External Postgres**: $0-15/month (Railway, Neon, Supabase)
- **Stripe**: 2.9% + $0.30 per transaction
- **Resend**: Free up to 3,000 emails/month
- **Daily.co**: Free up to 1,000 minutes/month

**Total**: ~$0-50/month depending on usage
