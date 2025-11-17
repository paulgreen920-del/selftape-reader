# Production Deployment Checklist

## 1. Create Production Database
- [ ] Create new Prisma PostgreSQL database for production
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Update `.env.production` with production database URL

## 2. Setup Production Stripe
- [ ] Go to Stripe Dashboard → Switch to Live Mode
- [ ] Get Live API keys: `sk_live_...` and `pk_live_...`
- [ ] Create production pricing plan for readers
- [ ] Update `.env.production` with live Stripe keys
- [ ] Setup webhook endpoint in Stripe for production URL
- [ ] Test webhook with Stripe CLI: `stripe listen --forward-to https://yourdomain.com/api/webhooks/stripe`

## 3. Setup OAuth Apps for Production
### Google Calendar
- [ ] Go to Google Cloud Console
- [ ] Create new OAuth 2.0 credentials OR add production redirect URI
- [ ] Authorized redirect URI: `https://yourdomain.com/api/calendar/google/callback`
- [ ] Update `.env.production` with credentials

### Microsoft Calendar
- [ ] Go to Azure Portal
- [ ] Create new app registration OR add production redirect URI
- [ ] Redirect URI: `https://yourdomain.com/api/calendar/microsoft/callback`
- [ ] Update `.env.production` with credentials

## 4. Deploy to Vercel

### Production Deployment
```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy production
vercel --prod

# Set environment variables in Vercel dashboard
# Settings → Environment Variables → Production
```

### Staging Deployment
```bash
# Deploy staging (preview environment)
vercel

# Or create separate project for staging
vercel --scope your-team --project readers-market-staging
```

## 5. Configure Vercel Environment Variables

### Option A: Add each variable individually in Vercel Dashboard
Go to Settings → Environment Variables and add:

**For Production:**
- `DATABASE_URL` = Your `PROD_DB_PRISMA_DATABASE_URL` (Accelerate URL)
- `DIRECT_DATABASE_URL` = Your `PROD_DB_POSTGRES_URL` (Direct Postgres)
- `DIRECT_SHADOW_DATABASE_URL` = Your `PROD_DB_POSTGRES_URL` (same as above)
- `STRIPE_SECRET_KEY` = Your live Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = Your live Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` = Your production webhook secret
- `STRIPE_READER_PRICE_ID` = Your production price ID
- `NEXT_PUBLIC_URL` = https://yourdomain.com
- And all other variables from `.env.production`

**For Preview/Staging:**
- Copy all values from `.env.staging`
- Select "Preview" environment

### Option B: Use Vercel CLI to bulk import
```bash
# Import from .env.production file
vercel env pull .env.production.local
# Then manually set in dashboard or use vercel env add
```

**Important:** Vercel variable names must match what your code expects:
- If Vercel shows `PROD_DB_PRISMA_DATABASE_URL`, you need to add it as `DATABASE_URL`
- The prefix (PROD_DB_, etc.) is just Prisma's naming convention - don't use it in Vercel

## 6. Domain Setup
- [ ] Add custom domain in Vercel
- [ ] Point DNS to Vercel (A/CNAME records)
- [ ] SSL automatically handled by Vercel
- [ ] Update `NEXT_PUBLIC_URL` in production env vars

## 7. Post-Deployment Checks
- [ ] Create admin account via script or signup
- [ ] Test reader signup flow
- [ ] Test actor signup flow
- [ ] Test Stripe subscription payment
- [ ] Test booking creation
- [ ] Test calendar sync (Google & Microsoft)
- [ ] Test email notifications
- [ ] Test webhook receiving from Stripe

## 8. Monitoring Setup
- [ ] Enable Vercel Analytics
- [ ] Setup error tracking (Sentry, etc.)
- [ ] Monitor database performance
- [ ] Check Stripe webhook logs regularly

## Branch Strategy

### Main Branch (Production)
- Only merge tested, stable code
- Deploys automatically to production

### Develop/Staging Branch
- Development and testing
- Deploys to staging environment
- Merge to main when ready for production

```bash
# Create staging branch
git checkout -b staging

# Deploy staging
vercel --scope your-team

# When ready for production
git checkout main
git merge staging
git push origin main
# Auto-deploys to production
```

## Environment Comparison

| Feature | Staging | Production |
|---------|---------|------------|
| Database | Test DB (current) | New production DB |
| Stripe | Test mode | Live mode |
| Domain | staging.yourdomain.com | yourdomain.com |
| Test data | Yes | No |
| Real payments | No | Yes |
| OAuth redirects | staging URLs | production URLs |

## Quick Commands

```bash
# Deploy to production
vercel --prod

# Deploy to staging
vercel

# Check deployment status
vercel ls

# View logs
vercel logs

# Roll back if needed
vercel rollback
```

## Emergency Rollback

If production has issues:
```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

## Testing Live Stripe

1. **Before going live**: Use Stripe test mode to verify everything
2. **Test credit cards**: Use Stripe test cards (4242 4242 4242 4242)
3. **Switch to live**: Activate your Stripe account and use live keys
4. **Monitor**: Watch Stripe dashboard for real transactions

## Important Notes

- Never commit `.env.production` to git
- Keep staging database separate from production
- Test all changes in staging before production
- Monitor webhook delivery in Stripe dashboard
- Have rollback plan ready
