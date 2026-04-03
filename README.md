# InvoicePro - Creative Invoice Management System

A beautiful, modern invoice management system with integrated payment processing. Create invoices, send them to clients, and get paid via Stripe or PayPal.

## Features ✨

- 🎨 **Beautiful Design** - Modern gradient UI with animations
- 📄 **Professional Invoices** - Clean, customizable invoice templates
- 💳 **Payment Integration** - Stripe & PayPal payment processing
- 🔗 **Shareable Links** - Unique links for each invoice
- 👥 **Client Accounts** - Clients can create accounts to track invoices
- 📊 **Dashboard** - View invoices, payments, and revenue
- 🌙 **Dark Mode** - Beautiful dark theme
- 📱 **Responsive** - Works on mobile, tablet, and desktop

## Tech Stack 🚀

**Frontend:**
- HTML5, CSS3, JavaScript (Vanilla)
- Tailwind CSS for styling
- Custom animations

**Backend:**
- Node.js with Express
- MongoDB for database
- JWT for authentication
- Stripe & PayPal SDKs

**Deployment:**
- Vercel (Frontend)
- Render/Railway (Backend)
- MongoDB Atlas (Database)

## Getting Started 🎯

### Prerequisites
- Node.js (v14+)
- npm or yarn
- MongoDB Atlas account (free tier)
- Stripe account (free)
- PayPal account (free)

### Installation

#### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/invoice-db
JWT_SECRET=your_super_secret_key_here
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Start the backend:
```bash
npm start
# or with auto-reload
npm run dev
```

The backend will run on `http://localhost:5000`

#### 2. Frontend Setup

```bash
cd frontend
# No build step needed - just serve the files
# You can use:
npx http-server
# or any other static server
```

The frontend will run on `http://localhost:8080` (or your chosen port)

**Update the API URL in `js/main.js` if needed:**
```javascript
const API_URL = 'http://localhost:5000/api';
```

### Using the Application

1. **Create Account**
   - Go to `register.html`
   - Enter business name, email, and password
   - You'll be logged in automatically

2. **Create Invoice**
   - Click "New Invoice" on dashboard
   - Add client details
   - Add invoice items with description, quantity, and rate
   - Set due date
   - Click "Create Invoice"

3. **Share Invoice**
   - Click on invoice in dashboard
   - Click "Share Link" to copy the shareable URL
   - Send to client

4. **Client Views Invoice**
   - Client opens the shared link (public, no login needed)
   - Sees beautiful invoice with payment options
   - Can choose to pay with Stripe or PayPal
   - Or create account to track multiple invoices

5. **Payment Processing**
   - Invoice marked as "Paid" after successful payment
   - Owner gets payment notification
   - Client can view payment history

## API Endpoints 📡

### Authentication
- `POST /api/auth/register` - Register business owner
- `POST /api/auth/login` - Login business owner
- `GET /api/auth/me` - Get current user
- `POST /api/auth/client/register` - Register client
- `POST /api/auth/client/login` - Login client

### Invoices
- `GET /api/invoices` - Get all invoices (owner only)
- `GET /api/invoices/:id` - Get single invoice
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `GET /api/invoices/share/:token` - Get invoice by share token (public)

### Payments
- `POST /api/payments/stripe/checkout` - Create Stripe session
- `POST /api/payments/paypal/checkout` - Create PayPal payment
- `POST /api/payments/paypal/execute` - Execute PayPal payment
- `POST /api/webhooks/stripe` - Stripe webhook handler

## Database Schema 🗄️

### User (Business Owner)
```javascript
{
  email: String,
  password: String (hashed),
  businessName: String,
  businessEmail: String,
  paymentMethods: {
    stripe: { enabled, publishableKey, secretKey },
    paypal: { enabled, clientId, secret }
  },
  createdAt: Date
}
```

### Invoice
```javascript
{
  userId: ObjectId,
  invoiceNumber: String,
  shareToken: String,
  clientName: String,
  clientEmail: String,
  items: [{ description, quantity, rate, amount }],
  subtotal: Number,
  tax: Number,
  total: Number,
  paymentFee: Number,
  totalWithFee: Number,
  dueDate: Date,
  status: String (draft, sent, paid, overdue),
  paymentMethods: { stripe, paypal },
  createdAt: Date
}
```

### Payment
```javascript
{
  invoiceId: ObjectId,
  userId: ObjectId,
  amount: Number,
  paymentMethod: String (stripe, paypal),
  transactionId: String,
  status: String (pending, success, failed),
  paidAt: Date,
  createdAt: Date
}
```

## Deployment 🌐

### Frontend (Vercel)
1. Push your `frontend` folder to GitHub
2. Import in Vercel
3. Set environment variable `VITE_API_URL`
4. Deploy

### Backend (Render/Railway)
1. Push your `backend` folder to GitHub
2. Create new service on Render/Railway
3. Set environment variables from `.env.example`
4. Deploy

### Database (MongoDB Atlas)
1. Create free cluster on MongoDB Atlas
2. Create database user
3. Get connection string
4. Add to backend `.env` as `MONGODB_URI`

## Customization 🎨

### Colors
Edit the Tailwind CSS classes in HTML files:
- Primary gradient: `from-purple-600 to-cyan-600`
- Change to your brand colors as needed

### Invoice Templates
Currently uses one template. To add more:
1. Create new HTML template in `frontend/`
2. Add selection in invoice creation
3. Update PDF generation to match

### Email Notifications
Uncomment email code in `backend/routes/payments.js` to send payment notifications.

## Troubleshooting 🔧

**Backend won't start:**
- Check MongoDB URI in `.env`
- Ensure Node.js is installed (`node --version`)
- Check port 5000 isn't in use

**Frontend can't connect:**
- Verify backend is running
- Check API URL in `js/main.js`
- Check CORS is enabled in `server.js`

**Payment not working:**
- Verify Stripe/PayPal keys are correct
- Check webhook URLs are public
- Use test cards: `4242 4242 4242 4242`

## Future Enhancements 🚀

- PDF generation and download
- Email invoice delivery
- Multiple invoice templates
- Recurring invoices
- Tax calculations
- Multi-currency support
- Expense tracking
- Client portal improvements

## Support & Feedback 💬

For issues or suggestions, please create an issue in the repository.

## License 📄

MIT License - feel free to use for personal or commercial projects.

---

**Built with ❤️ using Node.js, Express, MongoDB, and Tailwind CSS**
