import BrandMark from "./BrandMark";
import { useState } from "react";

export default function Header({ activePanel, onOpenPanel }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const openPanel = (panel) => {
    setMenuOpen(false);
    onOpenPanel(panel);
  };

  return (
    <header className="site-header">
      <a className="brand" href="#assistant" aria-label="ForgeLine home">
        <BrandMark />
        <span className="brand-copy">
          <strong>IRONFORGE</strong>
          <span>COMPONENTS</span>
        </span>
      </a>

      <nav aria-label="Primary navigation">
        <a className="nav-link active" href="#assistant">
          Assistant
        </a>
        <button
          className={`nav-link ${activePanel === "sources" ? "selected" : ""}`}
          type="button"
          aria-pressed={activePanel === "sources"}
          onClick={() => onOpenPanel("sources")}
        >
          Sources
        </button>
        <button
          className={`nav-link ${activePanel === "method" ? "selected" : ""}`}
          type="button"
          aria-pressed={activePanel === "method"}
          onClick={() => onOpenPanel("method")}
        >
          Method
        </button>
      </nav>

      <div className="system-status" aria-label="System status: live">
        <span className="live-dot" aria-hidden="true" />
        <span>LIVE SYSTEM</span>
      </div>

      <button
        className={`menu-toggle ${menuOpen ? "open" : ""}`}
        type="button"
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <span />
        <span />
      </button>

      {menuOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <a href="#assistant" onClick={() => setMenuOpen(false)}>
            <span>01</span>
            Assistant
          </a>
          <button type="button" onClick={() => openPanel("sources")}>
            <span>02</span>
            Sources
          </button>
          <button type="button" onClick={() => openPanel("method")}>
            <span>03</span>
            Method
          </button>
          <div>
            <span className="live-dot" aria-hidden="true" />
            LIVE SYSTEM
          </div>
        </nav>
      )}
    </header>
  );
}
