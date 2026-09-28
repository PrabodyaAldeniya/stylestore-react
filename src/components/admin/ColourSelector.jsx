/* ========================================================
   COLOUR SELECTOR
   --------------------------------------------------------
   The store owner's colour picker. Deliberately code-free:
   the owner only ever sees a colour circle with a readable
   name, taps it to select or deselect, and can type a name
   for anything not on the grid.

   The hex value behind each colour is resolved by
   `lib/colours` and handed back to the editor through
   `onToggle` / `onAddCustom` — the owner never sees one.
   ======================================================== */
import { useId, useState } from "react";
import { Check, Plus, X } from "lucide-react";

import {
  COLOUR_PRESETS,
  EXTRA_PRESETS,
  colourLabel,
  colourSwatch,
  isSameColourName,
  MAX_COLOURS,
} from "../../lib/colours";
import AdminField from "./AdminField";

/* ========================================================
   1. A SINGLE COLOUR BUTTON
   --------------------------------------------------------
   Shows the colour circle plus the readable name, and
   highlights itself clearly when the colour is selected.
   ======================================================== */
function ColourButton({ colour, selected, disabled, onToggle }) {
  return (
    <button
      type="button"
      className={selected ? "adm-colour-btn is-selected" : "adm-colour-btn"}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onToggle(colour.name)}
    >
      <span
        className="adm-colour-circle"
        style={{ backgroundColor: colourSwatch(colour) }}
        aria-hidden="true"
      />
      <span className="adm-colour-btn-name">{colour.name}</span>
      {selected && <Check size={13} className="adm-colour-btn-check" aria-hidden="true" />}
    </button>
  );
}

/* ========================================================
   2. COLOUR SELECTOR
   --------------------------------------------------------
   Sections, in reading order:
     a. the everyday colour grid
     b. the longer palette, behind a disclosure
     c. a plain text field for any other colour name
     d. the colours currently saved to this product
   ======================================================== */
export default function ColourSelector({
  id,
  label = "Colours",
  hint = "Tap a colour to add it, tap it again to remove it. Customers choose from these in Quick View.",
  error,
  errorKey,
  required = true,
  colours = [],
  onToggle,
  onAddCustom,
  disabled = false,
}) {
  const [customName, setCustomName] = useState("");
  const customFieldId = `${useId()}-custom`;

  const isSelected = (name) => colours.some((colour) => isSameColourName(colour.name, name));

  // At the ceiling new colours are greyed out, but a selected one can always
  // still be switched off, otherwise there would be no way back.
  const atLimit = colours.length >= MAX_COLOURS;
  const blocked = (selected) => disabled || (atLimit && !selected);

  const renderColourButton = (colour) => {
    const selected = isSelected(colour.name);
    return (
      <ColourButton
        key={colour.name}
        colour={colour}
        selected={selected}
        disabled={blocked(selected)}
        onToggle={onToggle}
      />
    );
  };

  const submitCustomColour = () => {
    const value = customName.trim();
    if (!value) return;
    onAddCustom(value);
    setCustomName("");
  };

  return (
    <AdminField
      id={id}
      label={label}
      required={required}
      hint={hint}
      error={error}
      errorKey={errorKey}
      className="adm-field-colours"
    >
      {/* ---- a. Everyday colours ---- */}
      <div className="adm-colour-grid" role="group" aria-label="Common colours">
        {COLOUR_PRESETS.map((colour) => renderColourButton(colour))}
      </div>

      {/* ---- b. The longer palette, kept out of the way ---- */}
      <details className="adm-colour-more">
        <summary className="adm-colour-more-summary">More colours</summary>
        <div className="adm-colour-grid" role="group" aria-label="More colours">
          {EXTRA_PRESETS.map((colour) => renderColourButton(colour))}
        </div>
      </details>

      {/* ---- c. Any other colour, by name only ---- */}
      <div className="adm-colour-custom">
        <label className="adm-inline-label" htmlFor={customFieldId}>
          Custom colour name
        </label>
        <div className="adm-colour-custom-row">
          <input
            id={customFieldId}
            type="text"
            value={customName}
            maxLength={50}
            placeholder="e.g. Dusty Rose"
            autoComplete="off"
            onChange={(event) => setCustomName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitCustomColour();
              }
            }}
          />
          <button
            type="button"
            className="adm-button adm-button-ghost"
            onClick={submitCustomColour}
            disabled={disabled || atLimit || !customName.trim()}
          >
            <Plus size={15} aria-hidden /> Add colour
          </button>
        </div>
        <p className="adm-hint">
          Type a colour name and we will match it to a shade for you. No colour
          codes needed.
        </p>
      </div>

      {/* ---- d. What is actually saved to this product ---- */}
      {colours.length > 0 && (
        <ul className="adm-selected adm-colour-saved">
          {colours.map((colour) => (
            <li key={colour.name}>
              <span
                className="adm-colour-circle"
                style={{ backgroundColor: colourSwatch(colour) }}
                aria-hidden="true"
              />
              <span>{colourLabel(colour)}</span>
              <button
                type="button"
                onClick={() => onToggle(colour.name)}
                disabled={disabled}
                aria-label={`Remove colour ${colour.name}`}
              >
                <X size={13} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </AdminField>
  );
}
