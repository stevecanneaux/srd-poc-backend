import React from "react";

export default function Home() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>🚀 SRD Admin Dashboard</h1>
      <p>Welcome to the admin control panel.</p>

      <h3>Available Sections:</h3>
      <ul>
        <li><a href="/vehicles">Vehicles Manager</a></li>
        <li><a href="/jobs">Jobs Manager</a></li>
        <li><a href="/map">Live Map View</a></li>
      </ul>

      <p style={{ marginTop: "2rem", color: "#555" }}>
        This dashboard connects to the backend optimizer and vehicle scheduling system.
      </p>
    </main>
  );
}
