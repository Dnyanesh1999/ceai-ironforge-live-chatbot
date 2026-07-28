import { useEffect, useState } from "react";
import ChatWorkspace from "./components/ChatWorkspace";
import EvidenceRail from "./components/EvidenceRail";
import Header from "./components/Header";
import InfoPanel from "./components/InfoPanel";

export default function App() {
  const [sources, setSources] = useState([]);
  const [activity, setActivity] = useState({ status: "idle" });
  const [panel, setPanel] = useState(null);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const addSources = (nextSources) => {
    setSources((current) => [...nextSources, ...current].slice(0, 8));
  };

  const resetSession = () => {
    setSources([]);
    setActivity({ status: "idle" });
  };

  return (
    <div className="app-shell">
      <Header activePanel={panel} onOpenPanel={setPanel} />
      <main className="main-layout">
        <ChatWorkspace
          onActivity={setActivity}
          onReset={resetSession}
          onSources={addSources}
        />
        <EvidenceRail activity={activity} sources={sources} />
      </main>
      <footer>
        <span>FORGELINE / IRONFORGE COMPONENTS</span>
        <span>BUILT FOR LIVE, VERIFIABLE CUSTOMER ENGAGEMENT</span>
      </footer>
      <InfoPanel type={panel} onClose={() => setPanel(null)} />
    </div>
  );
}
