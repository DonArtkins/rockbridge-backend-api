# Stripe Payment Integration Setup Guide

## R.O.C.K. Bridge Ministries Donation System

This guide walks you through setting up Stripe payments for the donation system, from test mode through production deployment.

## Step 1: Create Stripe Account

1. **Go to [stripe.com](https://stripe.com)** and click "Start now"
2. **Create your account** with your email and business details
3. **Complete business verification** - you'll need:
   - Business name: "R.O.C.K. Bridge Ministries, Inc."
   - Business type: Non-profit organization
   - Tax ID (EIN) for your 501(c)(3)
   - Business address: 3375 Piedmont Rd NE, Bldg 12, Ste 1330, Atlanta, GA 30305

## Step 2: Get Test API Keys

Once logged into your Stripe dashboard:

1. **Navigate to Developers > API keys**
2. **Toggle to "Test mode"** (should show a toggle in the left sidebar)
3. **Copy these keys:**
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`)

## Step 3: Configure Your Applications

### Frontend (.env file):
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_test_key_here
VITE_API_URL=https://rockbridge.up.railway.app/api
```

### Backend Environment Variables:
Add these to your Railway environment variables or .env:
```bash
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_test_key_here
```

## Step 4: Set Up Webhook Endpoint

Webhooks are crucial for handling events like successful payments:

1. **In Stripe Dashboard, go to Developers > Webhooks**
2. **Click "Add endpoint"**
3. **Endpoint URL:** `https://rockbridge.up.railway.app/api/webhooks/stripe`
4. **Select events to listen for:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded` (for recurring payments)
   - `invoice.payment_failed`
   - `customer.subscription.deleted`

5. **After creating, click on the webhook** and copy the **Signing Secret** (starts with `whsec_...`)

### Add Webhook Secret to Backend:
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Step 5: Test with Test Cards

Stripe provides test card numbers for testing:

**Successful payments:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/25`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any valid ZIP code

**Failed payments:**
- Card: `4000 0000 0000 0002` (card declined)
- Card: `4000 0000 0000 9995` (insufficient funds)

## Step 6: Test Your Integration

1. **Deploy your backend** with the test Stripe keys
2. **Deploy your frontend** with the test publishable key
3. **Try making a test donation** using the test card numbers above
4. **Check the Stripe Dashboard** - you should see the payment in "Payments" section
5. **Check your database** - the donation should be recorded
6. **Check email delivery** - you should receive confirmation emails

## Step 7: Monitor Webhook Events

In your Stripe Dashboard:
1. **Go to Developers > Webhooks**
2. **Click on your webhook endpoint**
3. **Check the "Logs" section** to see if events are being delivered successfully
4. **Look for 200 responses** - this means your backend is handling webhooks correctly

## Step 8: Going Live (After Testing)

### Prerequisites for Live Mode:
1. **Complete business verification** in Stripe Dashboard
2. **Add bank account** for payouts under "Settings > Payouts"
3. **Verify your business documents** (may take 1-2 business days)
4. **Set up tax reporting** if required

### Switch to Live Keys:
1. **In Stripe Dashboard, toggle to "Live mode"**
2. **Go to Developers > API keys** 
3. **Copy the live keys:**
   - Publishable key (starts with `pk_live_...`)
   - Secret key (starts with `sk_live_...`)

4. **Create a new webhook** for live mode:
   - Same URL: `https://rockbridge.up.railway.app/api/webhooks/stripe`
   - Same events as before
   - Copy the new webhook secret (starts with `whsec_...`)

### Update Your Environment Variables:

**Frontend:**
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_live_key_here
```

**Backend:**
```bash
STRIPE_SECRET_KEY=sk_live_your_actual_live_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret_here
```

## Important Security Notes

1. **Never expose secret keys** in frontend code
2. **Always validate webhooks** using the signing secret
3. **Use HTTPS** for all production endpoints (which you already have)
4. **Keep API keys secure** and rotate them if compromised

## Expected Processing Fees

Stripe charges:
- **2.9% + $0.30** per successful card transaction
- **2.7%** for ACH Direct Debit (bank transfers)
- **Additional 1%** for international cards

## Testing Checklist

- [ ] Can create payment intent via API
- [ ] Can process test card payments
- [ ] Donations appear in Stripe Dashboard
- [ ] Donations are saved to your database
- [ ] Webhook events are received and processed
- [ ] Email confirmations are sent
- [ ] Error handling works for declined cards

## Common Issues and Solutions

**Routes not working:** Make sure your backend routes are correctly configured as we discussed earlier.

**CORS errors:** Ensure your CORS middleware allows your frontend domain.

**Webhook failures:** Check that your webhook endpoint is publicly accessible and returns 200 status codes.

**Test payments not working:** Verify you're using test API keys and test card numbers.

## Frontend Dependencies Required

Make sure to install these npm packages:

```bash
npm install @stripe/stripe-js axios
```

## Backend Dependencies Required

Ensure your backend has these packages:

```bash
npm install stripe nodemailer winston express-rate-limit
```

## Environment Variables Summary

### Test Mode:
```bash
# Frontend
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=https://rockbridge.up.railway.app/api

# Backend
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
MONGODB_URI=your_mongodb_connection_string
GMAIL_USER=your_gmail_address
GMAIL_APP_PASSWORD=your_gmail_app_password
```

### Production Mode:
```bash
# Frontend
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_API_URL=https://rockbridge.up.railway.app/api

# Backend
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
MONGODB_URI=your_mongodb_connection_string
GMAIL_USER=your_gmail_address
GMAIL_APP_PASSWORD=your_gmail_app_password
```

## Support

If you encounter issues during setup:
1. Check the Stripe Dashboard logs
2. Review your server logs for errors
3. Verify all environment variables are set correctly
4. Test with the provided test card numbers first

Remember: Always test thoroughly in test mode before switching to live mode for production.