import React, { useEffect, useState, useMemo } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Leg {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  miles: number;
  etaMinutes: number;
  vehicleId: string;
  note?: string;
}

interface Assignment {
  jobId: string;
  legs: Leg[];
  dropDecision: string;
  willExceedShift: boolean;
  reason: string;
}

const containerStyle = {
  width: "100%",
  height: "80vh",
  borderRadius: "1rem",
};

const center = { lat: 52.0, lng: -1.5 }; // UK default center

// Simple color palette for vehicle routes
const colors = [
  "#007bff", "#28a745", "#ffc107", "#dc3545", "#6610f2",
  "#17a2b8", "#fd7e14", "#6f42c1", "#20c997", "#e83e8c",
];

function getVehicleColor(vehicleId: string, map: Record<string, string>, setMap: (m: Record<string, string>) => void) {
  if (map[vehicleId]) return map[vehicleId];
  const nextColor = colors[Object.keys(map).length % colors.length];
  const newMap = { ...map, [vehicleId]: nextColor };
  setMap(newMap);
  return nextColor;
}

export default function LiveMapPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [vehicleColorMap, setVehicleColorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const API_BASE = "https://srd-poc-backend.vercel.app/api";

  async function fetchAssignments() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/assignments/list`);
      const data = await res.json();
      if (res.ok) {
        setAssignments(data.assignments || []);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        setError(data.error || "Failed to load assignments");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ✅ Auto-refresh every 60s
  useEffect(() => {
    fetchAssignments();
    const interval = setInterval(fetchAssignments, 60000);
    return () => clearInterval(interval);
  }, []);

  const legend = useMemo(
    () =>
      Object.entries(vehicleColorMap).map(([id, color]) => (
        <div key={id} className="flex items-c
