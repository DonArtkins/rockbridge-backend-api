# Rockbridge Backend API

A high-performance, scalable donation processing API built for Rockbridge Ministries. This microservice handles global payment processing through Stripe, MongoDB data storage, and automated email notifications with graceful handling of concurrent donations.

## 🚀 Features

- **High Concurrency**: Handle thousands of simultaneous donations globally
- **Stripe Integration**: Secure payment processing with webhooks
- **MongoDB**: Atomic transactions with optimistic locking
- **Email Automation**: Receipt and notification system via Gmail SMTP
- **Global Scale**: Multi-region support with proper timezone handling
- **Real-time Analytics**: Campaign progress and donation tracking
- **Rate Limiting**: Protection against spam and abuse
- **Comprehensive Logging**: Winston-based logging with rotation
- **Health Monitoring**: Built-in health checks and metrics

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Payments**: Stripe API
- **Email**: Nodemailer with Gmail SMTP
- **Validation**: Joi + Express Validator
- **Logging**: Winston with daily rotation
- **Testing**: Jest + Supertest

### Design Principles
- **Stateless**: Each request is independent
- **Atomic Operations**: Database transactions ensure consistency
- **Graceful Degradation**: Continues operation even if email fails
- **Idempotency**: Safe to retry failed operations
- **Horizontal Scaling**: Ready for load balancer deployment

## 📁 Project Structure

```
rockbridge-backend-api/
├── src/
│   ├── config/           # Configuration files
│   ├── models/           # MongoDB schemas
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── middlewares/      # Express middlewares
│   ├── routes/           # API endpoints
│   ├── utils/            # Helper functions
│   ├── templates/        # Email templates
│   └── seeds/            # Database seeders
├── tests/                # Test suites
├── docs/                 # Documentation
├── logs/                 # Application logs
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm 8+
- MongoDB 6.0+ (local or Atlas)
- Stripe account with API keys
- Gmail account with App Password

### Installation

1. **Clone and setup project:**
   ```bash
   # Run the setup commands from the previous artifact
   # This creates all folders and installs dependencies
   ```

2. **Environment Configuration:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Required Environment Variables:**
   ```env
   # Server
   PORT=5000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/rockbridge-donations
   
   # Stripe
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   
   # Email
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-digit-app-password
   ADMIN_EMAIL=admin@rockbridgeministries.org
   
   # Security
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Database Setup:**
   ```bash
   # Seed initial campaigns
   npm run seed
   ```

5. **Start Development:**
   ```bash
   npm run dev
   ```

## 🔄 API Endpoints

### Health Check
```http
GET /api/health
```

### Campaigns
```http
GET    /api/campaigns              # List all active campaigns
GET    /api/campaigns/:slug        # Get campaign by slug
GET    /api/campaigns/:id/stats    # Campaign statistics
```

### Donations
```http
POST   /api/donations/intent       # Create payment intent
POST   /api/donations/confirm      # Confirm successful donation
GET    /api/donations/:id          # Get donation details
```

### Payments (Stripe Webhooks)
```http
POST   /api/webhooks/stripe        # Stripe webhook endpoint
```

## 💳 Payment Flow

### 1. Create Donation Intent
```javascript
POST /api/donations/intent
{
  "campaignId": "campaign_id_here",
  "amount": 50.00,
  "currency": "USD",
  "donorInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "isRecurring": false,
  "message": "God bless this mission!"
}

// Response
{
  "success": true,
  "data": {
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx"
  }
}
```

### 2. Frontend Payment Processing
```javascript
// Your frontend uses Stripe Elements with clientSecret
const result = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: 'https://yoursite.com/donation-success'
  }
});
```

### 3. Confirm Donation
```javascript
POST /api/donations/confirm
{
  "paymentIntentId": "pi_xxx",
  "campaignId": "campaign_id_here",
  "donorInfo": { /* same as step 1 */ },
  "amount": 50.00,
  "currency": "USD"
}

// Response
{
  "success": true,
  "data": {
    "donationId": "donation_id_here",
    "message": "Donation confirmed successfully"
  }
}
```

## 🌍 Handling Global Concurrent Donations

### Database Transactions
```javascript
// Atomic campaign update with optimistic locking
const session = await mongoose.startSession();
try {
  await session.withTransaction(async () => {
    // Update campaign stats atomically
    const campaign = await Campaign.findByIdAndUpdate(
      campaignId,
      { 
        $inc: { 
          raisedAmount: amount,
          donorCount: 1 
        }
      },
      { session, new: true }
    );
    
    // Create donation record
    const donation = await new Donation(donationData).save({ session });
    
    // Update/create donor record
    await Donor.findOneAndUpdate(
      { email: donorInfo.email },
      { $inc: { totalDonated: amount, donationCount: 1 } },
      { session, upsert: true }
    );
  });
} finally {
  await session.endSession();
}
```

### Rate Limiting Strategy
```javascript
// Different limits for different endpoints
const donationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 donations per IP per 15min
  message: 'Too many donation attempts'
});

const campaignLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Rate limit exceeded'
});
```

### Stripe Webhook Handling
```javascript
// Idempotent webhook processing
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event idempotently
  try {
    await processWebhookEvent(event);
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
```

## 📧 Email System

### Automated Email Flow
1. **Donation Receipt**: Sent immediately after successful payment
2. **Thank You Email**: Sent after donation confirmation
3. **Admin Notification**: Sent to ministry administrators

### Email Queue (Future Enhancement)
For high volume, consider implementing:
- Redis-based email queue
- Retry mechanism for failed emails
- Email template caching

## 🔒 Security Measures

- **Rate Limiting**: Prevents donation spam
- **Input Validation**: Joi schemas for all inputs
- **MongoDB Injection**: Express-mongo-sanitize
- **CORS**: Restricted to your domains
- **Helmet**: Security headers
- **Webhook Verification**: Stripe signature validation

## 📊 Monitoring & Logging

### Winston Logging Configuration
```javascript
// Structured logging with rotation
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error'
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD'
    })
  ]
});
```

### Health Check Endpoint
```http
GET /api/health

{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "database": "connected",
  "stripe": "configured",
  "uptime": 3600
}
```

## 🧪 Testing

### Run Tests
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Test Categories
- **Unit Tests**: Individual functions and services
- **Integration Tests**: API endpoints and database
- **E2E Tests**: Complete donation flows

## 🚀 Deployment

### Environment Setup
1. **Staging**: Test with Stripe test keys
2. **Production**: Use Stripe live keys, MongoDB Atlas

### Recommended Hosting
- **Railway**: Easy deployment, MongoDB add-on
- **Render**: Free tier available
- **Heroku**: Mature platform
- **DigitalOcean**: App Platform

### Docker Support
```bash
docker build -t rockbridge-api .
docker run -p 5000:5000 rockbridge-api
```

## 📈 Performance Optimizations

### Database Indexing
```javascript
// Campaign indexes
campaignSchema.index({ status: 1, category: 1 });
campaignSchema.index({ slug: 1 });

// Donation indexes  
donationSchema.index({ 'donorInfo.email': 1 });
donationSchema.index({ campaignId: 1, createdAt: -1 });
donationSchema.index({ paymentStatus: 1 });
```

### Connection Pooling
```javascript
// MongoDB connection with pooling
mongoose.connect(MONGODB_URI, {
  maxPoolSize: 50,        // Maximum connections
  minPoolSize: 5,         // Minimum connections
  maxIdleTimeMS: 30000,   // Close after 30s idle
  serverSelectionTimeoutMS: 5000
});
```

## 🔧 Development Commands

```bash
npm run dev           # Development server with hot reload
npm run lint          # ESLint code checking
npm run lint:fix      # Auto-fix linting issues
npm run seed          # Populate database with sample data
```

## 📚 Additional Documentation

- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Stripe Setup](docs/STRIPE_SETUP.md)

## 🆘 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   ```bash
   # Check if MongoDB is running
   mongosh
   # Or check Atlas connection string
   ```

2. **Stripe Webhook Failing**
   ```bash
   # Test webhook locally with Stripe CLI
   stripe listen --forward-to localhost:5000/api/webhooks/stripe
   ```

3. **Email Not Sending**
   ```bash
   # Verify Gmail App Password (not regular password)
   # Check 2FA is enabled on Gmail account
   ```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

---

**Support**: For technical support, contact the development team or create an issue in the repository.

**Rockbridge Ministries** - Spreading hope through technology 🙏