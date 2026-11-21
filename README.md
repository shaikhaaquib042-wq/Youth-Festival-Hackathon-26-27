# TRINETRA — Privacy-First Cyberbullying Evidence & Safe Reporting Toolkit

> **Naya Bharat 2047 (Code for Bharat) Hackathon**  
> **Track:** Rotary Area 1 — Peacebuilding & Conflict Prevention (*Peaceful Bharat*)  
> **Problem Statement 1.3:** *Bullied Online, Nowhere to Turn* — Help students save evidence and safely report online harassment to the right place.

---

## 1. Problem

According to a **CRY (Child Rights and You) / IndiaSpend** study, **nearly 1 in 10 Indian adolescents experience cyberbullying, and half of them never report it** to parents, teachers, or authorities.

When a student in India is harassed, impersonated, or targeted in campus WhatsApp/Instagram groups, they hit three immediate walls:
1. **Panic destroys proof:** Victims either retaliate emotionally or delete chats/block abusers immediately—erasing the timestamps, URLs, and phone numbers required by Cyber Police or college committees.
2. **Reporting confusion:** Students do not know whether to go to their college Anti-Ragging Cell / ICC, the UGC helpline, or `cybercrime.gov.in`—nor do they know the critical legal difference between **Track A** (anonymous Women/Child complaints that cannot be withdrawn) and **Track B** (OTP-verified complaints for other cybercrimes).
3. **Fear of exposure & stigma:** Uploading private screenshots or abusive chats to an unknown third-party website creates a second privacy risk.

---

## 2. Idea

**TRINETRA** is a **100% browser-local, zero-server** digital safety companion built specifically for Indian college and school students.

Instead of asking frightened students to create an account or upload private chats to a cloud database, TRINETRA guides them calmly in **under 2 minutes** from panic to action:
* **Identify the exact situation** across 4 real student cyberbullying scenarios (Abusive Chats, Fake Profile/Impersonation, Morphed/Private Photos, Campus Group Harassment).
* **Preserve court- and committee-ready evidence** using a guided 5-step checklist and platform-specific instructions for **Instagram, WhatsApp, and Snapchat**.
* **Route to the right authority** with crystal-clear guidance on `cybercrime.gov.in` (Track A vs. Track B), verified Indian & Pune/PCMC helplines (`1930`, `112`, `1800-180-5522`, `14416`, `1098`, Pune Bharosa Cell), and an instant **College Anti-Ragging / ICC Complaint Letter Generator**.
* **Export an offline Evidence Log (`.txt`)** compiled strictly inside browser memory (`Blob` + `URL.createObjectURL`).

---

## 3. Prototype & Zero-Server Privacy Architecture

Problem 1.3 explicitly requires keeping the user private and storing nothing on a server that is not needed. **TRINETRA stores zero bytes on any server—ever.**

| Privacy Layer | Implementation in TRINETRA |
| :--- | :--- |
| **No Backend / No Database** | Pure static HTML + Vanilla JS (`index.html`, `data.js`, `logic.js`). Zero `fetch()` or `XMLHttpRequest` calls. |
| **No Client Tracking** | Zero cookies, zero `localStorage`, zero `sessionStorage`, zero analytics scripts. Closing the tab wipes every note from RAM. |
| **In-Memory Export** | `TRINETRA-Evidence-Log.txt` is assembled locally via `Blob` + `URL.createObjectURL` and downloaded straight to the student's device. |
| **Multilingual Accessibility** | Built-in support for **English (`en`)**, **Marathi (`mr`)**, and **Hindi (`hi`)** so students across Maharashtra and India can act without language barriers. |
| **1-Click Judge Demo Mode** | Includes `getSampleDemoData()` pre-loaded with a realistic Pune college Instagram impersonation scenario for instant live walkthroughs. |

### Repository Structure
```text
trinetra/
├── index.html      # Responsive single-page UI (Partner A)
├── data.js         # Localized scenarios, checklists, platform guides, tracks & helplines (window.TrinetraData)
├── logic.js        # Zero-server helpers, Blob log exporter, ICC letter generator & demo loader (window.TrinetraLogic)
└── README.md       # Documentation & deployment guide