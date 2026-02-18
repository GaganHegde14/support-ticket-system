import React, { useState, useCallback } from "react";
import TicketForm from "./components/TicketForm";
import TicketList from "./components/TicketList";
import StatsDashboard from "./components/StatsDashboard";

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTicketCreated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🎫 Support Ticket System</h1>
        <p>
          Create, track &amp; manage support tickets with AI-powered
          classification
        </p>
      </header>

      <StatsDashboard refreshKey={refreshKey} />

      <div className="main-grid" style={{ marginTop: 24 }}>
        <TicketForm onTicketCreated={handleTicketCreated} />
        <TicketList refreshKey={refreshKey} />
      </div>
    </div>
  );
}
