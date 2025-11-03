import { useState, useEffect } from "react";

export default function PolicySettings() {
  const [policies, setPolicies] = useState({
    maxLegMiles: 30,
    intakeCutoffMinutesBeforeClose: 30,
    noNewJobLastMinutes: 0,
    maxOvertimeMinutes: 0,
    serviceMinutes: 10,
    enableMeetAndSwap: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem("policies");
    if (stored) setPolicies(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem("policies", JSON.stringify(policies));
  }, [policies]);

  return (
    <div className="bg-white shadow-md rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-4">Optimization Policy Settings</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Max Leg Miles
          </label>
          <input
            type="number"
            className="border rounded p-2 w-full"
            value={policies.maxLegMiles}
            onChange={(e) =>
              setPolicies({ ...policies, maxLegMiles: Number(e.target.value) })
            }
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Intake Cutoff (mins before close)
          </label>
          <input
            type="number"
            className="border rounded p-2 w-full"
            value={policies.intakeCutoffMinutesBeforeClose}
            onChange={(e) =>
              setPolicies({
                ...policies,
                intakeCutoffMinutesBeforeClose: Number(e.target.value),
              })
            }
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            No New Job Last (mins)
          </label>
          <input
            type="number"
            className="border rounded p-2 w-full"
            value={policies.noNewJobLastMinutes}
            onChange={(e) =>
              setPolicies({
                ...policies,
                noNewJobLastMinutes: Number(e.target.value),
              })
            }
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Max Overtime (mins)
          </label>
          <input
            type="number"
            className="border rounded p-2 w-full"
            value={policies.maxOvertimeMinutes}
            onChange={(e) =>
              setPolicies({
                ...policies,
                maxOvertimeMinutes: Number(e.target.value),
              })
            }
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Service Time (mins)
          </label>
          <input
            type="number"
            className="border rounded p-2 w-full"
            value={policies.serviceMinutes}
            onChange={(e) =>
              setPolicies({
                ...policies,
                serviceMinutes: Number(e.target.value),
              })
            }
          />
        </div>

        <div className="flex items-center space-x-2 mt-6">
          <input
            type="checkbox"
            checked={policies.enableMeetAndSwap}
            onChange={(e) =>
              setPolicies({ ...policies, enableMeetAndSwap: e.target.checked })
            }
          />
          <label>Enable Meet-and-Swap Logic</label>
        </div>
      </div>

      <p className="text-sm text-gray-500 mt-4">
        ⚙️ Changes are saved automatically and used by the optimizer.
      </p>
    </div>
  );
}
