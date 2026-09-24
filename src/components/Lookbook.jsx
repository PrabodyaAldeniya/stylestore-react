/* ========================================
   LOOKBOOK — "The Style Edit"
======================================== */
import { ArrowRight } from "lucide-react";
import Reveal from "./Reveal";

function Lookbook() {
  return (
    <section className="lookbook" id="lookbook">
      <div className="lookbook-inner">
        <Reveal className="lookbook-copy">
          <span className="eyebrow">FROM THE EDIT</span>
          <h2>
            The Style <em style={{ color: "var(--electric)" }}>Edit</em>
          </h2>
          <p>
            Editorial styling, separately buyable. Explore our seasonal edit —
            pieces worn in layers, dressed up or down, photographed in the
            wild.
          </p>
          <div className="lookbook-actions">
            <a href="#products" className="primary-button">
              Explore the Edit <ArrowRight size={16} />
            </a>
          </div>
        </Reveal>

        <div className="lookbook-grid reveal">
          <div className="lookbook-tile tall">
            <img
              src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80"
              alt="Editorial look: tailored coat pairing"
              loading="lazy"
            />
          </div>

          <div className="lookbook-tile">
            <img
              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=700&q=80"
              alt="Editorial look: knit dress"
              loading="lazy"
            />
          </div>

          <div className="lookbook-tile">
            <img
              src="https://images.unsplash.com/photo-1467043237213-65f2da53396f?auto=format&fit=crop&w=700&q=80"
              alt="Editorial look: street style layers"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Lookbook;