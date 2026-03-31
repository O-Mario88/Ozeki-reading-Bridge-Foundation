"use client";

import React, { useState } from "react";
import { PortalUser, SupportRequestRecord, PortalUserAdminRecord } from "@/lib/types";
import { 
  Search, LifeBuoy, BookOpen, GraduationCap, MapPin, 
  BarChart3, Settings, AlertCircle, CheckCircle2, FileText, 
  MonitorPlay, MessageSquare, Wrench, ChevronRight, PlusCircle,
  Clock, ArrowLeft
} from "lucide-react";
import SupportManager from "./SupportManager";

interface Props {
  user: PortalUser;
  initialRequests: SupportRequestRecord[];
  staffMembers: PortalUserAdminRecord[];
}

type TabState = "home" | "submit" | "tracker";

const QUICK_ACTIONS = [
  { icon: Settings, label: "Reset Password", desc: "Manage portal access" },
  { icon: AlertCircle, label: "Report Bug", desc: "System or UI error" },
  { icon: MapPin, label: "Update School Data", desc: "Fix directory info" },
  { icon: FileText, label: "Download Toolkit", desc: "Access standard resources" },
  { icon: Wrench, label: "Schedule Coaching", desc: "Request standard visit" },
  { icon: MonitorPlay, label: "Training Inquiry", desc: "Ask about sessions" },
  { icon: BookOpen, label: "Assessment Help", desc: "NLIS data entry help" },
  { icon: MessageSquare, label: "Feature Request", desc: "Suggest improvement" },
];

const MODULE_HELP = [
  { icon: GraduationCap, title: "Schools Directory", desc: "Managing school profiles, headteachers, and classes.", color: "bg-blue-50 text-blue-600" },
  { icon: MonitorPlay, title: "Trainings", desc: "Logging attendance, feedback, and session reports.", color: "bg-indigo-50 text-indigo-600" },
  { icon: MapPin, title: "Visits", desc: "Coaching standards, rubrics, and lesson evaluations.", color: "bg-orange-50 text-orange-600" },
  { icon: BookOpen, title: "Assessments", desc: "EGRA integration, story tracking, and learning outcomes.", color: "bg-emerald-50 text-emerald-600" },
  { icon: BarChart3, title: "Impact Reports", desc: "Generating AI narratives, PDFs, and scope aggregates.", color: "bg-purple-50 text-purple-600" },
];

const HELP_ARTICLES = [
  { title: "How to log a coaching visit", category: "Visits", tags: ["coaching", "visit", "rubric", "evaluation", "teacher"] },
  { title: "Updating headteacher contact info", category: "Directory", tags: ["headteacher", "phone", "email", "school", "directory"] },
  { title: "EGRA baseline entry guide", category: "Assessments", tags: ["egra", "baseline", "reading", "assessment", "score"] },
  { title: "Generate district impact report", category: "Reports", tags: ["impact", "report", "district", "pdf", "generate"] },
  { title: "Reset my portal password", category: "Account", tags: ["password", "login", "account", "access", "reset"] },
  { title: "Submit training attendance", category: "Trainings", tags: ["training", "attendance", "roster", "participant", "submit"] },
];

export default function SupportHubClient({ user, initialRequests, staffMembers }: Props) {
  const [activeTab, setActiveTab] = useState<TabState>("home");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Submit Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formData, setFormData] = useState({
    contactName: user.fullName || "",
    contactRole: (user.role as string) || "",
    contactInfo: user.email || "",
    supportTypes: [] as string[],
    urgency: "medium",
    message: "",
  });

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "submit" || tabParam === "tracker") {
      setActiveTab(tabParam);
    }
    const typeParam = params.get("type");
    if (typeParam) {
      setFormData(prev => ({ ...prev, supportTypes: [typeParam] }));
    }
  }, []);

  const handleSupportTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      supportTypes: prev.supportTypes.includes(type)
        ? prev.supportTypes.filter(t => t !== type)
        : [...prev.supportTypes, type]
    }));
  };

  const filteredArticles = searchQuery 
    ? HELP_ARTICLES.filter(a => 
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.supportTypes.length === 0 || !formData.message.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/portal/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSubmitSuccess(true);
      } else {
        alert("Failed to create support request. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("System error. Please contact a system administrator via email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Navigation Headers */}
      {activeTab !== "home" && (
        <button 
          onClick={() => setActiveTab("home")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium border border-gray-200 bg-white px-3 py-1.5 rounded-lg shadow-sm w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Support Center
        </button>
      )}

      {/* HOME TAB */}
      {activeTab === "home" && (
        <div className="ds-dashboard-main">
          {/* 1. HERO & SEARCH */}
          <div className="ds-card" style={{ background: "linear-gradient(135deg, var(--ds-accent-blue), var(--ds-accent-purple))", color: "white", padding: "3rem 2rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "relative", zIndex: 1, maxWidth: "600px", margin: "0 auto" }}>
              <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 0.5rem", letterSpacing: "-0.02em" }}>
                How can we help you today?
              </h1>
              <p style={{ fontSize: "0.95rem", opacity: 0.9, marginBottom: "2rem" }}>
                Search our knowledge base, submit a new request, or track your existing tickets.
              </p>
              
              <div style={{ position: "relative", maxWidth: "500px", margin: "0 auto" }}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search articles, guides, and known issues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%", padding: "1rem 1rem 1rem 3rem", borderRadius: "12px", border: "none", outline: "none", fontSize: "1rem", color: "var(--ds-text-primary)", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                />
              </div>

              <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
                <button 
                  onClick={() => setActiveTab("submit")}
                  style={{ background: "#ffffff", color: "var(--ds-accent-blue)", padding: "0.6rem 1.25rem", borderRadius: "8px", fontWeight: 700, fontSize: "0.85rem", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <PlusCircle className="w-4 h-4" /> Submit Request
                </button>
                <button 
                  onClick={() => setActiveTab("tracker")}
                  style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff", padding: "0.6rem 1.25rem", borderRadius: "8px", fontWeight: 700, fontSize: "0.85rem", border: "1px solid rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", backdropFilter: "blur(4px)" }}
                >
                  <LifeBuoy className="w-4 h-4" /> Track Existing
                </button>
              </div>
            </div>
          </div>

          {/* 6. KNOWN ISSUES / SYSTEM STATUS */}
          {!searchQuery && (
            <div className="ds-alert-banner success">
              <CheckCircle2 className="w-5 h-5" />
              <div>
                <span style={{ display: "block", fontWeight: 700 }}>All Systems Operational</span>
                <span style={{ fontSize: "0.75rem", opacity: 0.8, fontWeight: 400 }}>Report generation and sync functions are normal.</span>
              </div>
            </div>
          )}

          {searchQuery ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6">
              <h3 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-slate-400" /> Search Results for "{searchQuery}"
              </h3>
              {filteredArticles.length > 0 ? (
                <ul className="divide-y divide-slate-50">
                  {filteredArticles.map((article, i) => (
                    <li key={i} className="py-3 flex items-center justify-between group cursor-pointer hover:bg-slate-50/50 rounded-lg px-2 -mx-2 transition-colors">
                      <div>
                        <p className="font-bold text-indigo-600 text-sm group-hover:text-indigo-800 transition-colors">{article.title}</p>
                        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">{article.category}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">No articles found matching your search.</p>
                  <button 
                    onClick={() => setActiveTab("submit")}
                    className="mt-4 text-sm font-bold text-indigo-600 hover:underline"
                  >
                    Submit a support request instead
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* 2. QUICK ACTIONS */}
              <div>
                <h2 className="ds-action-section-title">Support Actions</h2>
                <div className="ds-action-grid">
                  {QUICK_ACTIONS.map((action, i) => {
                    const colors = ["blue", "green", "pink", "purple", "orange", "teal"];
                    const color = colors[i % colors.length];
                    return (
                      <button
                        key={i}
                        onClick={() => setActiveTab("submit")}
                        className={`ds-action-card ${color}`}
                        style={{ border: "1px solid #f3f4f6", cursor: "pointer", textAlign: "left", width: "100%", background: "white" }}
                      >
                        <div className="ds-action-icon">
                          <action.icon className="w-5 h-5" />
                        </div>
                        <div className="ds-action-text">
                          <span className="ds-action-title">{action.label}</span>
                          <span className="ds-action-subtitle">{action.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. MODULE-BASED HELP */}
              <div>
                <h2 className="ds-action-section-title">Module Guides</h2>
                <div className="ds-two-col">
                  {MODULE_HELP.map((mod, i) => {
                    const colors = ["blue", "pink", "orange", "green", "purple"];
                    const color = colors[i % colors.length];
                    return (
                      <div key={i} className={`ds-metric-card ${color}`} style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-start", justifyContent: "flex-start", background: "white", border: "1px solid #f3f4f6" }}>
                        <div className="ds-metric-icon" style={{ width: "48px", height: "48px" }}>
                          <mod.icon className="w-6 h-6" />
                        </div>
                        <div className="ds-metric-content">
                          <span className="ds-metric-title" style={{ fontSize: "0.9rem", color: "var(--ds-text-primary)", fontWeight: 700 }}>{mod.title}</span>
                          <span className="ds-metric-sub" style={{ marginTop: "0.25rem", lineHeight: 1.4, whiteSpace: "normal" }}>{mod.desc}</span>
                          <button className="ds-card-action" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.25rem", marginTop: "0.5rem", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
                            View guide <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* SUBMIT TAB */}
      {activeTab === "submit" && (
        <div className="ds-card" style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div className="ds-card-header" style={{ borderBottom: "1px solid #f4f5f8", paddingBottom: "1.25rem", display: "block" }}>
            <h2 className="ds-card-title" style={{ fontSize: "1.25rem" }}>Submit a Support Request</h2>
            <p className="ds-metric-sub" style={{ marginTop: "0.25rem" }}>Our team will get back to you within 24-48 business hours.</p>
          </div>

          {submitSuccess ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{ width: "64px", height: "64px", background: "rgba(76, 175, 80, 0.1)", color: "var(--ds-accent-green)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem", color: "var(--ds-text-primary)" }}>Request Submitted!</h3>
              <p style={{ color: "var(--ds-text-secondary)", fontSize: "0.85rem", marginBottom: "2rem" }}>We have received your request and will follow up shortly.</p>
              <button
                onClick={() => {
                  setSubmitSuccess(false);
                  setActiveTab("tracker");
                }}
                style={{ background: "var(--ds-accent-blue)", color: "white", border: "none", padding: "0.6rem 1.5rem", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
              >
                Track My Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ paddingTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--ds-text-secondary)", margin: "0 0 0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Contact Name</label>
                  <input
                    required
                    type="text"
                    value={formData.contactName}
                    onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e4e6ef", fontSize: "0.85rem", color: "var(--ds-text-primary)", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--ds-text-secondary)", margin: "0 0 0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Role</label>
                  <input
                    required
                    type="text"
                    value={formData.contactRole}
                    onChange={e => setFormData({ ...formData, contactRole: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e4e6ef", fontSize: "0.85rem", color: "var(--ds-text-primary)", outline: "none" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--ds-text-secondary)", margin: "0 0 0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Contact Information (Email or Phone)</label>
                <input
                  required
                  type="text"
                  value={formData.contactInfo}
                  onChange={e => setFormData({ ...formData, contactInfo: e.target.value })}
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e4e6ef", fontSize: "0.85rem", color: "var(--ds-text-primary)", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--ds-text-secondary)", margin: "0 0 0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Support Category</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {[
                    "phonics training", "coaching visit", "learner assessment",
                    "remedial & catch-up support", "1001 story", "portal bug", "access issue"
                  ].map(t => {
                    const isActive = formData.supportTypes.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSupportTypeToggle(t)}
                        style={{
                          padding: "0.4rem 0.8rem", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", border: "1px solid #e4e6ef", cursor: "pointer", transition: "all 0.15s ease",
                          background: isActive ? "var(--ds-accent-blue)" : "#f8f9fa",
                          color: isActive ? "#fff" : "var(--ds-text-secondary)",
                          borderColor: isActive ? "var(--ds-accent-blue)" : "#e4e6ef"
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--ds-text-secondary)", margin: "0 0 0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Urgency</label>
                <select 
                  value={formData.urgency}
                  onChange={e => setFormData({ ...formData, urgency: e.target.value })}
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e4e6ef", fontSize: "0.85rem", color: "var(--ds-text-primary)", outline: "none", background: "#fff" }}
                >
                  <option value="low">Low - Routine inquiry</option>
                  <option value="medium">Medium - Needs action soon</option>
                  <option value="high">High - Critical issue</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--ds-text-secondary)", margin: "0 0 0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Message / Description</label>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Please describe the issue or request in detail..."
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e4e6ef", fontSize: "0.85rem", color: "var(--ds-text-primary)", outline: "none", resize: "none", fontFamily: "inherit" }}
                ></textarea>
              </div>

              <div style={{ paddingTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
                <button
                  disabled={isSubmitting || formData.supportTypes.length === 0}
                  type="submit"
                  style={{ background: "var(--ds-accent-blue)", color: "white", padding: "0.8rem 2rem", borderRadius: "8px", fontWeight: 700, fontSize: "0.9rem", border: "none", cursor: "pointer", transition: "opacity 0.15s", opacity: (isSubmitting || formData.supportTypes.length === 0) ? 0.6 : 1 }}
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TRACKER TAB */}
      {activeTab === "tracker" && (
        user.isAdmin || user.isSuperAdmin || user.role === "Staff" ? (
          <div className="ds-card" style={{ padding: "1.5rem" }}>
            <SupportManager initialRequests={initialRequests} staffMembers={staffMembers} />
          </div>
        ) : (
          <div className="ds-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="ds-card-header" style={{ padding: "1.5rem 1.5rem 0", marginBottom: "1rem" }}>
              <div>
                <h2 className="ds-card-title">My Support Requests</h2>
                <p className="ds-metric-sub" style={{ marginTop: "0.25rem" }}>Track the status of your submitted tickets.</p>
              </div>
              
              <button 
                onClick={() => setActiveTab("submit")}
                style={{ background: "var(--ds-accent-blue)", color: "white", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 700, fontSize: "0.8rem", border: "none", cursor: "pointer" }}
              >
                New Request
              </button>
            </div>

            <div className="ds-table-wrap">
              {initialRequests.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
                  <div style={{ width: "64px", height: "64px", background: "#f8f9fa", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                    <Clock className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ds-text-primary)", margin: "0 0 0.25rem" }}>No active requests</h3>
                  <p style={{ color: "var(--ds-text-muted)", fontSize: "0.85rem" }}>When you submit tickets, they will appear here.</p>
                </div>
              ) : (
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Date Submited</th>
                      <th>Category</th>
                      <th>Message Preview</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialRequests.map((req) => {
                      const isNew = req.status === 'New';
                      const isClosed = req.status === 'Closed';
                      return (
                        <tr key={req.id}>
                          <td style={{ fontFamily: "monospace", color: "var(--ds-accent-blue)", fontWeight: 600 }}>#{req.id.toString().padStart(4, '0')}</td>
                          <td style={{ color: "var(--ds-text-secondary)", fontSize: "0.8rem" }}>
                            {new Date(req.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                              {req.supportTypes.map(t => (
                                <span key={t} style={{ background: "#f8f9fa", color: "var(--ds-text-secondary)", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                                  {t}
                               </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ color: "var(--ds-text-primary)", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {req.message}
                          </td>
                          <td>
                            <span className={`ds-badge ds-badge-${
                              isNew ? 'info' :
                              isClosed ? 'default' :
                              'warning'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
