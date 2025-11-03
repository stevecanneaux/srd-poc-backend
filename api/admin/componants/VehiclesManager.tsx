import { useState, useEffect } from 'react';

export default function VehiclesManager() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [form, setForm] = useState({
    id: '',
    type: 'van_only',
    postcode: '',
    shiftEnd: '',
    allowOvertime: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem('vehicles');
    if (stored) setVehicles(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem('vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  function addVehicle() {
    if (!form.id || !form.postcode) return alert('Please fill in ID and postcode');
    setVehicles([...vehicles, form]);
    setForm({ id: '', type: 'van_only', postcode: '', shiftEnd: '', allowOvertime: false });
  }

  function removeVehicle(id: string) {
    setVehicles(vehicles.filter((v) => v.id !== id));
  }

  return (
    <div className="bg-white shadow-md rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-4">Vehicle Roster</h2>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <input
          className="border rounded p-2"
          placeholder="Vehicle ID"
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
        />

        <select
          className="border rounded p-2"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="van_only">Van (Repair)</option>
          <option value="van_tow">Tow Van</option>
          <option value="hiab_grabber">HIAB</option>
          <option value="lorry_recovery">Lorry Recovery</option>
          <option value="small_ramp">Small Ramp</option>
          <option value="moto_recovery">Motorcycle Recovery</option>
          <option value="moto_repair">Motorcycle Repair</option>
        </select>

        <input
          className="border rounded p-2"
          placeholder="Start Postcode"
          value={form.postcode}
          onChange={(e) => setForm({ ...form, postcode: e.target.value })}
        />

        <input
          className="border rounded p-2"
          type="datetime-local"
          value={form.shiftEnd}
          onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })}
        />

        <button
          className="bg-blue-600 text-white rounded p-2 hover:bg-blue-700"
          onClick={addVehicle}
        >
          Add Vehicle
        </button>
      </div>

      <table className="w-full text-left border-t">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">ID</th>
            <th className="p-2">Type</th>
            <th className="p-2">Start</th>
            <th className="p-2">Shift End</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id} className="border-b hover:bg-gray-50">
              <td className="p-2">{v.id}</td>
              <td className="p-2">{v.type}</td>
              <td className="p-2">{v.postcode}</td>
              <td className="p-2">{v.shiftEnd}</td>
              <td className="p-2">
                <button
                  className="text-red-600 hover:underline"
                  onClick={() => removeVehicle(v.id)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
