/* One clearly titled block of the admin product form.
   `step` drives the numbered badge shown beside the heading. */
function FormSection({ step, title, description, icon, children, className = "" }) {
  return (
    <section
      className={`adm-section${className ? ` ${className}` : ""}`}
      aria-labelledby={`adm-section-${step}`}
    >
      <header className="adm-section-head">
        {icon ? <span className="adm-section-icon">{icon}</span> : null}
        <div>
          <h3 id={`adm-section-${step}`}>
            <span className="adm-section-step">{step}</span>
            {title}
          </h3>
          {description && <p className="adm-section-desc">{description}</p>}
        </div>
      </header>
      <div className="adm-section-body">{children}</div>
    </section>
  );
}

export default FormSection;
