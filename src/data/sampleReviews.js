/* ========================================================
   SAMPLE REVIEWS — demo content for homepage "Loved by our customers"
   --------------------------------------------------------
   These are SIX pre-written sample reviews used only on the
   homepage when there are not enough genuine approved reviews
   from the database. They are frontend-only demo content:
   
   - Never inserted into the MySQL product_reviews table
   - Never count toward product average ratings
   - Always labelled "Sample Review" (never "Verified Buyer")
   - Easy to remove before production launch by deleting this
     file and adjusting the Testimonials component
   ======================================================== */

export const SAMPLE_REVIEWS = [
  {
    id: "sample-1",
    name: "Nethmi P.",
    productName: "Floral Midi Dress",
    rating: 5,
    text: "The material feels comfortable and the dress fits beautifully. The colour looks just like the photos.",
    source: "sample",
    createdAt: new Date(Date.now() - 0 * 86400000).toISOString(),
  },
  {
    id: "sample-2",
    name: "Shenali R.",
    productName: "Classic Blouse",
    rating: 5,
    text: "Beautiful design and excellent stitching. It was packed carefully and delivered on time.",
    source: "sample",
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "sample-3",
    name: "Amaya K.",
    productName: "Linen Casual Dress",
    rating: 4,
    text: "Very comfortable for everyday wear. The size guide helped me choose the correct fit.",
    source: "sample",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "sample-4",
    name: "Kavindu S.",
    productName: "Men's Casual Shirt",
    rating: 5,
    text: "Good-quality fabric and a clean finish. The shirt fitted perfectly.",
    source: "sample",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "sample-5",
    name: "Dinuki M.",
    productName: "Elegant Evening Dress",
    rating: 5,
    text: "The dress looks elegant and the quality is better than I expected. I'm very happy with my order.",
    source: "sample",
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: "sample-6",
    name: "Sachini D.",
    productName: "Classic Tote Bag",
    rating: 4,
    text: "Spacious, stylish and easy to carry. It matches many of my outfits.",
    source: "sample",
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];