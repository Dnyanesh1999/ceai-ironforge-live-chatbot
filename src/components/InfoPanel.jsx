import { useEffect, useRef } from "react";

const CONTENT = {
  sources: {
    eyebrow: "SOURCE REGISTER",
    title: "What ForgeLine checks",
    body: (
      <>
        <div className="panel-source">
          <span>01</span>
          <div>
            <h3>IronForge live catalog</h3>
            <p>
              A lecturer-provided Google Sheet is fetched again for every relevant catalog
              question. Rows are not copied into the application.
            </p>
          </div>
        </div>
        <div className="panel-source">
          <span>02</span>
          <div>
            <h3>UK Carbon Intensity API</h3>
            <p>
              Public Great Britain grid data provides current intensity and a 24-hour
              scheduling forecast. It is not a product footprint.
            </p>
          </div>
        </div>
      </>
    ),
  },
  method: {
    eyebrow: "GROUNDING METHOD",
    title: "Fresh facts, visible judgement",
    body: (
      <>
        <p className="panel-lead">
          The language model decides which tool is needed. The tool—not the model—retrieves
          the business fact.
        </p>
        <ol className="method-list">
          <li><span>01</span><p>Classify the question and select an MCP tool.</p></li>
          <li><span>02</span><p>Fetch the live source with caching disabled.</p></li>
          <li><span>03</span><p>Check for extreme prices, negative lead times, and availability conflicts.</p></li>
          <li><span>04</span><p>Answer with the fetch time, source evidence, and human-verification caveats.</p></li>
        </ol>
      </>
    ),
  },
};

export default function InfoPanel({ type, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!type) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [type]);

  if (!type) return null;
  const content = CONTENT[type];

  return (
    <div className="panel-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="info-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          className="panel-close"
          type="button"
          onClick={onClose}
          aria-label="Close panel"
        >
          <span />
          <span />
        </button>
        <span className="panel-eyebrow">{content.eyebrow}</span>
        <h2 id="panel-title">{content.title}</h2>
        <div className="panel-body">{content.body}</div>
      </section>
    </div>
  );
}
