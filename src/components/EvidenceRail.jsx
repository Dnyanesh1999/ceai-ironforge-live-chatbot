import { useEffect, useState } from "react";

const TOOL_LABELS = {
  search_live_catalog: "Catalog search",
  inspect_live_part: "Part inspection",
  get_current_carbon_intensity: "Grid intensity",
  find_low_carbon_window: "24h forecast",
};

const TRACE_STEPS = [
  { label: "Understand", detail: "Read customer intent" },
  { label: "Route", detail: "Select the right MCP tool" },
  { label: "Retrieve", detail: "Fetch the live source" },
  { label: "Verify", detail: "Check values and anomalies" },
  { label: "Respond", detail: "Compose a grounded answer" },
];

function formatTime(value) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en-IE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function EvidenceList({ sources }) {
  if (!sources.length) {
    return (
      <div className="evidence-empty">
        <span className="evidence-empty-line" />
        <p>Source checks will appear here after your first live question.</p>
      </div>
    );
  }

  return (
    <ol className="evidence-list">
      {sources.map((source, index) => (
        <li key={`${source.tool}-${source.fetchedAt}-${index}`}>
          <span className="evidence-node" aria-hidden="true" />
          <div>
            <span className="evidence-time">{formatTime(source.fetchedAt)}</span>
            <h3>{TOOL_LABELS[source.tool] ?? source.tool}</h3>
            <p>
              {source.rowCount
                ? `${source.rowCount} live rows checked`
                : source.scope || "Public API response checked"}
            </p>
            {source.sourceUrl && (
              <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                Open source <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ActivityTrace({ activity }) {
  const [activeStep, setActiveStep] = useState(0);
  const isRunning = activity.status === "running";

  useEffect(() => {
    if (!isRunning) {
      setActiveStep(activity.status === "complete" ? TRACE_STEPS.length - 1 : 0);
      return undefined;
    }

    setActiveStep(0);
    const interval = window.setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, TRACE_STEPS.length - 1));
    }, 1050);

    return () => window.clearInterval(interval);
  }, [activity.status, isRunning]);

  const statusLabel = {
    idle: "Ready for a live check",
    running: "Grounding your answer",
    complete: "Answer verified",
    error: "Live check stopped safely",
  }[activity.status];

  return (
    <section className={`activity-trace trace-${activity.status}`} aria-live="polite">
      <div className="trace-status">
        <span className="trace-orbit" aria-hidden="true">
          <span />
        </span>
        <div>
          <span>REQUEST PIPELINE</span>
          <strong>{statusLabel}</strong>
        </div>
      </div>

      <ol className="trace-steps">
        {TRACE_STEPS.map((step, index) => {
          const complete =
            activity.status === "complete" ||
            (isRunning && index < activeStep);
          const active = isRunning && index === activeStep;
          return (
            <li
              className={`${complete ? "complete" : ""} ${active ? "active" : ""}`}
              key={step.label}
            >
              <span className="trace-step-mark">{complete ? "✓" : String(index + 1)}</span>
              <span>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="trace-footer">
        <span>{isRunning ? "LIVE REQUEST" : "NO CACHED BUSINESS DATA"}</span>
        <span className="trace-bars" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
    </section>
  );
}

export default function EvidenceRail({ activity, sources }) {
  return (
    <>
      <aside className="evidence-rail" aria-label="Live source evidence">
        <div className="rail-heading">
          <span>LIVE EVIDENCE</span>
          <span className="rail-count">{String(sources.length).padStart(2, "0")}</span>
        </div>
        <ActivityTrace activity={activity} />
        <EvidenceList sources={sources} />
        <div className="source-policy">
          <span>NO STORED CATALOG</span>
          <p>Business data is requested again for every relevant question.</p>
        </div>
      </aside>

      <details className="mobile-evidence">
        <summary>
          <span>Live evidence</span>
          <span>{String(sources.length).padStart(2, "0")}</span>
        </summary>
        <ActivityTrace activity={activity} />
        <EvidenceList sources={sources} />
      </details>
    </>
  );
}
