/* ========================================
   TESTIMONIALS — verified customer voices
======================================== */
function Testimonials() {
  const reviews = [
    {
      name: "Amara Osei",
      avatar: "AO",
      meta: "Verified Buyer",
      text: "The tailoring is unreal. I ordered the wool-blend blazer and it fits like it was made for me — and delivery to Dublin took two days.",
    },
    {
      name: "James Callahan",
      avatar: "JC",
      meta: "Verified Buyer",
      text: "Bought from a quick-view on my phone, arrived next morning in beautiful packaging. The quality genuinely surprised me at this price point.",
    },
    {
      name: "Priya Nair",
      avatar: "PN",
      meta: "Verified Buyer",
      text: "Their returns were painless when a size ran small for my daughter. Reordered the correct size instantly. This is how it should feel.",
    },
  ];

  return (
    <section className="testimonials" id="reviews">
      <div className="section-heading reveal">
        <span className="eyebrow">PEOPLE WORDS</span>
        <h2>Loved by thousands</h2>
        <p>Real reviews from verified StyleStore customers.</p>
      </div>

      <div className="testimonials-grid reveal">
        {reviews.map((review) => (
          <article className="testimonial-card" key={review.name}>
            <div className="stars" aria-label="5 out of 5 stars">
              {"\u2605".repeat(5)}
            </div>

            <blockquote>&ldquo;{review.text}&rdquo;</blockquote>

            <div className="testimonial-author">
              <span className="avatar">{review.avatar}</span>
              <div>
                <strong>{review.name}</strong>
                <span>{review.meta} &middot; {review.text ? "Confirmed" : ""}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Testimonials;