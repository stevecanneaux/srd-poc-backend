"use client";
import { useState, useEffect } from "react";
import { geocodeAddress } from "@/lib/geocode";

export default function JobsManager() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    id: "",
    pickupAddress: "",
    dropAddress: "",
    issueType: "repair",
    vehicleSize: "van",
  });

  useEffect(() => {
    const stored = localStorage.getItem("jobs");
    if (stored) setJobs(JSON.parse(stored));
  }, []);

  async function addJob() {
    if (!form.id || !form.pickupAddress || !form.dropAddress)
      return alert("Please enter Job ID, Pickup, and Drop addresses.");

    setLoading(true);
    try {
      const pickupCoords = await geocodeAddress(form.pickupAddress);
      const dropCoords = await geocodeAddress(form.dropAddress);

      if (!pickupCoords || !dropCoords) {
        alert("❌ Could not locate one or more addresses.");
        return;
      }

      const newJob = {
        id: form.id,
        pickup: pickupCoords,
        preferredDropPlaceId: null,
        secondaryDropPlaceId: null,
        homeFallback: dropCoords,
        issueType: form.issueType,
        vehicleSize: form.vehicleSize,
        pickupAddress: form.pickupAddress,
        dropAddress: form.dropAddress,
        priority: 1,
      };

      const updated = [...jobs, newJob]
