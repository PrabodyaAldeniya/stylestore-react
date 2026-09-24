/* ========================================
   FOOTER — big-type CTA + link columns
   Uses Footer.css (footer-cta, footer-grid,
   social-row, payments-list).
======================================== */
import { useState } from "react";
import { AtSign, ChevronDown, Globe, MessageCircle, Share2 } from "lucide-react";

import "./Footer.css";

// Link column with a mobile accordion toggle. On desktop the
// toggle is hidden and the links are always visible; on mobile
// the heading becomes a 44px+ touch target that expands/collapses.
// Open state lives in the parent Footer so only one section can
// stay open at a time.
function FooterColumn({ title, items, open, onToggle }) {
  return (
    <nav className="footer-col" aria-label={title}>
      <button
        type="button"
        className="footer-col-toggle"
        aria-expanded={open}
        onClick={onToggle}
      >
        {title}
        <ChevronDown size={16} className="footer-col-chevron" aria-hidden="true" />
      </button>

      <div className={open ? "footer-col-links open" : "footer-col-links"}>
        {items.map((item) => (
          <a key={item} href="#">{item}</a>
        ))}
      </div>
    </nav>
  );
}

function Footer() {
  const [openCol, setOpenCol] = useState(null);

  const handleToggle = (index) =>
    setOpenCol((current) => (current === index ? null : index));

  const collections = ["New In", "Women", "Men", "Kids", "The Style Edit", "Sale"];
  const help = ["Delivery", "Returns & Exchanges", "Size Guide", "Order Tracking", "FAQ", "Contact Us"];
  const company = ["Our Story", "Stores", "Careers", "Sustainability", "Press"];

  return (
    <footer className="footer">
      <div className="footer-inner">
      {/* ---- CTA block ---- */}
      <div className="footer-cta">
        <div>
          <h2>
            Become a <em>Style Insider</em>
          </h2>
          <p>
            Join the mailing list for early access to new drops, private
            sales and styling notes from our editors.
          </p>
        </div>

        <div className="footer-cta-actions">
          <a
            href="#newsletter"
            className="primary-button"
            onClick={(event) => {
              // Newsletter CTA: smooth-scroll to the section, then let the
              // Newsletter component focus the email field and highlight the
              // card once the scroll has settled.
              event.preventDefault();
              document.getElementById("newsletter")?.scrollIntoView({ behavior: "smooth" });
              window.setTimeout(() => {
                window.dispatchEvent(new CustomEvent("stylestore:focus-newsletter"));
              }, 700);
            }}
          >
            Sign Up
          </a>
        </div>
      </div>

      {/* ---- Link columns ---- */}
      <div className="footer-grid">
        <nav className="footer-col footer-col--brand" aria-label="Brand">
          <div className="footer-brand">
            <strong className="brand">StyleStore<span className="brand-amp">&amp;</span>Co</strong>
            <p>
              Premium fashion for every chapter of your story — designed in
              a studio, worn everywhere.
            </p>

            <div className="social-row">
              <a href="#" aria-label="Instagram"><AtSign size={17} /></a>
              <a href="#" aria-label="Facebook"><Share2 size={17} /></a>
              <a href="#" aria-label="Twitter"><Globe size={17} /></a>
              <a href="#" aria-label="YouTube"><MessageCircle size={17} /></a>
            </div>
          </div>
        </nav>

        <FooterColumn
          title="Collections"
          items={collections}
          open={openCol === 0}
          onToggle={() => handleToggle(0)}
        />
        <FooterColumn
          title="Help"
          items={help}
          open={openCol === 1}
          onToggle={() => handleToggle(1)}
        />
        <FooterColumn
          title="Company"
          items={company}
          open={openCol === 2}
          onToggle={() => handleToggle(2)}
        />
      </div>

      {/* ---- Bottom row ---- */}
      <div className="footer-bottom">
        <span className="footer-copy">&copy; {new Date().getFullYear()} StyleStore &amp; Co. All rights reserved.</span>

        <div className="footer-legal">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms &amp; Conditions</a>
          <a href="#">Cookie Settings</a>
        </div>

        <ul className="payments-list">
          <li>VISA</li>
          <li>MASTERCARD</li>
          <li>AMEX</li>
          <li>PAYPAL</li>
          <li>APPLE PAY</li>
        </ul>
      </div>
      </div>
    </footer>
  );
}

export default Footer;