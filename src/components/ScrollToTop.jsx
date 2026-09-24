import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Scroll to the top whenever the route changes (checkout flows
// start at the top of the page, like a fresh page load).
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}