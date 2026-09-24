// ========================================
// TRUSTED BACKEND PRODUCT CATALOG
// --------------------------------------------------------
// Prices here are authoritative for order total calculation.
// The server NEVER trusts a price, size list or discount
// amount sent by the browser — it only reads ids + quantities
// and looks the real price up from this table.
//
// Keep this in sync with src/data/products.js whenever a new
// product or price change is introduced.
// ========================================

const products = [
  { id: 1, name: "Elegant Summer Dress", price: 7800 },
  { id: 2, name: "Silk Blouse in Ivory", price: 8600 },
  { id: 3, name: "Tailored Beige Trench", price: 19500 },
  { id: 4, name: "Boxy Cotton Crew Tee", price: 2900 },
  { id: 5, name: "Washed Denim Jacket", price: 12000 },
  { id: 6, name: "Oversized Knit Hoodie", price: 7900 },
  { id: 7, name: "Kids Rainbow Graphic Tee", price: 2900 },
  { id: 8, name: "Slim Tapered Chinos", price: 6800 },
  { id: 9, name: "Fitted Ribbed Tank", price: 2400 },
  { id: 10, name: "Pleated Wrap Dress", price: 5600 },
  { id: 11, name: "Relaxed Wide-Leg Trousers", price: 7200 },
  { id: 12, name: "Knitted Cardigan in Camel", price: 9800 },
  { id: 13, name: "Cozy Fleece Hoodie", price: 5200 },
  { id: 14, name: "Kids Hoodie in Butterscotch", price: 4600 },
  { id: 15, name: "Linen Overshirt", price: 9900 },
];

const byId = new Map(products.map((product) => [product.id, product]));

export function getProduct(id) {
  return byId.get(Number(id)) || null;
}

export default products;