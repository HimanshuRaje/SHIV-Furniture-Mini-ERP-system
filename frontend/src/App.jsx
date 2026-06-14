import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import AddProduct from './pages/AddProduct';
import SalesOrders from './pages/SalesOrders';
import PurchaseOrders from './pages/PurchaseOrders';
import BillOfMaterials from './pages/BillOfMaterials';
import ManufacturingOrders from './pages/ManufacturingOrders';
import StockLedger from './pages/StockLedger';
import AuditLogs from './pages/AuditLogs';
import Vendors from './pages/Vendors';
import VendorHistory from './pages/VendorHistory';
import PurchaseInventory from './pages/PurchaseInventory';

// Smart default redirect based on role
const DefaultRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  const roleHome = {
    SALES_USER: '/sales-orders',
    PURCHASE_USER: '/purchase-orders',
    MANUFACTURING_USER: '/manufacturing',
    INVENTORY_MANAGER: '/inventory',
    PRODUCT_MANAGER: '/products',
  };

  return <Navigate to={roleHome[user.role] || '/dashboard'} replace />;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              borderRadius: '10px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />

        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes inside Layout */}
          <Route element={<Layout />}>
            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={['ADMIN', 'BUSINESS_OWNER']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Products — admin, product manager, purchase user, and sales user */}
            <Route
              path="/products"
              element={
                <ProtectedRoute roles={['ADMIN', 'PRODUCT_MANAGER', 'PURCHASE_USER', 'SALES_USER']}>
                  <Products />
                </ProtectedRoute>
              }
            />

            {/* Add Product — admin, product manager, and purchase user */}
            <Route
              path="/products/new"
              element={
                <ProtectedRoute roles={['ADMIN', 'PRODUCT_MANAGER', 'PURCHASE_USER']}>
                  <AddProduct />
                </ProtectedRoute>
              }
            />

            {/* Edit Product — admin, product manager, and purchase user */}
            <Route
              path="/products/edit/:id"
              element={
                <ProtectedRoute roles={['ADMIN', 'PRODUCT_MANAGER', 'PURCHASE_USER']}>
                  <AddProduct />
                </ProtectedRoute>
              }
            />

            {/* Sales Orders */}
            <Route
              path="/sales-orders"
              element={
                <ProtectedRoute roles={['ADMIN', 'SALES_USER', 'BUSINESS_OWNER']}>
                  <SalesOrders />
                </ProtectedRoute>
              }
            />

            {/* Purchase Orders */}
            <Route
              path="/purchase-orders"
              element={
                <ProtectedRoute roles={['ADMIN', 'PURCHASE_USER', 'BUSINESS_OWNER']}>
                  <PurchaseOrders />
                </ProtectedRoute>
              }
            />

            {/* Bill of Materials */}
            <Route
              path="/bill-of-materials"
              element={
                <ProtectedRoute roles={['ADMIN', 'MANUFACTURING_USER', 'BUSINESS_OWNER']}>
                  <BillOfMaterials />
                </ProtectedRoute>
              }
            />

            {/* Manufacturing Orders */}
            <Route
              path="/manufacturing"
              element={
                <ProtectedRoute roles={['ADMIN', 'MANUFACTURING_USER', 'BUSINESS_OWNER']}>
                  <ManufacturingOrders />
                </ProtectedRoute>
              }
            />

            {/* Inventory / Stock Ledger */}
            <Route
              path="/inventory"
              element={
                <ProtectedRoute roles={['ADMIN', 'INVENTORY_MANAGER', 'BUSINESS_OWNER']}>
                  <StockLedger />
                </ProtectedRoute>
              }
            />

            {/* Vendors */}
            <Route
              path="/vendors"
              element={
                <ProtectedRoute roles={['ADMIN', 'PURCHASE_USER', 'BUSINESS_OWNER']}>
                  <Vendors />
                </ProtectedRoute>
              }
            />

            {/* Vendor History */}
            <Route
              path="/vendor-history"
              element={
                <ProtectedRoute roles={['ADMIN', 'PURCHASE_USER', 'BUSINESS_OWNER']}>
                  <VendorHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor-history/:id"
              element={
                <ProtectedRoute roles={['ADMIN', 'PURCHASE_USER', 'BUSINESS_OWNER']}>
                  <VendorHistory />
                </ProtectedRoute>
              }
            />

            {/* Purchase Inventory */}
            <Route
              path="/purchase-inventory"
              element={
                <ProtectedRoute roles={['ADMIN', 'PURCHASE_USER', 'BUSINESS_OWNER']}>
                  <PurchaseInventory />
                </ProtectedRoute>
              }
            />

            {/* Audit Logs — admin only */}
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />

            {/* Default & catch-all — role-aware redirect */}
            <Route index element={<DefaultRedirect />} />
            <Route path="*" element={<DefaultRedirect />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
