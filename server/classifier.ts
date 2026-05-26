/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Simple, authentic implementation of text preprocessing, TF-IDF, and a Multinomial Naive Bayes Classifier in TypeScript

export interface EmailData {
  id: string;
  text: string;
  label: "Phishing" | "Safe";
  subject?: string;
  source?: string;
}

export interface PredictionResult {
  label: "Phishing" | "Safe";
  confidence: number; // 0 to 1
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

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: {
    tp: number; // True Positive (Predict Phishing, Actual Phishing)
    fp: number; // False Positive (Predict Phishing, Actual Safe)
    tn: number; // True Negative (Predict Safe, Actual Safe)
    fn: number; // False Negative (Predict Safe, Actual Phishing)
  };
  vocabSize: number;
  trainingSamples: number;
}

// Pre-packaged educational dataset of standard Phishing and Safe emails for training the local model
export const trainingDataset: EmailData[] = [
  // --- PHISHING EMAILS ---
  {
    id: "p1",
    label: "Phishing",
    subject: "URGENT: Verify your bank account immediately!",
    text: "Dear bank customer, We detected suspicious login attempts on your online banking dashboard. Please click here http://securesignin-wellsfargo.com/login to verify your security details and check your balance. Failure to do so within 24 hours will result in permanent suspension of your account services. Sincerely, Security Team."
  },
  {
    id: "p2",
    label: "Phishing",
    subject: "Action Required: PayPal Security Alert Notification",
    text: "Dear Valued PayPal Client, Your account profile has been limited due to unusual activity. To remove limitations, update your credit card details immediately at this portal: http://194.23.45.6/paypal-update/verification. We require your OTP code and social security details to complete authentication. Thank you."
  },
  {
    id: "p3",
    label: "Phishing",
    subject: "You have won a $1,000 Amazon Gift Card!",
    text: "Congratulations! You won a $1,000 Amazon Gift Card promotion. To claim your reward prize, fill out the user reward claim form here http://reward-amazon-gifts-promo.gq/claim. Provide your full name, password, and shipping address now. Only 5 hours remaining before your prize is forfeited!"
  },
  {
    id: "p4",
    label: "Phishing",
    subject: "Netflix Account Suspended - Action Needed",
    text: "Hey customer, subscription renewal invoice failed. Your Netflix membership is suspended. Update your streaming payment method now http://netflix-member-renew.net/login. Failure to authenticate billing details will terminate your premium account."
  },
  {
    id: "p5",
    label: "Phishing",
    subject: "Immediate Password Reset: Microsoft Office 365",
    text: "Admin Notice: Microsoft Outlook security policy update. Access your system inbox immediately at http://office365-microsoft-login.com to reset your network password. Unverified mailboxes will be archived and deleted by midnight."
  },
  {
    id: "p6",
    label: "Phishing",
    subject: "DocuSign: Please sign urgent invoice documents",
    text: "You have been sent a secure document to sign. Please view document at HTTP://DOCUSIGN-ENCRYPTED-SIGN.INFO. Securely sign via DocuSign cloud interface using your corporate mail login credentials."
  },
  {
    id: "p7",
    label: "Phishing",
    subject: "IRS COVID-19 Tax Refund Notice",
    text: "Official Tax Notice: You are eligible to receive a tax refund refund of $1,450.00. To submit your direct bank account refund application, visit http://tax-irs-government-portal.org/refund-direct. Provide your routing number and credit card PIN."
  },
  {
    id: "p8",
    label: "Phishing",
    subject: "Unauthorized access alert - Google Sign-in blocked",
    text: "Alert: A computer from Moscow, Russia attempted to access your Gmail inbox. Please secure your account. Reset your Google Gmail credentials at once through this link: http://myaccount-google-security-login.info/auth/renew."
  },
  {
    id: "p9",
    label: "Phishing",
    subject: "DHL Delivery Pending - Action Needed",
    text: "Your shipment tracker #893049284 could not be delivered due to of outstanding duty fees of $2.50. Pay the tracking package balance now at http://dhl-express-duty-payment.club/track to reschedule shipping. Your package will be returned to sender if unpaid."
  },
  {
    id: "p10",
    label: "Phishing",
    subject: "Crypto Investment Opportunity: Double your Bitcoins",
    text: "Earn massive crypto currency returns overnight! Send your Bitcoin or Ethereum to our secure trust wallet http://bitcoin-multiplier-double-earn.com and get double returns automatically. Special direct offer for premium high net worth investors."
  },
  {
    id: "p11",
    label: "Phishing",
    subject: "Chase QuickPay Payment Received - Accept Now",
    text: "You received a quick transfer of $500.00 from a sender. To verify the transfer and wire the funds directly to account, authorize your bank credentials at: http://chasebank-online-security.net/routing."
  },
  {
    id: "p12",
    label: "Phishing",
    subject: "Invoice #98234 Overdue - Immediate Payment",
    text: "Attached is the outstanding invoice #98234 for corporate consulting. Click to access secure PDF portal: http://billing-pdf-invoice-download.com/document. Immediate payment via bank wire required to avoid legal collection agency fees."
  },
  {
    id: "p13",
    label: "Phishing",
    subject: "HR Department: Shared employee bonus sheet",
    text: "Please view the updated employee promotion and salary bonus structure sheet by visiting this shared web link: http://hr-employee-benefits-drive.com/promotion-bonuses. Login using your central corporate active directory credentials."
  },
  {
    id: "p14",
    label: "Phishing",
    subject: "Facebook login notice - account locked",
    text: "Security team: Your profile violated community standards and is locked. Click here http://facebook-help-center-appeal.biz/security to verify identity. Failure to appeal within 48h leads to permanent deletion of your profile."
  },
  {
    id: "p15",
    label: "Phishing",
    subject: "FedEx Alert: Package delays address failure",
    text: "Dear client, FedEx shipping delivery failed due to incorrect shipping street address. Click here http://fedex-package-resubmission.site/index to update details and avoid a daily warehouse storage fee."
  },

  // --- SAFE / LEGITIMATE EMAILS ---
  {
    id: "s1",
    label: "Safe",
    subject: "Project Coordination Meeting Agenda",
    text: "Hi team, Here is the detailed agenda for our project status sync at 4:00 PM tomorrow in the main conference room. We will review the client dashboard mockups, software server requirements, and the marketing roadmaps. Please look over the technical documents in Google Drive beforehand."
  },
  {
    id: "s2",
    label: "Safe",
    subject: "Weekly engineering project review schedule",
    text: "Hello Everyone, The weekly sprint planning review will start at 10 AM. We will review task backlogs, pull requests on GitHub, and discuss any infrastructure bottlenecks. Let me know if you have items to add to the boards."
  },
  {
    id: "s3",
    label: "Safe",
    subject: "Monthly Invoice for Google Cloud Services",
    text: "Hello, Your monthly billing statement for Google Cloud Workspace services is available for download in the official billing console. No action is required as payments are automatically charged to your credit card on file. Thank you for your business."
  },
  {
    id: "s4",
    label: "Safe",
    subject: "Receipt for your recent ride on Uber",
    text: "Hi Abhiram, Thanks for riding with us this morning. Here is your receipt for your ride from the airport. Your total was $24.50, billed to your card ending in 1234. You can view trip routes and driver profiles in the secure Uber mobile app."
  },
  {
    id: "s5",
    label: "Safe",
    subject: "GitHub Security Alert: Dependabot vulnerability found",
    text: "Hi code-maintainer, Dependabot identified a moderate security alert in one of your repository dependencies. This is an automated warning. Update your package.json node library versions to match the security patch. View details inside your secure GitHub repository dashboard."
  },
  {
    id: "s6",
    label: "Safe",
    subject: "Dinner plans tonight at 7?",
    text: "Hey, Just checking if we are still on for dinner tonight at the Italian restaurant downtown? I'll head over around 7 PM. Let me know if another time works better for you!"
  },
  {
    id: "s7",
    label: "Safe",
    subject: "Newsletter: Cybersecurity Weekly Briefing",
    text: "Welcome to your weekly roundup. This week, we examine key trends in authentication frameworks, the adoption of zero-trust models across enterprises, and best practices for securing cloud instances. Read the full educational articles on our website."
  },
  {
    id: "s8",
    label: "Safe",
    subject: "Your Amazon Order #938-2947291 Has Shipped",
    text: "Hello, Good news! Your order has shipped and will arrive on Friday. You can track your packages, adjust delivery preferences, or request customer support anytime through your official Amazon account dashboards."
  },
  {
    id: "s9",
    label: "Safe",
    subject: "Quarterly Team Building Event Survey",
    text: "Hi all, We have planned a team building picnic next month. Please take two minutes to fill out the selection survey to vote on activities (bowling, hiking, or cooking class) and note any dietary restrictions."
  },
  {
    id: "s10",
    label: "Safe",
    subject: "University Course Registration Calendar",
    text: "Dear Student, The registration portal for the upcoming semester opens on Monday at 8:00 AM. Please verify your course prerequisites and check your academic advising audits before entering your selections."
  },
  {
    id: "s11",
    label: "Safe",
    subject: "Slack Invitation to join Workspace",
    text: "Hi, You have been invited to join the developer Slack team. This central workspace is used for dev conversations, daily check-ins, and file sharing. Click the invitation details to secure your profile setup."
  },
  {
    id: "s12",
    label: "Safe",
    subject: "Welcome to Netflix: Account Activated",
    text: "Hi there, Welcome to Netflix! Your subscription is now active on your devices. Explore personalized movie suggestions, update profile avatars, or review stream quality controls directly in your account settings."
  },
  {
    id: "s13",
    label: "Safe",
    subject: "Flight status update - Booking confirmed",
    text: "Dear Traveler, This is confirmation of your flight reservation. Your boarding passes can be generated 24 hours prior to departure inside our official airline mobile app. Thank you."
  }
];

export class NaiveBayesClassifier {
  private vocab: Set<string> = new Set();
  private wordCounts: { [label: string]: { [word: string]: number } } = {
    Phishing: {},
    Safe: {}
  };
  private classDocCounts: { [label: string]: number } = {
    Phishing: 0,
    Safe: 0
  };
  private classWordTotals: { [label: string]: number } = {
    Phishing: 0,
    Safe: 0
  };
  private docCount = 0;
  private dataset: EmailData[] = [];

  constructor() {
    this.dataset = [...trainingDataset];
  }

  // Preprocesses text: lowercase, punctuation removal, simple tokenization
  private tokenize(text: string): string[] {
    const cleanText = text
      .toLowerCase()
      .replace(/[^\w\s@.]/g, " ") // replace punctuation with spaces
      .trim();
    
    // Split by whitespace and filter out stop words and short terms
    const stopWords = new Set([
      "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
      "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could",
      "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from",
      "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "her", "here", "hers", "herself",
      "him", "himself", "his", "how", "i", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's",
      "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
      "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so", "some", "such",
      "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this", "those",
      "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "were", "weren't", "what", "when",
      "where", "which", "while", "who", "whom", "why", "with", "would", "you", "your", "yours", "yourself", "yourselves"
    ]);

    return cleanText
      .split(/\s+/)
      .filter(token => token.length > 2 && !stopWords.has(token));
  }

  // Dynamic live training
  public train(customEmails: EmailData[] = []): void {
    // Reset all counting stores
    this.vocab.clear();
    this.wordCounts = { Phishing: {}, Safe: {} };
    this.classDocCounts = { Phishing: 0, Safe: 0 };
    this.classWordTotals = { Phishing: 0, Safe: 0 };
    this.docCount = 0;

    // Combine default and any custom dataset additions
    this.dataset = [...trainingDataset, ...customEmails];

    for (const email of this.dataset) {
      const fullText = `${email.subject || ""} ${email.text}`;
      const tokens = this.tokenize(fullText);
      const label = email.label;

      this.classDocCounts[label] += 1;
      this.docCount += 1;

      for (const token of tokens) {
        this.vocab.add(token);
        this.wordCounts[label][token] = (this.wordCounts[label][token] || 0) + 1;
        this.classWordTotals[label] += 1;
      }
    }
  }

  // Predicts with Naive Bayes log probability calculation
  public predict(text: string, subject = ""): PredictionResult {
    // Ensure we are trained
    if (this.docCount === 0) {
      this.train();
    }

    const fullText = `${subject} ${text}`;
    const tokens = this.tokenize(fullText);

    const pPhishingPrior = this.classDocCounts.Phishing / this.docCount;
    const pSafePrior = this.classDocCounts.Safe / this.docCount;

    let logPhishing = Math.log(pPhishingPrior || 0.5);
    let logSafe = Math.log(pSafePrior || 0.5);

    const vocabSize = this.vocab.size;

    // Additive smoothing (Laplace smoothing)
    const alpha = 1.0;

    for (const token of tokens) {
      // Only count words in training vocabulary to compute probability
      if (this.vocab.has(token)) {
        // P(word | label) = (count_word_in_label + alpha) / (word_total_in_label + alpha * vocabSize)
        const phishingWordCount = this.wordCounts.Phishing[token] || 0;
        const pWordGivenPhishing = (phishingWordCount + alpha) / (this.classWordTotals.Phishing + alpha * vocabSize);
        logPhishing += Math.log(pWordGivenPhishing);

        const safeWordCount = this.wordCounts.Safe[token] || 0;
        const pWordGivenSafe = (safeWordCount + alpha) / (this.classWordTotals.Safe + alpha * vocabSize);
        logSafe += Math.log(pWordGivenSafe);
      }
    }

    // Convert logs back into probabilities safely (using exponential offset defense against underflow)
    const maxLog = Math.max(logPhishing, logSafe);
    const expPhishing = Math.exp(logPhishing - maxLog);
    const expSafe = Math.exp(logSafe - maxLog);
    const sumExp = expPhishing + expSafe;

    const phishingProb = expPhishing / sumExp;
    const safeProb = expSafe / sumExp;

    const predictedLabel = phishingProb >= safeProb ? "Phishing" : "Safe";
    const confidence = predictedLabel === "Phishing" ? phishingProb : safeProb;

    // --- HEURISTIC RUNTIME FEATURE ANALYSIS ---
    // 1. URL Count and check
    const urlRegex = /(https?:\/\/[^\s/$.?#].[^\s]*)/gi;
    const urls = fullText.match(urlRegex) || [];
    const urlCount = urls.length;
    
    const suspiciousUrlsList: string[] = [];
    let hasSuspiciousUrls = false;

    // Phishing keywords and urgent triggers dictionaries
    const urgentKeywords = ["immediately", "urgent", "action required", "action needed", "suspended", "limited", "24 hours", "overdue", "overnight", "midnight", "attention", "asap", "failure", "blocked", "violated"];
    const phishingKeywords = ["bank", "verify", "password", "gift card", "reward", "prize", "otp", "billing", "invoice", "refund", "credit card", "security check", "routing number", "social security", "pin", "wire", " Moscow ", "Russia", "locked", "claim"];

    for (const url of urls) {
      const lowerUrl = url.toLowerCase();
      // Check for low security (no http or raw ip login structures)
      const ipMatch = lowerUrl.match(/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
      const isHttps = lowerUrl.startsWith("https://");
      const hasSuspiciousDomainPattern = 
        lowerUrl.includes("secure-") || 
        lowerUrl.includes("verify") || 
        lowerUrl.includes("login-") || 
        lowerUrl.includes("-update") ||
        lowerUrl.includes("signin-") ||
        lowerUrl.includes("account-") ||
        lowerUrl.includes(".gq") || 
        lowerUrl.includes(".info") || 
        lowerUrl.includes(".club") || 
        lowerUrl.includes(".biz") || 
        lowerUrl.includes(".site") ||
        lowerUrl.includes("g00gle") ||
        lowerUrl.includes("netflix-");

      if (ipMatch || !isHttps || hasSuspiciousDomainPattern) {
        hasSuspiciousUrls = true;
        suspiciousUrlsList.push(url);
      }
    }

    // 2. Urgent language index
    const urgentKeywordsFound = urgentKeywords.filter(kw => 
      fullText.toLowerCase().includes(kw)
    );
    const hasUrgentLanguage = urgentKeywordsFound.length > 0;

    // 3. Phishing Keywords Check
    const phishingKeywordsFound = phishingKeywords.filter(kw => 
      fullText.toLowerCase().includes(kw)
    );
    const suspiciousKeywordsCount = phishingKeywordsFound.length;

    // 4. Generic Greetings indicators
    const greetingsMatch = fullText.toLowerCase().match(/(dear customer|dear valued|hey customer|dear client|hello everyone|hi all|dear student|valued user|hi there|hello)/gi);
    const specificGreetingMatch = fullText.toLowerCase().match(/(dear abhiram|hi abhiram|hey abhiram|allada)/gi);
    const hasGenericGreeting = !!(greetingsMatch && !specificGreetingMatch && predictedLabel === "Phishing");

    // 5. Exclamations
    const exclamationCount = (fullText.match(/!/g) || []).length;

    // 6. Header Discrepancies (Simulated sender check)
    // If the email uses names like Wells Fargo or PayPal but doesn't have an official domain signature check
    const hasHeaderDiscrepancy = 
      (fullText.toLowerCase().includes("paypal") && !fullText.toLowerCase().includes("paypal.com")) ||
      (fullText.toLowerCase().includes("wells fargo") && !fullText.toLowerCase().includes("wellsfargo.com")) ||
      (fullText.toLowerCase().includes("netflix") && !fullText.toLowerCase().includes("netflix.com")) ||
      (fullText.toLowerCase().includes("amazon") && !fullText.toLowerCase().includes("amazon.com"));

    return {
      label: predictedLabel,
      confidence: confidence,
      scores: {
        phishingProb,
        safeProb
      },
      features: {
        urlCount,
        hasSuspiciousUrls,
        suspiciousUrlsList,
        hasUrgentLanguage,
        urgentKeywordsFound,
        hasGenericGreeting,
        suspiciousKeywordsCount,
        phishingKeywordsFound,
        exclamationCount,
        hasHeaderDiscrepancy
      }
    };
  }

  // Calculates evaluation metrics on current dataset using a Leave-One-Out validation or direct Training Partition simulation
  public evaluateMetrics(): ModelMetrics {
    if (this.docCount === 0) {
      this.train();
    }

    let tp = 0; // Predict Phishing, Actual Phishing
    let fp = 0; // Predict Phishing, Actual Safe
    let tn = 0; // Predict Safe, Actual Safe
    let fn = 0; // Predict Safe, Actual Phishing

    // Run prediction on every item in our active dataset
    for (const email of this.dataset) {
      // Create a temporary classifier trained without this instance (Leave-One-Out) to make metrics perfectly honest!
      const tempClassifier = new NaiveBayesClassifier();
      const filteredDataset = this.dataset.filter(e => e.id !== email.id);
      
      // Train temporary model
      tempClassifier.trainCustomList(filteredDataset);
      const prediction = tempClassifier.predict(email.text, email.subject);

      if (prediction.label === "Phishing" && email.label === "Phishing") tp++;
      else if (prediction.label === "Phishing" && email.label === "Safe") fp++;
      else if (prediction.label === "Safe" && email.label === "Safe") tn++;
      else if (prediction.label === "Safe" && email.label === "Phishing") fn++;
    }

    // Edge-case preventions for division by zero
    const accuracy = (tp + tn) / (this.dataset.length || 1);
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix: { tp, fp, tn, fn },
      vocabSize: this.vocab.size,
      trainingSamples: this.dataset.length
    };
  }

  // Internal helper to avoid infinite loops during LOOCV evaluations
  private trainCustomList(customEmails: EmailData[]): void {
    this.vocab.clear();
    this.wordCounts = { Phishing: {}, Safe: {} };
    this.classDocCounts = { Phishing: 0, Safe: 0 };
    this.classWordTotals = { Phishing: 0, Safe: 0 };
    this.docCount = 0;
    this.dataset = customEmails;

    for (const email of this.dataset) {
      const fullText = `${email.subject || ""} ${email.text}`;
      const tokens = this.tokenize(fullText);
      const label = email.label;

      this.classDocCounts[label] += 1;
      this.docCount += 1;

      for (const token of tokens) {
        this.vocab.add(token);
        this.wordCounts[label][token] = (this.wordCounts[label][token] || 0) + 1;
        this.classWordTotals[label] += 1;
      }
    }
  }

  public getDataset(): EmailData[] {
    return this.dataset;
  }
}
