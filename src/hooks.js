/* ========================================
   SHARED HOOKS — useReveal + useLockScrollEscape
======================================== */
import { useEffect } from "react";

export function useReveal() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-reveal], .reveal").forEach((el) =>
        el.classList.add("is-visible")
      );
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -50px 0px" }
    );

    document.querySelectorAll("[data-reveal], .reveal").forEach((el) =>
      observer.observe(el)
    );

    return () => observer.disconnect();
  }, []);
}

export function useLockScrollAndEscape(active, onEscape) {
  useEffect(() => {
    if (!active) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (event) => {
      if (event.key === "Escape") onEscape?.();
    };

    window.addEventListener("keydown", handleKey, { passive: true });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [active, onEscape]);
}