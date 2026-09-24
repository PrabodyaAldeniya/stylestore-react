/* ========================================
   HERO — full-viewport editorial banner
----------------------------------------
   Splits into: full-bleed background image,
   dark gradient overlay, headline, sub copy
   and two CTAs (Shop Women / Shop Men) that
   jump to the collection + set that filter.
======================================== */
import { ArrowDown, ArrowRight } from "lucide-react";
import Reveal from "./Reveal";

function Hero({ onShopWomen, onShopMen, onShopAll }) {
  return (
    <section className="hero" id="home">
      {/* ---- Full-screen background image ---- */}
      <div className="hero-backdrop">
        <img
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1900&q=80"
          alt=""
          aria-hidden="true"
          fetchpriority="high"
        />

        {/* Dark gradient overlay so the text stays readable */}
        <div className="hero-overlay" aria-hidden="true"></div>
      </div>

      {/* ---- Editorial copy ---- */}
      <div className="hero-content">
        <Reveal>
          <span className="hero-label">NEW SEASON / 2026</span>
        </Reveal>

        <Reveal delay={120}>
          <h1>
            Wear Your
            <span> Story</span>
          </h1>
        </Reveal>

        <Reveal delay={220}>
          <p className="hero-sub">
            Modern essentials, confident silhouettes and everyday
            style, designed for every moment of your life.
          </p>
        </Reveal>

        <Reveal delay={320}>
          <div className="hero-actions">
            <button className="primary-button" onClick={onShopWomen}>
              Shop Women <ArrowRight size={17} />
            </button>

            <button className="secondary-button" onClick={onShopMen}>
              Shop Men
            </button>
          </div>
        </Reveal>

        {/* ---- Scroll indicator ---- */}
        <a
          href="#collections"
          className="scroll-indicator"
          onClick={(event) => {
            event.preventDefault();
            onShopAll();
          }}
        >
          <span>Scroll</span>
          <ArrowDown size={16} />
        </a>
      </div>
    </section>
  );
}

export default Hero;