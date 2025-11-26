import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

type IssueType = "repair" | "repair_possible_recovery" | "recovery_only";
type VehicleSize = "motorcycle" | "small_car" | "standard_car" | "van" | "lorry";

interface Job {
  id: string;
  customerName: string;
  contactNumber: string;
  pickupPostcode: string;
  dropoffPostcode: string;
  issueType: IssueType;
  vehicleSize: VehicleSize;
  priority: number;
  status?: string;
}

export default function JobsManager() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [form, setForm] = useState<Job>({
    id: "",
    customerName: "",
    contactNumber: "",
    pickupPostcode: "",
    dropoffPostcode: "",
    issueType: "repair",
    vehicleSize: "standard_car",
    priority: 1,
    status: "pending",
  });
  const [loading, setLoading] = useState(false);
  const API_BASE = "https://srd-poc-backend.vercel.app/api/jobs";

  // Fetch job list
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/list`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      } else {
        console.error("Failed to fetch jobs");
      }
    } catch (err) {
      console.error("Backend unreachable:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  const addJob = async () => {
    if (
      !form.id ||
      !form.customerName ||
      !form.contactNumber ||
      !form.pickupPostcode ||
      !form.dropoffPostcode
    ) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const newJob = { ...form };
    const updated = [...jobs, newJob];
    setJobs(updated);
    setForm({
      id: "",
      customerName: "",
      contactNumber: "",
      pickupPostcode: "",
      dropoffPostcode: "",
      issueType: "repair",
      vehicleSize: "standard_car",
      priority: 1,
      status: "pending",
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

  const deleteJob = async (id: string) => {
    const updated = jobs.filter((j) => j.id !== id);
    setJobs(updated);
    await syncWithBackend(updated, "Job removed successfully");
  };

  return (
    <main className="p-8 font-sans">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>📋 Jobs Manager</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="mb-2">⏳ Updating job list...</p>}

          <div className="flex flex-wrap gap-2 mb-4">
            <Input name="id" value={form.id} onChange={handleChange} placeholder="Job ID" className="w-28" />
            <Input name="customerName" value={form.customerName} onChange={handleChange} placeholder="Customer Name" className="w-40" />
            <Input name="contactNumber" value={form.contactNumber} onChange={handleChange} placeholder="Contact Number" className="w-36" />
            <Input name="pickupPostcode" value={form.pickupPostcode} onChange={handleChange} placeholder="Pickup Postcode" className="w-32" />
            <Input name="dropoffPostcode" value={form.dropoffPostcode} onChange={handleChange} placeholder="Dropoff Postcode" className="w-32" />

            <select name="issueType" value={form.issueType} onChange={handleChange} className="border rounded-md p-2">
              <option value="repair">Repair</option>
              <option value="repair_possible_recovery">Repair + Recovery</option>
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
              name="priority"
              type="number"
              min="1"
              max="5"
              value={form.priority}
              onChange={handleChange}
              className="w-20"
              placeholder="Priority"
            />

            <Button onClick={addJob}>➕ Add</Button>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th>ID</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Pickup</th>
                <th>Dropoff</th>
                <th>Issue</th>
                <th>Vehicle</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b">
                  <td>{j.id}</td>
                  <td>{j.customerName}</td>
                  <td>{j.contactNumber}</td>
                  <td>{j.pickupPostcode}</td>
                  <td>{j.dropoffPostcode}</td>
                  <td>{j.issueType}</td>
                  <td>{j.vehicleSize}</td>
                  <td>{j.priority}</td>
                  <td>{j.status}</td>
                  <td>
                    <Button variant="destructive" size="sm" onClick={() => deleteJob(j.id)}>
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

