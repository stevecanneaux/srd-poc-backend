import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Edit2, RefreshCcw, Search } from "lucide-react";

export default function VehiclesManager() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    id: "",
    type: "van_only",
    postcode: "",
    shiftStart: "",
    shiftEnd: "",
  });
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch vehicles from backend
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://srd-poc-backend.vercel.app/api/vehicles/list");
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles || []);
        setFilteredVehicles(data.vehicles || []);
      }
    } catch (err) {
      toast({ title: "Backend unreachable", description: `${err}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Filter vehicles by search
  useEffect(() => {
    setFilteredVehicles(
      vehicles.filter((v) =>
        v.id.toLowerCase().includes(search.toLowerCase()) ||
        v.postcode.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, vehicles]);

  // Add or update vehicle
  const saveVehicle = () => {
    if (!form.id || !form.postcode || !form.shiftStart || !form.shiftEnd) {
      toast({ title: "Missing fields", description: "Please fill in all fields" });
      return;
    }

    if (editing) {
      setVehicles(
        vehicles.map((v) => (v.id === editing.id ? { ...form } : v))
      );
      toast({ title: "Vehicle updated", description: `${form.id} has been updated.` });
      setEditing(null);
    } else {
      setVehicles([...vehicles, form]);
      toast({ title: "Vehicle added", description: `${form.id} added successfully.` });
    }

    setForm({ id: "", type: "van_only", postcode: "", shiftStart: "", shiftEnd: "" });
  };

  // Edit existing vehicle
  const handleEdit = (vehicle: any) => {
    setEditing(vehicle);
    setForm(vehicle);
  };

  // Remove a vehicle
  const handleRemove = (id: string) => {
    if (confirm(`Remove vehicle ${id}?`)) {
      setVehicles(vehicles.filter((v) => v.id !== id));
      toast({ title: "Vehicle removed", description: `${id} has been removed.` });
    }
  };

  // Clear all vehicles
  const clearAll = async () => {
    if (!confirm("Are you sure you want to clear all vehicles?")) return;
    try {
      const res = await fetch("https://srd-poc-backend.vercel.app/api/vehicles/clear", {
        method: "POST",
      });
      if (res.ok) {
        setVehicles([]);
        setFilteredVehicles([]);
        toast({ title: "All vehicles cleared" });
      } else {
        toast({ title: "Failed to clear vehicles" });
      }
    } catch {
      toast({ title: "Error", description: "Could not contact backend." });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="text-xl font-semibold">🚚 Vehicles Manager</CardTitle>
          <div className="flex gap-2">
            <Button onClick={fetchVehicles} variant="outline" disabled={loading}>
              <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button onClick={clearAll} variant="destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Clear All
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search by ID or Postcode"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Add / Edit form */}
          <div className="grid md:grid-cols-5 gap-2">
            <Input name="id" placeholder="Vehicle ID" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
            <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val })}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="van_only">Van Only</SelectItem>
                <SelectItem value="van_tow">Van Tow</SelectItem>
                <SelectItem value="small_ramp">Small Ramp</SelectItem>
                <SelectItem value="hiab_grabber">HIAB Grabber</SelectItem>
                <SelectItem value="lorry_recovery">Lorry Recovery</SelectItem>
              </SelectContent>
            </Select>
            <Input name="postcode" placeholder="Postcode" value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
            <Input type="datetime-local" name="shiftStart" value={form.shiftStart} onChange={(e) => setForm({ ...form, shiftStart: e.target.value })} />
            <Input type="datetime-local" name="shiftEnd" value={form.shiftEnd} onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })} />
          </div>

          <Button className="w-full md:w-auto" onClick={saveVehicle}>
            {editing ? "💾 Save Changes" : "➕ Add Vehicle"}
          </Button>

          {/* Vehicles Table */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Postcode</th>
                  <th className="text-left p-2">Shift Start</th>
                  <th className="text-left p-2">Shift End</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((v) => (
                  <tr key={v.id} className="border-t hover:bg-gray-50">
                    <td className="p-2">{v.id}</td>
                    <td className="p-2">{v.type}</td>
                    <td className="p-2">{v.postcode}</td>
                    <td className="p-2">{new Date(v.shiftStart).toLocaleString()}</td>
                    <td className="p-2">{new Date(v.shiftEnd).toLocaleString()}</td>
                    <td className="p-2 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(v)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleRemove(v.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center p-4 text-gray-500">
                      No vehicles found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
