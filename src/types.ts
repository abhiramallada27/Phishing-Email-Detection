/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MLResult {
  label: "Phishing" | "Safe";
  confidence: number;
  scores: {
    phishingProb: number;
    safeProb: number;
  };
  features: {
    urlCount: number;
    hasSuspiciousUrls: boolean;
    suspiciousUrlsList: string[];
    hasUrgentLanguage: boolean;
    urgentKeywordsFound: string[];
    hasGenericGreeting: boolean;
    suspiciousKeywordsCount: number;
    phishingKeywordsFound: string[];
    exclamationCount: number;
    hasHeaderDiscrepancy: boolean;
  };
}

export interface AISafetyAnalysis {
  aiLabel: "Phishing" | "Safe";
  aiReason: string;
  threatAnalysis: string; // Markdown supported
  socialEngineeringTactics: string[];
  actionSteps: string[];
}

export interface CompleteAnalysisReport {
  ml: MLResult;
  ai: AISafetyAnalysis | null;
  threatLevel: "Low" | "Medium" | "High" | "Critical";
  subject: string;
  text: string;
  timestamp: string;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: {
    tp: number;
    fp: number;
    tn: number;
    fn: number;
  };
  vocabSize: number;
  trainingSamples: number;
}

export interface DatasetItem {
  id: string;
  text: string;
  label: "Phishing" | "Safe";
  subject?: string;
  source?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  subject: string;
  text: string;
  prediction: "Phishing" | "Safe";
  confidence: number;
  source: string;
  threatLevel: "Low" | "Medium" | "High" | "Critical";
}
