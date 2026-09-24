// ========================================
// PRODUCT DATA
// ========================================
// All products for StyleStore live in this array.
// Add a new product by appending an object with:
//   id, name, category, price, oldPrice, rating,
//   image, description, isNew, tag, colors, featured

const products = [
  // ========================================
  // WOMEN
  // ========================================
  {
    id: 1,
    name: "Elegant Summer Dress",
    category: "Women",
    price: 7800,
    oldPrice: 9200,
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=900&q=80",
    description:
      "A breezy midi dress cut in a fluid, colour-blocked knit that moves beautifully with you from desk to dinner.",
    isNew: true,
    tag: "BESTSELLER",
    colors: ["#d9a066", "#1e1e1e"],
    featured: true,
  },
  {
    id: 2,
    name: "Silk Blouse in Ivory",
    category: "Women",
    price: 8600,
    oldPrice: 10500,
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1551803091-e20673f15770?auto=format&fit=crop&w=900&q=80",
    description:
      "Lightweight satin-touch blouse with a relaxed collar — the quiet-luxury staple your wardrobe is missing.",
    isNew: false,
    tag: "TRENDING",
    colors: ["#f4efe6", "#1e1e1e"],
    featured: false,
  },
  {
    id: 3,
    name: "Tailored Beige Trench",
    category: "Women",
    price: 19500,
    oldPrice: 24000,
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80",
    description:
      "A double-breasted trench with sharp lapels and a defined waist — polished outerwear for the modern closet.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#cbb493", "#2b2b2b"],
    featured: true,
  },
  {
    id: 10,
    name: "Pleated Wrap Dress",
    category: "Women",
    price: 5600,
    oldPrice: 6400,
    rating: 4.6,
    image:
      "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=900&q=80",
    description:
      "A soft pleated wrap dress with a removable waist tie — one silhouette, endless ways to style it.",
    isNew: false,
    tag: "EDIT PICK",
    colors: ["#9c7b6b", "#2b2b2b"],
    featured: false,
  },
  {
    id: 12,
    name: "Knitted Cardigan in Camel",
    category: "Women",
    price: 9800,
    oldPrice: 11500,
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80",
    description:
      "An oversized caramel cardigan with a chunky ribbed stitch and mother-of-pearl buttons — weekend comfort, elevated.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#c1a88b", "#e8e0d3"],
    featured: false,
  },

  // ========================================
  // MEN
  // ========================================
  {
    id: 4,
    name: "Boxy Cotton Crew Tee",
    category: "Men",
    price: 2900,
    oldPrice: 3600,
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    description:
      "240gsm combed cotton tee with a relaxed, boxy cut — thick enough to drape, soft enough to live in.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#f4f4f4", "#1e1e1e"],
    featured: true,
  },
  {
    id: 5,
    name: "Washed Denim Jacket",
    category: "Men",
    price: 12000,
    oldPrice: 14900,
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80",
    description:
      "Stone-washed sturdy denim with a broken-in feel from day one — the trucker jacket, perfected.",
    isNew: false,
    tag: "BESTSELLER",
    colors: ["#5f7a94", "#2f3b47"],
    featured: true,
  },
  {
    id: 6,
    name: "Oversized Knit Hoodie",
    category: "Men",
    price: 7900,
    oldPrice: 9200,
    rating: 4.6,
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80",
    description:
      "Brushed-back fleece hoodie with dropped shoulders and a kangaroo pocket — your year-round uniform.",
    isNew: false,
    tag: "STAPLE",
    colors: ["#a8a29e", "#1e1e1e"],
    featured: false,
  },
  {
    id: 8,
    name: "Slim Tapered Chinos",
    category: "Men",
    price: 6800,
    oldPrice: 7900,
    rating: 4.5,
    image:
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80",
    description:
      "Cotton-twill chinos with a clean slim taper — tailor sharp, weekend easy.",
    isNew: false,
    tag: "WORKWEAR",
    colors: ["#7c7368", "#30404d"],
    featured: false,
  },
  {
    id: 15,
    name: "Linen Overshirt",
    category: "Men",
    price: 9900,
    oldPrice: 11800,
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80",
    description:
      "A breathable linen-ramie overshirt with a camp collar — throw it over a tee and you are dressed.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#cbb59a", "#e8e4da"],
    featured: false,
  },

  // ========================================
  // KIDS
  // ========================================
  {
    id: 7,
    name: "Kids Rainbow Graphic Tee",
    category: "Kids",
    price: 2900,
    oldPrice: 3500,
    rating: 4.6,
    image:
      "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=900&q=80",
    description:
      "Vibrant rainbow-print tee in soft, breathable cotton — made for playground adventures and endless washing.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#ff9fc4", "#2b2733"],
    featured: false,
  },
  {
    id: 14,
    name: "Kids Hoodie in Butterscotch",
    category: "Kids",
    price: 4600,
    oldPrice: 5300,
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=80",
    description:
      "Fleece-lined hoodie in a cheerful butterscotch tone — warm, washable and made to be lived in.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#e0a458", "#7fa9a4"],
    featured: false,
  },
];

export default products;