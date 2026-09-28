// ========================================
// StyleStore initial catalogue seed products
// ========================================
const legacyProducts = [
  {
    "id": 1,
    "sku": "SS-WOM-001",
    "name": "Elegant Summer Dress",
    "category": "Women",
    "productType": "Dress",
    "shortDescription": "A breezy midi dress cut in a fluid, colour-blocked knit.",
    "description": "A breezy midi dress cut in a fluid, colour-blocked knit that moves beautifully with you from desk to dinner.",
    "price": 7800,
    "originalPrice": 9200,
    "rating": 4.8,
    "ratingCount": 182,
    "stockQuantity": 24,
    "isNew": true,
    "isFeatured": true,
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "colours": [
      {
        "name": "Caramel",
        "hex": "#d9a066"
      },
      {
        "name": "Black",
        "hex": "#1e1e1e"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 2,
    "sku": "SS-WOM-002",
    "name": "Silk Blouse in Ivory",
    "category": "Women",
    "productType": "Top",
    "shortDescription": "A relaxed satin-touch blouse with a quiet-luxury feel.",
    "description": "Lightweight satin-touch blouse with a relaxed collar — the quiet-luxury staple your wardrobe is missing.",
    "price": 8600,
    "originalPrice": 10500,
    "rating": 4.7,
    "ratingCount": 96,
    "stockQuantity": 18,
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "colours": [
      {
        "name": "Ivory",
        "hex": "#f4efe6"
      },
      {
        "name": "Black",
        "hex": "#1e1e1e"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1551803091-e20673f15770?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 3,
    "sku": "SS-WOM-003",
    "name": "Tailored Beige Trench",
    "category": "Women",
    "productType": "Jacket",
    "shortDescription": "A double-breasted trench with sharp lapels and a defined waist.",
    "description": "A double-breasted trench with sharp lapels and a defined waist — polished outerwear for the modern closet.",
    "price": 19500,
    "originalPrice": 24000,
    "rating": 4.9,
    "ratingCount": 214,
    "stockQuantity": 12,
    "isNew": true,
    "isFeatured": true,
    "sizes": [
      "S",
      "M",
      "L",
      "XL"
    ],
    "colours": [
      {
        "name": "Beige",
        "hex": "#cbb493"
      },
      {
        "name": "Charcoal",
        "hex": "#2b2b2b"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 4,
    "sku": "SS-MEN-001",
    "name": "Boxy Cotton Crew Tee",
    "category": "Men",
    "productType": "Top",
    "shortDescription": "A relaxed, boxy 240gsm combed cotton tee.",
    "description": "240gsm combed cotton tee with a relaxed, boxy cut — thick enough to drape, soft enough to live in.",
    "price": 2900,
    "originalPrice": 3600,
    "rating": 4.7,
    "ratingCount": 231,
    "stockQuantity": 40,
    "isNew": true,
    "isFeatured": true,
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "colours": [
      {
        "name": "White",
        "hex": "#f4f4f4"
      },
      {
        "name": "Black",
        "hex": "#1e1e1e"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 5,
    "sku": "SS-MEN-002",
    "name": "Washed Denim Jacket",
    "category": "Men",
    "productType": "Jacket",
    "shortDescription": "Stone-washed sturdy denim with a broken-in feel.",
    "description": "Stone-washed sturdy denim with a broken-in feel from day one — the trucker jacket, perfected.",
    "price": 12000,
    "originalPrice": 14900,
    "rating": 4.9,
    "ratingCount": 178,
    "stockQuantity": 16,
    "isFeatured": true,
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "colours": [
      {
        "name": "Indigo",
        "hex": "#5f7a94"
      },
      {
        "name": "Slate",
        "hex": "#2f3b47"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 6,
    "sku": "SS-MEN-003",
    "name": "Oversized Knit Hoodie",
    "category": "Men",
    "productType": "Top",
    "shortDescription": "Brushed-back fleece with dropped shoulders and a kangaroo pocket.",
    "description": "Brushed-back fleece hoodie with dropped shoulders and a kangaroo pocket — your year-round uniform.",
    "price": 7900,
    "originalPrice": 9200,
    "rating": 4.6,
    "ratingCount": 145,
    "stockQuantity": 28,
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "colours": [
      {
        "name": "Stone",
        "hex": "#a8a29e"
      },
      {
        "name": "Black",
        "hex": "#1e1e1e"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 7,
    "sku": "SS-KID-001",
    "name": "Kids Rainbow Graphic Tee",
    "category": "Kids",
    "productType": "Kids Wear",
    "shortDescription": "A soft cotton tee made for playground adventures.",
    "description": "Vibrant rainbow-print tee in soft, breathable cotton — made for playground adventures and endless washing.",
    "price": 2900,
    "originalPrice": 3500,
    "rating": 4.6,
    "ratingCount": 58,
    "stockQuantity": 32,
    "isNew": true,
    "sizes": [
      "2-3Y",
      "4-5Y",
      "6-7Y",
      "8-9Y"
    ],
    "colours": [
      {
        "name": "Pink",
        "hex": "#ff9fc4"
      },
      {
        "name": "Ink",
        "hex": "#2b2733"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 8,
    "sku": "SS-MEN-004",
    "name": "Slim Tapered Chinos",
    "category": "Men",
    "productType": "Trouser",
    "shortDescription": "Cotton-twill chinos with a clean slim taper.",
    "description": "Cotton-twill chinos with a clean slim taper — tailor sharp, weekend easy.",
    "price": 6800,
    "originalPrice": 7900,
    "rating": 4.5,
    "ratingCount": 109,
    "stockQuantity": 21,
    "sizes": [
      "28",
      "30",
      "32",
      "34",
      "36"
    ],
    "colours": [
      {
        "name": "Taupe",
        "hex": "#7c7368"
      },
      {
        "name": "Navy",
        "hex": "#30404d"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 9,
    "sku": "SS-WOM-004",
    "name": "Fitted Ribbed Tank",
    "category": "Women",
    "productType": "Top",
    "shortDescription": "A body-skimming ribbed tank with a scoop neckline.",
    "description": "A body-skimming ribbed tank with a scoop neckline — your easiest layering piece from spring to autumn.",
    "price": 2400,
    "originalPrice": 2900,
    "rating": 4.4,
    "ratingCount": 143,
    "stockQuantity": 35,
    "isNew": true,
    "sizes": [
      "XS",
      "S",
      "M",
      "L"
    ],
    "colours": [
      {
        "name": "Sand",
        "hex": "#d9c8b8"
      },
      {
        "name": "Charcoal",
        "hex": "#2b2b2b"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 10,
    "sku": "SS-WOM-005",
    "name": "Pleated Wrap Dress",
    "category": "Women",
    "productType": "Dress",
    "shortDescription": "A soft pleated wrap dress with a removable waist tie.",
    "description": "A soft pleated wrap dress with a removable waist tie — one silhouette, endless ways to style it.",
    "price": 5600,
    "originalPrice": 6400,
    "rating": 4.6,
    "ratingCount": 121,
    "stockQuantity": 20,
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "colours": [
      {
        "name": "Rosewood",
        "hex": "#9c7b6b"
      },
      {
        "name": "Charcoal",
        "hex": "#2b2b2b"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 11,
    "sku": "SS-WOM-006",
    "name": "Relaxed Wide-Leg Trousers",
    "category": "Women",
    "productType": "Trouser",
    "shortDescription": "High-waisted wide-leg trousers in a drapey crepe.",
    "description": "High-waisted wide-leg trousers in a drapey crepe — office smart at the top, effortlessly cool at the hem.",
    "price": 7200,
    "originalPrice": 8400,
    "rating": 4.6,
    "ratingCount": 132,
    "stockQuantity": 17,
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "colours": [
      {
        "name": "Oat",
        "hex": "#c1b5a2"
      },
      {
        "name": "Black",
        "hex": "#1e1e1e"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 12,
    "sku": "SS-WOM-007",
    "name": "Knitted Cardigan in Camel",
    "category": "Women",
    "productType": "Jacket",
    "shortDescription": "An oversized chunky-rib cardigan with mother-of-pearl buttons.",
    "description": "An oversized caramel cardigan with a chunky ribbed stitch and mother-of-pearl buttons — weekend comfort, elevated.",
    "price": 9800,
    "originalPrice": 11500,
    "rating": 4.8,
    "ratingCount": 88,
    "stockQuantity": 14,
    "isNew": true,
    "sizes": [
      "S",
      "M",
      "L",
      "XL"
    ],
    "colours": [
      {
        "name": "Camel",
        "hex": "#c1a88b"
      },
      {
        "name": "Cream",
        "hex": "#e8e0d3"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 13,
    "sku": "SS-MEN-005",
    "name": "Cozy Fleece Hoodie",
    "category": "Men",
    "productType": "Top",
    "shortDescription": "A mid-weight fleece hoodie with ribbed cuffs.",
    "description": "A mid-weight fleece hoodie with a tonal drawstring and ribbed cuffs — comfort that holds its shape.",
    "price": 5200,
    "originalPrice": 6300,
    "rating": 4.6,
    "ratingCount": 197,
    "stockQuantity": 30,
    "isNew": true,
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "colours": [
      {
        "name": "Taupe",
        "hex": "#7a6f66"
      },
      {
        "name": "Ink",
        "hex": "#2b2b2b"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 14,
    "sku": "SS-KID-002",
    "name": "Kids Hoodie in Butterscotch",
    "category": "Kids",
    "productType": "Kids Wear",
    "shortDescription": "A cheerful fleece-lined hoodie for everyday play.",
    "description": "Fleece-lined hoodie in a cheerful butterscotch tone — warm, washable and made to be lived in.",
    "price": 4600,
    "originalPrice": 5300,
    "rating": 4.7,
    "ratingCount": 47,
    "stockQuantity": 26,
    "isNew": true,
    "sizes": [
      "2-3Y",
      "4-5Y",
      "6-7Y",
      "8-9Y"
    ],
    "colours": [
      {
        "name": "Butterscotch",
        "hex": "#e0a458"
      },
      {
        "name": "Sage",
        "hex": "#7fa9a4"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 15,
    "sku": "SS-MEN-006",
    "name": "Linen Overshirt",
    "category": "Men",
    "productType": "Shirt",
    "shortDescription": "A breathable linen-ramie overshirt with a camp collar.",
    "description": "A breathable linen-ramie overshirt with a camp collar — throw it over a tee and you are dressed.",
    "price": 9900,
    "originalPrice": 11800,
    "rating": 4.7,
    "ratingCount": 83,
    "stockQuantity": 11,
    "isNew": true,
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "colours": [
      {
        "name": "Sand",
        "hex": "#cbb59a"
      },
      {
        "name": "Ecru",
        "hex": "#e8e4da"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 16,
    "sku": "SS-WOM-008",
    "name": "Floral Meadow Maxi Dress",
    "category": "Women",
    "productType": "Dress",
    "shortDescription": "A romantic ankle-length maxi in a delicate floral print.",
    "description": "A romantic ankle-length maxi in a delicate floral print with a softly gathered waist and flutter sleeves.",
    "price": 8400,
    "originalPrice": 10200,
    "rating": 4.8,
    "ratingCount": 76,
    "stockQuantity": 9,
    "isNew": true,
    "isFeatured": true,
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "colours": [
      {
        "name": "Dusty Rose",
        "hex": "#c9a0a0"
      },
      {
        "name": "Olive",
        "hex": "#5f6f52"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 17,
    "sku": "SS-WOM-009",
    "name": "Silk Slip Midi Dress",
    "category": "Women",
    "productType": "Dress",
    "shortDescription": "A bias-cut satin slip with delicate adjustable straps.",
    "description": "A bias-cut satin slip with delicate adjustable straps — liquid shine that dresses up or down in seconds.",
    "price": 9600,
    "originalPrice": 11500,
    "rating": 4.7,
    "ratingCount": 159,
    "stockQuantity": 8,
    "isNew": true,
    "isFeatured": true,
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "colours": [
      {
        "name": "Champagne",
        "hex": "#efe6d8"
      },
      {
        "name": "Black",
        "hex": "#2b2b2b"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 18,
    "sku": "SS-WOM-010",
    "name": "Golden Hour Wrap Dress",
    "category": "Women",
    "productType": "Dress",
    "shortDescription": "A sun-washed wrap silhouette with a flattering tie waist.",
    "description": "A sun-washed wrap silhouette with a flattering V neckline and a tie waist that cinches just right.",
    "price": 7400,
    "originalPrice": 8900,
    "rating": 4.6,
    "ratingCount": 104,
    "stockQuantity": 10,
    "sizes": [
      "XS",
      "S",
      "M",
      "L"
    ],
    "colours": [
      {
        "name": "Honey",
        "hex": "#e0b879"
      },
      {
        "name": "Cacao",
        "hex": "#7c6a4f"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 19,
    "sku": "SS-WOM-011",
    "name": "Satin Skater Dress",
    "category": "Women",
    "productType": "Dress",
    "shortDescription": "A polished skater silhouette with a fluid satin skirt.",
    "description": "A polished skater silhouette with a fluid satin skirt and elegant bardot neckline — made for warm evenings.",
    "price": 6900,
    "originalPrice": 8200,
    "rating": 4.5,
    "ratingCount": 67,
    "stockQuantity": 13,
    "sizes": [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    "colours": [
      {
        "name": "Mushroom",
        "hex": "#8c7a6b"
      },
      {
        "name": "Charcoal",
        "hex": "#2b2b2b"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 20,
    "sku": "SS-WOM-012",
    "name": "Blush Pink Wool Coat",
    "category": "Women",
    "productType": "Jacket",
    "shortDescription": "A double-faced wool coat with a cocoon shape.",
    "description": "Wrap up in a cloud of barely-there blush — a double-faced wool coat with a cocoon shape and velvet toggles.",
    "price": 18500,
    "originalPrice": 22500,
    "rating": 4.9,
    "ratingCount": 52,
    "stockQuantity": 6,
    "isNew": true,
    "isFeatured": true,
    "sizes": [
      "S",
      "M",
      "L",
      "XL"
    ],
    "colours": [
      {
        "name": "Blush",
        "hex": "#ecc9c0"
      },
      {
        "name": "Ivory",
        "hex": "#f4efe6"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 21,
    "sku": "SS-MEN-007",
    "name": "Essential Heavyweight Tee",
    "category": "Men",
    "productType": "Top",
    "shortDescription": "A dependable 220gsm crew-neck tee in washed cotton.",
    "description": "A sturdy 220gsm crew-neck tee in washed cotton — the dependable staple that only gets better with age.",
    "price": 3200,
    "originalPrice": 3900,
    "rating": 4.7,
    "ratingCount": 126,
    "stockQuantity": 38,
    "isNew": true,
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "colours": [
      {
        "name": "White",
        "hex": "#f4f4f4"
      },
      {
        "name": "Sand",
        "hex": "#8c7355"
      },
      {
        "name": "Black",
        "hex": "#1e1e1e"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 22,
    "sku": "SS-MEN-008",
    "name": "Resort Camp Shirt",
    "category": "Men",
    "productType": "Shirt",
    "shortDescription": "A breezy camp-collar shirt in an easy-wear rayon blend.",
    "description": "A breezy camp-collar shirt in an easy-wear rayon blend — vacation energy, worn anywhere.",
    "price": 7200,
    "originalPrice": 8600,
    "rating": 4.5,
    "ratingCount": 91,
    "stockQuantity": 15,
    "sizes": [
      "S",
      "M",
      "L",
      "XL"
    ],
    "colours": [
      {
        "name": "Blue",
        "hex": "#5f7a94"
      },
      {
        "name": "Sand",
        "hex": "#cbb59a"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1593032465175-481ac7f401a0?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 23,
    "sku": "SS-MEN-009",
    "name": "Heritage Trucker Jacket",
    "category": "Men",
    "productType": "Jacket",
    "shortDescription": "A rugged cotton-twill trucker jacket with a corduroy collar.",
    "description": "A rugged cotton twill trucker jacket with corduroy collar and brass hardware — vintage bones, modern fit.",
    "price": 13400,
    "originalPrice": 16200,
    "rating": 4.8,
    "ratingCount": 74,
    "stockQuantity": 7,
    "isNew": true,
    "isFeatured": true,
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "colours": [
      {
        "name": "Blue",
        "hex": "#4a6b8a"
      },
      {
        "name": "Brown",
        "hex": "#8c7355"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=80"
  },
  {
    "id": 24,
    "sku": "SS-KID-003",
    "name": "Kids Cloud Cotton Set",
    "category": "Kids",
    "productType": "Kids Wear",
    "shortDescription": "A cloud-soft cotton two-piece set for little ones.",
    "description": "A cloud-soft cotton two-piece set for little ones — gentle on skin, quick to dry and easy to move in.",
    "price": 3900,
    "originalPrice": 4700,
    "rating": 4.6,
    "ratingCount": 38,
    "stockQuantity": 23,
    "isNew": true,
    "sizes": [
      "2-3Y",
      "4-5Y",
      "6-7Y",
      "8-9Y"
    ],
    "colours": [
      {
        "name": "Sky",
        "hex": "#cfe0e3"
      },
      {
        "name": "Ecru",
        "hex": "#e8e4da"
      }
    ],
    "status": "published",
    "image": "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=80"
  }
];

export default legacyProducts;
