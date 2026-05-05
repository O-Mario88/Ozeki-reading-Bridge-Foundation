"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormModal } from "@/components/forms";

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deliveryType, setDeliveryType] = useState("In-Person Training");
  const [fundingType, setFundingType] = useState("Free Ozeki Event");

  const close = () => router.push("/portal/events");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/scheduler/create", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to create event");

      const result = await res.json();
      alert(`Event provisioned successfully! Code: ${result.event.event_code}`);
      router.push("/portal/events");
    } catch (_err) {
      alert("Error scheduling event. Please check logs.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormModal
      open
      onClose={close}
      title="Schedule New Event"
      description="Configure parameters for Online Live Sessions or Physical Trainings."
      closeLabel="Close form"
      maxWidth="1080px"
    >
      <form id="schedule-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Core Details */}
        <div className="ozeki-card space-y-4">
          <h2 className="text-lg font-bold border-b pb-2">Core Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Event Title</label>
              <input required name="title" className="w-full border rounded-lg px-3 py-2" placeholder="e.g. Masterclass in Synthetic Phonics" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select name="category" className="w-full border rounded-lg px-3 py-2" aria-label="Category">
                <option>Teacher Training</option>
                <option>Headteacher Workshop</option>
                <option>Policy Briefing</option>
                <option>Coaching Clinic</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea required name="description" rows={3} className="w-full border rounded-lg px-3 py-2" placeholder="Detailed syllabus or session breakdown..."></textarea>
          </div>
        </div>

        {/* Delivery & Funding Parameters */}
        <div className="ozeki-card space-y-4">
          <h2 className="text-lg font-bold border-b pb-2">Logistics & Delivery</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Delivery Type</label>
              <select
                name="deliveryType"
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 bg-slate-50"
                aria-label="Delivery Type"
              >
                <option>In-Person Training</option>
                <option>Online Live Session</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Funding Mechanism</label>
              <select
                name="fundingType"
                value={fundingType}
                onChange={(e) => setFundingType(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 bg-slate-50"
                aria-label="Funding Mechanism"
              >
                <option>Free Ozeki Event</option>
                <option>Sponsored Training</option>
                <option>Paid Training</option>
              </select>
            </div>
          </div>

          {fundingType === "Sponsored Training" && (
            <div>
              <label className="block text-sm font-medium mb-1">Sponsoring Partner Name</label>
              <input required name="sponsoringPartner" className="w-full border rounded-lg px-3 py-2" placeholder="e.g. UNICEF, BuildAfrica" />
            </div>
          )}

          {fundingType === "Paid Training" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Training Fee (per participant)</label>
                <input required type="number" name="trainingFee" className="w-full border rounded-lg px-3 py-2" placeholder="e.g. 50000" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select name="currency" className="w-full border rounded-lg px-3 py-2" aria-label="Currency">
                  <option>UGX</option>
                  <option>USD</option>
                </select>
              </div>
            </div>
          )}

          {deliveryType === "In-Person Training" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 border-dashed mt-4">
              <div>
                <label className="block text-sm font-medium text-[#066a67] mb-1">Physical Venue</label>
                <input required name="venueName" className="w-full border rounded-lg px-3 py-2" placeholder="e.g. Imperial Royale Hotel" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#066a67] mb-1">District</label>
                <input required name="district" className="w-full border rounded-lg px-3 py-2" placeholder="e.g. Kampala" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#066a67] mb-1">Venue Address</label>
                <input name="venueAddress" className="w-full border rounded-lg px-3 py-2" placeholder="Plot 4, Example Road..." />
              </div>
            </div>
          )}

          {deliveryType === "Online Live Session" && (
            <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm flex items-start gap-3 mt-4">
              <span className="text-xl">📹</span>
              <p>
                <strong>Google Meet Automation Active.</strong> Submitting this form will securely broker the Google Calendar integration and generate a unique Google Meet link for attendees automatically.
              </p>
            </div>
          )}
        </div>

        {/* Time Constraints */}
        <div className="ozeki-card space-y-4">
          <h2 className="text-lg font-bold border-b pb-2">Scheduling</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input required type="date" name="eventDate" className="w-full border rounded-lg px-3 py-2" aria-label="Date" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input required type="time" name="startTime" className="w-full border rounded-lg px-3 py-2" aria-label="Start time" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input required type="time" name="endTime" className="w-full border rounded-lg px-3 py-2" aria-label="End time" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={close} disabled={loading} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="ozeki-btn ozeki-btn-primary px-6 py-2 text-sm"
          >
            {loading ? "Provisioning..." : "Launch Event Scheduler"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}
