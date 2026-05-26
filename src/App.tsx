/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  History,
  Plus,
  Database,
  RefreshCw,
  Sliders,
  X,
  Mail,
  ArrowRight,
  ExternalLink,
  Lock,
  ListRestart,
  BarChart3,
  HelpCircle
} from "lucide-react";
import { CompleteAnalysisReport, ModelMetrics, DatasetItem, HistoryItem } from "./types";

export default function App() {
  // Main Input Fields
  const [inputText, setInputText] = useState("");
  const [inputSubject, setInputSubject] = useState("");
  const [scanning, setScanning] = useState(false);
  const [activeReport, setActiveReport] = useState<CompleteAnalysisReport | null>(null);

  // Stats & States
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [emails, setEmails] = useState<DatasetItem[]>([]);
  const [showRetrainModal, setShowRetrainModal] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // New training email payload
  const [addSubject, setAddSubject] = useState("");
  const [addText, setAddText] = useState("");
  const [addLabel, setAddLabel] = useState<"Phishing" | "Safe">("Phishing");
  const [isRetraining, setIsRetraining] = useState(false);

  // Active view tab in details panel
  const [resultsTab, setResultsTab] = useState<"indicators" | "deepAi" | "history" | "dataset">("indicators");

  // File Upload reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show preconditioned demo loader helpers
  const demoPhishingTemplate = {
    subject: "URGENT: Outstanding balance found on account",
    text: "Dear online client, unusual database activity required restricting your current access profile. Please authenticate credentials immediately via https://restricted-chasepay-safety-update.com/signin to confirm identity and check balance details. Delaying authentication beyond 12 hours results in final account termination."
  };

  const demoSafeTemplate = {
    subject: "Design guidelines for PhishGuard AI sprint",
    text: "Hello everyone, attached are the design patterns for our minimalistic workspace styling upgrade. We will run reviews on Friday to check contrast compatibility, interactive hover patterns, and responsive layout breakpoints. Please add your suggestions to GitHub before Thursday."
  };

  // Quick notifier helper
  const notify = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch metrics, emails, history on mount
  useEffect(() => {
    fetchMetrics();
    fetchHistory();
    fetchEmails();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/metrics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error("Error fetching metrics", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Error fetching history", err);
    }
  };

  const fetchEmails = async () => {
    try {
      const res = await fetch("/api/emails");
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      }
    } catch (err) {
      console.error("Error fetching dataset", err);
    }
  };

  // Run Real-Time AI scan
  const handleScan = async (overrideText?: string, overrideSubject?: string) => {
    const textToScan = overrideText !== undefined ? overrideText : inputText;
    const subjectToScan = overrideSubject !== undefined ? overrideSubject : inputSubject;

    if (!textToScan.trim()) {
      notify("Please provide or paste email text content to start scanning.", "error");
      return;
    }

    setScanning(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToScan, subject: subjectToScan })
      });

      if (res.ok) {
        const reportData: CompleteAnalysisReport = await res.json();
        setActiveReport(reportData);
        notify("Cybersecurity analysis completed securely.", "success");
        fetchHistory(); // Refresh scan history listing
        fetchMetrics(); // Refresh training summary statistics
      } else {
        notify("Server scanning error. Please retry.", "error");
      }
    } catch (err) {
      console.error("Scanning request failed", err);
      notify("Failed to reach scanner server.", "error");
    } finally {
      setScanning(false);
    }
  };

  // Handle Drag & Drop uploading of text files
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (file.type !== "text/plain" && !file.name.endsWith(".txt") && !file.name.endsWith(".eml")) {
      notify("Currently, only plain text (.txt) files are supported for import.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const targetText = event.target?.result as string;
      if (targetText) {
        // Try to guess subject if present at the top
        const firstLine = targetText.split("\n")[0];
        if (firstLine.toLowerCase().startsWith("subject:")) {
          setInputSubject(firstLine.replace(/subject:/i, "").trim());
          setInputText(targetText.substring(firstLine.length).trim());
        } else {
          setInputSubject(`Uploaded: ${file.name}`);
          setInputText(targetText);
        }
        notify(`Loaded content from file: ${file.name}`, "success");
      }
    };
    reader.readAsText(file);
  };

  // Submit dynamic custom email training to classifier
  const handleAddTrainingEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addText.trim()) {
      notify("Training email text cannot be blank.", "error");
      return;
    }

    setIsRetraining(true);
    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: addText,
          label: addLabel,
          subject: addSubject || "No Subject Given"
        })
      });

      if (res.ok) {
        const responseData = await res.json();
        // Update metric states immediately
        if (responseData.metrics) {
          setMetrics(responseData.metrics);
        }
        notify("Custom signature added. Multinomial Naive Bayes model retrained successfully!", "success");
        fetchEmails();
        // Reset states
        setAddSubject("");
        setAddText("");
        setAddLabel("Phishing");
        setShowRetrainModal(false);
      } else {
        notify("Could not save signature.", "error");
      }
    } catch (err) {
      console.error(err);
      notify("Network error while submitting signature.", "error");
    } finally {
      setIsRetraining(false);
    }
  };

  // Helper values to categorize confidence intervals
  const getThemeColors = (label: "Phishing" | "Safe", level: string) => {
    if (label === "Phishing") {
      if (level === "Critical") return { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-600" };
      if (level === "High") return { bg: "bg-red-50", border: "border-red-100", text: "text-red-600", badge: "bg-red-500" };
      return { bg: "bg-orange-50", border: "border-orange-100", text: "text-orange-600", badge: "bg-orange-500" };
    }
    return { bg: "bg-green-50", border: "border-green-100", text: "text-green-700", badge: "bg-green-600" };
  };

  return (
    <div id="phishguard-dashboard" className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] flex flex-col antialiased">
      {/* Toast Notification */}
      {notification && (
        <div
          id="toast-notifier"
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm transition-all animate-slide-in ${
            notification.type === "success"
              ? "bg-white border-green-200 text-green-800"
              : "bg-white border-red-200 text-red-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          )}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Professional Minimalism Navigation Bar */}
      <header id="header-nav" className="h-16 px-8 flex items-center justify-between bg-white border-b border-gray-200 shadow-xs flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center transition-transform hover:scale-102">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight uppercase font-display text-black">PhishGuard AI</span>
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-[10px] text-gray-500 font-semibold rounded-full border border-gray-100">Intelligent Scanner</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Model Active</span>
          </div>
          <div className="h-4 w-[1px] bg-gray-200"></div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRetrainModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-gray-800 text-white font-semibold text-xs rounded-full transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Retrain Model</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace Layout */}
      <main id="app-workspace" className="flex-1 max-w-[1400px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
        
        {/* Left Column (Input Area and Quick templates helper) - 6 grid cols */}
        <div id="control-workspace" className="lg:col-span-6 flex flex-col gap-6">
          
          {/* Analyze Area Card */}
          <section id="analysis-input-panel" className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 flex flex-col flex-1 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Email Under Scrutiny</label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInputText("");
                    setInputSubject("");
                    setActiveReport(null);
                    notify("Inputs cleared.");
                  }}
                  className="px-3 py-1.5 text-xs text-gray-500 font-semibold border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-full border border-gray-200 transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Import .txt</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".txt,.eml"
                  className="hidden"
                />
              </div>
            </div>

            {/* Drag & Drop Overlay Layer */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex-1 flex flex-col gap-3 group"
            >
              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  placeholder="Subject: (Optional, helps flag impersonation attempts)"
                  value={inputSubject}
                  onChange={(e) => setInputSubject(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm leading-relaxed placeholder-gray-400 focus:outline-none focus:border-black focus:bg-white transition-all font-medium"
                />
              </div>

              <div className="flex-1 relative min-h-[220px] flex flex-col">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste email headers and context body contents here to analyze for social engineering attacks, suspicious hyperlinks, or urgent triggers..."
                  className="flex-1 w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm leading-relaxed placeholder-gray-400 focus:outline-none focus:border-black focus:bg-white transition-all resize-none text-gray-700"
                />
                {!inputText && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center p-6 opacity-30">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Drag & Drop email text file inside</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => handleScan()}
              disabled={scanning}
              className="mt-4 w-full h-12 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {scanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing TF-IDF Vectorization...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-green-400" />
                  <span>Run Model Heuristic Scan</span>
                </>
              )}
            </button>
          </section>

          {/* Quick Sandbox Playgrounds templates */}
          <section id="demo-templates-panel" className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Load Sandbox Demonstrations</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setInputSubject(demoPhishingTemplate.subject);
                  setInputText(demoPhishingTemplate.text);
                  notify("Loaded mock Phishing template. Click Run Heuristic Scan to verify.");
                }}
                className="flex flex-col text-left p-3 border border-red-100 hover:border-red-300 bg-red-50/30 hover:bg-red-50/50 rounded-xl transition-all"
              >
                <span className="text-[11px] font-bold text-red-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Sample Phishing Threat
                </span>
                <span className="text-xs font-semibold text-gray-800 line-clamp-1">{demoPhishingTemplate.subject}</span>
                <span className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{demoPhishingTemplate.text}</span>
              </button>

              <button
                onClick={() => {
                  setInputSubject(demoSafeTemplate.subject);
                  setInputText(demoSafeTemplate.text);
                  notify("Loaded mock Legitimate template. Click Run Heuristic Scan to verify.");
                }}
                className="flex flex-col text-left p-3 border border-green-100 hover:border-green-300 bg-green-50/30 hover:bg-green-50/50 rounded-xl transition-all"
              >
                <span className="text-[11px] font-bold text-green-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Sample Safe Email
                </span>
                <span className="text-xs font-semibold text-gray-800 line-clamp-1">{demoSafeTemplate.subject}</span>
                <span className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{demoSafeTemplate.text}</span>
              </button>
            </div>
          </section>
        </div>

        {/* Right Column (Results Overview and Tabbed diagnostics layout) - 6 grid cols */}
        <div id="results-workspace" className="lg:col-span-6 flex flex-col gap-6">
          
          {/* Main Scanned Result Display Panel */}
          {activeReport ? (
            <div
              id="active-result-card"
              className={`bg-white rounded-2xl border p-6 transition-all shadow-md relative overflow-hidden ${
                activeReport.ml.label === "Phishing" ? "border-red-100" : "border-green-100"
              }`}
            >
              {/* Top Accent Strip */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                activeReport.ml.label === "Phishing" ? "bg-red-500" : "bg-green-500"
              }`} />

              <div className="flex flex-col items-center justify-center text-center mt-2">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                  activeReport.ml.label === "Phishing" ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"
                }`}>
                  {activeReport.ml.label === "Phishing" ? (
                    <ShieldAlert className="w-7 h-7" />
                  ) : (
                    <CheckCircle2 className="w-7 h-7" />
                  )}
                </div>

                <div className="flex flex-col">
                  <h2 className={`text-2xl font-black uppercase tracking-tight ${
                    activeReport.ml.label === "Phishing" ? "text-red-600" : "text-green-600"
                  }`}>
                    {activeReport.ml.label === "Phishing" ? "Phishing Detected" : "Legitimate Email Verified"}
                  </h2>
                  <p className="text-xs text-gray-400 uppercase tracking-widest mt-1 font-bold">
                    Analysis completed via Local Token preprocessor
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 w-full border-t border-gray-100 pt-5 text-left">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">ML Confidence Metric</span>
                    <span className="text-2xl font-light text-black">
                      {(activeReport.ml.confidence * 100).toFixed(1)}
                      <span className="text-xs font-semibold text-gray-500 ml-0.5">%</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Threat Category Score</span>
                    <span className={`text-2xl font-black ${
                      activeReport.threatLevel === "Critical" ? "text-red-700 font-black animate-pulse" :
                      activeReport.threatLevel === "High" ? "text-red-500 font-bold" :
                      activeReport.threatLevel === "Medium" ? "text-orange-500 font-bold" : "text-green-600 font-bold"
                    }`}>
                      {activeReport.threatLevel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 flex flex-col items-center justify-center text-center text-gray-400 flex-1 min-h-[180px]">
              <Shield className="w-12 h-12 stroke-1 text-gray-300 mb-3" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Verdict Pending</h3>
              <p className="text-xs mt-1 max-w-[280px]">Provide email text on the left workspace and run scan to view immediate threat assessments.</p>
            </div>
          )}

          {/* Diagnostics and Historical Analysis Tabbed Card */}
          <div id="diagnostics-subpanel" className="bg-white rounded-2xl border border-gray-200 shadow-xs flex-1 flex flex-col min-h-[340px] overflow-hidden">
            {/* Nav Tab Buttons */}
            <div className="flex border-b border-gray-100 bg-gray-50 p-2 gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => setResultsTab("indicators")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold rounded-lg transition-all ${
                  resultsTab === "indicators" ? "bg-white text-black shadow-xs" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Heuristic Indicators</span>
              </button>

              <button
                type="button"
                onClick={() => setResultsTab("deepAi")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold rounded-lg transition-all ${
                  resultsTab === "deepAi" ? "bg-white text-black shadow-xs" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                <span>AI Security Scan (Gemini)</span>
              </button>

              <button
                type="button"
                onClick={() => setResultsTab("history")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold rounded-lg transition-all ${
                  resultsTab === "history" ? "bg-white text-black shadow-xs" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Scan History Logs</span>
              </button>
            </div>

            {/* Inner Panels Render Area */}
            <div className="flex-1 p-5 overflow-y-auto max-h-[360px]">
              
              {resultsTab === "indicators" && (
                <div id="heuristic-indicators-view" className="space-y-4">
                  {!activeReport ? (
                    <div className="text-center py-10 text-gray-400 text-xs font-medium">
                      Indicators will reveal individual feature factors once a scan is initiated.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Identified Signal Vectors</span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-bold">TF-IDF extracted</span>
                      </div>

                      <div className="space-y-2.5">
                        {/* URL pattern risk indicator */}
                        <div className={`p-3 border rounded-xl flex items-center justify-between ${
                          activeReport.ml.features.urlCount > 0 
                            ? (activeReport.ml.features.hasSuspiciousUrls ? "bg-red-50/50 border-red-100" : "bg-orange-50/30 border-orange-100")
                            : "bg-gray-50/50 border-gray-100"
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded text-white ${
                              activeReport.ml.features.hasSuspiciousUrls ? "bg-red-500" : "bg-gray-400"
                            }`}>
                              URL
                            </span>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">
                                Contains {activeReport.ml.features.urlCount} Hyperlinks
                              </p>
                              {activeReport.ml.features.urlCount > 0 && (
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                  {activeReport.ml.features.hasSuspiciousUrls 
                                    ? "Suspicious domains block or untrusted protocols detected." 
                                    : "URLs listed match default safety rules."
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs font-semibold ${
                            activeReport.ml.features.hasSuspiciousUrls ? "text-red-600" : "text-gray-400"
                          }`}>
                            {activeReport.ml.features.hasSuspiciousUrls ? "Critical Signal" : "No Alert"}
                          </span>
                        </div>

                        {/* Urgent Language Tracker indicator */}
                        <div className={`p-3 border rounded-xl flex items-center justify-between ${
                          activeReport.ml.features.hasUrgentLanguage ? "bg-red-50/30 border-red-100" : "bg-gray-50/50 border-gray-100"
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded text-white ${
                              activeReport.ml.features.hasUrgentLanguage ? "bg-orange-500" : "bg-gray-400"
                            }`}>
                              NLP
                            </span>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">Urgency Callouts & Threat Levers</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                {activeReport.ml.features.hasUrgentLanguage 
                                  ? `Found: ${activeReport.ml.features.urgentKeywordsFound.slice(0, 3).join(", ")}` 
                                  : "Zero excessive urgency pressure keywords found."
                                }
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs font-semibold ${
                            activeReport.ml.features.hasUrgentLanguage ? "text-orange-600" : "text-gray-400"
                          }`}>
                            {activeReport.ml.features.hasUrgentLanguage ? "+ Risk factor" : "No Alert"}
                          </span>
                        </div>

                        {/* Genuine recipient greeting discrepancy indicator */}
                        <div className={`p-3 border rounded-xl flex items-center justify-between ${
                          activeReport.ml.features.hasGenericGreeting ? "bg-orange-50/30 border-orange-100" : "bg-gray-50/50 border-gray-100"
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded text-white bg-gray-400">
                              META
                            </span>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">Generic Greeting Flag</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                {activeReport.ml.features.hasGenericGreeting 
                                  ? "Generic customer reference used over direct username validation." 
                                  : "Addresses user cleanly or bypasses generic greeting traps."
                                }
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-gray-400">
                            {activeReport.ml.features.hasGenericGreeting ? "Elevated Alert" : "No Alert"}
                          </span>
                        </div>

                        {/* System Header Impersonation spoofing alert */}
                        <div className={`p-3 border rounded-xl flex items-center justify-between ${
                          activeReport.ml.features.hasHeaderDiscrepancy ? "bg-red-50/30 border-red-100" : "bg-gray-50/50 border-gray-100"
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded text-white ${
                              activeReport.ml.features.hasHeaderDiscrepancy ? "bg-red-500" : "bg-gray-400"
                            }`}>
                              SPOOF
                            </span>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">Sender Logo Impersonation</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                {activeReport.ml.features.hasHeaderDiscrepancy 
                                  ? "Mentions major company (PayPal, Amazon, Netflix) but lacks signature origin emails." 
                                  : "Origin branding aligns within standard envelope values."
                                }
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs font-semibold ${
                            activeReport.ml.features.hasHeaderDiscrepancy ? "text-red-500 font-bold" : "text-gray-400"
                          }`}>
                            {activeReport.ml.features.hasHeaderDiscrepancy ? "+ Major Red Flag" : "No Alert"}
                          </span>
                        </div>
                      </div>

                      {/* Phishing Keyword Badges */}
                      <div className="mt-5 border-t border-gray-100 pt-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Flagged Suspicious Term Frequency
                        </p>
                        {activeReport.ml.features.suspiciousKeywordsCount > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {activeReport.ml.features.phishingKeywordsFound.map((kw, idx) => (
                              <span key={idx} className="px-2.5 py-0.5 bg-red-50 border border-red-100 text-red-700 text-[11px] font-semibold rounded-full uppercase">
                                {kw}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">Zero default blacklisted terms identified.</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {resultsTab === "deepAi" && (
                <div id="ai-deep-scan-view" className="space-y-4">
                  {!activeReport ? (
                    <div className="text-center py-10 text-gray-400 text-xs font-medium">
                      Deep AI scan indicators will reveal when a scan is processed.
                    </div>
                  ) : activeReport.ai ? (
                    <div className="space-y-4">
                      {/* Sub Alert Badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 fill-blue-100" /> Server-side Gemini AI Heuristics
                        </span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                          Generative Reasoning Validated
                        </span>
                      </div>

                      <div className="p-4 bg-gray-50 border border-blue-100 rounded-2xl">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">AI decision rationale</h4>
                        <p className="text-sm font-semibold text-gray-800 leading-relaxed">
                          {activeReport.ai.aiReason}
                        </p>
                      </div>

                      {/* Comprehensive markdown summary */}
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Social Engineering Strategy</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {activeReport.ai.socialEngineeringTactics.map((t, idx) => (
                            <span key={idx} className="px-2.5 py-0.5 bg-yellow-50 border border-yellow-200 text-yellow-800 text-[10px] font-bold rounded-md uppercase">
                              ⚠️ {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Danger Analysis Summary</h4>
                        <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                          {activeReport.ai.threatAnalysis}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Required Response Checklist</h4>
                        <ul className="space-y-1">
                          {activeReport.ai.actionSteps.map((step, idx) => (
                            <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                              <span className="text-red-500 font-bold mt-0.5">•</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-center">
                      <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Deep Gemini Verification Locked</h4>
                      <p className="text-xs text-gray-500 mt-1 max-w-[340px] mx-auto leading-relaxed">
                        Specify a valid <b>GEMINI_API_KEY</b> in the AI Studio environment settings to automatically supplement Bayesian models with server-side safety checks.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {resultsTab === "history" && (
                <div id="logs-history-view" className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Archived Security Diagnostics</span>
                    <span className="text-[10px] text-gray-500 font-semibold">Latest {history.length} events</span>
                  </div>

                  {history.length === 0 ? (
                    <p className="text-center py-8 text-xs text-gray-400 font-medium">History log empty.</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {history.map((h) => (
                        <div
                          key={h.id}
                          onClick={() => {
                            setInputSubject(h.subject);
                            setInputText(h.text);
                            notify("Reloaded archived email payload. Click scan to run analysis.");
                          }}
                          className="py-2.5 flex items-center justify-between gap-3 text-left hover:bg-gray-50 cursor-pointer rounded-lg px-2 transition-all group"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-gray-800 line-clamp-1 group-hover:text-black transition-colors">
                              {h.subject || "No Subject header"}
                            </span>
                            <span className="text-[10px] text-gray-400 block block-clamp-1 mt-0.5">
                              {new Date(h.timestamp).toLocaleTimeString()} • {h.source}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              h.prediction === "Phishing" ? "bg-red-50 text-red-700 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"
                            }`}>
                              {h.prediction}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

      </main>

      {/* Footer Metrics Analytics Bar */}
      <footer id="footer-metrics-rail" className="h-14 px-8 bg-white border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 font-medium flex-shrink-0">
        <div className="flex items-center gap-5 sm:gap-8 overflow-x-auto min-w-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="uppercase text-gray-400 font-bold text-[10px] tracking-wider">Dynamic Accuracy:</span>
            <span className="text-black font-semibold">{metrics ? `${(metrics.accuracy * 100).toFixed(1)}%` : "Loading..."}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="uppercase text-gray-400 font-bold text-[10px] tracking-wider">Model Precision:</span>
            <span className="text-black font-semibold">{metrics ? `${(metrics.precision * 100).toFixed(1)}%` : "Loading..."}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="uppercase text-gray-400 font-bold text-[10px] tracking-wider">F1 Score:</span>
            <span className="text-black font-semibold">{metrics ? `${(metrics.f1Score * 100).toFixed(1)}%` : "Loading..."}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="uppercase text-gray-400 font-bold text-[10px] tracking-wider">Trained Corpus:</span>
            <span className="text-black font-semibold">{metrics ? `${metrics.trainingSamples} samples` : "Loading..."}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-[11px] text-gray-400 flex-shrink-0">
          <span className="flex items-center gap-1 text-green-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            <span>Multinomial Naive Bayes Engine Active</span>
          </span>
          <span>|</span>
          <span className="hover:text-black cursor-help flex items-center gap-0.5" title="Educational simulator for safe browsing and corporate training.">
            Disclaimer info <HelpCircle className="w-3 h-3" />
          </span>
        </div>
      </footer>

      {/* Retrain Model Popup Modal Dialog */}
      {showRetrainModal && (
        <div id="retrain-dialog" className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-xl w-full p-6 relative">
            <button
              onClick={() => setShowRetrainModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <Database className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-bold text-black font-display uppercase tracking-tight">
                Add To Classifier Database
              </h2>
            </div>
            
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Inject custom email signals into the running active dataset. The Multinomial Naive Bayes model will run full TF-IDF text vectorization on submit to immediately expand threat pattern awareness labels.
            </p>

            <form onSubmit={handleAddTrainingEmail} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Target classification label</label>
                  <select
                    value={addLabel}
                    onChange={(e) => setAddLabel(e.target.value as "Phishing" | "Safe")}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-black font-semibold"
                  >
                    <option value="Phishing">Phishing Threat</option>
                    <option value="Safe">Legitimate / Safe</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Origin Header Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Account update warning"
                    value={addSubject}
                    onChange={(e) => setAddSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Email Content Payload Text</label>
                <textarea
                  required
                  placeholder="Paste signature sample or normal email body content to append..."
                  value={addText}
                  onChange={(e) => setAddText(e.target.value)}
                  className="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:border-black resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRetrainModal(false)}
                  className="px-4 py-2 text-xs text-gray-500 hover:text-gray-800 font-semibold border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRetraining}
                  className="px-4 py-2 text-xs bg-black text-white hover:bg-gray-800 font-semibold rounded-xl disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isRetraining ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Retraining Model...</span>
                    </>
                  ) : (
                    <>
                      <ListRestart className="w-3.5 h-3.5" />
                      <span>Train and Compile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
