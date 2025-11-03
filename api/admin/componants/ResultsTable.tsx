export default function ResultsTable({ results }: any) {
  if (!results) return null;

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Optimizer Results</h3>

      {results.assignments?.length ? (
        <table className="w-full border text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Job ID</th>
              <th className="p-2">Legs</th>
              <th className="p-2">Drop Decision</th>
              <th className="p-2">Shift Risk</th>
              <th className="p-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {results.assignments.map((a: any) => (
              <tr key={a.jobId} className="border-b hover:bg-gray-50">
                <td className="p-2">{a.jobId}</td>
                <td className="p-2">{a.legs.length}</td>
                <td className="p-2">{a.dropDecision}</td>
                <td className="p-2">
                  {a.willExceedShift ? "⚠️ Exceeds Shift" : "✅ OK"}
                </td>
                <td className="p-2 text-sm text-gray-700">{a.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No assignments available.</p>
      )}

      {results.unassigned?.length ? (
        <div className="mt-4 bg-red-50 border border-red-300 rounded p-3">
          <strong className="text-red-700">
            ⚠️ {results.unassigned.length} Unassigned Jobs:
          </strong>
          <ul className="list-disc ml-6 text-red-600">
            {results.unassigned.map((id: string) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
