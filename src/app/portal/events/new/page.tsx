"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deliveryType, setDeliveryType] = useState("In-Person Training");
  const [fundingType, setFundingType] = useState("Free Ozeki Event");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/scheduler/create", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
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
    <div className="portal-shell p-6 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">Schedule New Event</h1>
        <p className="text-slate-500">Configure parameters for Online Live Sessions or Physical Trainings.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
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
                  <select name="category" className="w-full border rounded-lg px-3 py-2">
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
                  >
                    <option>Free Ozeki Event</option>
                    <option>Sponsored Training</option>
                    <option>Paid Training</option>
                  </select>
                </div>
              </div>

              {/* Conditional Rendering based on PRD Section 7 & 8 */}
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
                    <select name="currency" className="w-full border rounded-lg px-3 py-2">
                      <option>UGX</option>
                      <option>USD</option>
                    </select>
                  </div>
                </div>
              )}

              {deliveryType === "In-Person Training" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 border-dashed mt-4">
                  <div>
                    <label className="block text-sm font-medium text-emerald-700 mb-1">Physical Venue</label>
                    <input required name="venueName" className="w-full border rounded-lg px-3 py-2" placeholder="e.g. Imperial Royale Hotel" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-emerald-700 mb-1">District</label>
                    <input required name="district" className="w-full border rounded-lg px-3 py-2" placeholder="e.g. Kampala" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-emerald-700 mb-1">Venue Address</label>
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
                  <input required type="date" name="eventDate" className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input required type="time" name="startTime" className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input required type="time" name="endTime" className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Sidebar Info & Submit */}
        <div className="space-y-6">
          <div className="ozeki-card">
            <h2 className="text-lg font-bold mb-4">Finalize Scheduling</h2>
            <p className="text-sm text-slate-500 mb-6">Double-check all configurations. Once scheduled, Google Calendar items will be broadcasted and Registration modules will open.</p>
            <button 
              type="submit" 
              form="schedule-form" 
              disabled={loading}
              className="ozeki-btn ozeki-btn-primary w-full text-center py-3 text-lg"
            >
              {loading ? "Provisioning..." : "Launch Event Scheduler"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
