import { useState, useEffect } from "react";

export default function JobsManager() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [form, setForm] = useState({
    id: "",
    pickup: "",
    issueType: "repair",
    vehicleSize: "van",
    preferredDrop: "",
    homeFallback: "",
  });

  // Load stored jobs
  useEffect(() => {
    const stored = localStorage.getItem("jobs");
    if (stored) setJobs(JSON.parse(stored));
  }, []);

  // Save on change
  useEffect(() => {
    localStorage.setItem("jobs", JSON.stringify(jobs));
  }, [jobs]);

  function addJob() {
    if (!form.id || !form.pickup)
      return alert("Please fill in Job ID and pickup location");

    setJobs([...jobs, form]);
    setForm({
      id: "",
      pickup: "",
      issueType: "repair",
      vehicleSize: "van",
      preferredDrop: "",
      homeFallback: "",
    });
  }

  function removeJob(id: string) {
    setJobs(jobs.filter((j) => j.id !== id));
  }

  return (
    <div className="bg-white shadow-md rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-4">Live Jobs Queue</h2>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
        <input
          className="border rounded p-2"
          placeholder="Job ID"
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
        />

        <input
          className="border rounded p-2"
          placeholder="Pickup Postcode"
          value={form.pickup}
          onChange={(e) => setForm({ ...form, pickup: e.target.value })}
        />

        <select
          className="border rounded p-2"
          value={form.issueType}
          onChange={(e) => setForm({ ...form, issueType: e.target.value })}
        >
          <option value="repair">Repair</option>
          <option value="repair_possible_recovery">
            Repair (Possible Recovery)
          </option>
          <option value="recovery_only">Recovery Only</option>
        </select>

        <select
          className="border rounded p-2"
          value={form.vehicleSize}
          onChange={(e) => setForm({ ...form, vehicleSize: e.target.value })}
        >
          <option value="motorcycle">Motorcycle</option>
          <option value="small_car">Small Car</option>
          <option value="standard_car">Standard Car</option>
          <option value="van">Van</option>
          <option value="lorry">Lorry</option>
        </select>

        <input
          className="border rounded p-2"
          placeholder="Preferred Drop Postcode"
          value={form.preferredDrop}
          onChange={(e) =>
            setForm({ ...form, preferredDrop: e.target.value })
          }
        />

        <input
          className="border rounded p-2"
          placeholder="Home Fallback Postcode"
          value={form.homeFallback}
          onChange={(e) =>
            setForm({ ...form, homeFallback: e.target.value })
          }
        />
      </div>

      <button
        className="bg-blue-600 text-white rounded p-2 hover:bg-blue-700 mb-4"
        onClick={addJob}
      >
        Add Job
      </button>

      <table className="w-full text-left border-t">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">ID</th>
            <th className="p-2">Pickup</th>
            <th className="p-2">Issue Type</th>
            <th className="p-2">Vehicle Size</th>
            <th className="p-2">Preferred Drop</th>
            <th className="p-2">Home Fallback</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id} className="border-b hover:bg-gray-50">
              <td className="p-2">{j.id}</td>
              <td className="p-2">{j.pickup}</td>
              <td className="p-2 capitalize">{j.issueType.replace(/_/g, " ")}</td>
              <td className="p-2">{j.vehicleSize}</td>
              <td className="p-2">{j.preferredDrop}</td>
              <td className="p-2">{j.homeFallback}</td>
              <td className="p-2">
                <button
                  className="text-red-600 hover:underline"
                  onClick={() => removeJob(j.id)}
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
