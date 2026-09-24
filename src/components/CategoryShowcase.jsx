/* ========================================
   CATEGORY SHOWCASE
   Large editorial image cards: Women, Men,
   Kids + Accessories. Clicking a card sets
   the active category (via callback) and
   scrolls to the product grid.
======================================== */
import { ArrowRight } from "lucide-react";

function CategoryShowcase({ onSelectCategory }) {
  const categories = [
    {
      id: "women",
      label: "Women",
      filter: "Women",
      title: "She Wears The Season",
      image:
        "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=80",
      blurb: "Dresses, tailoring & knitwear",
    },
    {
      id: "men",
      label: "Men",
      filter: "Men",
      title: "Sharp & Effortless",
      image:
        "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1000&q=80",
      blurb: "Relaxed tailoring & essentials",
    },
    {
      id: "kids",
      label: "Kids",
      filter: "Kids",
      title: "Little Ones, Big Style",
      image:
        "https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=1000&q=80",
      blurb: "Soft, sturdy & adventure-ready",
    },
    {
      id: "accessories",
      label: "Accessories",
      filter: "All",
      title: "The Finishing Touches",
      image:
        "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=80",
      blurb: "Bags, belts & statement pieces",
    },
  ];

  return (
    /* ========================================
       SHOP BY CATEGORY
    ======================================== */
    <section className="category-showcase" id="collections">
      <div className="section-heading reveal">
        <span className="eyebrow">SHOP YOUR STYLE</span>
        <h2>Shop by Category</h2>
        <p>
          Four looks, one flawless wardrobe. Find the edit
          that speaks to you.
        </p>
      </div>

      <div className="category-grid">
        {categories.map((category, index) => (
          <button
            key={category.id}
            type="button"
            className="category-card reveal"
            onClick={() => onSelectCategory(category.filter)}
            style={{ "--delay": `${index * 90}ms` }}
          >
            <img
              src={category.image}
              alt={category.label}
              loading="lazy"
            />

            <span className="category-overlay"></span>

            <span className="category-card-body">
              <span className="category-card-label">
                {category.label}
              </span>

              <strong>{category.title}</strong>

              <span className="category-card-blurb">
                {category.blurb}
              </span>

              <span className="category-card-link">
                Shop Now <ArrowRight size={15} />
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default CategoryShowcase;
