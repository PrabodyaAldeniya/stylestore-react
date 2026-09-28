/* ========================================
   CategoryFilter — All / Women / Men / Kids
   + sub-category (product type) pills
   + sort dropdown (drives ProductList)
======================================== */
import { ChevronDown } from "lucide-react";

function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  productTypes = [],
  selectedType = "all",
  onSelectType,
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

      {/* ---- Sub-category (product type) pills ---- */}
      {productTypes.length > 0 && (
        <div className="filter-group filter-group-sub" role="group" aria-label="Collection">
          <span className="filter-label">COLLECTION</span>

          <div className="category-pills category-pills-sub">
            <button
              type="button"
              className={selectedType === "all" ? "category-pill active" : "category-pill"}
              aria-pressed={selectedType === "all"}
              onClick={() => onSelectType?.("all")}
            >
              All {selectedCategory === "All" ? "styles" : selectedCategory}
            </button>
            {productTypes.map((type) => (
              <button
                key={type}
                type="button"
                className={selectedType === type ? "category-pill active" : "category-pill"}
                aria-pressed={selectedType === type}
                onClick={() => onSelectType?.(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

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
