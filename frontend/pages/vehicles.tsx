import React, { useState, useEffect } from "react";

type VehicleType =
  | "van_only"
  | "van_tow"
  | "small_ramp"
  | "hiab_grabber"
  | "lorry_recovery";

export default function VehiclesManager() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [form, setForm] = useState({
    id: "",
    type: "van_only",
    postcode: "",
    shiftStart: "",
    shiftEnd: "",
  });
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // 🕒 Update current time every 60s
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // 📡 Fetch vehicles from backend
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "https://srd-poc-backend.vercel.app/api/vehicles/list"
      );
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles || []);
      } else {
        console.error("Failed to fetch vehicles", await res.text());
      }
    } catch (err) {
      console.error("Backend unreachable:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔁 Auto-refresh every 30 seconds
  useEffect(() => {
    fetchVehicles();
    const interval = setInterval(fetchVehicles, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e: any) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const addVehicle = () => {
    if (!form.id || !form.postcode || !form.shiftStart || !form.shiftEnd) {
      alert("Please fill in all fields");
      return;
    }
    setVehicles([...vehicles, form]);
    setForm({
      id: "",
      type: "van_only",
      postcode: "",
      shiftStart: "",
      shiftEnd: "",
    });
  };

  const syncWithBackend = async () => {
    try {
      const res = await fetch(
        "https://srd-poc-backend.vercel.app/api/vehicles/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vehicles }),
        }
      );

      if (res.ok) {
        alert("✅ Vehicles synced to backend successfully");
        fetchVehicles(); // Refresh live view
      } else {
        alert("⚠️ Failed to sync with backend");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Error communicating with backend");
    }
  };

  const getShiftStatus = (shiftStart: string, shiftEnd: string) => {
    if (!shiftStart || !shiftEnd) return { label: "⚪ No shift set", color: "#eee" };
    const start = new Date(shiftStart);
    const end = new Date(shiftEnd);
    if (now < start) {
      const diff = (start.getTime() - now.getTime()) / 3600000;
      if (diff <= 1) return { label: "🟡 Starting soon", color: "#fff8d6" };
      return { label: "🔒 Not started yet", color: "#f0f0f0" };
    }
    if (now > end) return { label: "⚫ Shift ended", color: "#ddd" };
    return { label: "🟢 Active now", color: "#d6f5d6", active: true };
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      {/* CSS pulse effect for active vehicles */}
      <style>
        {`
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(0,255,0,0.4); }
            70% { box-shadow: 0 0 15px 10px rgba(0,255,0,0); }
            100% { box-shadow: 0 0 0 0 rgba(0,255,0,0); }
          }
          .pulse {
            animation: pulse 2s infinite;
          }
        `}
      </style>

      <h1>🚚 Vehicles Manager</h1>
      {loading && <p>⏳ Updating vehicle list...</p>}

      {/* Add new vehicle */}
      <section
        style={{
          marginBottom: "2rem",
          padding: "1rem",
          background: "#f8f9fa",
          borderRadius: "10px",
          border: "1px solid #ccc",
        }}
      >
        <h3>Add Vehicle</h3>
        <input
          type="text"
          name="id"
          value={form.id}
          onChange={handleChange}
          placeholder="Vehicle ID"
          style={{ marginRight: "10px" }}
        />
        <select name="type" value={form.type} onChange={handleChange}>
          <option value="van_only">Van Only</option>
          <option value="van_tow">Van Tow</option>
          <option value="small_ramp">Small Ramp</option>
          <option value="hiab_grabber">HIAB Grabber</option>
          <option value="lorry_recovery">Lorry Recovery</option>
        </select>
        <input
          type="text"
          name="postcode"
          value={form.postcode}
          onChange={handleChange}
          placeholder="Start Postcode"
          style={{ marginLeft: "10px", marginRight: "10px" }}
        />
        <br />
        <label>Shift Start:</label>
        <input
          type="datetime-local"
          name="shiftStart"
          value={form.shiftStart}
          onChange={handleChange}
          style={{ marginLeft: "10px", marginRight: "10px" }}
        />
        <label>Shift End:</label>
        <input
          type="datetime-local"
          name="shiftEnd"
          value={form.shiftEnd}
          onChange={handleChange}
          style={{ marginLeft: "10px" }}
        />
        <button
          onClick={addVehicle}
          style={{
            marginLeft: "10px",
            background: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "5px 10px",
            cursor: "pointer",
          }}
        >
          ➕ Add
        </button>
      </section>

      {/* Live vehicle list */}
      <h3>Vehicles on Shift</h3>
      <table
        border={1}
        cellPadding={6}
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: "1px solid #ddd",
          fontSize: "0.95rem",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>
            <th>ID</th>
            <th>Type</th>
            <th>Start Postcode</th>
            <th>Shift Start</th>
            <th>Shift End</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => {
            const status = getShiftStatus(v.shiftStart, v.shiftEnd);
            return (
              <tr
                key={v.id}
                className={status.active ? "pulse" : ""}
                style={{
                  backgroundColor: status.color,
                  transition: "background-color 0.3s ease",
                }}
              >
                <td>{v.id}</td>
                <td>{v.type}</td>
                <td>{v.postcode}</td>
                <td>{new Date(v.shiftStart).toLocaleString()}</td>
                <td>{new Date(v.shiftEnd).toLocaleString()}</td>
                <td>{status.label}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {vehicles.length > 0 && (
        <button
          onClick={syncWithBackend}
          style={{
            marginTop: "2rem",
            background: "#28a745",
            color: "white",
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          🔄 Sync Vehicles to Optimizer
        </button>
      )}
    </main>
  );
}
