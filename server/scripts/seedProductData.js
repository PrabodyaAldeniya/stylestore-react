/* ========================================================
   INITIAL CATALOGUE DATA
   --------------------------------------------------------
   These are plain JavaScript objects — no SQL, no database
   calls. `server/scripts/seedInitialProducts.js` reads them
   and writes them to MySQL.

   Every object matches the shape the existing Add Product form
   submits, so the seed goes through the exact same validation
   and the exact same repository insert as a product typed in by
   hand.

   Rules these records follow:
     - unique SKU and unique product name
     - prices are plain numbers (no "Rs." and no commas)
     - `originalPrice` is either null or strictly higher than `price`;
       the discount percentage is never stored, it is calculated
       by the product repository from the two numbers
     - colours are readable names with a matching hex so the admin
       colour picker highlights the right swatch
     - sizes come from the recommended size lists for the category
   ======================================================== */

/* Size lists reused by the catalogue (short names for readability). */
const WOMEN_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const MEN_SIZES = ["S", "M", "L", "XL", "XXL"];
const MEN_WAIST_SIZES = ["28", "30", "32", "34", "36"];
const KIDS_SIZES = ["2-3 Years", "4-5 Years", "6-7 Years", "8-9 Years", "10-12 Years"];
const BABY_SIZES = ["2-3 Years", "4-5 Years", "6-7 Years"];
const FREE_SIZE = ["Free Size"];
const ADJUSTABLE = ["Adjustable"];

/* Colour swatches use the same hex values as src/lib/colours.js so the
   admin colour buttons highlight correctly when a seeded product is edited. */
const BLACK = { name: "Black", hex: "#1e1e1e" };
const WHITE = { name: "White", hex: "#ffffff" };
const BLUE = { name: "Blue", hex: "#2f6fb5" };
const GREEN = { name: "Green", hex: "#2f8f4e" };
const PINK = { name: "Pink", hex: "#f2a1b6" };
const YELLOW = { name: "Yellow", hex: "#f5c518" };
const GREY = { name: "Grey", hex: "#8a8a8a" };
const NAVY = { name: "Navy", hex: "#1f2a44" };
const IVORY = { name: "Ivory", hex: "#f7f1e3" };
const CREAM = { name: "Cream", hex: "#f3e9d8" };
const BEIGE = { name: "Beige", hex: "#d9c8b8" };
const BROWN = { name: "Brown", hex: "#6b4a2f" };
const MAROON = { name: "Maroon", hex: "#7b1e2b" };
const WINE = { name: "Wine", hex: "#5c1233" };
const MUSTARD = { name: "Mustard", hex: "#d9a441" };
const DUSTY_ROSE = { name: "Dusty Rose", hex: "#c9a0a0" };
const SKY_BLUE = { name: "Sky Blue", hex: "#7fb2e5" };
const OLIVE = { name: "Olive", hex: "#6b7a3a" };

/* ============================================
   SECTION: Women products (10)
   ============================================ */
const womenProducts = [
  {
    sku: "SS-WOM-DR001",
    name: "Floral Midi Dress",
    category: "Women",
    productType: "Dress",
    shortDescription:
      "A soft viscose midi dress in a hand-drawn floral print, cut to fall just below the knee.",
    description:
      "Printed viscose crepe with a light, floaty hand that moves without clinging. The bodice is fitted through the shoulder with a softly gathered waist, and the skirt falls to a midi length just below the knee. Made for daytime weddings, garden parties and office events where you want something pretty but easy to wear. Machine wash cold on a gentle cycle, do not bleach, and line dry in shade. A light iron on the reverse is enough after washing.",
    price: 6450,
    originalPrice: 8900,
    isNew: true,
    isFeatured: true,
    sizes: WOMEN_SIZES,
    colours: [DUSTY_ROSE, GREEN, NAVY],
    stockQuantity: 24,
    rating: 4.7,
    ratingCount: 42,
    image: null,
  },
  {
    sku: "SS-WOM-DR002",
    name: "Satin Evening Dress",
    category: "Women",
    productType: "Dress",
    shortDescription:
      "A bias-cut satin evening dress with a draped neckline that catches the light at every step.",
    description:
      "Cut on the bias from a heavyweight satin so it skims the body and hangs straight when you stand still. The neckline is draped by hand-finished pleats and the hem is weighted lightly to keep the line clean. This is an occasion dress for weddings, formal dinners and the end-of-year party. For the best finish, dry clean only. If you must wash at home, use cold water on a delicate cycle, never wring the fabric, and hang the dress rather than folding it.",
    price: 12500,
    originalPrice: null,
    isNew: true,
    isFeatured: true,
    sizes: WOMEN_SIZES,
    colours: [WINE, BLACK, GREEN],
    stockQuantity: 12,
    rating: 4.8,
    ratingCount: 27,
    image: null,
  },
  {
    sku: "SS-WOM-DR003",
    name: "Linen Summer Dress",
    category: "Women",
    productType: "Dress",
    shortDescription:
      "Breathable washed-linen sundress with side pockets and adjustable straps for hot afternoons.",
    description:
      "Washed linen that starts soft and keeps getting softer, so it never feels stiff against the skin. It has a straight cut with a gently scooped neckline, adjustable straps and two deep side pockets for a phone and keys. Made for hot afternoons, seaside days and casual weekend lunches. Machine wash cold, tumble dry low or line dry, and iron while slightly damp for the smoothest finish.",
    price: 5900,
    originalPrice: 7400,
    isNew: false,
    isFeatured: false,
    sizes: WOMEN_SIZES,
    colours: [IVORY, OLIVE, WHITE],
    stockQuantity: 3,
    rating: 4.5,
    ratingCount: 18,
    image: null,
  },
  {
    sku: "SS-WOM-BL001",
    name: "Puff Sleeve Blouse",
    category: "Women",
    productType: "Blouse",
    shortDescription:
      "A crisp cotton-poplin blouse with gathered puff sleeves and a relaxed tie-neck front.",
    description:
      "Crisp cotton poplin with just enough body to hold its shape, cut with a softly gathered puff sleeve at the shoulder and a relaxed tie neck you can knot or leave open. The hem is curved so it sits neatly untucked over trousers or a skirt. Good for work, meetings and smart-casual lunches. Machine wash cold on a gentle cycle, do not tumble dry hot, and iron the collar and cuffs while damp.",
    price: 4350,
    originalPrice: null,
    isNew: false,
    isFeatured: false,
    sizes: WOMEN_SIZES,
    colours: [WHITE, SKY_BLUE, PINK],
    stockQuantity: 31,
    rating: 4.4,
    ratingCount: 33,
    image: null,
  },
  {
    sku: "SS-WOM-TP001",
    name: "Ribbed Knit Top",
    category: "Women",
    productType: "Top",
    shortDescription:
      "A second-skin ribbed knit top in stretch cotton that holds its shape wash after wash.",
    description:
      "A fine 2x2 rib knit in stretch cotton with a close, comfortable fit that stays smooth instead of stretching out at the waist. The neckline and cuffs are ribbed for a clean finish and the hem is slightly longer so it stays tucked. An easy everyday layer under a blazer or on its own. Machine wash cold inside out, dry flat to keep the rib from stretching, and do not bleach.",
    price: 3950,
    originalPrice: 5200,
    isNew: false,
    isFeatured: false,
    sizes: WOMEN_SIZES,
    colours: [BLACK, CREAM, MAROON, OLIVE],
    stockQuantity: 0,
    rating: 4.6,
    ratingCount: 51,
    image: null,
  },
  {
    sku: "SS-WOM-SK001",
    name: "High-Waist Midi Skirt",
    category: "Women",
    productType: "Skirt",
    shortDescription:
      "A structured high-waist midi skirt with a soft A-line swing and a concealed side zip.",
    description:
      "A lightly structured suiting blend that holds a clean A-line swing without feeling stiff. The high waist sits at the natural waist, the back has a concealed zip, and there is a small vent at the hem so you can walk comfortably. Pair it with a knit top for the office or a flat shoe for everyday wear. Dry clean recommended; if washed at home use cold water and press the pleats from the inside.",
    price: 5400,
    originalPrice: null,
    isNew: false,
    isFeatured: true,
    sizes: WOMEN_SIZES,
    colours: [BLACK, BEIGE, NAVY],
    stockQuantity: 19,
    rating: 4.5,
    ratingCount: 24,
    image: null,
  },
  {
    sku: "SS-WOM-TR001",
    name: "Wide-Leg Trousers",
    category: "Women",
    productType: "Trouser",
    shortDescription:
      "High-rise wide-leg trousers in a fluid suiting blend that drape cleanly over shoes.",
    description:
      "A fluid suiting blend with a small amount of stretch, cut high on the waist with a genuinely wide leg that falls straight to the ankle and covers most footwear. There is a front zip, two side pockets and a single back welt pocket. Made for office wear, formal meetings and smart dinners. Dry clean is best. If you wash at home, use cold water on a delicate cycle and steam rather than press the crease flat.",
    price: 6800,
    originalPrice: 8200,
    isNew: false,
    isFeatured: false,
    sizes: WOMEN_SIZES,
    colours: [BLACK, GREY, NAVY, CREAM],
    stockQuantity: 27,
    rating: 4.7,
    ratingCount: 39,
    image: null,
  },
  {
    sku: "SS-WOM-JK001",
    name: "Cropped Denim Jacket",
    category: "Women",
    productType: "Jacket",
    shortDescription:
      "A mid-wash denim jacket, cropped at the waist with contrast topstitching and metal buttons.",
    description:
      "Rigid mid-wash denim that breaks in and softens with wear, cropped so it sits at the waist over a dress or with high-rise trousers. It has the classic pointed collar, two chest pockets with button flaps and two hand pockets, finished with contrast topstitching and metal buttons. Good for casual weekends, college and everyday layering. Wash cold inside out, hang to dry away from direct sun, and expect the denim to fade slightly at the seams.",
    price: 8900,
    originalPrice: 11500,
    isNew: false,
    isFeatured: false,
    sizes: WOMEN_SIZES,
    colours: [BLUE, BLACK, IVORY],
    stockQuantity: 15,
    rating: 4.6,
    ratingCount: 46,
    image: null,
  },
  {
    sku: "SS-WOM-SH001",
    name: "Casual Cotton Shirt",
    category: "Women",
    productType: "Shirt",
    shortDescription:
      "An oversized cotton shirt in a fine dobby weave, made for layering all year round.",
    description:
      "A fine dobby-weave cotton that is softer than a dress shirt but still looks neat, cut relaxed through the body with dropped shoulders and a curved hem long enough to knot at the waist. Wear it open over a top, buttoned with jeans, or belted for work. Machine wash cold with like colours, reshape while damp and iron lightly. It is designed to look better slightly rumpled than perfectly pressed.",
    price: 4750,
    originalPrice: null,
    isNew: true,
    isFeatured: false,
    sizes: WOMEN_SIZES,
    colours: [WHITE, SKY_BLUE, MUSTARD],
    stockQuantity: 34,
    rating: 4.3,
    ratingCount: 28,
    image: null,
  },
  {
    sku: "SS-WOM-DR004",
    name: "Printed Wrap Dress",
    category: "Women",
    productType: "Dress",
    shortDescription:
      "A true wrap dress in printed viscose crepe with an adjustable tie waist and a clean neckline.",
    description:
      "Printed viscose crepe in a genuine wrap construction, so it ties to fit rather than relying on elastic. The neckline stays flat, the tie waist can be knotted any way you like, and the skirt falls to mid-calf with a small side vent. Suits office days, family visits and daytime events. Machine wash cold on a gentle cycle, close the tie before washing, and line dry to protect the print.",
    price: 7250,
    originalPrice: 9600,
    isNew: false,
    isFeatured: false,
    sizes: WOMEN_SIZES,
    colours: [GREEN, NAVY, WINE],
    stockQuantity: 21,
    rating: 4.7,
    ratingCount: 37,
    image: null,
  },
];

/* ============================================
   SECTION: Men products (8)
   ============================================ */
const menProducts = [
  {
    sku: "SS-MEN-SH001",
    name: "Classic Oxford Shirt",
    category: "Men",
    productType: "Shirt",
    shortDescription:
      "A button-down oxford shirt in cotton poplin with a soft roll collar that sits flat under a jacket.",
    description:
      "Woven cotton oxford with a soft roll collar, a button-down point and a single chest pocket. The fit is regular through the chest and waist with a straight hem, so it works buttoned with chinos or open under a blazer. This is the shirt to reach for on interview days, meetings and everyday office wear. Machine wash warm, tumble dry low, and iron damp for the sharpest collar roll.",
    price: 6950,
    originalPrice: null,
    isNew: false,
    isFeatured: true,
    sizes: MEN_SIZES,
    colours: [WHITE, SKY_BLUE, GREY],
    stockQuantity: 22,
    rating: 4.7,
    ratingCount: 61,
    image: null,
  },
  {
    sku: "SS-MEN-TS001",
    name: "Premium Cotton T-Shirt",
    category: "Men",
    productType: "T-Shirt",
    shortDescription:
      "A heavyweight combed-cotton tee with a ribbed collar that stays flat season after season.",
    description:
      "Combed cotton at a heavier weight than a standard tee, with a double-stitched ribbed collar that resists stretching and a slightly structured shoulder. The straight body fits true to size and holds its shape through the day. Wear it on its own, under an open shirt or with a jacket. Machine wash cold inside out, do not bleach, and dry flat in shade to keep the colour bright.",
    price: 3200,
    originalPrice: 4000,
    isNew: false,
    isFeatured: false,
    sizes: MEN_SIZES,
    colours: [BLACK, WHITE, NAVY, OLIVE],
    stockQuantity: 38,
    rating: 4.6,
    ratingCount: 74,
    image: null,
  },
  {
    sku: "SS-MEN-TR001",
    name: "Slim-Fit Chino Trousers",
    category: "Men",
    productType: "Trouser",
    shortDescription:
      "Slim-fit chinos in stretch cotton twill with a clean flat front and just enough give to move in.",
    description:
      "Cotton twill with a small amount of elastane so it flexes when you sit or climb without going baggy. The front is clean with no pleats, the back has two single pleats, and there is a belt-loop waistband that works with or without a belt. Offered in letter sizes and waist measurements so you can order your usual trouser size. Machine wash cold, tumble dry low, and iron the creases from the inside.",
    price: 5900,
    originalPrice: 7200,
    isNew: false,
    isFeatured: false,
    sizes: [...MEN_SIZES, ...MEN_WAIST_SIZES],
    colours: [BEIGE, NAVY, OLIVE, BLACK],
    stockQuantity: 4,
    rating: 4.5,
    ratingCount: 43,
    image: null,
  },
  {
    sku: "SS-MEN-JK001",
    name: "Heritage Trucker Jacket",
    category: "Men",
    productType: "Jacket",
    shortDescription:
      "A classic trucker jacket in garment-washed denim with copper hardware and two chest pockets.",
    description:
      "Garment-washed denim that feels broken in from the first wear, cut with a straight body, a button waistband and four pockets, two of them on the chest with pointed flaps. Copper hardware and a sherpa-free cotton twill lining keep it durable rather than bulky. Built for layering over a tee or a shirt through the year. Wash cold inside out, hang to dry away from direct sunlight, and it will only look better with age.",
    price: 11900,
    originalPrice: 14900,
    isNew: false,
    isFeatured: true,
    sizes: MEN_SIZES,
    colours: [BLUE, BLACK, BROWN],
    stockQuantity: 9,
    rating: 4.8,
    ratingCount: 52,
    image: null,
  },
  {
    sku: "SS-MEN-SH002",
    name: "Linen Casual Shirt",
    category: "Men",
    productType: "Shirt",
    shortDescription:
      "A relaxed linen-blend shirt with a camp collar that stays cool through humid afternoons.",
    description:
      "A linen-cotton blend chosen because it breathes far better than pure cotton while being easier to press. The camp collar sits open, the body is relaxed through the chest, and the curved hem works tucked or loose. Made for hot afternoons, holidays and casual weekends. Machine wash cold on a gentle cycle, hang to dry, and iron while damp. Expect natural creasing; that is part of the look.",
    price: 5400,
    originalPrice: null,
    isNew: true,
    isFeatured: false,
    sizes: MEN_SIZES,
    colours: [IVORY, OLIVE, SKY_BLUE, WHITE],
    stockQuantity: 26,
    rating: 4.4,
    ratingCount: 22,
    image: null,
  },
  {
    sku: "SS-MEN-TR002",
    name: "Tailored Formal Trousers",
    category: "Men",
    productType: "Trouser",
    shortDescription:
      "Flat-front suit trousers in a wool-blend suiting with a lined waistband and a sturdy hook closure.",
    description:
      "A wool-blend suiting with a smooth, matte finish, cut flat at the front with a clean straight leg and a single forward pleat. The waistband is lined and reinforced with a hook-and-bar closure so it keeps its shape through a full day. Made to pair with the Classic Oxford Shirt for interviews, formal functions and office wear. Dry clean only to protect the crease and the wool content.",
    price: 8600,
    originalPrice: null,
    isNew: false,
    isFeatured: false,
    sizes: [...MEN_WAIST_SIZES, "38", ...MEN_SIZES],
    colours: [BLACK, GREY, NAVY],
    stockQuantity: 0,
    rating: 4.6,
    ratingCount: 30,
    image: null,
  },
  {
    sku: "SS-MEN-JK002",
    name: "Lightweight Bomber Jacket",
    category: "Men",
    productType: "Jacket",
    shortDescription:
      "A water-resistant bomber jacket with a light quilted lining, ribbed cuffs and two zip pockets.",
    description:
      "A light nylon shell with a water-resistant finish that shrugs off light rain and wind without feeling heavy. Inside is a thin quilted lining, with ribbed cuffs, collar and hem that seal in warmth, and two zipped side pockets for a phone and keys. Ideal for evening outings, travel and the changeable monsoon. Machine wash cold on a gentle cycle, close all zips first, and do not iron the shell.",
    price: 9750,
    originalPrice: 12500,
    isNew: false,
    isFeatured: false,
    sizes: MEN_SIZES,
    colours: [BLACK, NAVY, OLIVE],
    stockQuantity: 17,
    rating: 4.5,
    ratingCount: 35,
    image: null,
  },
  {
    sku: "SS-MEN-PS001",
    name: "Relaxed-Fit Polo Shirt",
    category: "Men",
    productType: "Polo Shirt",
    shortDescription:
      "A relaxed pique-cotton polo with a soft collar, side slits and two-button placket.",
    description:
      "Mid-weight pique cotton with a soft collar that sits flat without tipping, a two-button placket and side slits at the hem for easy movement. The fit is relaxed through the body so it works open over a tee or buttoned on its own. Good for casual Fridays, family days and smart-casual meetings. Machine wash cold, do not bleach, and hang to dry rather than tumble drying so the collar keeps its shape.",
    price: 4650,
    originalPrice: 5900,
    isNew: true,
    isFeatured: false,
    sizes: MEN_SIZES,
    colours: [NAVY, WHITE, MAROON, OLIVE],
    stockQuantity: 33,
    rating: 4.6,
    ratingCount: 48,
    image: null,
  },
];

/* ============================================
   SECTION: Kids products (7)
   ============================================ */
const kidsProducts = [
  {
    sku: "SS-KID-DR001",
    name: "Girls Floral Party Dress",
    category: "Kids",
    productType: "Kids Dress",
    shortDescription:
      "A soft cotton party dress with a small floral print, a smocked waist and a twirl-ready skirt.",
    description:
      "Soft cotton with a small all-over floral print, smocked across the waist so it grows a little with the child and never feels tight. The skirt is gathered for movement and the short sleeves finish with a plain turned hem. Made for birthday parties, school functions and family celebrations. Machine wash warm with like colours, tumble dry low, and iron the bodice lightly if needed.",
    price: 4850,
    originalPrice: 6200,
    isNew: false,
    isFeatured: false,
    sizes: KIDS_SIZES,
    colours: [PINK, DUSTY_ROSE, WHITE],
    stockQuantity: 20,
    rating: 4.7,
    ratingCount: 26,
    image: null,
  },
  {
    sku: "SS-KID-DR002",
    name: "Girls Cotton Summer Dress",
    category: "Kids",
    productType: "Kids Dress",
    shortDescription:
      "A breathable cotton sundress with short sleeves and an easy A-line shape for everyday play.",
    description:
      "Lightweight breathable cotton in an easy A-line shape with short sleeves and a simple round neck. It is roomy enough for climbing, running and long school days, and short enough to wear with sandals or sneakers. Made for everyday play, outings and casual family occasions. Machine wash warm, tumble dry low, and wash with darker colours separately at first to be safe.",
    price: 3600,
    originalPrice: null,
    isNew: true,
    isFeatured: false,
    sizes: KIDS_SIZES,
    colours: [SKY_BLUE, YELLOW, IVORY],
    stockQuantity: 28,
    rating: 4.5,
    ratingCount: 19,
    image: null,
  },
  {
    sku: "SS-KID-TS001",
    name: "Boys Printed T-Shirt",
    category: "Kids",
    productType: "Kids T-Shirt",
    shortDescription:
      "A soft combed-cotton tee with a small graphic print that survives constant washing.",
    description:
      "Combed cotton that stays soft after many washes, with a small screen-printed graphic on the chest rather than a large transfer, so it does not crack or peel. The neckline is ribbed and reinforced to survive being pulled on every morning. Made for school, playground and everyday wear. Machine wash warm inside out, tumble dry low, and do not iron directly onto the print.",
    price: 2400,
    originalPrice: 3000,
    isNew: false,
    isFeatured: false,
    sizes: KIDS_SIZES,
    colours: [BLUE, MUSTARD, GREY],
    stockQuantity: 36,
    rating: 4.4,
    ratingCount: 41,
    image: null,
  },
  {
    sku: "SS-KID-ST001",
    name: "Boys Chino Shorts",
    category: "Kids",
    productType: "Kids Shorts",
    shortDescription:
      "Durable chino shorts in cotton twill with an adjustable inner waistband for growing children.",
    description:
      "Cotton twill chosen to survive playground wear, cut with a hidden adjustable elastic waistband inside so the shorts fit for longer as a child grows. Two side pockets and one back pocket hold the small essentials. Made for school days, outings and everyday summer wear. Machine wash warm, tumble dry low, and the adjustable waist means one size often lasts more than one season.",
    price: 2850,
    originalPrice: null,
    isNew: false,
    isFeatured: false,
    sizes: KIDS_SIZES,
    colours: [BEIGE, NAVY, OLIVE],
    stockQuantity: 5,
    rating: 4.5,
    ratingCount: 23,
    image: null,
  },
  {
    sku: "SS-KID-JK001",
    name: "Kids Hooded Jacket",
    category: "Kids",
    productType: "Kids Jacket",
    shortDescription:
      "A warm quilted hooded jacket lined in soft fleece, with easy-grip zip pulls and deep pockets.",
    description:
      "A lightly quilted outer shell lined throughout in soft fleece, so it is warm without feeling heavy or stiff. The hood is lined too, the zips have large rounded pulls small hands can manage, and there are two deep side pockets for gloves and small toys. Made for school runs, cooler evenings and family outings in winter. Machine wash cold on a gentle cycle and dry flat or tumble dry low.",
    price: 6900,
    originalPrice: 8200,
    isNew: false,
    isFeatured: true,
    sizes: KIDS_SIZES,
    colours: [NAVY, MAROON, BLACK],
    stockQuantity: 14,
    rating: 4.7,
    ratingCount: 34,
    image: null,
  },
  {
    sku: "SS-KID-JG001",
    name: "Kids Cotton Joggers",
    category: "Kids",
    productType: "Kids Joggers",
    shortDescription:
      "Soft brushed-cotton joggers with an elastic waist, a drawcord and cuffed ankles for active days.",
    description:
      "Brushed cotton inside for warmth against the skin, with a comfortable elastic waist, a flat drawcord and ribbed cuffs at the ankle so the legs stay out of the way. Two side pockets and a single back pocket are deep enough for a phone or a small wallet. Made for play, sports practice and long travel days. Machine wash warm, tumble dry low, and wash with similar colours to keep the brushed finish soft.",
    price: 3250,
    originalPrice: null,
    isNew: false,
    isFeatured: false,
    sizes: KIDS_SIZES,
    colours: [GREY, BLACK, OLIVE, BLUE],
    stockQuantity: 31,
    rating: 4.6,
    ratingCount: 29,
    image: null,
  },
  {
    sku: "SS-KID-BS001",
    name: "Baby Two-Piece Clothing Set",
    category: "Kids",
    productType: "Baby Set",
    shortDescription:
      "A gentle two-piece cotton set for babies with a snap-button bodysuit and matching soft leggings.",
    description:
      "A two-piece set in soft breathable cotton: a long-sleeve bodysuit with a reinforced snap-button gusset for easy changes, and matching leggings with a soft waistband that sits flat on a small waist. Nothing is scratchy or stiff against a baby's skin. Made for everyday wear, outings and gifting. Machine wash warm with baby-safe detergent, tumble dry low, and skip fabric softener.",
    price: 3950,
    originalPrice: 4900,
    isNew: true,
    isFeatured: false,
    sizes: BABY_SIZES,
    colours: [IVORY, SKY_BLUE, MUSTARD, PINK],
    stockQuantity: 23,
    rating: 4.8,
    ratingCount: 38,
    image: null,
  },
];

/* ============================================
   SECTION: Accessories (5)
   ============================================ */
const accessoryProducts = [
  {
    sku: "SS-ACC-BL001",
    name: "Classic Leather Belt",
    category: "Accessories",
    productType: "Belt",
    shortDescription:
      "A genuine leather dress belt with a brushed metal buckle, available in waist sizes 28 to 36.",
    description:
      "Full-grain leather that softens and burnishes with wear, on a 35mm strap with a brushed metal buckle and a keeper loop. It is thin enough to sit comfortably through belt loops on trousers and jeans, and strong enough to hold a heavy work belt in place. Available in waist sizes 28 to 36. Wipe with a dry cloth, condition occasionally with a leather cream, and keep out of prolonged rain.",
    price: 4250,
    originalPrice: 5600,
    isNew: false,
    isFeatured: true,
    sizes: [...MEN_WAIST_SIZES, "Adjustable"],
    colours: [BROWN, BLACK],
    stockQuantity: 26,
    rating: 4.6,
    ratingCount: 47,
    image: null,
  },
  {
    sku: "SS-ACC-BG001",
    name: "Canvas Everyday Tote Bag",
    category: "Accessories",
    productType: "Bag",
    shortDescription:
      "A heavyweight cotton-canvas tote with reinforced handles and an internal zip pocket.",
    description:
      "Heavyweight 12oz cotton canvas with double-stitched and reinforced handles, an internal zip pocket for a wallet and keys, and an open top wide enough for a laptop or a stack of shopping. It holds its shape when empty and folds flat when you do not need it. Made for daily shopping, college, the beach and library runs. Machine wash cold, reshape while damp and line dry.",
    price: 5400,
    originalPrice: null,
    isNew: false,
    isFeatured: false,
    sizes: FREE_SIZE,
    colours: [BEIGE, BLACK, NAVY, OLIVE],
    stockQuantity: 32,
    rating: 4.8,
    ratingCount: 59,
    image: null,
  },
  {
    sku: "SS-ACC-SC001",
    name: "Lightweight Fashion Scarf",
    category: "Accessories",
    productType: "Scarf",
    shortDescription:
      "A feather-light printed chiffon scarf that adds colour to an outfit without adding weight.",
    description:
      "A light chiffon-style scarf with a hand-rolled edge, printed in a small seasonal motif. It is light enough to wear in a warm room and long enough to loop twice around the neck or drape over the shoulders as a wrap. Works with both office tailoring and casual weekend outfits. Hand wash cold or use a laundry bag on a gentle cycle, and dry flat away from direct sun so the print stays bright.",
    price: 2650,
    originalPrice: 3400,
    isNew: false,
    isFeatured: false,
    sizes: FREE_SIZE,
    colours: [DUSTY_ROSE, MUSTARD, NAVY, GREEN],
    stockQuantity: 39,
    rating: 4.4,
    ratingCount: 31,
    image: null,
  },
  {
    sku: "SS-ACC-BG002",
    name: "Minimalist Crossbody Bag",
    category: "Accessories",
    productType: "Bag",
    shortDescription:
      "A compact crossbody bag in smooth PU with an adjustable strap and a magnetic flap closure.",
    description:
      "A compact crossbody in smooth PU with clean stitching and no visible branding, closed by a magnetic flap that opens one-handed. The strap adjusts from shoulder to cross-body length and detaches completely, so it also works as a clutch. Inside there is one slip pocket and a card slot. Made for errands, travel and evenings out. Wipe with a dry cloth, keep out of heavy rain, and store filled so the shape holds.",
    price: 7900,
    originalPrice: 9200,
    isNew: false,
    isFeatured: false,
    sizes: ADJUSTABLE,
    colours: [BLACK, WINE, CREAM],
    stockQuantity: 3,
    rating: 4.5,
    ratingCount: 22,
    image: null,
  },
  {
    sku: "SS-ACC-CP001",
    name: "Classic Baseball Cap",
    category: "Accessories",
    productType: "Cap",
    shortDescription:
      "A structured cotton-twill cap with a curved brim and an adjustable metal strap at the back.",
    description:
      "Six-panel cotton twill with a curved brim, pre-shaped so it sits well without a hard break, and a metal adjustable strap at the back so one size fits most heads. There is a brass-tone eyelet on each side for ventilation and a lightly reinforced front panel. Made for everyday wear, sport and outdoor errands. Spot clean with a damp cloth and mild soap, air dry, and do not machine wash the brim.",
    price: 3400,
    originalPrice: null,
    isNew: true,
    isFeatured: false,
    sizes: ADJUSTABLE,
    colours: [BLACK, NAVY, WHITE, OLIVE],
    stockQuantity: 24,
    rating: 4.6,
    ratingCount: 53,
    image: null,
  },
];

/* ============================================
   SECTION: Exported catalogue
   --------------------------------------------------------
   Everything below the last `====` banner is just plumbing:
   the four sections above are merged into one ordered array.
   ============================================ */
const seedProducts = [
  ...womenProducts,
  ...menProducts,
  ...kidsProducts,
  ...accessoryProducts,
];

export default seedProducts;
