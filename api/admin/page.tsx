"use client";

import { useState } from "react";
import VehiclesManager from "./components/VehiclesManager";
import JobsManager from "./components/JobsManager";
import PolicySettings from "./components/PolicySettings";
import OptimizerRunner from "./components/OptimizerRunner";
import MissingVehiclesPrompt from "./components/MissingVehiclesPrompt";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<
    "vehicles" | "jobs" | "policies" | "results"
  >("vehicles");

  const [missingVehicles, setMissingVehicles] = useState<any[]>([]);
  const [optimizerResults, setOptimizerResults] = useState<any>(null);

  // When admin fills in missing vehicles
  function handleMissingVehicleSubmit(newVehicles: any[]) {
    const stored = JSON.parse(localStorage.getItem("vehicles") || "[]");
    const updated = [
      ...stored,
      ...newVehicles.map((v) => ({
        id: `V${Math.floor(Math.random() * 10000)}`,
        type: v.vehicleType,
        location: { lat: 0, lng: 0 }, // Placeholder; geocoded later
        shiftEnd: v.shiftEnd,
        allowOvertime: false,
        capabilities: [],
      })),
    ];

    localStorage.setItem("vehicles", JSON.stringify(updated));
    setMissingVehicles([]);
    alert("✅ New vehicles added to schedule. Please re-run optimizer.");
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        🚚 SRD Dispatch Optimization Dashboard
      </h1>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 mb-6">
        {[
          { id: "vehicles", label: "Vehicles" },
          { id: "jobs", label: "Jobs" },
          { id: "policies", label: "Policies" },
          { id: "results", label: "Run Optimizer" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded ${
              activeTab === tab.id
                ? "bg-blue-600 text-white"
                : "bg-white border text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "vehicles" && <VehiclesManager />}
        {activeTab === "jobs" && <JobsManager />}
        {activeTab === "policies" && <PolicySettings />}
        {activeTab === "results" && (
          <OptimizerRunner
            onRunComplete={(data: any) => setOptimizerResults(data)}
            onMissingVehicles={(missing: any[]) => setMissingVehicles(missing)}
          />
        )}
      </div>

      {/* Missing Vehicle Prompt */}
      {missingVehicles.length > 0 && (
        <MissingVehiclesPrompt
          missing={missingVehicles}
          onSubmit={handleMissingVehicleSubmit}
          onClose={() => setMissingVehicles([])}
        />
      )}
    </div>
  );
}
