"use client";

import { useState, useEffect } from "react";
import { Settings, Save, AlertCircle, CheckCircle2, Server, Key, Bot } from "lucide-react";

type GoogleWorkspaceStatus = {
    configured: boolean;
    googleConnected: boolean;
    calendarId: string | null;
    missingEnv: string[];
    grantedScopes: string[];
    missingScopes: string[];
    calendarAccessible: boolean;
    calendarSummary: string | null;
    tokenValid: boolean;
    error: string | null;
};

export default function TrainingSettingsPage() {
    const [settings, setSettings] = useState({
        googleConnected: false,
        defaultMeetingsRecorded: true,
        aiNotesEnabled: true,
        aiModel: "gpt-4o-mini",
        googleStatus: null as GoogleWorkspaceStatus | null,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    useEffect(() => {
        fetch("/api/portal/settings/training")
            .then(r => r.json())
            .then(data => {
                setSettings(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load settings:", err);
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSuccessMsg("");
        try {
            const res = await fetch("/api/portal/settings/training", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            if (res.ok) {
                setSuccessMsg("Settings saved successfully.");
            }
        } catch (e) {
            console.error(e);
        }
        setSaving(false);
    };

    if (loading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 lg:p-10 bg-white min-h-screen">

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-brand-primary flex items-center">
                    <Settings className="w-6 h-6 mr-3 text-[#00155F]" />
                    Online Training Settings
                </h1>
                <p className="text-gray-500 mt-2">
                    Configure Google Workspace integration and AI meeting note behaviors. Only super administrators can modify these settings.
                </p>
            </div>

            {successMsg && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center text-orange-800">
                    <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" />
                    {successMsg}
                </div>
            )}

            <div className="space-y-8">

                {/* Google Workspace Section */}
                <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center">
                        <Server className="w-5 h-5 text-gray-500 mr-2" />
                        <h2 className="text-lg font-bold text-brand-primary">Google Workspace API</h2>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-semibold text-brand-primary">Connection Status</h3>
                                <p className="text-sm text-gray-500 mt-1">Authenticate Ozeki to schedule Meets on behalf of staff.</p>
                                {settings.googleStatus?.calendarId ? (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Calendar ID: <strong>{settings.googleStatus.calendarId}</strong>
                                    </p>
                                ) : null}
                            </div>
                            <div className="mt-1">
                                {settings.googleConnected ? (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-800 border border-orange-200">
                                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Connected
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                        Not Connected
                                    </span>
                                )}
                            </div>
                        </div>

                        {settings.googleStatus?.missingEnv?.length ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                <strong>Missing environment variables:</strong> {settings.googleStatus.missingEnv.join(", ")}
                            </div>
                        ) : null}

                        {settings.googleStatus?.missingScopes?.length ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                <strong>Missing OAuth scopes:</strong> {settings.googleStatus.missingScopes.join(", ")}
                            </div>
                        ) : null}

                        {settings.googleStatus?.error ? (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                                <strong>Last Google check:</strong> {settings.googleStatus.error}
                            </div>
                        ) : null}

                        <div className="pt-4 border-t border-gray-100">
                            <a
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors inline-flex items-center"
                                href="/api/portal/integrations/google/status"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Key className="w-4 h-4 mr-2 text-gray-500" />
                                {settings.googleConnected ? "View Live Google Status" : "Check Google Workspace Setup"}
                            </a>
                            <p className="text-xs text-gray-400 mt-2 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Requires Google Cloud project credentials and OAuth scopes for Calendar + Meet.
                            </p>
                        </div>
                    </div>
                </section>

                {/* AI Meeting Notes Section */}
                <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center">
                        <Bot className="w-5 h-5 text-gray-500 mr-2" />
                        <h2 className="text-lg font-bold text-brand-primary">AI Meeting Notes Generation</h2>
                    </div>

                    <div className="p-6 space-y-6">

                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-brand-primary">Enable AI Processing</h3>
                                <p className="text-sm text-gray-500 mt-1">Automatically generate minutes and action items from transcripts.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.aiNotesEnabled}
                                    onChange={(e) => setSettings({ ...settings, aiNotesEnabled: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#00155F]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00155F]"></div>
                            </label>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Primary AI Model</label>
                            <select
                                value={settings.aiModel}
                                onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
                                className="block w-full max-w-xs pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#00155F] focus:border-[#00155F] sm:text-sm rounded-lg"
                            >
                                <option value="gpt-4o-mini">gpt-4o-mini (Faster, Recommended)</option>
                                <option value="gpt-4">gpt-4 (Slower, Higher Reasoning)</option>
                            </select>
                            <p className="text-xs text-amber-600 mt-2 bg-amber-50 rounded p-2 inline-block border border-amber-200">
                                <strong>Guardrail Info:</strong> Models are strictly prompted to extract facts from the transcript. Data hallucination risks are minimized.
                            </p>
                        </div>

                    </div>
                </section>

            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-bold rounded-lg shadow-sm text-white bg-[#FA7D15] hover:bg-[#D96A0F] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FA7D15] disabled:opacity-50 transition-colors"
                >
                    {saving ? (
                        <span className="animate-pulse">Saving...</span>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Configuration
                        </>
                    )}
                </button>
            </div>

        </div>
    );
}
