import { useState } from "react";
import ResultsTable from "./ResultsTable";

export default function OptimizerRunner({ onRunComplete, onMissingVehicles }: any) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  async function runOptimizer() {
    setLoading(true);
    try {
      const vehicles = JSON.parse(localStorage.getItem("vehicles") || "[]");
      const jobs = JSON.parse(localStorage.getItem("jobs") || "[]");
      const policies = JSON.parse(localStorage.getItem("policies") || "{}");

      const response = await fetch("/api/optimize-v2", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          now: new Date().toISOString(),
          jobs,
          vehicles,
          policies,
        }),
      });

      const data = await response.json();
      setResults(data);
      onRunComplete(data);

      if (data.unassigned?.length) {
        onMissingVehicles(
          data.unassigned.map((id: string) => ({
            jobId: id,
            reason: "No available vehicle within range/shift limit",
          }))
        );
      }
    } catch (err) {
      console.error("Optimizer error", err);
      alert("Error running optimizer. Check console.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white shadow-md rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-4">Run Optimizer</h2>

      <button
        onClick={runOptimizer}
        disabled={loading}
        className={`${
          loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
        } text-white rounded p-3`}
      >
        {loading ? "Optimizing..." : "Run Optimization"}
      </button>

      {results && (
        <div className="mt-6">
          <ResultsTable results={results} />
        </div>
      )}
    </div>
  );
}
