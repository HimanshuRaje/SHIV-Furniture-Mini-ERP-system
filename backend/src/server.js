require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const salesRoutes = require('./routes/salesRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const bomRoutes = require('./routes/bomRoutes');
const manufacturingRoutes = require('./routes/manufacturingRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const auditRoutes = require('./routes/auditRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const userRoutes   = require('./routes/userRoutes');

const app = express();

// ─── MIDDLEWARE ───
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());

// ─── ROUTES ───
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales-orders', salesRoutes);
app.use('/api/purchase-orders', purchaseRoutes);
app.use('/api/boms', bomRoutes);
app.use('/api/manufacturing-orders', manufacturingRoutes);
app.use('/api/stock-ledger', inventoryRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/users',   userRoutes);

// ─── HEALTH CHECK ───
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'OK', timestamp: new Date().toISOString() } });
});

// ─── GLOBAL ERROR HANDLER ───
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// ─── START SERVER ───
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Shiv Furniture ERP Backend running on port ${PORT}`);
});

module.exports = app;
