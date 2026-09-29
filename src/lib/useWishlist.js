/* ========================================================
   WISHLIST HOOK
   --------------------------------------------------------
   The wishlist is stored in the browser only (localStorage), so
   this small hook is the one place that knows how to read, write
   and update it.

   It is shared by the home page and the /products catalogue page so
   a heart tapped in one place is still there in the other.
   ======================================================== */
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "styleStoreWishlist";

/** Read the saved ids once, safely (private browsing can throw). */
function readStoredWishlist() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useWishlist() {
  const [wishlist, setWishlist] = useState(readStoredWishlist);

  // Keep the browser copy in step with the state.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  const has = useCallback(
    (id) => wishlist.some((item) => String(item) === String(id)),
    [wishlist]
  );

  const add = useCallback((id) => {
    setWishlist((current) =>
      current.some((item) => String(item) === String(id)) ? current : [...current, id]
    );
  }, []);

  const remove = useCallback((id) => {
    setWishlist((current) => current.filter((item) => String(item) !== String(id)));
  }, []);

  // Returns true when the item was added, false when it was removed —
  // so the caller can show the right toast message.
  const toggle = useCallback(
    (id) => {
      const isSaved = wishlist.some((item) => String(item) === String(id));
      setWishlist((current) =>
        current.some((item) => String(item) === String(id))
          ? current.filter((item) => String(item) !== String(id))
          : [...current, id]
      );
      return !isSaved;
    },
    [wishlist]
  );

  return { wishlist, has, add, remove, toggle };
}

export default useWishlist;
