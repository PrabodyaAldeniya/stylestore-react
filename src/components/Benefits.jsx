/* ========================================
   BENEFITS — shipping, payments, returns, help
======================================== */
import { CreditCard, RotateCcw, ShieldCheck, Truck } from "lucide-react";

function Benefits() {
  const items = [
    { icon: Truck, title: "Free Islandwide Delivery", text: "On all orders over £135. Fast, tracked, doorstep." },
    { icon: CreditCard, title: "Secure Payments", text: "Cards, PayPal & Apple Pay. Encrypted end to end." },
    { icon: RotateCcw, title: "Easy 7-Day Returns", text: "Changed your mind? Free returns within 7 days." },
    { icon: ShieldCheck, title: "Customer Support", text: "Real humans, 7 days a week. We get back fast." },
  ];

  return (
    <section className="benefits reveal" aria-label="Why shop with us">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.title} className="benefit-card">
            <span className="benefit-icon"><Icon size={26} strokeWidth={1.7} /></span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        );
      })}
    </section>
  );
}

export default Benefits;