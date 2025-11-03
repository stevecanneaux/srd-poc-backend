"use client";
import { useState, useEffect } from "react";
import { geocodeAddress } from "@/lib/geocode";

export default function VehiclesManager() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [form, setForm] = useState({
    type: "van_only",
    startPostcode: "",
    shiftEnd: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("vehicles");
    if (stored) setVehicles(JSON.parse(stored));
  }, []);

  async function addVehicle() {
    if (!form.startPostcode || !form.shiftEnd)
      return alert("Please enter postcode and shift end.");

    setLoading(true);
    try {
      const coords = await geocodeAddress(form.startPostcode);
      if (!coords) {
        alert("Could not locate postcode on map.");
        return;
      }

      const newVehicle = {
        id: `V${Math.floor(Math.random() * 10000)}`,
        type: form.type,
        location: coords,
        shiftEnd: form.shiftEnd,
        allowOvertime: false,
      };

      const updated = [...vehicles, newVehicle];
      setVehicles(updated);
      localStorage.setItem("vehicles", JSON.stringify(updated));

      setForm({ type: "van_only", startPostcode: "", shiftEnd: "" });
    } finally {
      setLoading(false);
    }
  }

  function removeVehicle(id: string) {
    const updated = vehicles.filter((v) => v.id !== id);
    setVehicles(updated);
    localStorage.setItem("vehicles", JSON.stringify(updated));
  }

  return (
    <div className="bg-white shadow-md rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-4">Vehicles on Shift</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <select
          className="border p-2 rounded"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="van_only">Van</option>
          <option value="van_tow">Tow Van</option>
          <option value="hiab_grabber">HIAB</option>
          <option value="lorry_recovery">Lorry</option>
        </select>

        <input
          className="border p-2 rounded"
          placeholder="Start Postcode"
          value={form.startPostcode}
          onChange={(e) => setForm({ ...form, startPostcode: e.target.value })}
        />

        <input
          type="datetime-local"
          className="border p-2 rounded"
          value={form.shiftEnd}
          onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })}
        />

        <button
          onClick={addVehicle}
          disabled={loading}
          className={`${
            loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          } text-white rounded p-2`}
        >
          {loading ? "Adding..." : "Add Vehicle"}
        </button>
      </div>

      {vehicles.length ? (
        <table className="w-full border text-left mt-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Type</th>
              <th className="p-2">Start (Postcode)</th>
              <th className="p-2">Shift End</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{v.id}</td>
                <td className="p-2">{v.type}</td>
                <td className="p-2">{form.startPostcode || "Geocoded"}</td>
                <td className="p-2">{v.shiftEnd}</td>
                <td className="p-2">
                  <button
                    onClick={() => removeVehicle(v.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-500">No vehicles added yet.</p>
      )}
    </div>
  );
}
