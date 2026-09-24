/* ========================================
   Reveal — IntersectionObserver wrapper
   Fades/slides children in when they enter
   the viewport (respects reduced-motion).
======================================== */
import { useEffect, useRef } from "react";

function Reveal({
  as: Tag = "div",
  className = "",
  children,
  delay = 0,
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Skip animation entirely for reduced-motion users.
    if (prefersReducedMotion) {
      node.classList.add("is-visible");
      return;
    }

    // Fallback for old browsers: show immediately.
    if (!("IntersectionObserver" in window)) {
      node.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            node.classList.add("is-visible");
            observer.unobserve(node);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      data-reveal=""
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Reveal;