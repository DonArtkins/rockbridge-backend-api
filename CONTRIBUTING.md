# Contributing to Rockbridge Backend API

Thank you for your interest in contributing to the Rockbridge Backend API! This document provides guidelines for contributing to this donation processing microservice for Rockbridge Ministries.

## 🌟 Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 18+ and npm 8+
- MongoDB 6.0+ (local or Atlas)
- Git configured with your credentials
- A code editor (VS Code recommended)
- Basic understanding of:
  - JavaScript/Node.js
  - Express.js framework
  - MongoDB/Mongoose
  - Stripe payments
  - RESTful APIs

### Development Setup

1. **Fork the repository**
   ```bash
   # Fork the repo on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/rockbridge-backend-api.git
   cd rockbridge-backend-api
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/rockbridge-backend-api.git
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Environment setup**
   ```bash
   cp .env.example .env
   # Fill in your development values
   ```

5. **Database setup**
   ```bash
   npm run seed
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

## 🔄 Development Workflow

### Branch Strategy

We use a simplified Git Flow:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/feature-name` - Individual features
- `bugfix/bug-description` - Bug fixes
- `hotfix/critical-fix` - Critical production fixes

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**
   ```bash
   npm test                 # Run all tests
   npm run lint            # Check code style
   npm run test:coverage   # Check test coverage
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add: brief description of changes"
   ```

### Commit Message Guidelines

Use conventional commits format:

```
type: brief description

Longer description if needed

- Additional details
- Breaking changes noted with BREAKING CHANGE:
```

**Types:**
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Examples:**
```bash
git commit -m "feat: add recurring donation support"
git commit -m "fix: handle stripe webhook timeout errors"
git commit -m "docs: update API documentation for new endpoints"
```

## 🧪 Testing Guidelines

### Test Requirements

All contributions must include appropriate tests:

- **Unit tests** for individual functions
- **Integration tests** for API endpoints
- **End-to-end tests** for complete workflows

### Writing Tests

1. **Test file naming**
   ```
   src/services/donationService.js
   tests/unit/services/donationService.test.js
   ```

2. **Test structure**
   ```javascript
   describe('DonationService', () => {
     describe('processPayment', () => {
       it('should process valid payment successfully', async () => {
         // Arrange
         const paymentData = { /* test data */ };
         
         // Act
         const result = await donationService.processPayment(paymentData);
         
         // Assert
         expect(result.success).toBe(true);
       });
       
       it('should handle invalid payment gracefully', async () => {
         // Test error scenarios
       });
     });
   });
   ```

3. **Running tests**
   ```bash
   npm test                           # All tests
   npm test -- --watch               # Watch mode
   npm test -- tests/unit            # Specific directory
   npm test -- --testNamePattern="Payment"  # Specific pattern
   ```

### Test Coverage

- Maintain minimum 80% code coverage
- Focus on critical payment processing logic
- Test error handling and edge cases

## 📋 Pull Request Process

### Before Submitting

1. **Sync with upstream**
   ```bash
   git fetch upstream
   git rebase upstream/develop
   ```

2. **Run full test suite**
   ```bash
   npm run lint:fix        # Fix any linting issues
   npm test               # Ensure all tests pass
   npm run test:coverage  # Check coverage
   ```

3. **Update documentation**
   - Update API documentation if endpoints changed
   - Update README if new features added
   - Add JSDoc comments to new functions

### Submitting Pull Request

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**
   - Use the provided PR template
   - Link related issues
   - Provide clear description of changes
   - Add screenshots for UI changes

3. **PR Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Tests added/updated
   - [ ] All tests passing
   - [ ] Manual testing completed
   
   ## Checklist
   - [ ] Code follows project style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No breaking changes (or clearly documented)
   ```

### Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** on staging environment
4. **Approval** from project maintainers

## 🎯 Contribution Areas

We welcome contributions in these areas:

### 🔧 Backend Development
- Payment processing improvements
- Database optimization
- API endpoint enhancements
- Security hardening
- Performance optimization

### 📧 Email System
- Template improvements
- Email queue implementation
- Notification enhancements
- Multi-language support

### 🧪 Testing
- Increase test coverage
- Add integration tests
- Performance testing
- Security testing

### 📚 Documentation
- API documentation
- Code comments
- Setup guides
- Troubleshooting guides

### 🚀 DevOps
- Docker improvements
- CI/CD pipeline
- Monitoring setup
- Deployment automation

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Bug description** - What happened vs. what expected
2. **Steps to reproduce** - Detailed steps
3. **Environment details** - OS, Node.js version, etc.
4. **Error logs** - Full error messages
5. **Screenshots** - If applicable

Use this template:
```markdown
**Bug Description:**
Clear description of the bug

**Steps to Reproduce:**
1. Go to...
2. Click on...
3. See error...

**Expected Behavior:**
What should happen

**Environment:**
- OS: [e.g., macOS 12.0]
- Node.js: [e.g., 18.17.0]
- MongoDB: [e.g., 6.0.4]

**Error Logs:**
```
Paste error logs here
```

**Additional Context:**
Any other relevant information
```

## 💡 Feature Requests

For feature requests:

1. **Check existing issues** first
2. **Describe the problem** this feature solves
3. **Propose a solution** with implementation details
4. **Consider alternatives** you've thought of
5. **Assess impact** on existing functionality

## 🔒 Security

### Reporting Security Issues

**DO NOT** create public issues for security vulnerabilities.

Instead:
1. Email security concerns to: security@rockbridgeministries.org
2. Include detailed description and steps to reproduce
3. Allow reasonable time for response before public disclosure

### Security Guidelines

When contributing:
- Never commit API keys or secrets
- Follow OWASP security practices
- Validate all inputs thoroughly
- Use parameterized queries
- Implement proper authentication/authorization

## 📖 Code Style Guidelines

### JavaScript Style

We follow these conventions:

```javascript
// Use const/let, avoid var
const donationAmount = 100;
let processingStatus = 'pending';

// Consistent naming
const calculateTotalAmount = (donations) => {
  return donations.reduce((total, donation) => total + donation.amount, 0);
};

// Error handling
try {
  const result = await processPayment(paymentData);
  return { success: true, data: result };
} catch (error) {
  logger.error('Payment processing failed:', error);
  throw new Error('Payment processing failed');
}

// JSDoc comments for functions
/**
 * Process a donation payment through Stripe
 * @param {Object} paymentData - The payment information
 * @param {string} paymentData.amount - Payment amount in cents
 * @param {string} paymentData.currency - Currency code (USD, EUR, etc.)
 * @returns {Promise<Object>} Payment result
 * @throws {Error} When payment processing fails
 */
const processPayment = async (paymentData) => {
  // Implementation
};
```

### File Organization

```
src/
├── config/           # Configuration files
│   ├── database.js
│   ├── stripe.js
│   └── email.js
├── models/           # MongoDB schemas
│   ├── Campaign.js
│   ├── Donation.js
│   └── Donor.js
├── controllers/      # Request handlers
│   ├── campaignController.js
│   ├── donationController.js
│   └── webhookController.js
├── services/         # Business logic
│   ├── donationService.js
│   ├── emailService.js
│   └── stripeService.js
├── middlewares/      # Express middlewares
│   ├── auth.js
│   ├── validation.js
│   └── rateLimit.js
├── routes/           # API route definitions
│   ├── campaigns.js
│   ├── donations.js
│   └── webhooks.js
├── utils/            # Helper functions
│   ├── logger.js
│   ├── validators.js
│   └── helpers.js
└── templates/        # Email templates
    ├── receipt.html
    └── notification.html
```

## 🚀 Deployment Considerations

When contributing features that affect deployment:

1. **Environment variables** - Update `.env.example`
2. **Database migrations** - Provide migration scripts
3. **Dependencies** - Justify new dependencies
4. **Performance** - Consider impact on response times
5. **Monitoring** - Add appropriate logging

## 🤝 Community

### Getting Help

- **GitHub Issues** - For bugs and feature requests
- **Discussions** - For questions and general discussion
- **Email** - For direct communication with maintainers

### Recognition

Contributors will be:
- Added to the Contributors section
- Credited in release notes for significant contributions
- Invited to become maintainers for sustained contributions

## 📝 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Rockbridge Backend API! Your efforts help us build better tools for ministry work. 🙏

**Questions?** Feel free to reach out to the maintainers or create a discussion thread.