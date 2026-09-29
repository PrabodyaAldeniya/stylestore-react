/* ========================================================
   REVIEW PUBLISHED — tiny cross-section event bus
   --------------------------------------------------------
   When a customer's verified review is auto-published, two
   different parts of the page must update without a full-page
   refresh:

     · the "Loved by our customers" section (all reviews)
     · the product's own reviews list inside the Quick View

   Those two components do not share a parent that can pass a
   callback down, so this module uses a plain browser CustomEvent
   as the messenger. It has no dependencies and no global state:

     notifyReviewPublished(...)  — called once after a successful
                                   submission (from the form)
     onReviewPublished(fn)       — subscribed to by each section;
                                   it returns an unsubscribe
                                   function for useEffect cleanup

   The event detail carries only the public productId, so a
   product section can choose whether the new review belongs to
   it. No private data ever travels through here.
   ======================================================== */

// One well-named event avoids typos across files.
const EVENT_NAME = "stylestore:review-published";

/** Tell every mounted review section that a review was just published. */
export function notifyReviewPublished(detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
}

/**
 * Run `handler` whenever a review is published. Returns an unsubscribe
 * function so a React effect can clean the listener up.
 */
export function onReviewPublished(handler) {
  if (typeof window === "undefined" || typeof handler !== "function") {
    return () => {};
  }
  const listener = (event) => handler(event.detail || {});
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
