# Developer Resources & Implementation Guide — Problem Statement 1.2 ("Where Do I Even Complain?")

Companion handbook to `india_grievance_platforms.json`. Contains APIs, open-source datasets, official scrapable directories, verified Pune seed tables, pan-India NALSA legal-aid thresholds, routing guardrails, and verified impact statistics for building and pitching your prototype.

---

## 1. APIs & Digital Public Infrastructure (DPI) Integrations

### 1.1 BHASHINI (ULCA) — Multilingual Speech & Translation (Marathi / Hindi / English + 22 Languages)
Use BHASHINI so citizens can speak or type everyday disputes in Marathi or Hindi and receive plain-language guidance and bilingual complaint drafts.

* **Developer & Onboarding Portal:** `https://bhashini.gov.in/`
* **API Docs:** `https://bhashini.gitbook.io/bhashini-apis`
* **Web Try-Out (Text & TTS):** `https://anuvaad.bhashini.gov.in/` | `https://anuvaad.bhashini.gov.in/text-to-speech-translation`
* **Core Services:** `Anuvaad` (text translation), `Abhilekh` (live voice-to-text transcription), `Lekhaanuvaad` (document translation), `BHASHINI WTMC` (website translation plugin across 22 Indian languages).
* **Standard 3-Step Integration Flow:**
  1. **Onboard** at `bhashini.gov.in` to obtain `userID` and `ulcaApiKey`.
  2. **Pipeline Config Call** (send headers `userID` + `ulcaApiKey`) specifying task sequence such as `["asr", "translation", "tts"]` and a `pipelineId` to receive the dynamic inference `callbackUrl`, `serviceId`, and `inferenceApiKey`.
  3. **Pipeline Compute Call** to the returned `callbackUrl` with base64 audio or text.
* **Published Reference Pipeline IDs** *(confirm active IDs in your BHASHINI dashboard after onboarding)*:
  * Initial Pipeline (ASR, Translation, Transliteration, TTS): `64392f96daac500b55c543cd`
  * IIT Bombay (Translation — includes `en`/`hi`/`mr` models): `660f813c0413087224435d2c`
  * IIT Madras (ASR & TTS): `660fa5bec7fb5b0328229016`
  * IIIT Hyderabad (Translation): `660f866443e53d4133f65317`

```json
// Example BHASHINI Pipeline Config Request Body (Marathi speech -> English text)
{
  "pipelineTasks": [
    { "taskType": "asr", "config": { "language": { "sourceLanguage": "mr" } } },
    { "taskType": "translation", "config": { "language": { "sourceLanguage": "mr", "targetLanguage": "en" } } }
  ],
  "pipelineRequestConfig": {
    "pipelineId": "64392f96daac500b55c543cd"
  }
}
```

### 1.2 DIGIT / UPYOG — Open-Source Municipal PGR REST API (Live Demo Sandbox)
While major central portals block third-party write APIs, **DIGIT** (eGov Foundation, MIT License, DPGA-certified Digital Public Good) and **UPYOG** (NIUA / MoHUA) define India's open municipal Public Grievance Redressal (PGR) API standard—live in states such as Punjab (`mSeva`), Odisha (`SUJOG`), Kerala (`K-SMART`), and Himachal Pradesh.

* **Repos & Docs:**
  * PGR Stack: `https://github.com/egovernments/Citizen-Complaint-Resolution-System`
  * DIGIT Core: `https://github.com/egovernments/Digit-Core`
  * UPYOG Portal & Docs: `https://upyog.niua.in/` | `https://upyog-docs.gitbook.io/upyog-v-2.0/ecosystem/upyog-toolkit/upyog-services`
  * PGR Configuration Guide: `https://docs.digit.org/health/deploy/configuration/hcm-service-configuration/complaints`
* **Local Docker Compose Requirements:** 8 GB RAM allocated to Docker, 8 vCPU (see `local-setup/README.md` in the PGR repo).
* **API Conventions:** All endpoints use HTTP `POST` (`/{service}/{entity}/{version}/_create`, `_update`, `_search`, `_count`) with a mandatory `RequestInfo` metadata envelope.
* **Key Microservices & Endpoints:**
  * **Create Complaint:** `POST /pgr-services/v2/request/_create` (Kafka topics: `save-pgr-request`, `update-pgr-request`)
  * **Evidence Upload:** `egov-filestore` (multipart upload returning a `fileStoreId` UUID)
  * **GPS-to-Tenant & Boundaries:** `egov-location` (`Tenant` resolves lat/lng to `tenantId`; `Boundary` serves GeoJSON zones/wards)
  * **Master Data & Categories:** `egov-mdms-service` (reads Git-backed JSON schemas such as `roles.json` / `roleactions.json`)
  * **Chatbot & Notifications:** `xstate-chatbot` (WhatsApp PGR bridge), `egov-notification-sms`, `pdf-service`

```json
// Example DIGIT / UPYOG RequestInfo Envelope for POST /pgr-services/v2/request/_create
{
  "RequestInfo": {
    "apiId": "Rainmaker",
    "ver": "1.0",
    "ts": 1763700000000,
    "action": "_create",
    "msgId": "20261121|en_IN",
    "authToken": "<CITIZEN_AUTH_TOKEN>"
  },
  "service": {
    "tenantId": "pb.amritsar",
    "serviceCode": "StreetLightNotWorking",
    "description": "Streetlight out near main junction for 5 days",
    "address": {
      "city": "Pune",
      "locality": { "code": "SUN01" },
      "geoLocation": { "latitude": 18.5204, "longitude": 73.8567 }
    }
  },
  "workflow": {
    "action": "APPLY"
  }
}
```

### 1.3 API Setu & DigiLocker OAuth 2.0 (Production Roadmap Integration)
* **Portal:** `https://apisetu.gov.in/` (228 Central, 2,457 State, and 241 Industry/Private publishers).
* **DigiLocker Requestor Onboarding:** `https://partners.apisetu.gov.in/signin` | API Spec: `https://directory.apisetu.gov.in/api-collection/digilocker`
* **Why It Matters for Statement 1.2:** API Setu does **not** expose open citizen grievance-submission APIs, but an approved NGO or municipal partner can register as a **DigiLocker Requestor** (OAuth 2.0 `client_id` / `client_secret` + revocable citizen consent) to pull verified KYC and eligibility proofs—**Driving Licence, Ration Card, Income Certificate, Caste Certificate**—directly into NALSA free legal aid and e-Jagriti filing packets.

### 1.4 OpenStreetMap Overpass API (Free Pan-India Office Lookup Fallback)
* **Docs & Endpoint:** `https://wiki.openstreetmap.org/wiki/Overpass_API` (`https://overpass-api.de/api/interpreter`)
* **Cost / License:** Free, no API key required; ODbL attribution required.
* **Mandatory Usage Rules:** Always send a unique `User-Agent` or `Referer` header, never run parallel scraping scripts, and cache responses locally (do not query Overpass on every page load). Cross-verify phone numbers against `.gov.in` sites.

```overpassql
// Example Overpass QL query: Fetch government offices, courthouses, and police stations in Pune bbox
[out:json][timeout:25];
(
  node["office"="government"](18.40,73.73,18.65,73.99);
  way["office"="government"](18.40,73.73,18.65,73.99);
  node["amenity"~"courthouse|police"](18.40,73.73,18.65,73.99);
  way["amenity"~"courthouse|police"](18.40,73.73,18.65,73.99);
);
out center tags;
```

### 1.5 Zero-Backend Prefill Helper (WhatsApp, Email, Dialer, X)
Because authenticated portals block query-param prefills, use client-side deep links for verified WhatsApp bots, ward emails, emergency helplines, and public civic nudges:

```javascript
export function buildWhatsAppLink(phone10Digits, text) {
  return `[https://wa.me/91$](https://wa.me/91$){phone10Digits}?text=${encodeURIComponent(text)}`;
}

export function buildMailtoLink(to, subject, body, cc = "") {
  const params = new URLSearchParams({ subject, body });
  if (cc) params.set("cc", cc);
  return `mailto:${to}?${params.toString()}`;
}

export function buildXEscalationLink(handle, ticketId, summary) {
  // Never include personal phone numbers or Aadhaar in public tweets
  const text = `${handle} Ticket #${ticketId}: ${summary} — requesting status update.`;
  return `[https://twitter.com/intent/tweet?text=$](https://twitter.com/intent/tweet?text=$){encodeURIComponent(text)}`;
}
```

---

## 2. Open-Source Datasets & Official Scrapable Directories

No single GitHub repo bundles consumer commissions, labour offices, legal-aid authorities, and municipal ward offices pan-India. Combine **ready-made GitHub/OpenCity municipal datasets** with **lightweight static JSON parsed from official `.gov.in` HTML tables**.

### 2.1 Ready-to-Use Open-Source Repositories

| Dataset / Repo | URL | Format & License | Coverage & Contents | Implementation Notes / Caveats |
| :--- | :--- | :--- | :--- | :--- |
| DataMeet `Pune_wards` | `https://github.com/datameet/Pune_wards` | CSV + GeoJSON (CC-BY-SA 2.5 India) | Pune (PMC) & Pimpri-Chinchwad (PCMC) | Includes `pune-admin-ward-offices.csv` (all 15 admin wards), `pune-admin-wards.geojson`, `pune-electoral-wards.geojson`, `pcmc-electoral-wards.geojson`, `pune-wards-info.csv`. Join with the verified emails/phones in Section 3.2. |
| Pune 2022 Wards | `https://github.com/answerquest/pune-2022-wards` | GeoJSON (MIT) | Pune (PMC 2022 electoral wards) | Also mirrored inside DataMeet `Municipal_Spatial_Data/Pune/pune-electoral-wards-2022.geojson`. |
| DataMeet `Municipal_Spatial_Data` | `https://github.com/datameet/Municipal_Spatial_Data` | GeoJSON & KML (CC-BY 4.0) | 25+ cities: Pune, PCMC, Mumbai, NMMC, Bengaluru, Delhi, Chennai, Hyderabad, Kolkata, Ahmedabad, Kochi, Jaipur, etc. | Ideal for GPS point-in-polygon ward lookup (`@turf/boolean-point-in-polygon`). **Caveat:** GitHub issues flag outdated boundaries for Delhi, Hyderabad, and Mumbai; Bengaluru reorganized into 5 GBA corporations in July 2025. |
| PMC Open Data Portal | `https://opendata.pmc.gov.in/departments/category?id=34` | CSV / XLS / KML / XML (NDSAP Open Data) | Pune (PMC) | Official datasets: *PMC Ward Offices*, *PMC Offices*, *Government Offices*, *Important Govt. Offices under PMC*, *Location of Toilets*. **Caveat:** Homepage intermittently throws client-side JS exceptions—download and commit static CSVs to your repo. |
| OpenCity (`data.opencity.in`) | `https://data.opencity.in/` | CSV / GeoJSON / KML (Public Domain / CC) | Bengaluru (145 datasets), Chennai (35), Mumbai (12), Delhi (10), Kolkata (10), Hyderabad (8), Pune (6) | Includes **Greater Bengaluru Authority Corporations Delimitation 2025 (KML)**, **Greater Chennai Corporation Wards Info (CSV)**, **BWSSB Contact Info (CSV)**, and **Bangalore Ward Names**. |
| India States & Districts JSON | `https://github.com/KTBsomen/Indian-state-district-json` | JSON + browser scraper (MIT) | All Indian States & Districts | Sourced from official IGOD (`https://igod.gov.in/sg/district/states`). Re-runnable in browser DevTools with zero dependencies. |
| India States & Districts (Node) | `https://github.com/sanjaynishad/Indian-States-And-Districts` | JSON & CSV (MIT) | All Indian States & Districts | Multiple pre-split files in `dist/` (by state code, state name, flat array); refresh via `npm run generate` (uses `igod.gov.in`). |
| DataMeet National & Village Maps | `https://github.com/datameet/maps` & `https://github.com/datameet/indian_village_boundaries` | GeoJSON / Shapefile (ODbL / CC) | States, Districts, Assembly/Parliamentary Constituencies, Villages | Project index at `http://projects.datameet.org/maps/`. |
| Open Government Data (OGD) | `https://data.gov.in/` | CSV / JSON / XML / RDF | Pan-India government catalogs | Check for supplemental civic and judicial statistics. |
| Justice Hub & Open Justice India | `https://justicehub.in/` (`github.com/justicehub-in`) & `https://openjustice-in.github.io/` | CKAN / CC-BY / AGPL / PDF / Text | Pan-India courts, judgments, cause lists, justice budgets | Best for legal NLP, court metadata, and research context (not pre-built local office address CSVs). |
| Nyaaya (Plain-Language Legal Guides) | `https://nyaaya.org/` | Web explainers, guides, sample forms (English & regional) | Pan-India everyday disputes | Gold-standard **SARAL** (Simple, Actionable, Reliable, Accessible Legal) tone and topic taxonomy (Money & Property, Labour, Police & Courts, Family, Citizen Rights). |

### 2.2 Official `.gov.in` Registries to Parse into Static JSON (No Pre-Made GitHub CSVs Found)

| Office Type | Official Source URL | Format | Notes |
| :--- | :--- | :--- | :--- |
| **Maharashtra Consumer Commissions** | `https://grahak.maharashtra.gov.in/en/directory/` | Clean HTML table (paginated) | Columns: Name, Email, Landline, Address. **Warning:** Avoid old third-party PDFs (e.g., Scribd) that list outdated addresses like Pune's old Gultekadi office. |
| **Pan-India Consumer Commissions** | `https://ncdrc.nic.in/` & `https://e-jagriti.gov.in/` | Web directories (+ email PDFs such as `ipleader.in/wp-content/uploads/2026/07/Email-ids-of-all-consumer-foras.pdf`) | Confonet case status lookup (no login): `https://confonet.nic.in/`. |
| **State Legal Services Authorities (SLSA)** | `https://nalsa.gov.in/directory/` | Clean HTML table | Lists every State/UT SLSA Executive Chairman, Member Secretary, address, phone, email, and website. |
| **Maharashtra DLSAs (All Districts)** | `https://maharashtra.nalsa.gov.in/directory/` (Marathi: `/mr/निर्देशिका/page/2`) | Paginated HTML table | Columns: Name, Designation, `@bhc.gov.in` Email, Mobile, Landline, Courthouse Address. |
| **Pune Labour Officers & 15 WFCs** | `https://pune.gov.in/en/office-of-the-deputy-commissioner-of-labour/` | Clean HTML tables | Publishes Area-to-ALC/GLO jurisdictions, officer mobile numbers, and all 15 Pune District taluka Worker Facility Centers. |
| **Maharashtra Labour HQ & Regions** | `https://mahakamgar.maharashtra.gov.in/Site/1729/Contact-Us` & `https://labour.maharashtra.gov.in/en/contact-us` | HTML tables | Mumbai BKC Kamgar Bhavan HQ, Thane, Kalyan, and Labour Welfare Board regional offices (`Site/1737/Contact-Us`). |
| **Central Labour Conciliation Officers** | `https://web.umang.gov.in/landing/department/samadhan.html` | UMANG service ("List of Conciliation Officers") | Central-sphere Regional Labour Commissioners (CIRM). |

---

## 3. Ready-to-Seed Verified Pune Office Directory

Commit these two verified tables directly into your app's `pune_offices.json` seed file so your hackathon demo works offline with zero broken lookups.

### 3.1 Pune Consumer, Legal Aid, Tenancy, Labour & Municipal Anchor Offices

| Category | Official Office Name | Address | Phone & Email | Verification Note |
| :--- | :--- | :--- | :--- | :--- |
| Consumer Commission (Main) | District Consumer Disputes Redressal Commission, Pune | New Administrative Building, A Wing, 4th Floor, Opp. Vidhan Bhavan, Sadhu Vaswani Chowk, Pune – 411001 | `020-26139191` / `confo-pu-mh@nic.in` | Verified via `grahak.maharashtra.gov.in` |
| Consumer Commission (Addl.) | District Consumer Disputes Redressal Commission, Additional Pune | New Administrative Building, A Wing, 4th Floor, Opp. Council Hall, Sadhu Vaswani Chowk, Pune – 411001 | `020-26120364` / `confo-pu1-mh@nic.in` | Verified via `grahak.maharashtra.gov.in` |
| Legal Aid & Permanent Lok Adalat | District Legal Services Authority (DLSA), Pune & Permanent Lok Adalat | New Building, 1st Floor, District & Sessions Court Premises, Shivajinagar, Pune – 411005 (+ 35 District Legal Aid Clinics) | `020-25534881` / `dlsapune2@gmail.com` / Helpline `15100` | Verified via `punedlsa.org` & NALSA |
| Tenancy & Civil Disputes | District & Sessions Court / Small Causes Court, Pune | CTS No. 9 & 9A, FP No. 805 & 891, Shivajinagar, Pune – 411005 | Registrar: `020-25534799` / `mahpundc@mhstate.nic.in` | Verified via `pune.dcourts.gov.in` |
| Labour (State Sphere — HQ) | Additional Commissioner of Labour, Pune Division | Bungalow No. 5, Mumbai-Pune Road, Shivajinagar, Pune – 411005 | `020-25542611` | Secondary directory; cross-check area ALC/GLO mobiles on `pune.gov.in` |
| Labour (Welfare Board) | Maharashtra Labour Welfare Board, Pune | Lalit Krida Bhavan, Sahakarnagar No. 1, Near Aranyeshwar Temple, Pune – 411009 | `020-24228988` | Verified via `mahakamgar.maharashtra.gov.in` |
| Labour (Pune City WFC) | Worker Facility Center — Pune City (1 of 15 District WFCs) | S. No. 347, Private Road, Inaam Nagar, Tadiwala Road, Pune – 411001 | `9970765491` | Verified via `pune.gov.in` |
| Labour (PCMC WFC) | Worker Facility Center — Pimpri-Chinchwad | Shop No. 29, Ground Floor, Sukhwani Chamber, Pimpri Chowk, Station Road, Pimpri | `8087177331` | Verified via `pune.gov.in` |
| Labour (Central Sphere) | Central Labour Office, Pune | Survey No. 1-A, Guru Nanak Nagar, Shanti Nagar Society, Katad Khana, Pune – 411042 | File online via `samadhan.labour.gov.in` (`011-23354722`) | Address via third-party directory; verify jurisdiction on SAMADHAN |
| Municipal HQ (PMC) | Pune Municipal Corporation Main Building | Congress House Road, Near Mangala Theatre, Shivajinagar, Pune – 411005 | `1800-103-0222` / WA `8888251001` & `9689900002` | Verified via `pmc.gov.in` |

### 3.2 All 15 PMC Administrative Ward Offices & 5 Zone DMCs
Join each row by ward name with `pune-admin-wards.geojson` from DataMeet `Pune_wards` for automatic GPS-to-Ward email escalation. *(Preserve exact spelling `hadpsar@punecorporation.org` as published on `pmc.gov.in`.)*

| Zone | Zone DMC Phone & Email | Ward Office (Assistant Municipal Commissioner) | Ward Office Phone | Ward Office Email |
| :--- | :--- | :--- | :--- | :--- |
| Zone 1 | `020-25501591` / `dmc1@punecorporation.org` | Dhole Patil Road | `020-26161470` / `26161472` | `dholepatil@punecorporation.org` |
| Zone 1 | `020-25501591` / `dmc1@punecorporation.org` | Nagar Road – Wagholi | `020-25509000` / `26630103` | `nagarroad@punecorporation.org` |
| Zone 1 | `020-25501591` / `dmc1@punecorporation.org` | Yerwada – Wadgaonsheri | `020-25509100` / `26616550` | `yerwada@punecorporation.org` |
| Zone 2 | `020-26141484` / `dmc2@punecorporation.org` | Aundh – Baner | `020-25506840` | `aundh@punecorporation.org` |
| Zone 2 | `020-26141484` / `dmc2@punecorporation.org` | Kothrud – Bavdhan | `020-25506930` | `kothrud@punecorporation.org` |
| Zone 2 | `020-26141484` / `dmc2@punecorporation.org` | Shivajinagar – Ghole Road | `020-25501500` / `25511956` | `shivajinagar@punecorporation.org` |
| Zone 3 | `020-25508121` / `dmc3@punecorporation.org` | Dhankawadi – Katraj – Ambegaon | `020-24229769` | `dhankawadi@punecorporation.org` |
| Zone 3 | `020-25508121` / `dmc3@punecorporation.org` | Sinhagad Road | `020-24431467` / `24431468` | `sinhgadroad@punecorporation.org` |
| Zone 3 | `020-25508121` / `dmc3@punecorporation.org` | Warje – Karvenagar | `020-25432192` / `25432193` | `warjekarvenagar@punecorporation.org` |
| Zone 4 | `020-26141484` / `dmc4@punecorporation.org` | Kondhwa – Undri | `020-26860230` / `26860320` | `kondhwa@punecorporation.org` |
| Zone 4 | `020-26141484` / `dmc4@punecorporation.org` | Hadapsar – Manjri | `020-26821092` / `26821093` | `hadpsar@punecorporation.org` |
| Zone 4 | `020-26141484` / `dmc4@punecorporation.org` | Wanowrie (Wanawadi) | `020-25506264` / `25506299` | `wanawadi@punecorporation.org` |
| Zone 5 | `020-26141484` / `dmc5@punecorporation.org` | Vishrambaugwada | `020-24431461` / `24431462` | `vishrambaugwada@punecorporation.org` |
| Zone 5 | `020-26141484` / `dmc5@punecorporation.org` | Kasba Peth | `020-26437040` / `26437041` | `kasbapeth@punecorporation.org` |
| Zone 5 | `020-26141484` / `dmc5@punecorporation.org` | Bibvewadi | `020-24229768` | `bibwewadi@punecorporation.org` |

---

## 4. Pan-India NALSA Section 12 Free Legal Aid Screener Data

Add a 15-second eligibility screener on every civil, labour, tenancy, and criminal result screen.

### 4.1 Status-Based Eligibility (NO Income Limit)
Under Section 12 of the Legal Services Authorities Act, 1987, a citizen qualifies **regardless of income** if they are:
1. A woman
2. A child (under 18 years)
3. A member of a Scheduled Caste (SC) or Scheduled Tribe (ST)
4. An industrial workman
5. A person with disability or mental illness
6. A person in custody (including protective, juvenile, or psychiatric homes)
7. A victim of human trafficking or *begar*
8. A victim of mass disaster, ethnic violence, caste atrocity, flood, drought, earthquake, or industrial disaster

*(Note: Under Section 13(2), an income affidavit is generally sufficient proof of income. Senior citizens' eligibility varies by state rules. **Tele-Law** pre-litigation legal advice is free for **all** citizens regardless of income or status.)*

### 4.2 Section 12(h) Annual Income Ceilings — All 37 States & UTs
*(Supreme Court Legal Services Committee ceiling: ₹5,00,000/year across India.)*

| Annual Income Ceiling | States / Union Territories |
| :--- | :--- |
| **₹3,00,000** | Andhra Pradesh, Assam, Goa, Haryana, Himachal Pradesh, Jammu & Kashmir, Jharkhand, Karnataka, Kerala, **Maharashtra**, Manipur, Meghalaya, Odisha, Punjab, Rajasthan, Sikkim, Tamil Nadu, Telangana, Uttar Pradesh, Uttarakhand, Andaman & Nicobar Islands, Chandigarh UT, Delhi, Lakshadweep |
| **₹2,00,000** | Madhya Pradesh |
| **₹1,50,000** | Bihar, Chhattisgarh, Tripura |
| **₹1,00,000** | Arunachal Pradesh, Gujarat, Nagaland, West Bengal, Daman & Diu, Ladakh, Puducherry |
| **₹25,000** | Mizoram |
| **₹15,000** | Dadra & Nagar Haveli UT |

---

## 5. App Architecture, Guardrails & Statutory Countdown Timers

### 5.1 Recommended Technical Pattern: LLM Slot-Extraction + Deterministic Rule Engine
Never let an LLM invent portal URLs, filing fees, or legal deadlines. Separate intake from routing:
1. **Multilingual Intake (LLM / BHASHINI):** Parse free-text or voice input (Marathi/Hindi/English) strictly into structured slots:
   ```json
   {
     "dispute_type": "consumer_refund | unpaid_wages | security_deposit | neighbour_construction | civic_failure | cyber_fraud | banking_nbfc | builder_delay | govt_service | workplace_harassment",
     "lat": 18.5204,
     "lng": 73.8567,
     "amount_paid_inr": 45000,
     "days_since_incident": 10,
     "prior_written_complaint_sent": false,
     "prior_complaint_days_ago": 0,
     "nalsa_eligible_flag": true
   }
   ```
2. **Geo-Jurisdiction Resolver (Client-side Turf.js / Server-side Shapely):** Run point-in-polygon against DataMeet `pune-admin-wards.geojson` and `pcmc-electoral-wards.geojson` to split **PMC vs. PCMC** and identify the exact 1 of 15 PMC wards automatically.
3. **Deterministic Rule Engine (`india_grievance_platforms.json`):** Compute the exact forum, fee slab, mandatory pre-steps, SLA timer, document checklist, and handoff mode (Direct `wa.me` / `mailto:` / DIGIT API vs. Assisted Filing Packet PDF + Copy Tray).

### 5.2 Statutory Countdown Timers to Build into Your Tracker UI

| Trigger Event | Countdown Window | Portal / Law | Why It Matters |
| :--- | :--- | :--- | :--- |
| Unauthorized bank/UPI fraud | **Immediate / 3 working days** | `1930` + Bank (RBI circular) | Freeze funds on `1930`; preserve **zero customer liability** with bank (shadow credit in 10 working days) |
| Electronic FIR submission | **3 days** | Police / CCTNS | Must be signed in person within 3 days to be taken on record |
| NALSA Legal Aid decision | **7 days** | NALSA Reg. 7(2) | Expected window for Panel Advocate appointment |
| MahaRERA Conciliation consent | **7 days** | MahaRERA | Developer must consent within 7 days to enter ₹1,000 + GST conciliation |
| Written Demand Notice | **7–15 days** | Labour / Consumer / Tenancy | Creates clean documentary trail before formal filing |
| CPGRAMS / SEBI SCORES / Aaple Sarkar SLA | **21 days** (Aaple Sarkar: 21 working days) | CPGRAMS / SEBI / Maharashtra | Marks date to trigger Appeal / Review / Escalation |
| RBI CMS Mandatory Pre-Step | **30 days** | RBI Integrated Ombudsman | Filing earlier causes auto-rejection as "Non-maintainable" |
| SEBI SCORES / RBI CMS Limitation | **1 year** | SEBI / RB-IOS | Hard filing cutoff from cause of action / lender reply |
| Consumer Commission Limitation | **2 years** | CPA 2019 Sec. 69 (e-Jagriti) | Note: NCH (`1915`) does **not** pause this 2-year clock |
| Civil Recovery / IT Act Limitation | **3 years** | Limitation Act / IT Act | Cutoff for managerial salary recovery suits / cyber prosecution |

### 5.3 Hard UX & Compliance Guardrails (Avoid Common Hackathon Mistakes)
* **Prominent Non-Legal-Advice Banner:** *"This tool provides structured civic and procedural guidance based on public government rules; it does not constitute legal advice."*
* **Zero Dead Links:** Never link to `edaakhil.nic.in` (retired 1 Jan 2025; replaced by `e-jagriti.gov.in`). Always verify the live IRDAI grievance link from `irdai.gov.in` rather than blindly routing to `bimabharosa.irdai.gov.in`.
* **No Iframe Embedding of PMC:** PMC's open-data policy explicitly forbids loading PMC pages inside external iframes—always open portals in a new tab (`target="_blank" rel="noopener noreferrer"`).
* **Privacy by Design:** Store sensitive complaint drafts (especially SHe-Box, cyberbullying, or police narratives) only in client-side `localStorage`/memory, strip phone numbers from public X/Twitter civic intents, and never collect OTPs, PINs, or passwords.
* **No Wrong-Forum Traps:**
  * Block RTI, court/sub-judice, and personal/family disputes from CPGRAMS.
  * Direct Consumer Commission case tracking to `e-jagriti.gov.in` / `confonet.nic.in`—never regular eCourts.
  * Route pure civil security deposit refunds to Small Causes Court / DLSA / Tele-Law—not police stations (unless criminal cheating occurred).
  * Always use `1800-103-0222` (official `pmc.gov.in` toll-free) rather than third-party-cited PMC numbers.

---

## 6. Recommended 10 MVP Disputes & Verified Pitch-Deck Metrics

### 6.1 Top 10 Disputes for a Pune-Anchored Hackathon MVP
1. **Faulty Product / E-Commerce Refund Refusal** → Company GRO → NCH (`wa.me/918800001915`) → e-Jagriti (`₹0` fee ≤₹5L).
2. **Shop Overcharging Above MRP** → NCH WhatsApp prefill + District Legal Metrology + e-Jagriti.
3. **Unpaid Salary / Withheld FnF** → 7-Day Demand Notice PDF → Mahakamgar / Pune ALC (or SAMADHAN if Central sphere) + Civil Summary Suit flag + NALSA industrial-workman check.
4. **Landlord Refusing Security Deposit** → 15-Day Notice PDF + move-out checklist → Tele-Law / DLSA Pune → Small Causes Court Pune.
5. **Neighbour Unauthorized Construction Damaging Wall** → Dual track: PMC Pune Urban / Encroachment (`encroachment1@punecorporation.org` + GPS-matched PMC Ward Office) + DLSA/Civil injunction guide.
6. **Civic Failure (Pothole, Drainage, Garbage, Water, Streetlight)** → Auto-detect PMC vs. PCMC polygon → instant WhatsApp prefill (`8888251001` PMC / `9922501450` PCMC) + Swachhata (12-hr SLA) + Aaple Sarkar 21-day escalation.
7. **UPI / Online Banking Fraud** → Emergency Golden-Hour screen → `tel:1930` + Bank 3-day zero-liability written alert template + `cybercrime.gov.in` evidence packager.
8. **Bank/NBFC Harassment or Wrong CIBIL Entry** → Mandatory 30-day lender complaint generator + countdown timer → `cms.rbi.org.in` (10 MB validator).
9. **Builder Possession Delay / Handover Without OC** → MahaRERA registration check → Conciliation (₹1,000 + GST) vs. Form A (₹5,000) + forum-exclusivity notice.
10. **Delayed Government Service / Pension / Certificate** → Aaple Sarkar (State, 21 working days) vs. CPGRAMS (Central, 21 days) with exclusion filter.

### 6.2 Verified Statistics for Your Pitch Deck
* **Why Citizens Don't Complain (DAKSH National Survey):** 74% turn first to friends/family and 49% to village elders/local leaders; **police (40%)** and **lawyers (32%)** top the channels citizens avoid.
* **Cost of Misrouted Justice (DAKSH Access to Justice Survey — 305 locations, 24 states, 9,329 litigants):** Most litigants earn **<₹3 lakh/year**; lost wages and legal fees cost litigants **>₹80,000 crore/year** (>₹50,000 crore in lost wages/business at ₹1,746/case/day); women represent just **15%** of litigants (NJDG: 14%).
* **High-Volume Urban Demand:**
  * **National Consumer Helpline (2025):** **17.72 lakh** grievances (29% / 5.11 lakh e-commerce); facilitated ₹27.61 crore in refunds (Apr–Oct 2025).
  * **CPGRAMS (Jan–Nov 2026):** Financial Services (Banking) led with **2.92 lakh** central grievances, followed by Telecom (**92,794**). Meanwhile, **79.71%** of pending State/UT grievances on CPGRAMS exceeded 21 days (as of June 2025)—proving why routing directly to the right local/sectoral forum matters.
  * **Local Scale:** District Consumer Commissions account for **52.30 lakh** cumulative filings (vs. 8.43 lakh State and 1.15 lakh National); **e-Jagriti** crossed **1.35 lakh+** filings and **2.81 lakh+** users by Nov 2025; **Tele-Law** has enabled **1.15 crore+** free pre-litigation legal advice consultations across 2.5 lakh CSCs.