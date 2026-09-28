/* Accessible form field wrapper for the admin product form.
   Renders the label, helper text and error message, and marks
   the field so the editor can scroll to the first error. */
function AdminField({
  id,
  label,
  hint,
  error,
  required = false,
  errorKey,
  className = "",
  children,
}) {
  return (
    <div
      className={`adm-field${error ? " has-error" : ""}${className ? ` ${className}` : ""}`}
      data-error={error ? "true" : undefined}
      data-error-key={error ? errorKey || id : undefined}
    >
      <label className="adm-label" htmlFor={id}>
        {label}
        {required ? (
          <span className="adm-required" title="Required">
            required
          </span>
        ) : (
          <span className="adm-optional">optional</span>
        )}
      </label>

      {children}

      {hint && (
        <p className="adm-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="adm-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default AdminField;
