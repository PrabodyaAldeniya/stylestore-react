/* ========================================================
   ADMIN REVIEWS
   --------------------------------------------------------
   The moderation screen for the customer review system.

   Verified reviews are published automatically, so this page is
   for moderation after the fact. The owner can:
     · switch between Approved / Rejected / Pending / All
     · search by customer name, email, order number or product
     · read the full review text before deciding
     · HIDE a published review, REJECT a pending one,
       RESTORE a hidden one, or DELETE it safely
     · see at a glance whether the purchase was actually
       verified against the orders table

   Only this screen ever shows a customer's email address and
   order number. Every call goes through the protected admin API,
   and an expired session redirects to the login page.

   Hiding, rejecting, restoring or deleting also re-syncs the
   product's displayed average rating on the server, so the shop
   numbers follow the decisions made here.
   ======================================================== */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArchiveRestore,
  ArrowLeft,
  BadgeCheck,
  Ban,
  Check,
  Eye,
  EyeOff,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteAdminReview,
  getAdminReviewCounts,
  listAdminReviews,
  logoutAdmin,
  updateAdminReviewStatus,
} from "../lib/adminApi";
import "../admin.css";

// Published first, because verified reviews are published automatically.
const STATUS_TABS = [
  { value: "approved", label: "Published" },
  { value: "rejected", label: "Hidden" },
  { value: "pending", label: "Pending" },
  { value: "all", label: "All" },
];

function formatDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StarRow({ rating }) {
  const value = Number(rating) || 0;
  return (
    <span className="adm-review-stars" title={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          aria-hidden
          className={star <= value ? "is-on" : ""}
          fill={star <= value ? "currentColor" : "none"}
        />
      ))}
      <span className="adm-sr-only">{value} out of 5 stars</span>
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`adm-status adm-review-status-${status}`}>{status}</span>
  );
}

export default function AdminReviews() {
  const navigate = useNavigate();

  // Published reviews are the default view because reviews go live
  // automatically. Pending is still available for anything unusual.
  const [status, setStatus] = useState("approved");
  const [search, setSearch] = useState("");
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [listStatus, setListStatus] = useState("loading");
  const [listError, setListError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    setListStatus("loading");
    setListError("");
    try {
      const result = await listAdminReviews({
        pageSize: 100,
        status: status === "all" ? "" : status,
        search,
      });
      setReviews(result.reviews || []);
      setTotal(Number(result.total || 0));
      if (result.counts) setCounts(result.counts);
      setListStatus("success");
    } catch (error) {
      if (error.code === "AUTH_REQUIRED") {
        navigate("/admin/login", { replace: true });
        return;
      }
      setListError(error.message || "Reviews could not be loaded.");
      setListStatus("error");
    }
  }, [status, search, navigate]);

  // Debounced so typing in the search box does not spam the API.
  useEffect(() => {
    const timer = window.setTimeout(load, 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  // The pending badge is shown in this page header and on the Products page.
  useEffect(() => {
    let cancelled = false;
    getAdminReviewCounts()
      .then((result) => {
        if (!cancelled) {
          setCounts({
            pending: Number(result.pending || 0),
            approved: Number(result.approved || 0),
            rejected: Number(result.rejected || 0),
          });
        }
      })
      .catch(() => {
        if (!cancelled) return;
      });
    return () => {
      cancelled = true;
    };
  }, [listStatus]);

  const flash = (type, message) => setNotice({ type, message });

  const runAction = async (review, action, successMessage) => {
    setBusyId(review.id);
    setNotice(null);
    try {
      await action();
      await load();
      if (successMessage) flash("success", successMessage);
    } catch (error) {
      if (error.code === "AUTH_REQUIRED") {
        navigate("/admin/login", { replace: true });
        return;
      }
      flash("error", error.message || "That action could not be completed.");
    } finally {
      setBusyId(null);
    }
  };

  // Approve / restore. Both move the review to 'approved' — the only status
  // the public site reads. The wording just reflects where it came from.
  const approve = (review) =>
    runAction(
      review,
      () => updateAdminReviewStatus(review.id, "approved"),
      review.status === "rejected"
        ? `Restored. "${review.customerName}"'s review is live again.`
        : `Published. "${review.customerName}"'s review is now live on the website.`
    );

  // Reject (pending) / hide (already published). Both set 'rejected', which is
  // never returned by a public endpoint.
  const reject = (review) =>
    runAction(
      review,
      () => updateAdminReviewStatus(review.id, "rejected"),
      review.status === "approved"
        ? `Hidden. "${review.customerName}"'s review no longer appears on the website.`
        : `Rejected. "${review.customerName}"'s review stays hidden from the website.`
    );

  const remove = (review) => {
    const ok = window.confirm(
      `Delete this review permanently?\n\n"${review.text.slice(0, 90)}${review.text.length > 90 ? "…" : ""}"\n\nIt will be removed from ${review.productName || "the product"} and stop counting towards its rating. This cannot be undone.`
    );
    if (!ok) return;
    runAction(review, () => deleteAdminReview(review.id), "Review deleted for good.");
  };

  const signOut = async () => {
    await logoutAdmin().catch(() => {});
    navigate("/admin/login", { replace: true });
  };

  const filtersActive = search !== "" || status !== "approved";
  const pendingTotal = counts.pending;

  const heading = useMemo(
    () => STATUS_TABS.find((tab) => tab.value === status)?.label || "Reviews",
    [status]
  );

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <button type="button" className="adm-back" onClick={() => navigate("/admin/products")}>
            <ArrowLeft size={15} aria-hidden /> All products
          </button>
          <span className="eyebrow">STYLESTORE ADMIN</span>
          <h1>
            Customer Reviews{" "}
            {/* Visible pending count, so nothing waits unnoticed. */}
            {pendingTotal > 0 && (
              <span className="adm-trash-count adm-review-badge" aria-label={`${pendingTotal} pending`}>
                {pendingTotal}
              </span>
            )}
          </h1>
          <p>
            Verified reviews are <strong>published automatically</strong> as soon as the server
            confirms the order number, checkout email, purchased product, duplicate rule, rating
            and review text. Use the actions here to hide, reject, restore or delete a review if
            needed. A review is only marked Verified Buyer when its order number and checkout
            email matched a real order.
          </p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="adm-button adm-button-ghost" onClick={load}>
            <RefreshCw size={15} aria-hidden /> Refresh
          </button>
          <button type="button" className="admin-logout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      {notice && (
        <div
          className={`adm-notice adm-notice-${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
        >
          {notice.type === "success" ? (
            <Check size={16} aria-hidden />
          ) : (
            <Info size={16} aria-hidden />
          )}
          <span>{notice.message}</span>
          <button
            type="button"
            className="adm-notice-close"
            onClick={() => setNotice(null)}
            aria-label="Dismiss message"
          >
            <X size={15} aria-hidden />
          </button>
        </div>
      )}

      <section className="admin-list-panel" aria-label="Review moderation">
        {/* ---- Status tabs with live counts ---- */}
        <div className="adm-review-tabs" role="tablist" aria-label="Review status">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? counts.pending + counts.approved + counts.rejected
                : counts[tab.value];
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={status === tab.value}
                className={status === tab.value ? "adm-review-tab is-active" : "adm-review-tab"}
                onClick={() => setStatus(tab.value)}
              >
                {tab.label}
                <span className="adm-review-tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="adm-filters">
          <div className="adm-filter adm-filter-search">
            <label className="adm-inline-label" htmlFor="adm-review-search">
              Search
            </label>
            <input
              id="adm-review-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Customer, order number or product"
            />
          </div>

          <button type="button" className="adm-button adm-button-ghost" onClick={load}>
            <Search size={15} aria-hidden /> Search
          </button>
        </div>

        <div className="adm-list-meta">
          <p aria-live="polite">
            <strong>{reviews.length}</strong> of {total} review{total === 1 ? "" : "s"}
            {filtersActive ? " matching your filters" : ""}
          </p>
          {filtersActive && (
            <button
              type="button"
              className="adm-link-button"
              onClick={() => {
                setSearch("");
                setStatus("approved");
              }}
            >
              Clear all filters
            </button>
          )}
        </div>

        {listStatus === "loading" && reviews.length > 0 && (
          <p className="adm-refreshing" role="status">
            <Loader2 className="spin" size={14} aria-hidden /> Refreshing reviews…
          </p>
        )}

        {/* ---- Loading / error / empty / list ---- */}
        {listStatus === "loading" && reviews.length === 0 && (
          <div className="adm-state" role="status">
            <Loader2 className="spin" size={20} aria-hidden /> Loading reviews…
          </div>
        )}

        {listStatus === "error" && (
          <div className="adm-state adm-state-error" role="alert">
            <p>{listError}</p>
            <button type="button" className="adm-button adm-button-ghost" onClick={load}>
              <RefreshCw size={15} aria-hidden /> Try again
            </button>
          </div>
        )}

        {listStatus === "success" && reviews.length === 0 && (
          <div className="adm-state">
            <p>
              {filtersActive
                ? "No reviews match these filters."
                : status === "pending"
                  ? `No reviews are waiting for approval. ${counts.approved} review${counts.approved === 1 ? " is" : "s are"} live on the website.`
                  : `No ${heading.toLowerCase()} reviews yet.`}
            </p>
          </div>
        )}

        {listStatus === "success" && reviews.length > 0 && (
          <ul className="adm-review-list">
            {reviews.map((review) => {
              const busy = busyId === review.id;
              return (
                <li className={`adm-review-row is-${review.status}`} key={review.id}>
                  <div className="adm-review-main">
                    <div className="adm-review-head">
                      <StarRow rating={review.rating} />
                      <StatusBadge status={review.status} />
                      {review.verifiedBuyer ? (
                        <span className="adm-review-verified">
                          <BadgeCheck size={13} aria-hidden /> Verified Buyer
                        </span>
                      ) : (
                        <span className="adm-review-unverified">Purchase not verified</span>
                      )}
                      <time className="adm-review-date" dateTime={String(review.createdAt)}>
                        {formatDate(review.createdAt)}
                      </time>
                    </div>

                    <h3 className="adm-review-product">{review.productName || "Unknown product"}</h3>

                    <blockquote className="adm-review-text">
                      {review.title && <strong>{review.title}</strong>}
                      {review.title ? " — " : ""}
                      {review.text}
                    </blockquote>

                    <p className="adm-review-customer">
                      <strong>{review.customerName}</strong>
                      <span className="adm-review-email">{review.customerEmail}</span>
                      <code className="adm-sku">{review.orderNumber}</code>
                    </p>
                  </div>

                  <div className="adm-review-actions">
                    {/* Published -> Hide.  Pending -> Publish or Reject.
                        Hidden -> Restore.  Delete is always available. */}
                    {review.status === "approved" ? (
                      <button
                        type="button"
                        className="adm-button adm-button-secondary"
                        onClick={() => reject(review)}
                        disabled={busy}
                      >
                        <EyeOff size={15} aria-hidden /> Hide
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="adm-button adm-button-primary"
                        onClick={() => approve(review)}
                        disabled={busy}
                      >
                        <ArchiveRestore size={15} aria-hidden />{" "}
                        {review.status === "rejected" ? "Restore" : "Publish"}
                      </button>
                    )}
                    {review.status === "pending" && (
                      <button
                        type="button"
                        className="adm-button adm-button-secondary"
                        onClick={() => reject(review)}
                        disabled={busy}
                      >
                        <Ban size={15} aria-hidden /> Reject
                      </button>
                    )}
                    <button
                      type="button"
                      className="adm-button adm-button-ghost"
                      onClick={() => setPreview(review)}
                      disabled={busy}
                    >
                      <Eye size={15} aria-hidden /> Preview
                    </button>
                    <button
                      type="button"
                      className="adm-button adm-button-danger-solid"
                      onClick={() => remove(review)}
                      disabled={busy}
                    >
                      <Trash2 size={15} aria-hidden /> Delete
                    </button>
                  </div>

                  {busy && (
                    <span className="adm-cell-busy adm-review-busy" aria-hidden>
                      <Loader2 className="spin" size={16} />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="adm-price-hint">
          <BadgeCheck size={13} aria-hidden /> Verified reviews are published automatically. Use{" "}
          <strong>Hide</strong> to remove a published review, <strong>Reject</strong> for a pending
          one, <strong>Restore</strong> to publish it again, or <strong>Delete</strong> to remove it
          for good. Any of these updates that product&rsquo;s average rating. The customer&rsquo;s
          email address is only ever shown here — never on the public pages.
        </p>
      </section>

      {preview && (
        <div
          className="modal-overlay"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Review details"
        >
          <div className="adm-review-preview" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="adm-icon-button adm-review-preview-close"
              onClick={() => setPreview(null)}
              aria-label="Close review details"
            >
              <X size={18} />
            </button>

            <span className="eyebrow">FULL REVIEW</span>
            <div className="adm-review-head">
              <StarRow rating={preview.rating} />
              <StatusBadge status={preview.status} />
              {preview.verifiedBuyer && (
                <span className="adm-review-verified">
                  <BadgeCheck size={13} aria-hidden /> Verified Buyer
                </span>
              )}
            </div>

            <h2>{preview.productName || "Unknown product"}</h2>
            {preview.title && <h3 className="adm-review-preview-title">{preview.title}</h3>}
            <blockquote className="adm-review-preview-text">{preview.text}</blockquote>

            <dl className="adm-review-preview-meta">
              <div>
                <dt>Customer</dt>
                <dd>{preview.customerName}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{preview.customerEmail}</dd>
              </div>
              <div>
                <dt>Order number</dt>
                <dd>
                  <code className="adm-sku">{preview.orderNumber}</code>
                </dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{formatDate(preview.createdAt)}</dd>
              </div>
              <div>
                <dt>Last changed</dt>
                <dd>{formatDate(preview.updatedAt)}</dd>
              </div>
              <div>
                <dt>Purchase</dt>
                <dd>{preview.verifiedBuyer ? "Verified against a real order" : "Not verified"}</dd>
              </div>
            </dl>

            <div className="adm-danger-actions">
              <button type="button" className="adm-button adm-button-ghost" onClick={() => setPreview(null)}>
                Close
              </button>
              {preview.status === "approved" ? (
                <button
                  type="button"
                  className="adm-button adm-button-secondary"
                  onClick={() => {
                    const target = preview;
                    setPreview(null);
                    reject(target);
                  }}
                >
                  <EyeOff size={15} aria-hidden /> Hide
                </button>
              ) : (
                <button
                  type="button"
                  className="adm-button adm-button-primary"
                  onClick={() => {
                    const target = preview;
                    setPreview(null);
                    approve(target);
                  }}
                >
                  <ArchiveRestore size={15} aria-hidden />{" "}
                  {preview.status === "rejected" ? "Restore" : "Publish"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
