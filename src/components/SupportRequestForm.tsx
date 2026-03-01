"use client";

import React, { useState, useEffect } from "react";
import { SupportRequestInput, SupportType } from "@/lib/types";

interface SchoolOption {
    id: number;
    name: string;
    district: string;
}

export default function SupportRequestForm() {
    const [formData, setFormData] = useState<SupportRequestInput>({
        contactName: "",
        contactRole: "",
        contactInfo: "",
        supportTypes: [],
        urgency: "medium",
        message: ""
    });

    const [schools, setSchools] = useState<SchoolOption[]>([]);
    const [search, setSearch] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (search.length > 2) {
            // Simplified search logic, ideally this would be an API call
            fetch(`/api/portal/schools?search=${search}`)
                .then(res => res.json())
                .then(data => setSchools(data.slice(0, 10)))
                .catch(err => console.error("Error fetching schools:", err));
        } else {
            setSchools([]);
        }
    }, [search]);

    const toggleSupportType = (type: SupportType) => {
        setFormData(prev => ({
            ...prev,
            supportTypes: prev.supportTypes.includes(type)
                ? prev.supportTypes.filter(t => t !== type)
                : [...prev.supportTypes, type]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/portal/support", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to submit request");
            }

            setSubmitted(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="bg-green-50 p-8 rounded-2xl border-2 border-green-200 text-center max-w-2xl mx-auto my-12 animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
                <p className="text-gray-600">
                    Thank you for reaching out. A staff member will contact you soon.
                </p>
                <button
                    onClick={() => setSubmitted(false)}
                    className="mt-6 px-6 py-2 bg-white border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
                >
                    Submit another request
                </button>
            </div>
        );
    }

    const supportTypeOptions: { value: SupportType; label: string; icon: string }[] = [
        { value: "phonics training", label: "Phonics Training", icon: "📚" },
        { value: "coaching visit", label: "Coaching Visit", icon: "👨‍🏫" },
        { value: "learner assessment", label: "Learner Assessment", icon: "📝" },
        { value: "1001 story", label: "1001 Story Library", icon: "📖" }
    ];

    return (
        <div className="max-w-3xl mx-auto my-12 px-6">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Request School Support</h2>
                    <p className="text-gray-500">Submit a request for training or resources for your school.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* School Selection */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">1. School Information</h3>
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Search for your school</label>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Type school name..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                            {schools.length > 0 && !formData.schoolId && (
                                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-top-2">
                                    {schools.map(school => (
                                        <button
                                            key={school.id}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, schoolId: school.id }));
                                                setSearch(school.name);
                                                setSchools([]);
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex justify-between items-center group transition-colors"
                                        >
                                            <span className="font-medium text-gray-800">{school.name}</span>
                                            <span className="text-xs text-gray-400 group-hover:text-indigo-400 transition-colors uppercase">{school.district}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {!formData.schoolId && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">If your school is not listed, describe the location</label>
                                <input
                                    type="text"
                                    value={formData.locationText || ""}
                                    onChange={(e) => setFormData(prev => ({ ...prev, locationText: e.target.value }))}
                                    placeholder="e.g. Namasuba Village, Wakiso"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                        )}
                    </section>

                    {/* Contact Information */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                        <div className="md:col-span-2">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">2. Contact Details</h3>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                            <input
                                required
                                type="text"
                                value={formData.contactName}
                                onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <input
                                required
                                type="text"
                                value={formData.contactRole}
                                onChange={(e) => setFormData(prev => ({ ...prev, contactRole: e.target.value }))}
                                placeholder="e.g. Head Teacher"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number / Email</label>
                            <input
                                required
                                type="text"
                                value={formData.contactInfo}
                                onChange={(e) => setFormData(prev => ({ ...prev, contactInfo: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </section>

                    {/* Support Types */}
                    <section className="space-y-4 pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">3. What support do you need?</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {supportTypeOptions.map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => toggleSupportType(option.value)}
                                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${formData.supportTypes.includes(option.value)
                                            ? "bg-indigo-50 border-indigo-500 shadow-lg scale-105"
                                            : "bg-white border-gray-100 hover:border-gray-200 grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
                                        }`}
                                >
                                    <span className="text-2xl">{option.icon}</span>
                                    <span className={`text-[10px] font-bold uppercase text-center ${formData.supportTypes.includes(option.value) ? "text-indigo-700" : "text-gray-400"
                                        }`}>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Urgency & Message */}
                    <section className="space-y-4 pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">4. Additional Information</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                            <div className="flex gap-4">
                                {["low", "medium", "high"].map(level => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, urgency: level as any }))}
                                        className={`flex-1 py-2 rounded-xl border-2 transition-all uppercase text-[10px] font-bold tracking-widest ${formData.urgency === level
                                                ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md"
                                                : "bg-white border-gray-100 text-gray-400"
                                            }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">How can we help? (Details)</label>
                            <textarea
                                required
                                rows={4}
                                value={formData.message}
                                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            ></textarea>
                        </div>
                    </section>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 animate-in shake duration-300 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        disabled={isSubmitting || formData.supportTypes.length === 0}
                        className={`w-full py-4 rounded-2xl font-bold text-white shadow-xl transition-all duration-300 transform active:scale-95 ${isSubmitting || formData.supportTypes.length === 0
                                ? "bg-gray-300 cursor-not-allowed translate-y-0"
                                : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-2xl hover:-translate-y-1"
                            }`}
                    >
                        {isSubmitting ? "Submitting..." : "Send Request"}
                    </button>
                </form>
            </div>
        </div>
    );
}
