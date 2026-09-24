/* ========================================
   PROMO BANNER — Mid-Season Edit (30% off)
======================================== */
import { ArrowRight, Sparkles } from "lucide-react";

import { FREE_DELIVERY_THRESHOLD, formatLKR } from "../format";

function PromoBanner({ onShopSale }) {
  return (
    <section className="promo-banner">
      <div className="promo-inner reveal">
        <span className="promo-kicker"><Sparkles size={15} /> Limited Time</span>
        <h2>Mid-Season Edit</h2>
        <p>
          Curated season favourites, up to <strong>30% off</strong> for a
          limited time. Free delivery over {formatLKR(FREE_DELIVERY_THRESHOLD)}.
        </p>
        <button type="button" className="primary-button promo-cta" onClick={onShopSale}>
          Shop the Sale <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

export default PromoBanner;