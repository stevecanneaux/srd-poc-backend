import React, { useState } from "react";

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
    shiftEnd: "",
  });

  const handleChange = (e: any) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const addVehicle = () => {
    if (!form.id || !form.postcode || !form.shiftEnd) {
      alert("Please fill in all fields");
      return;
    }
    setVehicles([...vehicles, form]);
    setForm({ id: "", type: "van_only", postcode: "", shiftEnd: "" });
  };

  const syncWithBackend = async () => {
    try {
      const res = await fetch("https://srd-poc-backend.vercel.app/api/vehicles/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicles }),
      });

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
        <input
          type="datetime-local"
          name="shiftEnd"
          value={form.shiftEnd}
          onChange={handleChange}
        />
        <button onClick={addVehicle} style={{ marginLeft: "10px" }}>Add</button>
      </section>

      <h3>Vehicles on Shift</h3>
      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Start Postcode</th>
            <th>Shift Ends</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id}>
              <td>{v.id}</td>
              <td>{v.type}</td>
              <td>{v.postcode}</td>
              <td>{v.shiftEnd}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {vehicles.length > 0 && (
        <button onClick={syncWithBackend} style={{ marginTop: "2rem" }}>
          🔄 Sync Vehicles to Optimizer
        </button>
      )}
    </main>
  );
}
