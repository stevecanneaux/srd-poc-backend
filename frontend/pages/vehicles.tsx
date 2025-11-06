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

  // ⏱ Auto-refresh current time every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
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
      } else {
        alert("⚠️ Failed to sync with backend");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Error communicating with backend");
    }
  };

  const getShiftStatus = (shiftStart: string, shiftEnd: string) => {
    if (!shiftStart || !shiftEnd) return "⚪ No shift set";

    const start = new Date(shiftStart);
    const end = new Date(shiftEnd);

    if (now < start) {
      const diff = (start.getTime() - now.getTime()) / 3600000;
      if (diff <= 1) return "🟡 Starting soon";
      return "🔒 Not started yet";
    }
    if (now > end) return "⚫ Shift ended";
    return "🟢 Active now";
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🚚 Vehicles Manager</h1>

      <section style={{ marginBottom: "2rem" }}>
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
        <button onClick={addVehicle} style={{ marginLeft: "10px" }}>
          Add
        </button>
