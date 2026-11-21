/**
 * TRINETRA — Pure Browser-Local Business Logic
 * Exposes: window.TrinetraLogic (aliased as window.KavachLogic for compatibility)
 * Depends on: window.TrinetraData (load data.js before logic.js)
 * Privacy Guarantee: Zero network requests, zero cookies, zero localStorage/sessionStorage.
 */
(function (global) {
  "use strict";

  function getStore() {
    const store = global.TrinetraData || global.KavachData;
    if (!store) {
      throw new Error("TrinetraData not loaded. Ensure data.js is included before logic.js.");
    }
    return store;
  }

  function normalizeLang(lang) {
    const allowed = ["en", "mr", "hi"];
    const cleaned = typeof lang === "string" ? lang.trim().toLowerCase() : "en";
    return allowed.indexOf(cleaned) !== -1 ? cleaned : "en";
  }

  function pickText(field, lang) {
    if (field === null || field === undefined) return "";
    if (typeof field === "string") return field;
    const safeLang = normalizeLang(lang);
    return field[safeLang] || field.en || "";
  }

  /**
   * Returns formatted scenario array for the selected language ('en', 'mr', 'hi').
   */
  function getScenarios(lang) {
    const safeLang = normalizeLang(lang);
    const data = getStore();
    return data.scenarios.map(function (item) {
      return {
        id: item.id,
        title: pickText(item.title, safeLang),
        desc: pickText(item.desc, safeLang),
        urgency: pickText(item.urgency, safeLang),
        summary: pickText(item.summary, safeLang),
        route: pickText(item.route, safeLang)
      };
    });
  }

  /**
   * Returns formatted evidence checklist array for the selected language.
   */
  function getEvidenceChecklist(lang) {
    const safeLang = normalizeLang(lang);
    const data = getStore();
    return data.evidenceChecklist.map(function (item) {
      return {
        id: item.id,
        title: pickText(item.title, safeLang),
        detail: pickText(item.detail, safeLang)
      };
    });
  }

  /**
   * Returns step-by-step reporting/blocking guide array for Instagram, WhatsApp, or Snapchat.
   * Matches platform names case-insensitively.
   */
  function getPlatformSteps(platform, lang) {
    const safeLang = normalizeLang(lang);
    const guides = getStore().platformGuides;
    if (!platform || typeof platform !== "string") {
      return [];
    }

    const target = platform.trim().toLowerCase();
    const matchedKey = Object.keys(guides).find(function (key) {
      return key.toLowerCase() === target;
    });

    if (!matchedKey) {
      return [];
    }

    const platformEntry = guides[matchedKey];
    const steps = platformEntry[safeLang] || platformEntry.en || [];
    return steps.slice();
  }

  /**
   * Bonus helper: returns localized Track A vs Track B guidance for cybercrime.gov.in.
   */
  function getCybercrimeTracks(lang) {
    const safeLang = normalizeLang(lang);
    const tracks = getStore().cybercrimeTracks || [];
    return tracks.map(function (t) {
      return {
        id: t.id,
        code: t.code,
        portalUrl: t.portalUrl,
        anonymousAllowed: t.anonymousAllowed,
        canWithdraw: t.canWithdraw,
        title: pickText(t.title, safeLang),
        bestFor: pickText(t.bestFor, safeLang),
        identityRule: pickText(t.identityRule, safeLang),
        withdrawalRule: pickText(t.withdrawalRule, safeLang)
      };
    });
  }

  /**
   * Returns the verified helpline & Pune/PCMC college committee directory.
   */
  function getHelplines() {
    return getStore().helplines.map(function (h) {
      return {
        name: h.name,
        number: h.number,
        tag: h.tag,
        desc: h.desc
      };
    });
  }

  /**
   * Generates a formatted, timestamped .txt evidence log strictly in browser memory
   * using Blob + URL.createObjectURL and triggers download as 'TRINETRA-Evidence-Log.txt'.
   */
  function downloadEvidenceLog(options) {
    const opts = options || {};
    const scenarioTitle = (opts.scenarioTitle || "Online Harassment / Cyberbullying Incident").trim();
    const route = (opts.route || "cybercrime.gov.in / College Anti-Ragging Committee").trim();
    const checkedIds = Array.isArray(opts.checkedIds) ? opts.checkedIds : [];
    const notes = typeof opts.notes === "string" && opts.notes.trim()
      ? opts.notes.trim()
      : "No additional notes entered.";

    const now = new Date();
    const utcTimestamp = now.toISOString();
    const localTimestamp = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "medium"
    });

    const checklistItems = getEvidenceChecklist("en");
    const checklistLines = checklistItems.map(function (item, idx) {
      const done = checkedIds.indexOf(item.id) !== -1;
      const mark = done ? "[X]" : "[ ]";
      return "  " + (idx + 1) + ". " + mark + " " + item.title;
    });

    const completedCount = checklistItems.filter(function (item) {
      return checkedIds.indexOf(item.id) !== -1;
    }).length;

    const lines = [
      "======================================================================",
      "                TRINETRA — PERSONAL CYBER EVIDENCE LOG                ",
      "======================================================================",
      "Generated (IST) : " + localTimestamp,
      "Generated (UTC) : " + utcTimestamp,
      "----------------------------------------------------------------------",
      "1. INCIDENT CLASSIFICATION",
      "   Scenario          : " + scenarioTitle,
      "   Recommended Route : " + route,
      "",
      "2. EVIDENCE PRESERVATION CHECKLIST (" + completedCount + "/" + checklistItems.length + " Completed)",
      checklistLines.join("\n"),
      "",
      "3. INCIDENT NOTES, PROFILE URLS & TIMELINE",
      "----------------------------------------------------------------------",
      notes,
      "----------------------------------------------------------------------",
      "",
      "4. KEY OFFICIAL REPORTING CONTACTS (INDIA / PUNE)",
      "   * National Cybercrime Portal  : https://cybercrime.gov.in",
      "   * National Cybercrime Helpline: 1930",
      "   * Emergency Police Response   : 112",
      "   * UGC Anti-Ragging Helpline   : 1800-180-5522",
      "   * Tele-MANAS Mental Health    : 14416",
      "   * Pune Cyber / Bharosa Cell   : 020-29710097",
      "",
      "======================================================================",
      "PRIVACY CONFIRMATION:",
      "This evidence log was generated 100% locally inside your web browser.",
      "Zero personal data, notes, or files were sent to or stored on any server.",
      "Store this file offline along with your uncropped screenshots.",
      "======================================================================"
    ];

    const fileContent = lines.join("\n");
    const filename = "TRINETRA-Evidence-Log.txt";

    try {
      const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () {
        URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (err) {
      // Fallback: return content cleanly even in non-DOM test environments
    }

    return {
      filename: filename,
      timestampUtc: utcTimestamp,
      content: fileContent
    };
  }

  /**
   * Generates a formal, ready-to-copy written complaint addressed to the Chairperson
   * of the College Anti-Ragging Committee / Internal Complaints Committee (ICC).
   */
  function generateCollegeLetter(options) {
    const opts = options || {};
    const collegeName = (opts.collegeName || "[Enter Your College Name, City]").trim();
    const platform = (opts.platform || "[Platform Name, e.g., Instagram / WhatsApp]").trim();
    const incidentDate = (opts.incidentDate || new Date().toISOString().slice(0, 10)).trim();
    const scenarioTitle = (opts.scenarioTitle || "Online Harassment / Cyberbullying").trim();

    const todayFormatted = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });

    const letterLines = [
      "Date: " + todayFormatted,
      "",
      "To,",
      "The Chairperson,",
      "Anti-Ragging Committee / Internal Complaints Committee (ICC),",
      collegeName,
      "",
      "Subject: Formal Confidential Complaint Regarding Online Harassment (" + scenarioTitle + ") on " + platform,
      "",
      "Respected Chairperson,",
      "",
      "I am writing to formally report an incident of online harassment / cyberbullying that occurred on or around " + incidentDate + " on " + platform + ", categorized under: " + scenarioTitle + ".",
      "",
      "This incident is affecting my mental well-being, dignity, and sense of safety on campus. In accordance with UGC Anti-Ragging Regulations and institutional student-safety guidelines, I respectfully request the Committee to take prompt, confidential cognizance of this matter.",
      "",
      "Details of Evidence Preserved:",
      "1. Platform Involved       : " + platform,
      "2. Date of Incident        : " + incidentDate,
      "3. Nature of Harassment    : " + scenarioTitle,
      "4. Supporting Records      : I have preserved uncropped, timestamped screenshots, exact profile/post URLs, and an offline incident log, which I am ready to present confidentially to the Committee during inquiry.",
      "",
      "Requested Action:",
      "1. Maintain strict confidentiality regarding my identity to prevent any retaliation or social stigma.",
      "2. Initiate an urgent review and appropriate disciplinary/preventive action against the responsible individual(s).",
      "3. Provide written acknowledgement of receipt of this complaint and guide me on institutional support or parallel cyber-police escalation if required.",
      "",
      "Thank you for your prompt attention and support.",
      "",
      "Yours faithfully,",
      "",
      "[Your Full Name / Request Confidential Handling]",
      "Class / Department : [e.g., SY B.Sc. / Engineering]",
      "Roll Number / ID   : [Your Roll Number]",
      "Contact Number     : [Your Phone Number]",
      "Email Address      : [Your Email]"
    ];

    return letterLines.join("\n");
  }

  /**
   * Returns pre-filled sample data (an Instagram impersonation case at a Pune college)
   * so judges can test the entire workflow in 1 click.
   */
  function getSampleDemoData() {
    return {
      scenarioId: "fake-profile",
      scenarioTitle: "Fake profile or impersonation",
      platform: "Instagram",
      collegeName: "SPPU Affiliated Senior College, Pimpri-Chinchwad, Pune",
      incidentDate: "2026-11-21",
      route: "Copy Profile URL → Platform Impersonation Report → cybercrime.gov.in (Track B) + College ICC if peer-linked",
      checkedIds: [
        "no-reply",
        "full-screenshots",
        "copy-url",
        "offline-backup"
      ],
      notes: [
        "Incident Summary: An unknown person created a fake Instagram profile using my college ID photo and name to send derogatory DMs to students in my second-year batch.",
        "Impersonation Profile URL: https://instagram.com/fake_student_pune_demo (sample URL)",
        "First Noticed: 21 Nov 2026 at 10:15 AM IST when two classmates forwarded screenshots.",
        "Action Taken So Far: Did not reply to the fake handle. Saved 4 uncropped screenshots with visible timestamps and copied the exact profile URL before reporting on Instagram."
      ].join("\n")
    };
  }

  const TrinetraLogic = {
    getScenarios: getScenarios,
    getEvidenceChecklist: getEvidenceChecklist,
    getPlatformSteps: getPlatformSteps,
    getCybercrimeTracks: getCybercrimeTracks,
    getHelplines: getHelplines,
    downloadEvidenceLog: downloadEvidenceLog,
    generateCollegeLetter: generateCollegeLetter,
    getSampleDemoData: getSampleDemoData
  };

  global.TrinetraLogic = TrinetraLogic;
  global.KavachLogic = TrinetraLogic;
})(window);