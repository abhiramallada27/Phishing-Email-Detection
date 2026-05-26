/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { NaiveBayesClassifier, EmailData } from "./server/classifier.js";

// Load environment variables
dotenv.config();

// Create instances
const classifier = new NaiveBayesClassifier();
let customDataset: EmailData[] = [];
let scanHistory: any[] = [
  {
    id: "hist-1",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    subject: "Security Update Required",
    text: "Verify billing info linked to Amazon services right now or access will be restricted.",
    prediction: "Phishing",
    confidence: 0.94,
    source: "Paste Box",
    threatLevel: "High"
  },
  {
    id: "hist-2",
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    subject: "Design Review Notes",
    text: "Hello, clean diagrams from our frontend review have been attached for comment.",
    prediction: "Safe",
    confidence: 0.99,
    source: "Uploaded File",
    threatLevel: "Low"
  }
];

// Train the classifier on starter data
classifier.train(customDataset);

// Lazy initialization check for Gemini AI SDK
let aiInstance: GoogleGenAI | null = null;
function getGeminiAI(): GoogleGenAI | null {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "") {
      try {
        aiInstance = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build"
            }
          }
        });
        console.log("Gemini AI successfully initialized for server-side security scanning.");
      } catch (err) {
        console.error("Failed to initialize GoogleGenAI client:", err);
      }
    }
  }
  return aiInstance;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON and URL encoded body parsers
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));

  // --- API ROUTE: Server health check ---
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      geminiAvailable: getGeminiAI() !== null
    });
  });

  // --- API ROUTE: Get classifier valuation metrics and dataset info ---
  app.get("/api/metrics", (req, res) => {
    try {
      const metrics = classifier.evaluateMetrics();
      res.json(metrics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- API ROUTE: List all active emails in dataset ---
  app.get("/api/emails", (req, res) => {
    try {
      const emails = classifier.getDataset();
      res.json(emails);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- API ROUTE: Add customized email to train dataset ---
  app.post("/api/emails", (req, res) => {
    try {
      const { text, label, subject } = req.body;
      if (!text || !label) {
        return res.status(400).json({ error: "Text and label ('Phishing' | 'Safe') are required" });
      }

      const newEmail: EmailData = {
        id: `custom-${Date.now()}`,
        text,
        label,
        subject: subject || "No Subject",
        source: "User Contribution"
      };

      customDataset.push(newEmail);
      // Retrain model
      classifier.train(customDataset);

      // Return newly updated training metrics
      const newMetrics = classifier.evaluateMetrics();
      res.json({
        message: "Email added successfully. Classifier retrained.",
        appendedEmail: newEmail,
        metrics: newMetrics
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- API ROUTE: Retrieve scan history list ---
  app.get("/api/history", (req, res) => {
    res.json(scanHistory);
  });

  // --- API ROUTE: Core analyzer endpoint ---
  app.post("/api/analyze", async (req, res) => {
    try {
      const { text, subject } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Email text body is required for analysis." });
      }

      const normalizedSubject = subject || "";

      // 1. Run our authentic Local Machine Learning Classifier (Naive Bayes + TF-IDF)
      const mlResult = classifier.predict(text, normalizedSubject);

      // 2. Process threat status score and priority levels
      let threatLevel: "Low" | "Medium" | "High" | "Critical" = "Low";
      if (mlResult.label === "Phishing") {
        if (mlResult.confidence > 0.9 || mlResult.features.hasSuspiciousUrls) {
          threatLevel = "Critical";
        } else if (mlResult.confidence > 0.75) {
          threatLevel = "High";
        } else {
          threatLevel = "Medium";
        }
      } else {
        if (mlResult.features.hasSuspiciousUrls || mlResult.features.suspiciousKeywordsCount > 3) {
          threatLevel = "Medium";
        }
      }

      // 3. Optionally call server-side Gemini AI for deep security heuristics
      let aiAnalysisResult = null;
      const ai = getGeminiAI();

      if (ai) {
        try {
          const userPrompt = `
          You are PhishGuard AI, an expert cybersecurity analysis system.
          Analyze this suspicious email for social engineering indicators.
          
          SUBJECT: ${normalizedSubject}
          BODY:
          ${text}
          
          Provide your analysis in clean JSON that adheres exactly to this response specification (without enclosing standard text):
          {
            "aiLabel": "Phishing" or "Safe",
            "aiReason": "A 1-sentence summarization of the threat decision",
            "threatAnalysis": "A short markdown text explaining the security threat vectors (e.g., urgency levers, source spoofing, fake attachments) or validating its legitimacy",
            "socialEngineeringTactics": ["list", "tactics", "found", "e.g., Urgency, Authority-impersonation, Fear"],
            "actionSteps": ["short", "actionable", "steps", "e.g., Delete email immediately, Report to IT department, Do not click on securesignin link"]
          }
          `;

          const aiResponse = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: userPrompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  aiLabel: { type: Type.STRING, description: "Whether the email is Phishing or Safe" },
                  aiReason: { type: Type.STRING, description: "A one sentence reason summarizing the decision" },
                  threatAnalysis: { type: Type.STRING, description: "Markdown text analyzing the email threats" },
                  socialEngineeringTactics: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Social engineering tactics detected e.g. Urgency"
                  },
                  actionSteps: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Action items for the user"
                  }
                },
                required: ["aiLabel", "aiReason", "threatAnalysis", "socialEngineeringTactics", "actionSteps"]
              }
            }
          });

          const rawText = aiResponse.text;
          if (rawText) {
            aiAnalysisResult = JSON.parse(rawText.trim());
          }
        } catch (aiErr) {
          console.error("Gemini AI API Scanning Error: ", aiErr);
          // Don't crash, we have the local model as a highly accurate solid backup!
        }
      }

      // 4. Combine results and compile report
      const completeReport = {
        ml: mlResult,
        ai: aiAnalysisResult,
        threatLevel,
        subject: normalizedSubject,
        text,
        timestamp: new Date().toISOString()
      };

      // 5. Save to temporary memory scan history
      scanHistory.unshift({
        id: `hist-${Date.now()}`,
        timestamp: completeReport.timestamp,
        subject: normalizedSubject || "No Subject",
        text: text.substring(0, 150) + (text.length > 150 ? "..." : ""),
        prediction: completeReport.ml.label,
        confidence: completeReport.ml.confidence,
        source: normalizedSubject ? "Saved Scan" : "Quick Textbox Analysis",
        threatLevel: completeReport.threatLevel
      });

      // Keep metrics collection manageable
      if (scanHistory.length > 30) {
        scanHistory.pop();
      }

      res.json(completeReport);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- VITE MIDDLEWARE CONFIGURATION ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PhishGuard AI Server successfully bootloaded on http://localhost:${PORT}`);
  });
}

startServer();
