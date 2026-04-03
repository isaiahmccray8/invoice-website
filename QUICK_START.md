# Isaiah Business Invoices - Quick Start Guide 🚀

## How It Works

1. **You (Isaiah) create invoices** in your business dashboard
2. **Clients visit the homepage** (index.html)
3. **They see all your invoices listed by their name**
4. **They click their invoice** to view details and pay

That's it! Simple and beautiful.

---

## Step 1: Setup Backend

### Install Dependencies
```bash
cd backend
npm install
```

### Create .env file
Copy `.env.example` to `.env` and fill in:

```
# MongoDB (Get FREE tier from https://www.mongodb.com/cloud/atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/invoice-db

# Random secret key for JWT
JWT_SECRET=your_super_secret_key_change_this_to_something_random

# Stripe (Get FREE from https://stripe.com)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# PayPal (Get FREE from https://www.paypal.com/business)
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=xxxxx
PAYPAL_CLIENT_SECRET=xxxxx

# Email notifications (optional, use Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password

# Server settings
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Start Backend
```bash
npm start
```

You'll see: `🚀 Server running on port 5000`

---

## Step 2: Setup Frontend

Open any browser and go to your frontend files. You have two options:

### Option A: Simple HTTP Server
```bash
cd frontend
npx http-server -p 3000
```

Then visit: `http://localhost:3000`

### Option B: Live Server Extension
If using VS Code, install "Live Server" extension and open `index.html`

---

## Step 3: Test It Out!

### A. Create Your First Invoice
1. Go to `http://localhost:3000/index.html`
2. Click "Business Login"
3. Click "Create an account"
4. Fill in:
   - Business Name: `Isaiah Business`
   - Business Email: `isaiah@business.com`
   - Account Email: `your@email.com`
   - Password: `test123`
5. You're logged in! Click "+ New Invoice"
6. Add invoice details:
   - Client Name: `John Doe`
   - Client Email: `john@email.com`
   - Items: Add some services/products with prices
   - Due Date: Pick a date
7. Click "Create Invoice"

### B. View as Client
1. Go back to homepage (`http://localhost:3000/index.html`)
2. You'll see your invoice listed with "John Doe"'s name
3. Click on it
4. Client sees beautiful invoice with option to pay
5. (Payment not fully wired yet, but structure is there)

---

## File Structure

```
invoice-website/
├── frontend/
│   ├── index.html              ← Homepage (shows all invoices)
│   ├── login.html              ← Business owner login
│   ├── register.html           ← Business owner registration
│   ├── dashboard.html          ← Your invoice management
│   ├── invoice-create.html     ← Create new invoice
│   ├── invoice-view.html       ← Client views invoice & pays
│   ├── js/
│   │   └── main.js             ← Shared utilities
│   └── styles/
│       └── main.css            ← Animations & styling
│
└── backend/
    ├── server.js               ← Main server
    ├── .env                    ← Your secrets (create this!)
    ├── .env.example            ← Template
    ├── models/                 ← Database schemas
    ├── routes/                 ← API endpoints
    ├── middleware/             ← Auth, errors
    ├── config/                 ← Database, PDF generation
    └── package.json
```

---

## API Endpoints Summary

### For You (Business Owner)
- **Register**: POST `/api/auth/register`
- **Login**: POST `/api/auth/login`
- **Create Invoice**: POST `/api/invoices`
- **Your Invoices**: GET `/api/invoices/owner/list`
- **Edit Invoice**: PUT `/api/invoices/:id`
- **Delete Invoice**: DELETE `/api/invoices/:id`

### For Clients (Public)
- **All Invoices**: GET `/api/invoices/all` (Shows non-draft invoices)
- **View Invoice**: GET `/api/invoices/:id` (Anyone can view)
- **Pay with Stripe**: POST `/api/payments/stripe/checkout`
- **Pay with PayPal**: POST `/api/payments/paypal/checkout`

---

## Key Features Explained

### 🎨 Beautiful UI
- Purple/Cyan gradient design
- Smooth animations
- Responsive (mobile + desktop)
- Dark theme ready

### 💰 Payment Fees
- 3% fee automatically added to invoice total
- Shown to clients at checkout
- You can customize this percentage

### 📄 Invoices
- Auto-numbered (INV-2024-04-0001)
- Professional templates
- Shareable links
- Status tracking (draft, sent, paid, overdue)

### 🔐 Security
- Passwords are hashed with bcrypt
- JWT tokens for authentication
- CORS protection
- API validation

---

## Customization

### Change Business Name
Edit these files:
- `frontend/index.html` - Line 11
- `frontend/login.html` - Line 15
- `frontend/register.html` - Line 15
- `frontend/dashboard.html` - Line 13
- `frontend/invoice-create.html` - Line 13
- `frontend/invoice-view.html` - Line 14

### Change Colors
Search for these Tailwind classes:
- `from-purple-600 to-cyan-600` → Your primary color
- `from-purple-400 to-cyan-400` → Your accent color

### Change Payment Fee %
Edit `backend/routes/invoices.js` line 85:
```javascript
const paymentFee = total * 0.03; // Change 0.03 to 0.05 for 5%, etc.
```

---

## Troubleshooting

### Backend won't start
```bash
# Check if MongoDB URI is correct
# Check if port 5000 is free
lsof -i :5000
# Kill if needed
kill -9 <PID>
```

### Frontend can't connect to backend
- Make sure backend is running on `http://localhost:5000`
- Check `FRONTEND_URL` in `.env` matches where frontend is running
- Open browser console (F12) to see error messages

### Invoices don't show up
1. Make sure you created some invoices (not drafts)
2. Check backend console for errors
3. Open browser console (F12) for frontend errors
4. Verify MongoDB connection works

### Payment buttons don't work yet
This is expected! We've set up the structure. To fully enable:
1. Get real Stripe keys and add to `.env`
2. Implement Stripe checkout in `frontend/js/payments.js`
3. Test with Stripe test card: `4242 4242 4242 4242`

---

## Next Steps

### Short Term
- [ ] Test creating invoices
- [ ] Test viewing invoices as client
- [ ] Configure Stripe/PayPal keys
- [ ] Test payment flow

### Medium Term
- [ ] Deploy backend to Render.com or Railway
- [ ] Deploy frontend to Vercel
- [ ] Set up custom domain
- [ ] Enable email notifications

### Long Term
- [ ] Add PDF download
- [ ] Add email invoice delivery
- [ ] Add recurring invoices
- [ ] Add expense tracking
- [ ] Add tax calculations

---

## Deployment (Future)

### Backend: Render.com
1. Push code to GitHub
2. Connect to Render
3. Set environment variables
4. Deploy

### Frontend: Vercel
1. Push `frontend/` to GitHub
2. Import in Vercel
3. Set API URL environment variable
4. Deploy

---

## Support

If something breaks:
1. Check browser console (F12)
2. Check backend console
3. Look for error messages
4. Search GitHub issues for similar problems

---

**You're all set! Go create some beautiful invoices! 💪**
