/* Route guard for every /admin/products* screen. Verifies the
   HttpOnly admin session cookie with the API before rendering, and
   sends unauthenticated visitors to the sign-in page. */
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { getAdminSession } from "../../lib/adminApi";

export default function RequireAdmin() {
  const location = useLocation();
  const [state, setState] = useState("checking");

  useEffect(() => {
    let cancelled = false;
    getAdminSession()
      .then((result) => {
        if (cancelled) return;
        setState(result.authenticated ? "allowed" : "denied");
      })
      .catch(() => {
        if (!cancelled) setState("denied");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") {
    return (
      <main className="admin-page">
        <div className="adm-boot" role="status">
          <Loader2 className="spin" size={26} aria-hidden />
          <p>Checking your admin session…</p>
        </div>
      </main>
    );
  }

  if (state === "denied") {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
