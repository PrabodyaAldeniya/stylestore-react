import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./index.css";
import "./App.css";
import "./checkout.css";
import "./orderHistory.css";
import App from "./App.jsx";
import Checkout from "./pages/Checkout.jsx";
import OrderSuccess from "./pages/OrderSuccess.jsx";
import OrderHistory from "./pages/OrderHistory.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminProducts from "./pages/AdminProducts.jsx";
import AdminTrash from "./pages/AdminTrash.jsx";
import AdminProductEditor from "./pages/AdminProductEditor.jsx";
import AdminReviews from "./pages/AdminReviews.jsx";
import RequireAdmin from "./components/admin/RequireAdmin.jsx";
import PromoPopup from "./components/PromoPopup.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import { CartProvider } from "./context/CartProvider.jsx";

/* Admin routes are wrapped in RequireAdmin so the session cookie is always
   verified before any product screen renders. */
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CartProvider>
      <BrowserRouter>
        <ScrollToTop />
        <PromoPopup />
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success/:orderNumber" element={<OrderSuccess />} />
          <Route path="/orders" element={<OrderHistory />} />
          <Route path="/admin" element={<Navigate to="/admin/products" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<RequireAdmin />}>
            {/* Declared before the product editor so the literal
                "reviews" segment is never read as a product id. */}
            <Route path="/admin/reviews" element={<AdminReviews />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            {/* The Trash (soft delete) screen. Declared before the editor so
                "trash" is never read as a product id. */}
            <Route path="/admin/trash" element={<AdminTrash />} />
            {/* key forces a fresh editor per route so unsaved state from one
                product never bleeds into another. */}
            <Route path="/admin/products/new" element={<AdminProductEditor key="new" />} />
            <Route
              path="/admin/products/:productId/edit"
              element={<AdminProductEditor key="edit" />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  </StrictMode>
);
