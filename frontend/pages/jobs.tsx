import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

type IssueType = "repair" | "repair_possible_recovery" | "recovery_only";
type VehicleSize = "motorcycle" | "small_car" | "standard_car" | "van" | "lorry";

interface Job {
  id: string;
  pickupLat: string;
  pickupLng: string;
  dropoffLat: string;
  dropoffLng: string;
  issueType: IssueType;
  vehicleSize: VehicleSize;
  priority: number;
}

export default function JobsManager() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [form, setForm] = useState<Job>({
    id: "",
    pickupLat: "",
    pickupLng: "",
    dropoffLat: "",
    dropoffLng: "",
    issueType: "repair",
    vehicleSize: "standard_car",
    priority: 1,
  });
  const [loading, setLoading] = useState(false);

  const API_BASE = "https://srd-poc-backend.vercel.app/api/jobs";

  // Fetch jobs from backend
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/list`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      } else {
        toast({ title: "Failed", description: "Could not load jobs", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Backend unreachable", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle form inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Add job
  const addJob = async () => {
    if (!form.id || !form.pickupLat || !form.pickupLng || !form.dropoffLat || !form.dropoffLng) {
      toast({ title: "Missing fields", description: "Please fill in all coordinates.", variant: "destructive" });
      return;
    }

    const newJob = { ...form, priority: Number(form.priority) };
    const updated = [...jobs, newJob];
    setJobs(updated);
    setForm({
      id: "",
      pickupLat: "",
      pickupLng: "",
      dropoffLat: "",
      dropoffLng: "",
      issueType: "repair",
      vehicleSize: "standard_car",
      priority: 1,
    });

    await syncWithBackend(updated, "Job added successfully");
  };

  const syncWithBackend = async (updatedJobs = jobs, message?: string) => {
    try {
      const res = await fetch(`${API_BASE}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: updatedJobs }),
      });
      if (res.ok) {
        toast({ title: "Success", description: message || "Jobs synced successfully" });
        fetchJobs();
      } else {
        toast({ title: "Sync failed", description: "Could not update backend", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to connect to backend", variant: "destructive" });
    }
  };

  const deleteJob = async (id: string) => {
    const updated = jobs.filter((j) => j.id !== id);
    setJobs(updated);
    await syncWithBackend(updated, "Job removed successfully");
  };

  const clearJobs = async () => {
    if (!confirm("Are you sure you want to clear all jobs?")) return;
    try {
      const res = await fetch(`${API_BASE}/clear`, { method: "POST" });
      if (res.ok) {
        setJobs([]);
        toast({ title: "Cleared", description: "All jobs removed successfully" });
      } else {
        toast({ title: "Failed", description: "Could not clear jobs", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Backend unreachable", variant: "destructive" });
    }
  };

  return (
    <main className="p-8 font-sans">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>📋 Jobs Manager</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="mb-2">⏳ Loading jobs...</p>}

          <div className="flex flex-wrap gap-2 mb-4">
            <Input name="id" value={form.id} onChange={handleChange} placeholder="Job ID" className="w-36" />
            <Input name="pickupLat" value={form.pickupLat} onChange={handleChange} placeholder="Pickup Lat" className="w-32" />
            <Input name="pickupLng" value={form.pickupLng} onChange={handleChange} placeholder="Pickup Lng" className="w-32" />
            <Input name="dropoffLat" value={form.dropoffLat} onChange={handleChange} placeholder="Dropoff Lat" className="w-32" />
            <Input name="dropoffLng" value={form.dropoffLng} onChange={handleChange} placeholder="Dropoff Lng" className="w-32" />
            <select name="issueType" value={form.issueType} onChange={handleChange} className="border rounded-md p-2">
              <option value="repair">Repair</option>
              <option value="repair_possible_recovery">Repair Possible Recovery</option>
              <option value="recovery_only">Recovery Only</option>
            </select>
            <select name="vehicleSize" value={form.vehicleSize} onChange={handleChange} className="border rounded-md p-2">
              <option value="motorcycle">Motorcycle</option>
              <option value="small_car">Small Car</option>
              <option value="standard_car">Standard Car</option>
              <option value="van">Van</option>
              <option value="lorry">Lorry</option>
            </select>
            <Input
              type="number"
              name="priority"
              value={form.priority}
              onChange={handleChange}
              placeholder="Priority"
              className="w-24"
            />
            <Button onClick={addJob}>➕ Add</Button>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th>ID</th>
                <th>Pickup</th>
                <th>Dropoff</th>
                <th>Issue</th>
                <th>Vehicle Size</th>
                <th>Priority</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>{j.id}</td>
                  <td>{`${j.pickupLat}, ${j.pickupLng}`}</td>
                  <td>{`${j.dropoffLat}, ${j.dropoffLng}`}</td>
                  <td>{j.issueType}</td>
                  <td>{j.vehicleSize}</td>
                  <td>{j.priority}</td>
                  <td>
                    <Button variant="destructive" onClick={() => deleteJob(j.id)}>
                      🗑️ Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {jobs.length > 0 && (
            <div className="mt-4 flex gap-2">
              <Button onClick={() => syncWithBackend()} variant="default">
                🔄 Sync Jobs
              </Button>
              <Button onClick={clearJobs} variant="destructive">
                🧹 Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
