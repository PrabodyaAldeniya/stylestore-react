/* ========================================================
   SIZE TYPE SELECTOR
   --------------------------------------------------------
   The store owner's "Size Type" field. Exactly one of three
   modes can be active:

     Standard Sizes   the customer picks from a size list
     Free Size        one universal size — we save "Free Size"
     Not Applicable   no size at all, so no size selector

   The component owns no state: the chosen mode and the size
   list live in AdminProductEditor, which passes the mode in and
   gets a change back through `onChange`.

   It also asks for confirmation before a switch would throw
   away sizes the owner already saved, so a mis-click can never
   silently delete a real size list.
   ======================================================== */
import { Check } from "lucide-react";

import AdminField from "./AdminField";
import {
  FREE_SIZE_NOTICE,
  NOT_APPLICABLE_NOTICE,
  SIZE_MODE_FREE_SIZE,
  SIZE_MODE_NOT_APPLICABLE,
  SIZE_MODE_OPTIONS,
  SIZE_MODE_STANDARD,
} from "../../lib/sizeModes";

function labelForMode(mode) {
  return SIZE_MODE_OPTIONS.find((option) => option.value === mode)?.label || "this size type";
}

/* ========================================================
   1. ONE MODE, RENDERED AS A RADIO BUTTON
   --------------------------------------------------------
   A real radio input is used so keyboard users get arrow-key
   navigation for free and the form reads correctly to a screen
   reader; the label wraps the input to give it a large,
   easy-to-tap click target.
   ======================================================== */
function SizeTypeOption({ id, name, option, checked, disabled, onSelect }) {
  return (
    <label
      className={checked ? "adm-size-mode is-active" : "adm-size-mode"}
      data-mode={option.value}
    >
      <input
        type="radio"
        id={id}
        name={name}
        value={option.value}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(option.value)}
      />
      <span className="adm-size-mode-body">
        <span className="adm-size-mode-label">
          {option.label}
          {checked && <Check size={14} aria-hidden="true" />}
        </span>
        <span className="adm-size-mode-hint">{option.hint}</span>
      </span>
    </label>
  );
}

/* ========================================================
   2. SIZE TYPE SELECTOR
   --------------------------------------------------------
   Only a mode that empties the size list needs a confirmation.
   Switching TO Standard Sizes is the safe direction: nothing is
   lost, because the sizes stay in the form and are merely
   hidden until the owner switches back, so it must not
   interrupt them.
   ======================================================== */
export default function SizeTypeSelector({
  id = "adm-size-mode",
  value = SIZE_MODE_STANDARD,
  sizeCount = 0,
  onChange,
  disabled = false,
  error = "",
  errorKey = "sizes",
}) {
  const selectMode = (next) => {
    if (next === value) return;

    if (next !== SIZE_MODE_STANDARD && sizeCount > 0) {
      const confirmed = window.confirm(
        `Switching to ${labelForMode(next)} removes the ${sizeCount} size${
          sizeCount === 1 ? "" : "s"
        } you already saved. Continue?`
      );
      if (!confirmed) return;
    }
    onChange(next);
  };

  return (
    <AdminField
      id={id}
      label="Size Type"
      required
      hint="This decides whether customers choose a size, get one Free Size, or never see a size selector."
      error={error}
      errorKey={errorKey}
      className="adm-field-size-mode"
    >
      <div className="adm-size-mode-list" role="radiogroup" aria-label="Size Type">
        {SIZE_MODE_OPTIONS.map((option, index) => (
          <SizeTypeOption
            key={option.value}
            /* AdminField's label points at the first radio, which is what a
               screen reader needs in order to announce the group correctly. */
            id={index === 0 ? id : undefined}
            name={id}
            option={option}
            checked={option.value === value}
            disabled={disabled}
            onSelect={selectMode}
          />
        ))}
      </div>

      {/* The two messages the owner needs to see, spelled out exactly. */}
      {value === SIZE_MODE_FREE_SIZE && (
        <p className="adm-size-mode-notice" role="status">
          {FREE_SIZE_NOTICE}
        </p>
      )}
      {value === SIZE_MODE_NOT_APPLICABLE && (
        <p className="adm-size-mode-notice" role="status">
          {NOT_APPLICABLE_NOTICE}
        </p>
      )}
    </AdminField>
  );
}
