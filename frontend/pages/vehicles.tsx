import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

type VehicleType =
  | "van_only"
  | "van_tow"
  | "small_ramp"
  | "hiab_grabber"
  | "lorry_recovery";

interface Vehicle {
  id: string;
  type: VehicleType;
  postcode: string;
  shiftStart: string;
  shiftEnd: string;
}

export default function VehiclesManager() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<Vehicle>({
    id: "",
    type: "van_only",
    postcode: "",
    shiftStart: "",
    shiftEnd: "",
  });
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Vehicle>>({});

  const API_BASE = "https://srd-poc-backend.vercel.app/api/vehicles";

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch vehicles list
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/list`);
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles || []);
      } else {
        console.error("Failed to fetch vehicles");
      }
    } catch (err) {
      console.error("Backend unreachable:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    const interval = setInterval(fetchVehicles, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addVehicle = async () => {
    if (!form.id || !form.postcode || !form.shiftStart || !form.shiftEnd) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    const newVehicle = { ...form };
    const updated = [...vehicles, newVehicle];
    setVehicles(updated);
    setForm({ id: "", type: "van_only", postcode: "", shiftStart: "", shiftEnd: "" });

    await syncWithBackend(updated, "Vehicle added successfully");
  };

  const syncWithBackend = async (updatedVehicles = vehicles, message?: string) => {
    try {
      const res = await fetch(`${API_BASE}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicles: updatedVehicles }),
      });
      if (res.ok) {
        toast({
          title: "Success",
          description: message || "Vehicles synced successfully",
        });
        fetchVehicles();
      } else {
        toast({
          title: "Sync failed",
          description: "Could not update backend",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to connect to backend",
        variant: "destructive",
      });
    }
  };

  const clearVehicles = async () => {
    if (!confirm("Are you sure you want to clear all vehicles?")) return;
    try {
      const res = await fetch(`${API_BASE}/clear`, { method: "POST" });
      if (res.ok) {
        setVehicles([]);
        toast({
          title: "Cleared",
          description: "All vehicles removed successfully",
        });
      } else {
        toast({
          title: "Failed",
          description: "Could not clear vehicles",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Backend unreachable",
        variant: "destructive",
      });
    }
  };

  const deleteVehicle = async (id: string) => {
    const updated = vehicles.filter((v) => v.id !== id);
    setVehicles(updated);
    await syncWithBackend(updated, "Vehicle removed successfully");
  };

  const startEditing = (id: string) => {
    const vehicle = vehicles.find((v) => v.id === id);
    if (!vehicle) return;
    setEditingId(id);
    setEditValues({ ...vehicle });
  };

  const handleEditChange = (id: string, field: keyof Vehicle, value: string) => {
    setEditValues({ ...editValues, [field]: value });
  };

  const saveEdit = async (id: string) => {
    const updated = vehicles.map((v) =>
      v.id === id ? { ...v, ...editValues } : v
    );
    setVehicles(updated);
    setEditingId(null);
    setEditValues({});
    await syncWithBackend(updated, "Vehicle updated successfully");
  };

  const handleEditKey = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    id: string
  ) => {
    if (e.key === "Enter") saveEdit(id);
    if (e.key === "Escape") {
      setEditingId(null);
      setEditValues({});
    }
  };

  const getShiftStatus = (shiftStart: string, shiftEnd: string) => {
    if (!shiftStart || !shiftEnd)
      return { label: "⚪ No shift set", color: "#eee" };
    const start = new Date(shiftStart);
    const end = new Date(shiftEnd);
    if (now < start) {
      const diff = (start.getTime() - now.getTime()) / 3600000;
      if (diff <= 1) return { label: "🟡 Starting soon", color: "#fff8d6" };
      return { label: "🔒 Not started yet", color: "#f0f0f0" };
    }
    if (now > end) return { label: "⚫ Shift ended", color: "#ddd" };
    return { label: "🟢 Active now", color: "#d6f5d6", active: true };
  };

  return (
    <main className="p-8 font-sans">
      <style>
        {`
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(0,255,0,0.4); }
            70% { box-shadow: 0 0 15px 10px rgba(0,255,0,0); }
            100% { box-shadow: 0 0 0 0 rgba(0,255,0,0); }
          }
          .pulse {
            animation: pulse 2s infinite;
          }
        `}
      </style>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🚚 Vehicles Manager</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="mb-2">⏳ Updating vehicle list...</p>}

          <div className="flex flex-wrap gap-2 mb-4">
            <Input
              name="id"
              value={form.id}
              onChange={handleChange}
              placeholder="Vehicle ID"
              className="w-36"
            />
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="border rounded-md p-2"
            >
              <option value="van_only">Van Only</option>
              <option value="van_tow">Van Tow</option>
              <option value="small_ramp">Small Ramp</option>
              <option value="hiab_grabber">HIAB Grabber</option>
              <option value="lorry_recovery">Lorry Recovery</option>
            </select>
            <Input
              name="postcode"
              value={form.postcode}
              onChange={handleChange}
              placeholder="Start Postcode"
              className="w-36"
            />
            <Input
              type="datetime-local"
              name="shiftStart"
              value={form.shiftStart}
              onChange={handleChange}
              className="w-56"
            />
            <Input
              type="datetime-local"
              name="shiftEnd"
              value={form.shiftEnd}
              onChange={handleChange}
              className="w-56"
            />
            <Button onClick={addVehicle}>➕ Add</Button>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th>ID</th>
                <th>Type</th>
                <th>Postcode</th>
                <th>Shift Start</th>
                <th>Shift End</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => {
                const status = getShiftStatus(v.shiftStart, v.shiftEnd);
                const editing = editingId === v.id;
                return (
                  <tr
                    key={v.id}
                    className={status.active ? "pulse" : ""}
                    style={{ backgroundColor: status.color }}
                  >
                    <td>
                      {editing ? (
                        <Input
                          value={editValues.id || ""}
                          onChange={(e) =>
                            handleEditChange(v.id, "id", e.target.value)
                          }
                          onKeyDown={(e) => handleEditKey(e, v.id)}
                        />
                      ) : (
                        v.id
                      )}
                    </td>
                    <td>
                      {editing ? (
                        <select
                          value={editValues.type || v.type}
                          onChange={(e) =>
                            handleEditChange(v.id, "type", e.target.value)
                          }
                          onKeyDown={(e) => handleEditKey(e, v.id)}
                        >
                          <option value="van_only">Van Only</option>
                          <option value="van_tow">Van Tow</option>
                          <option value="small_ramp">Small Ramp</option>
                          <option value="hiab_grabber">HIAB Grabber</option>
                          <option value="lorry_recovery">Lorry Recovery</option>
                        </select>
                      ) : (
                        v.type
                      )}
                    </td>
                    <td>
                      {editing ? (
                        <Input
                          value={editValues.postcode || ""}
                          onChange={(e) =>
                            handleEditChange(v.id, "postcode", e.target.value)
                          }
                          onKeyDown={(e) => handleEditKey(e, v.id)}
                        />
                      ) : (
                        v.postcode
                      )}
                    </td>
                    <td>
                      {editing ? (
                        <Input
                          type="datetime-local"
                          value={editValues.shiftStart || ""}
                          onChange={(e) =>
                            handleEditChange(v.id, "shiftStart", e.target.value)
                          }
                          onKeyDown={(e) => handleEditKey(e, v.id)}
                        />
                      ) : (
                        new Date(v.shiftStart).toLocaleString()
                      )}
                    </td>
                    <td>
                      {editing ? (
                        <Input
                          type="datetime-local"
                          value={editValues.shiftEnd || ""}
                          onChange={(e) =>
                            handleEditChange(v.id, "shiftEnd", e.target.value)
                          }
                          onKeyDown={(e) => handleEditKey(e, v.id)}
                        />
                      ) : (
                        new Date(v.shiftEnd).toLocaleString()
                      )}
                    </td>
                    <td>{status.label}</td>
                    <td>
                      {editing ? (
                        <Button variant="secondary" onClick={() => saveEdit(v.id)}>
                          💾 Save
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => startEditing(v.id)}
                          >
                            ✏️ Edit
                          </Button>{" "}
                          <Button
                            variant="destructive"
                            onClick={() => deleteVehicle(v.id)}
                          >
                            🗑️ Delete
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {vehicles.length > 0 && (
            <div className="mt-4 flex gap-2">
              <Button onClick={() => syncWithBackend()} variant="default">
                🔄 Sync Vehicles
              </Button>
              <Button onClick={clearVehicles} variant="destructive">
                🧹 Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
