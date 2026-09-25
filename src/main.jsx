import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./index.css";
import "./App.css";
import "./checkout.css";
import "./orderHistory.css";
import App from "./App.jsx";
import Checkout from "./pages/Checkout.jsx";
import OrderSuccess from "./pages/OrderSuccess.jsx";
import OrderHistory from "./pages/OrderHistory.jsx";
import PromoPopup from "./components/PromoPopup.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import { CartProvider } from "./context/CartProvider.jsx";

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
        </Routes>
      </BrowserRouter>
    </CartProvider>
  </StrictMode>
);