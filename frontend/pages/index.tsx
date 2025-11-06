import React, { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState("Checking connection...");

  useEffect(() => {
    async function testBackend() {
      try {
        const res = await fetch("https://srd-poc-backend.vercel.app/api/optimize-v2", {
          method: "GET",
        });

        if (res.status === 405) {
          setStatus("✅ Connected to backend (API online)");
        } else {
          setStatus(`⚠️ Unexpected response: ${res.status}`);
        }
      } catch (err) {
        setStatus("❌ Cannot reach backend");
      }
    }

    testBackend();
  }, []);

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>🚀 SRD Admin Dashboard</h1>
      <p>{status}</p>

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
