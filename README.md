# Budget Dekho

*An intelligent personal finance management platform powered by AI, enabling users to track expenses, optimize budgets, and make data-driven financial decisions.*

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Integration](#api-integration)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

**Budget Dekho** is a comprehensive personal expense management solution designed to help individuals take control of their finances. By combining modern web technologies with artificial intelligence capabilities, the platform provides intelligent expense tracking, predictive analytics, and smart budgeting recommendations to optimize financial planning.

---

## ✨ Key Features

- **AI-Powered Expense Analysis** - Intelligent categorization and insights using Gemini AI
- **Receipt Scanner** - Automatic expense capture through receipt image recognition
- **Smart Budgeting** - AI-driven budget optimization and spending recommendations
- **Predictive Analytics** - Forecast future spending patterns and identify savings opportunities
- **Multi-Account Management** - Manage multiple financial accounts seamlessly
- **Real-time Dashboard** - Comprehensive financial overview with interactive visualizations
- **Transaction Management** - Full CRUD operations for transaction tracking
- **Email Notifications** - Automated email alerts for budget milestones and spending alerts
- **Security-First Approach** - Industry-standard authentication and fraud detection
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (React)
- **Styling**: Tailwind CSS
- **UI Components**: Custom component library with Shadcn/ui patterns
- **State Management**: React Hooks

### Backend
- **Runtime**: Node.js
- **Server Framework**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **Email Service**: Resend

### AI & Advanced Features
- **AI Models**: Google Gemini API
- **Automation**: Inngest (workflow orchestration)
- **Security**: ArcJet (bot protection & rate limiting)

### Development Tools
- **Build Tool**: Next.js
- **CSS Processing**: PostCSS
- **Component Library**: Shadcn/ui

---

## 📋 Prerequisites

Ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **PostgreSQL** (v14 or higher)
- API keys for:
  - Clerk (authentication)
  - Google Gemini (AI features)
  - Resend (email service)
  - ArcJet (security)

---

## 💻 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Budget-Dekho.git
cd Budget-Dekho
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Database Setup

Initialize your PostgreSQL database and run Prisma migrations:

```bash
npx prisma migrate dev
npx prisma db seed  # Optional: seed with sample data
```

---

## 🔐 Environment Configuration

Create a `.env.local` file in the root directory and configure the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/budget_dekho
DIRECT_URL=postgresql://user:password@localhost:5432/budget_dekho

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# AI & ML
GEMINI_API_KEY=your_gemini_api_key

# Email Service
RESEND_API_KEY=your_resend_api_key

# Security
ARCJET_KEY=your_arcjet_key
```

### Environment Variables Explained

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `DIRECT_URL` | Direct DB connection (for migrations) | ✅ Yes |
| `CLERK_*` | User authentication & management | ✅ Yes |
| `GEMINI_API_KEY` | AI-powered expense analysis | ✅ Yes |
| `RESEND_API_KEY` | Email notification service | ✅ Yes |
| `ARCJET_KEY` | Bot protection & rate limiting | ✅ Yes |

---

## 🚀 Getting Started

### Development Mode

```bash
npm run dev
```

The application will start at `http://localhost:3000`

### Production Build

```bash
npm run build
npm run start
```

### Testing

```bash
npm test
```

---

## 📁 Project Structure

```
Budget-Dekho/
├── app/                          # Next.js app directory
│   ├── (auth)/                   # Authentication routes
│   ├── (main)/                   # Main application routes
│   │   ├── dashboard/            # Dashboard page
│   │   ├── account/              # Account management
│   │   └── transaction/          # Transaction management
│   ├── api/                      # API routes
│   └── layout.js                 # Root layout
├── components/                   # Reusable React components
│   ├── ui/                       # UI component library
│   └── create-account-drawer.jsx # Account creation component
├── actions/                      # Server actions
│   ├── dashboard.js              # Dashboard logic
│   ├── transaction.js            # Transaction logic
│   ├── budget.js                 # Budget logic
│   └── account.js                # Account management
├── lib/                          # Utility functions
│   ├── prisma.js                 # Prisma client
│   ├── utils.js                  # Helper utilities
│   └── arcjet.js                 # Security middleware
├── prisma/                       # Database schema & migrations
│   └── schema.prisma             # Data models
├── emails/                       # Email templates
├── hooks/                        # Custom React hooks
├── data/                         # Static data & constants
├── public/                       # Static assets
├── middleware.js                 # Request middleware
├── next.config.mjs               # Next.js configuration
├── tailwind.config.js            # Tailwind CSS config
└── package.json                  # Dependencies & scripts
```

---

## 🔗 API Integration

### Clerk Authentication
- User authentication and session management
- Email verification and passwordless login
- User profile management

### Google Gemini API
- Intelligent expense categorization
- Receipt OCR and data extraction
- Budget optimization recommendations

### Resend Email Service
- Transaction notifications
- Budget alerts
- Weekly expense summaries

### ArcJet Security
- Bot detection and prevention
- Rate limiting for API endpoints
- Fraud detection and protection

---

## 🔒 Security

- **Authentication**: Enterprise-grade authentication via Clerk
- **Data Protection**: Encrypted database connections (DIRECT_URL for migrations)
- **Bot Protection**: ArcJet integration for blocking malicious requests
- **Email Verification**: Verified email communications via Resend
- **Input Validation**: Server-side validation for all user inputs
- **CORS & CSRF**: Security headers configured in Next.js middleware

---

## 📝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---
