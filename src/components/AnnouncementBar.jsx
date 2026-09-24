/* ========================================
   ANNOUNCEMENT BAR (top of page)
   Rotating promotional messages.
======================================== */
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

function AnnouncementBar() {
  const messages = [
    "Free islandwide delivery on orders over £135",
    "Mid-Season Edit — up to 30% off selected styles",
    "New Season 2026 — the collection just landed",
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % messages.length),
      4500
    );
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <div className="announcement-bar" role="region" aria-label="Announcements">
      {messages.map((message, i) => (
        <p
          key={message}
          className={`announcement-slide ${i === index ? "active" : ""}`}
          aria-hidden={i !== index}
        >
          <Sparkles size={14} strokeWidth={2.2} />
          <span>{message}</span>
        </p>
      ))}
    </div>
  );
}

export default AnnouncementBar;