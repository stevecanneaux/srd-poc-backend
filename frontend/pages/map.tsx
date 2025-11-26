import React, { useEffect, useState } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Assignment {
  jobId: string;
  legs: {
    from: { lat: number; lng: number };
    to: { lat: number; lng: number };
    vehicleId: string;
    miles: number;
    etaMinutes: number;
    note?: string;
  }[];
  dropDecision: string;
  willExceedShift: boolean;
  reason: string;
}

const containerStyle = {
  width: "100%",
  height: "80vh",
  borderRadius: "1rem",
};

const center = { lat: 52.0, lng: -1.5 }; // default UK center

export default function LiveMapPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (res.ok) setAssignments(data.assignments || []);
      else setError(data.error || "Failed to load assignments");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssignments();
  }, []);

  if (!isLoaded) return <p>🗺️ Loading Google Maps...</p>;

  return (
    <main className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>🗺️ Live Optimization Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button onClick={fetchAssignments} disabled={loading}>
              🔄 Refresh
            </Button>
          </div>

          {error && <p className="text-red-500">{error}</p>}
          {loading && <p>Loading assignments...</p>}

          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={6}
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: true,
            }}
          >
            {/* Show assignments */}
            {assignments.map((a, idx) => (
              <React.Fragment key={a.jobId}>
                {a.legs.map((leg, i) => (
                  <Polyline
                    key={`${a.jobId}-leg-${i}`}
                    path={[leg.from, leg.to]}
                    options={{
                      strokeColor: "#007bff",
                      strokeOpacity: 0.8,
                      strokeWeight: 4,
                      icons: [
                        {
                          icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 4 },
                          offset: "0",
                          repeat: "20px",
                        },
                      ],
                    }}
                  />
                ))}

                {/* Pickup Marker */}
                <Marker
                  position={a.legs[0]?.from}
                  label={{
                    text: `🚗 ${a.legs[0]?.vehicleId}`,
                    className: "text-xs",
                  }}
                />

                {/* Drop Marker */}
                <Marker
                  position={a.legs[a.legs.length - 1]?.to}
                  label={{
                    text: `📍 Job ${a.jobId}`,
                    className: "text-xs",
                  }}
                />
              </React.Fragment>
            ))}
          </GoogleMap>
        </CardContent>
      </Card>
    </main>
  );
}
