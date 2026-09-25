// ========================================
// PRODUCT DATA
// ========================================
// All products for StyleStore live in this array.
// Add a new product by appending an object with:
//   id, name, category, price, oldPrice, discount (derived),
//   rating, ratingCount, image, description, isNew, tag,
//   colors, sizes, featured
//
// Rules:
//   - id must be unique (mirrors server/data/products.js)
//   - price/oldPrice are whole LKR amounts (display formatted as Rs.)
//   - image must be a unique, working asset URL
//   - discount % is derived from oldPrice on the product card

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
    ratingCount: 182,
    image:
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=900&q=80",
    description:
      "A breezy midi dress cut in a fluid, colour-blocked knit that moves beautifully with you from desk to dinner.",
    isNew: true,
    tag: "BESTSELLER",
    colors: ["#d9a066", "#1e1e1e"],
    sizes: ["XS", "S", "M", "L", "XL"],
    featured: true,
  },
  {
    id: 2,
    name: "Silk Blouse in Ivory",
    category: "Women",
    price: 8600,
    oldPrice: 10500,
    rating: 4.7,
    ratingCount: 96,
    image:
      "https://images.unsplash.com/photo-1551803091-e20673f15770?auto=format&fit=crop&w=900&q=80",
    description:
      "Lightweight satin-touch blouse with a relaxed collar — the quiet-luxury staple your wardrobe is missing.",
    isNew: false,
    tag: "TRENDING",
    colors: ["#f4efe6", "#1e1e1e"],
    sizes: ["XS", "S", "M", "L", "XL"],
    featured: false,
  },
  {
    id: 3,
    name: "Tailored Beige Trench",
    category: "Women",
    price: 19500,
    oldPrice: 24000,
    rating: 4.9,
    ratingCount: 214,
    image:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80",
    description:
      "A double-breasted trench with sharp lapels and a defined waist — polished outerwear for the modern closet.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#cbb493", "#2b2b2b"],
    sizes: ["S", "M", "L", "XL"],
    featured: true,
  },
  {
    id: 9,
    name: "Fitted Ribbed Tank",
    category: "Women",
    price: 2400,
    oldPrice: 2900,
    rating: 4.4,
    ratingCount: 143,
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    description:
      "A body-skimming ribbed tank with a scoop neckline — your easiest layering piece from spring to autumn.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#d9c8b8", "#2b2b2b"],
    sizes: ["XS", "S", "M", "L"],
    featured: false,
  },
  {
    id: 10,
    name: "Pleated Wrap Dress",
    category: "Women",
    price: 5600,
    oldPrice: 6400,
    rating: 4.6,
    ratingCount: 121,
    image:
      "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=900&q=80",
    description:
      "A soft pleated wrap dress with a removable waist tie — one silhouette, endless ways to style it.",
    isNew: false,
    tag: "EDIT PICK",
    colors: ["#9c7b6b", "#2b2b2b"],
    sizes: ["XS", "S", "M", "L", "XL"],
    featured: false,
  },
  {
    id: 11,
    name: "Relaxed Wide-Leg Trousers",
    category: "Women",
    price: 7200,
    oldPrice: 8400,
    rating: 4.6,
    ratingCount: 132,
    image:
      "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=900&q=80",
    description:
      "High-waisted wide-leg trousers in a drapey crepe — office smart at the top, effortlessly cool at the hem.",
    isNew: false,
    tag: "WORKWEAR",
    colors: ["#c1b5a2", "#1e1e1e"],
    sizes: ["XS", "S", "M", "L", "XL"],
    featured: false,
  },
  {
    id: 12,
    name: "Knitted Cardigan in Camel",
    category: "Women",
    price: 9800,
    oldPrice: 11500,
    rating: 4.8,
    ratingCount: 88,
    image:
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80",
    description:
      "An oversized caramel cardigan with a chunky ribbed stitch and mother-of-pearl buttons — weekend comfort, elevated.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#c1a88b", "#e8e0d3"],
    sizes: ["S", "M", "L", "XL"],
    featured: false,
  },
  {
    id: 16,
    name: "Floral Meadow Maxi Dress",
    category: "Women",
    price: 8400,
    oldPrice: 10200,
    rating: 4.8,
    ratingCount: 76,
    image:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
    description:
      "A romantic ankle-length maxi in a delicate floral print with a softly gathered waist and flutter sleeves.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#c9a0a0", "#5f6f52"],
    sizes: ["XS", "S", "M", "L", "XL"],
    featured: true,
  },
  {
    id: 17,
    name: "Silk Slip Midi Dress",
    category: "Women",
    price: 9600,
    oldPrice: 11500,
    rating: 4.7,
    ratingCount: 159,
    image:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=900&q=80",
    description:
      "A bias-cut satin slip with delicate adjustable straps — liquid shine that dresses up or down in seconds.",
    isNew: true,
    tag: "TRENDING",
    colors: ["#efe6d8", "#2b2b2b"],
    sizes: ["XS", "S", "M", "L", "XL"],
    featured: true,
  },
  {
    id: 18,
    name: "Golden Hour Wrap Dress",
    category: "Women",
    price: 7400,
    oldPrice: 8900,
    rating: 4.6,
    ratingCount: 104,
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
    description:
      "A sun-washed wrap silhouette with a flattering V neckline and a tie waist that cinches just right.",
    isNew: false,
    tag: "EDIT PICK",
    colors: ["#e0b879", "#7c6a4f"],
    sizes: ["XS", "S", "M", "L"],
    featured: false,
  },
  {
    id: 19,
    name: "Satin Skater Dress",
    category: "Women",
    price: 6900,
    oldPrice: 8200,
    rating: 4.5,
    ratingCount: 67,
    image:
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80",
    description:
      "A polished skater silhouette with a fluid satin skirt and elegant bardot neckline — made for warm evenings.",
    isNew: false,
    tag: "BESTSELLER",
    colors: ["#8c7a6b", "#2b2b2b"],
    sizes: ["XS", "S", "M", "L", "XL"],
    featured: false,
  },
  {
    id: 20,
    name: "Blush Pink Wool Coat",
    category: "Women",
    price: 18500,
    oldPrice: 22500,
    rating: 4.9,
    ratingCount: 52,
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80",
    description:
      "Wrap up in a cloud of barely-there blush — a double-faced wool coat with a cocoon shape and velvet toggles.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#ecc9c0", "#f4efe6"],
    sizes: ["S", "M", "L", "XL"],
    featured: true,
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
    ratingCount: 231,
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    description:
      "240gsm combed cotton tee with a relaxed, boxy cut — thick enough to drape, soft enough to live in.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#f4f4f4", "#1e1e1e"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    featured: true,
  },
  {
    id: 5,
    name: "Washed Denim Jacket",
    category: "Men",
    price: 12000,
    oldPrice: 14900,
    rating: 4.9,
    ratingCount: 178,
    image:
      "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80",
    description:
      "Stone-washed sturdy denim with a broken-in feel from day one — the trucker jacket, perfected.",
    isNew: false,
    tag: "BESTSELLER",
    colors: ["#5f7a94", "#2f3b47"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    featured: true,
  },
  {
    id: 6,
    name: "Oversized Knit Hoodie",
    category: "Men",
    price: 7900,
    oldPrice: 9200,
    rating: 4.6,
    ratingCount: 145,
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80",
    description:
      "Brushed-back fleece hoodie with dropped shoulders and a kangaroo pocket — your year-round uniform.",
    isNew: false,
    tag: "STAPLE",
    colors: ["#a8a29e", "#1e1e1e"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    featured: false,
  },
  {
    id: 8,
    name: "Slim Tapered Chinos",
    category: "Men",
    price: 6800,
    oldPrice: 7900,
    rating: 4.5,
    ratingCount: 109,
    image:
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80",
    description:
      "Cotton-twill chinos with a clean slim taper — tailor sharp, weekend easy.",
    isNew: false,
    tag: "WORKWEAR",
    colors: ["#7c7368", "#30404d"],
    sizes: ["28", "30", "32", "34", "36"],
    featured: false,
  },
  {
    id: 13,
    name: "Cozy Fleece Hoodie",
    category: "Men",
    price: 5200,
    oldPrice: 6300,
    rating: 4.6,
    ratingCount: 197,
    image:
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80",
    description:
      "A mid-weight fleece hoodie with a tonal drawstring and ribbed cuffs — comfort that holds its shape.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#7a6f66", "#2b2b2b"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    featured: false,
  },
  {
    id: 15,
    name: "Linen Overshirt",
    category: "Men",
    price: 9900,
    oldPrice: 11800,
    rating: 4.7,
    ratingCount: 83,
    image:
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80",
    description:
      "A breathable linen-ramie overshirt with a camp collar — throw it over a tee and you are dressed.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#cbb59a", "#e8e4da"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    featured: false,
  },
  {
    id: 21,
    name: "Essential Heavyweight Tee",
    category: "Men",
    price: 3200,
    oldPrice: 3900,
    rating: 4.7,
    ratingCount: 126,
    image:
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=80",
    description:
      "A sturdy 220gsm crew-neck tee in washed cotton — the dependable staple that only gets better with age.",
    isNew: true,
    tag: "STAPLE",
    colors: ["#f4f4f4", "#8c7355", "#1e1e1e"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    featured: false,
  },
  {
    id: 22,
    name: "Resort Camp Shirt",
    category: "Men",
    price: 7200,
    oldPrice: 8600,
    rating: 4.5,
    ratingCount: 91,
    image:
      "https://images.unsplash.com/photo-1593032465175-481ac7f401a0?auto=format&fit=crop&w=900&q=80",
    description:
      "A breezy camp-collar shirt in an easy-wear rayon blend — vacation energy, worn anywhere.",
    isNew: false,
    tag: "EDIT PICK",
    colors: ["#5f7a94", "#cbb59a"],
    sizes: ["S", "M", "L", "XL"],
    featured: false,
  },
  {
    id: 23,
    name: "Heritage Trucker Jacket",
    category: "Men",
    price: 13400,
    oldPrice: 16200,
    rating: 4.8,
    ratingCount: 74,
    image:
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=80",
    description:
      "A rugged cotton twill trucker jacket with corduroy collar and brass hardware — vintage bones, modern fit.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#4a6b8a", "#8c7355"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    featured: true,
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
    ratingCount: 58,
    image:
      "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=900&q=80",
    description:
      "Vibrant rainbow-print tee in soft, breathable cotton — made for playground adventures and endless washing.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#ff9fc4", "#2b2733"],
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"],
    featured: false,
  },
  {
    id: 14,
    name: "Kids Hoodie in Butterscotch",
    category: "Kids",
    price: 4600,
    oldPrice: 5300,
    rating: 4.7,
    ratingCount: 47,
    image:
      "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=80",
    description:
      "Fleece-lined hoodie in a cheerful butterscotch tone — warm, washable and made to be lived in.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#e0a458", "#7fa9a4"],
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"],
    featured: false,
  },
  {
    id: 24,
    name: "Kids Cloud Cotton Set",
    category: "Kids",
    price: 3900,
    oldPrice: 4700,
    rating: 4.6,
    ratingCount: 38,
    image:
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=80",
    description:
      "A cloud-soft cotton two-piece set for little ones — gentle on skin, quick to dry and easy to move in.",
    isNew: true,
    tag: "NEW IN",
    colors: ["#cfe0e3", "#e8e4da"],
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"],
    featured: false,
  },
];

export default products;