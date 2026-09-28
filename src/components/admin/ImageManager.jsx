/* ========================================================
   PRODUCT IMAGE MANAGER — admin form section 3
   --------------------------------------------------------
   Handles staged uploads: newly picked files are previewed
   locally and only sent when the product is saved, while
   existing images can be marked for removal or promoted to
   "main" and are applied in the same server transaction.
   ======================================================== */
import { useRef } from "react";
import { ImagePlus, Star, Trash2, Undo2, Upload } from "lucide-react";

import {
  formatBytes,
  formatMaxBytes,
  IMAGE_ACCEPT,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_COUNT,
  validateImageFile,
} from "../../lib/adminCatalog";

function ImageManager({
  existingImages,
  newImages,
  removedImageIds,
  primary,
  busy,
  onAddFiles,
  onRemoveNew,
  onRemoveExisting,
  onRestoreExisting,
  onSetPrimaryExisting,
  onSetPrimaryNew,
  onClearAll,
}) {
  const inputRef = useRef(null);

  const keptExisting = existingImages.filter((image) => !removedImageIds.includes(image.id));
  const totalCount = keptExisting.length + newImages.length;

  const isPrimaryExisting = (image) =>
    primary?.kind === "existing"
      ? primary.id === image.id
      : primary?.kind !== "new" && image.isPrimary;

  const isPrimaryNew = (image) => primary?.kind === "new" && primary.key === image.key;

  return (
    <div className="adm-images">
      <div className="adm-upload">
        <input
          ref={inputRef}
          id="adm-product-images"
          className="adm-file-input"
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          disabled={busy || totalCount >= MAX_IMAGE_COUNT}
          onChange={(event) => {
            const picked = Array.from(event.target.files || []);
            event.target.value = "";
            if (picked.length) onAddFiles(picked);
          }}
        />
        <label className="adm-upload-drop" htmlFor="adm-product-images">
          <Upload size={20} aria-hidden />
          <span className="adm-upload-title">
            {totalCount >= MAX_IMAGE_COUNT
              ? `Maximum of ${MAX_IMAGE_COUNT} photos reached`
              : "Choose photos from your computer"}
          </span>
          <span className="adm-upload-hint">
            JPG, PNG or WebP · up to {MAX_IMAGE_COUNT} photos · {formatMaxBytes(MAX_IMAGE_BYTES)} each
          </span>
        </label>
      </div>

      <p className="adm-counter">
        <strong>{totalCount}</strong> of {MAX_IMAGE_COUNT} photo
        {MAX_IMAGE_COUNT === 1 ? "" : "s"} selected
        {newImages.length > 0 && ` · ${newImages.length} waiting to upload`}
      </p>

      {totalCount === 0 && (
        <p className="adm-empty-note">
          <ImagePlus size={16} aria-hidden />
          No photo selected yet. A clean placeholder will show on the website until you upload
          a real product photo.
        </p>
      )}

      {keptExisting.length > 0 && (
        <div className="adm-image-block">
          <h4 className="adm-subhead">Already saved</h4>
          <ul className="adm-image-grid">
            {keptExisting.map((image) => (
              <li className="adm-image-tile" key={image.id}>
                <img src={image.url} alt={image.altText || "Product photo"} loading="lazy" />
                {isPrimaryExisting(image) && (
                  <span className="adm-image-tag adm-image-tag-main">
                    <Star size={12} aria-hidden /> Main
                  </span>
                )}
                <div className="adm-image-tools">
                  <button
                    type="button"
                    className={isPrimaryExisting(image) ? "adm-chip is-active" : "adm-chip"}
                    onClick={() => onSetPrimaryExisting(image.id)}
                    disabled={busy || isPrimaryExisting(image)}
                  >
                    <Star size={13} aria-hidden /> Make main
                  </button>
                  <button
                    type="button"
                    className="adm-chip adm-chip-danger"
                    onClick={() => onRemoveExisting(image.id)}
                    disabled={busy}
                    aria-label={`Remove saved photo ${image.id}`}
                  >
                    <Trash2 size={13} aria-hidden /> Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {newImages.length > 0 && (
        <div className="adm-image-block">
          <h4 className="adm-subhead">Ready to upload</h4>
          <ul className="adm-image-grid">
            {newImages.map((image) => (
              <li className="adm-image-tile is-new" key={image.key}>
                <img src={image.url} alt={image.file.name} />
                {isPrimaryNew(image) && (
                  <span className="adm-image-tag adm-image-tag-main">
                    <Star size={12} aria-hidden /> Main
                  </span>
                )}
                <span className="adm-image-size">{formatBytes(image.file.size)}</span>
                <div className="adm-image-tools">
                  <button
                    type="button"
                    className={isPrimaryNew(image) ? "adm-chip is-active" : "adm-chip"}
                    onClick={() => onSetPrimaryNew(image.key)}
                    disabled={busy || isPrimaryNew(image)}
                  >
                    <Star size={13} aria-hidden /> Make main
                  </button>
                  <button
                    type="button"
                    className="adm-chip adm-chip-danger"
                    onClick={() => onRemoveNew(image.key)}
                    disabled={busy}
                    aria-label={`Remove ${image.file.name}`}
                  >
                    <Trash2 size={13} aria-hidden /> Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {removedImageIds.length > 0 && (
        <div className="adm-image-block">
          <h4 className="adm-subhead">Marked for removal (undo until you save)</h4>
          <ul className="adm-image-removed">
            {removedImageIds.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  className="adm-chip"
                  onClick={() => onRestoreExisting(id)}
                  disabled={busy}
                >
                  <Undo2 size={13} aria-hidden /> Keep this photo
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="adm-link-button" onClick={onClearAll} disabled={busy}>
            Undo all photo changes
          </button>
        </div>
      )}

      {newImages.length > 0 && (
        <p className="adm-hint adm-hint-inline">
          {newImages.some((image) => validateImageFile(image.file)) ? (
            <span className="adm-error">
              {newImages
                .map((image) => validateImageFile(image.file))
                .filter(Boolean)
                .join(" ")}
            </span>
          ) : (
            "Photos are uploaded to your server only when you save the product."
          )}
        </p>
      )}
    </div>
  );
}

export default ImageManager;
