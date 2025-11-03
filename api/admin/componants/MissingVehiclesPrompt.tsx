import { useState } from "react";

export default function MissingVehiclesPrompt({ missing, onSubmit, onClose }: any) {
  const [suggestions, setSuggestions] = useState(
    missing.map((m: any, i: number) => ({
      jobId: m.jobId,
      vehicleType: "van_only",
      startPostcode: "",
      shiftEnd: "",
    }))
  );

  function updateSuggestion(i: number, field: string, value: any) {
    const newList = [...suggestions];
    newList[i][field] = value;
    setSuggestions(newList);
  }

  function submit() {
    const invalid = suggestions.some((s) => !s.startPostcode || !s.shiftEnd);
    if (invalid)
      return alert("Please enter start postcode and shift end time for all vehicles.");

    onSubmit(suggestions);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          {missing.length} Vehicles Required to Complete All Jobs
        </h2>

        <p className="text-gray-600 mb-4">
          The optimizer identified jobs without available vehicles.  
          Please enter details for new vehicles to be added into the schedule.
        </p>

        <table className="w-full text-left border mb-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Job ID</th>
              <th className="p-2">Vehicle Type</th>
              <th className="p-2">Start Postcode</th>
              <th className="p-2">Shift End</th>
            </tr>
          </thead>
          <tbody>
            {suggestions.map((s, i) => (
              <tr key={s.jobId} className="border-b">
                <td className="p-2 font-medium">{s.jobId}</td>
                <td className="p-2">
                  <select
                    value={s.vehicleType}
                    onChange={(e) =>
                      updateSuggestion(i, "vehicleType", e.target.value)
                    }
                    className="border rounded p-1"
                  >
                    <option value="van_only">Van</option>
                    <option value="van_tow">Tow Van</option>
                    <option value="hiab_grabber">HIAB</option>
                    <option value="lorry_recovery">Lorry Recovery</option>
                  </select>
                </td>
                <td className="p-2">
                  <input
                    className="border rounded p-1 w-full"
                    placeholder="Start Postcode"
                    value={s.startPostcode}
                    onChange={(e) =>
                      updateSuggestion(i, "startPostcode", e.target.value)
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    type="datetime-local"
                    className="border rounded p-1 w-full"
                    value={s.shiftEnd}
                    onChange={(e) =>
                      updateSuggestion(i, "shiftEnd", e.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-800 rounded px-4 py-2 hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700"
          >
            Add to Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
