/* ========================================
   CategoryFilter — All / Women / Men / Kids
   + sort dropdown (drives ProductList)
======================================== */
import { ChevronDown } from "lucide-react";

function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  sortOption,
  onSortChange,
  productCount,
}) {
  return (
    <section
      className="product-filter-bar"
      id="shop-tools"
      aria-label="Filter and sort products"
    >
      {/* ---- Category pills ---- */}
      <div className="filter-group" role="group" aria-label="Category">
        <span className="filter-label">SHOP</span>

        <div className="category-pills">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={
                selectedCategory === category
                  ? "category-pill active"
                  : "category-pill"
              }
              aria-pressed={selectedCategory === category}
              onClick={() => onSelectCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Sort dropdown ---- */}
      <div className="filter-group sort-group">
        <span className="filter-label">SORT</span>

        <label className="sort-select">
          <span className="sr-only">Sort products</span>

          <select
            value={sortOption}
            onChange={(event) => onSortChange(event.target.value)}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>

          <ChevronDown size={16} className="select-chevron" aria-hidden />
        </label>
      </div>

      {/* ---- Result count ---- */}
      <p className="product-count" aria-live="polite">
        <strong>{productCount}</strong> {productCount === 1 ? "style" : "styles"}
      </p>
    </section>
  );
}

export default CategoryFilter;
