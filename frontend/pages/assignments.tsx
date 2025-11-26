import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Assignment {
  jobId: string;
  legs: {
    from: { lat: number; lng: number };
    to: { lat: number; lng: number };
    miles: number;
    etaMinutes: number;
    vehicleId: string;
    note?: string;
  }[];
  dropDecision: "preferred" | "secondary" | "home_fallback";
  willExceedShift: boolean;
  reason: string;
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = "https://srd-poc-backend.vercel.app/api/assignments";

  async function fetchAssignments() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/list`);
      const data = await res.json();
      if (res.ok) {
        setAssignments(data.assignments || []);
      } else {
        setError(data.error || "Failed to load assignments");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function runOptimization() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/optimize`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        await fetchAssignments();
        alert("Optimization completed!");
      } else {
        alert(`Optimization failed: ${data.error || data.detail}`);
      }
    } catch (err) {
      alert("Network error during optimization.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssignments();
  }, []);

  return (
    <main className="p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🧭 Job–Vehicle Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button onClick={fetchAssignments} disabled={loading}>
              🔄 Refresh
            </Button>
            <Button onClick={runOptimization} disabled={loading}>
              ⚙️ Run Optimization
            </Button>
          </div>

          {loading && <p>Loading...</p>}
          {error && <p className="text-red-600">❌ {error}</p>}

          {!loading && !error && assignments.length === 0 && (
            <p className="text-gray-500">No assignments yet. Run optimization to generate results.</p>
          )}

          {assignments.length > 0 && (
            <table className="w-full border-collapse text-sm mt-4">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th>Job ID</th>
                  <th>Vehicle ID</th>
                  <th>Drop Decision</th>
                  <th>ETA (min)</th>
                  <th>Miles</th>
                  <th>Shift OK?</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.jobId} className="border-b">
                    <td>{a.jobId}</td>
                    <td>{a.legs?.[0]?.vehicleId || "N/A"}</td>
                    <td>{a.dropDecision}</td>
                    <td>
                      {a.legs.reduce((sum, l) => sum + (l.etaMinutes || 0), 0).toFixed(0)}
                    </td>
                    <td>
                      {a.legs.reduce((sum, l) => sum + (l.miles || 0), 0).toFixed(1)}
                    </td>
                    <td>{a.willExceedShift ? "⚠️ Yes" : "✅ No"}</td>
                    <td>{a.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
