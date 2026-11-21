let currentLang = "en";
let selectedScenario = null;
let checkedEvidenceIds = new Set();
let activePlatform = "Instagram";
let forensicWaveIndex = 0;

// 3-Language UI Localization Pack: English (en), Hindi (hi), Marathi (mr)
const UI_TRANSLATIONS = {
  en: {
    name: "English (EN)",
    statBadge: "1 IN 10 ADOLESCENTS FACE CYBERBULLYING — 50% NEVER REPORT",
    hero1: "Detect. Contain.",
    hero2: "Report Without Fear.",
    subtitle: "A zero-trace cyberbullying defense console for students. Lock down morphed image URLs, abusive group chats, and fake profiles in browser RAM—before harassers delete the evidence.",
    startBtn: "Start Defense Protocol",
    demoBtn: "SIMULATE LIVE CASE (JUDGES)",
    wipeBtn: "WIPE SCREEN",
    exitBtn: "QUICK EXIT",
    layer1: "Threat Classification — What's Happening?",
    layer2: "Digital Evidence Preservation Protocol",
    layer2Sub: "Secure timestamps and permanent URLs before blocking so proof cannot be deleted.",
    tacticalRule: '<strong class="text-amber-300">Tactical Rule:</strong> Do not reply or retaliate. Harassers routinely delete messages or deactivate accounts the moment they are confronted.',
    notesPlaceholder: "Record profile URLs, handles, phone numbers, dates, and timestamps here...",
    exportBtn: "EXPORT EVIDENCE DOSSIER (.TXT)",
    layer3: "Platform Reporting & Containment",
    layer4: "Official Escalation & Support Grid"
  },
  hi: {
    name: "हिन्दी (Hindi)",
    statBadge: "10 में से 1 किशोर साइबरबुलिंग का शिकार — 50% कभी रिपोर्ट नहीं करते",
    hero1: "पहचानें. रोकें.",
    hero2: "बिना डर रिपोर्ट करें.",
    subtitle: "छात्रों के लिए जीरो-ट्रेस साइबरबुलिंग सुरक्षा कंसोल। उत्पीड़कों द्वारा सबूत मिटाने से पहले ब्राउज़र RAM में ही मॉर्फ्ड फोटो लिंक, अपमानजनक चैट और फर्जी प्रोफाइल सुरक्षित करें।",
    startBtn: "सुरक्षा प्रोटोकॉल शुरू करें",
    demoBtn: "लाइव केस डेमो देखें (जजों के लिए)",
    wipeBtn: "स्क्रीन साफ़ करें",
    exitBtn: "तुरंत बाहर निकलें",
    layer1: "खतरे की पहचान — क्या हो रहा है?",
    layer2: "डिजिटल सबूत सुरक्षित करने की प्रक्रिया",
    layer2Sub: "ब्लॉक करने से पहले तारीख, समय और स्थायी प्रोफ़ाइल लिंक सुरक्षित करें ताकि सबूत मिट न सकें।",
    tacticalRule: '<strong class="text-amber-300">जरूरी नियम:</strong> कोई जवाब या पलटवार न करें। सामना होने पर उत्पीड़क अक्सर तुरंत मैसेज या अकाउंट डिलीट कर देते हैं।',
    notesPlaceholder: "यहाँ प्रोफ़ाइल URL, यूज़रनेम, फ़ोन नंबर, तारीख और समय लिखें...",
    exportBtn: "सबूत फ़ाइल डाउनलोड करें (.TXT)",
    layer3: "सोशल मीडिया ऐप पर रिपोर्ट और ब्लॉक",
    layer4: "आधिकारिक शिकायत और हेल्पलाइन ग्रिड"
  },
  mr: {
    name: "मराठी (Marathi)",
    statBadge: "१० पैकी १ किशोर सायबरबुलिंगला बळी — ५०% कधीही तक्रार करत नाहीत",
    hero1: "ओळखा. थांबवा.",
    hero2: "न घाबरता तक्रार करा.",
    subtitle: "विद्यार्थ्यांसाठी झिरो-ट्रेस सायबरबुलिंग संरक्षण प्रणाली. छळ करणाऱ्यांनी पुरावे नष्ट करण्यापूर्वी ब्राउझर RAM मध्येच मॉर्फ केलेले फोटो, आक्षेपार्ह चॅट्स आणि बनावट प्रोफाइल जतन करा.",
    startBtn: "संरक्षण प्रोटोकॉल सुरू करा",
    demoBtn: "लाईव्ह केस डेमो पहा (परीक्षकांसाठी)",
    wipeBtn: "स्क्रीन पुसा",
    exitBtn: "त्वरित बाहेर पडा",
    layer1: "धोक्याचे वर्गीकरण — नेमके काय घडत आहे?",
    layer2: "डिजिटल पुरावे जतन करण्याची पद्धत",
    layer2Sub: "ब्लॉक करण्यापूर्वी तारीख, वेळ आणि कायमस्वरूपी प्रोफाइल लिंक जतन करा जेणेकरून पुरावे नष्ट होणार नाहीत.",
    tacticalRule: '<strong class="text-amber-300">महत्त्वाचा नियम:</strong> उत्तर देऊ नका किंवा प्रत्युत्तर देऊ नका. जाब विचारल्यास त्रास देणारे लगेच मेसेज किंवा अकाउंट डिलीट करतात.',
    notesPlaceholder: "येथे प्रोफाइल URL, युजरनेम, फोन नंबर, तारीख आणि वेळ नोंदवा...",
    exportBtn: "पुराव्यांची फाईल डाउनलोड करा (.TXT)",
    layer3: "सोशल मीडिया ॲपवर रिपोर्ट आणि ब्लॉक",
    layer4: "अधिकृत तक्रार आणि हेल्पलाइन मदत"
  }
};

// Full Multilingual Content (English, Hindi, Marathi)
const CONTENT_BY_LANG = {
  en: {
    scenarios: [
      {
        id: "abuse",
        title: "Abusive Messages or Threats in Chats",
        desc: "Repeated insults, threats, or bullying in DMs or college WhatsApp groups.",
        urgency: "PRIORITY // SAVE CHAT & ADMIN INFO",
        summary: "Do not reply or argue. Capture full-screen screenshots showing the sender's username or phone number, timestamps, and group admin list.",
        route: "Recommended Path: Report in-app → Escalate to College Anti-Ragging Cell or cybercrime.gov.in."
      },
      {
        id: "impersonation",
        title: "Fake Profile or Impersonation",
        desc: "Someone created a fake account using your name, photos, or college identity.",
        urgency: "PRIORITY // COPY PERMANENT PROFILE URL",
        summary: "Usernames can be changed anytime. Open the fake profile and copy its direct Profile URL before reporting so investigators can trace it.",
        route: "Recommended Path: Submit Impersonation Report on the app → File on cybercrime.gov.in."
      },
      {
        id: "morphed",
        title: "Morphed or Private Photos Shared",
        desc: "Edited images or private photos leaked or used to threaten you.",
        urgency: "CRITICAL // ANONYMOUS REPORTING READY",
        summary: "Save the post link and blackmail messages. Never pay money or comply with threats.",
        route: "Recommended Path: File under 'Women/Child Related Crime' on cybercrime.gov.in (supports anonymous filing) or call 1930 / 112."
      },
      {
        id: "campus",
        title: "Campus / College Group Harassment",
        desc: "Coordinated bullying, ragging, or rumors spread by classmates or seniors.",
        urgency: "PRIORITY // INSTITUTIONAL PROTECTION",
        summary: "Colleges must act on written complaints through their Anti-Ragging Committee or Internal Complaints Committee (ICC).",
        route: "Recommended Path: Use the Complaint Draft below for your college committee or call UGC Helpline 1800-180-5522."
      }
    ],
    checklist: [
      { id: "ev1", title: "Do not reply or retaliate", detail: "Confronting the bully often makes them delete posts before you save proof." },
      { id: "ev2", title: "Take full-screen screenshots with date & time", detail: "Make sure the clock, sender handle/number, and exact message are visible." },
      { id: "ev3", title: "Copy the exact profile URL or post link", detail: "Save the permanent link, not just a cropped screenshot of the display name." },
      { id: "ev4", title: "Capture group info & admin list (if in a group)", detail: "Screenshot the group description and admin phone numbers/handles." },
      { id: "ev5", title: "Save backups offline", detail: "Keep copies in a secure local folder on your device." }
    ],
    platforms: {
      Instagram: [
        "Open the offending profile or chat and tap the three dots (⋯) in the top right.",
        "Tap 'Copy Profile URL' first and paste it into your Local Incident Log above.",
        "Tap 'Report' → 'Something about this account' or 'Specific post/message'.",
        "Select 'Bullying or harassment' or 'Pretending to be someone else'.",
        "Tap 'Block' and 'Restrict' so they cannot message or view your profile."
      ],
      WhatsApp: [
        "Open the chat or group and tap the contact/group name at the top.",
        "Screenshot their visible phone number and the abusive messages.",
        "In a 1-on-1 chat: scroll down, tap 'Report', and keep 'Block contact' checked.",
        "In a group chat: screenshot the Group Admins list, tap 'Report group', and exit.",
        "Turn on 'Silence Unknown Callers' in Settings → Privacy."
      ],
      Snapchat: [
        "Press and hold on the abusive Snap, message, or story.",
        "Tap 'Report' from the menu.",
        "Choose 'Harassment or Bullying' or 'Impersonation'.",
        "Write down the exact Snapchat username (not just display name) in your notes.",
        "Tap 'Manage Friendship' → 'Block'."
      ]
    }
  },
  hi: {
    scenarios: [
      {
        id: "abuse",
        title: "चैट में अपमानजनक संदेश या धमकियाँ",
        desc: "DM या कॉलेज WhatsApp ग्रुप में बार-बार गालियाँ, धमकियाँ या बुलिंग।",
        urgency: "प्राथमिकता // चैट और एडमिन जानकारी सेव करें",
        summary: "जवाब या बहस न करें। फुल-स्क्रीन स्क्रीनशॉट लें जिसमें भेजने वाले का यूज़रनेम या फ़ोन नंबर, समय और ग्रुप एडमिन की सूची दिखे।",
        route: "सुझाया गया रास्ता: ऐप में रिपोर्ट करें → कॉलेज एंटी-रैगिंग सेल या cybercrime.gov.in पर शिकायत करें।"
      },
      {
        id: "impersonation",
        title: "फर्जी प्रोफ़ाइल या पहचान की चोरी",
        desc: "किसी ने आपके नाम, फ़ोटो या कॉलेज पहचान का उपयोग करके नकली अकाउंट बनाया है।",
        urgency: "प्राथमिकता // स्थायी प्रोफ़ाइल URL कॉपी करें",
        summary: "यूज़रनेम कभी भी बदला जा सकता है। रिपोर्ट करने से पहले फर्जी प्रोफ़ाइल खोलें और उसका सीधा Profile URL कॉपी करें।",
        route: "सुझाया गया रास्ता: ऐप पर Impersonation रिपोर्ट सबमिट करें → cybercrime.gov.in पर दर्ज करें।"
      },
      {
        id: "morphed",
        title: "मॉर्फ्ड या निजी फ़ोटो साझा करना",
        desc: "एडिट की गई तस्वीरें या निजी फ़ोटो लीक करना या ब्लैकमेल के लिए इस्तेमाल करना।",
        urgency: "अति गंभीर // गुमनाम रिपोर्टिंग उपलब्ध",
        summary: "पोस्ट लिंक और ब्लैकमेल संदेश सुरक्षित रखें। कभी भी पैसे न दें या धमकियों के आगे न झुकें।",
        route: "सुझाया गया रास्ता: cybercrime.gov.in पर 'Women/Child Related Crime' के तहत (गुमनाम विकल्प के साथ) रिपोर्ट करें या 1930 / 112 पर कॉल करें।"
      },
      {
        id: "campus",
        title: "कैंपस / कॉलेज ग्रुप में उत्पीड़न",
        desc: "सहपाठियों या सीनियर्स द्वारा सामूहिक बुलिंग, रैगिंग या अफवाहें फैलाना।",
        urgency: "प्राथमिकता // संस्थागत सुरक्षा",
        summary: "कॉलेजों को अपनी एंटी-रैगिंग कमेटी या आंतरिक शिकायत समिति (ICC) के माध्यम से लिखित शिकायतों पर कार्रवाई करना अनिवार्य है।",
        route: "सुझाया गया रास्ता: नीचे दिए गए शिकायत ड्राफ्ट का उपयोग करें या UGC हेल्पलाइन 1800-180-5522 पर कॉल करें।"
      }
    ],
    checklist: [
      { id: "ev1", title: "जवाब या पलटवार न करें", detail: "सामना करने पर उत्पीड़क अक्सर सबूत सेव करने से पहले ही पोस्ट डिलीट कर देते हैं।" },
      { id: "ev2", title: "तारीख और समय के साथ फुल-स्क्रीन स्क्रीनशॉट लें", detail: "सुनिश्चित करें कि घड़ी, भेजने वाले का हैंडल/नंबर और पूरा संदेश स्पष्ट दिखे।" },
      { id: "ev3", title: "सटीक प्रोफ़ाइल URL या पोस्ट लिंक कॉपी करें", detail: "केवल डिस्प्ले नाम का क्रॉप स्क्रीनशॉट नहीं, बल्कि स्थायी लिंक सेव करें।" },
      { id: "ev4", title: "ग्रुप जानकारी और एडमिन सूची कैप्चर करें", detail: "ग्रुप विवरण और एडमिन के फ़ोन नंबर/हैंडल का स्क्रीनशॉट लें।" },
      { id: "ev5", title: "बैकअप ऑफ़लाइन सुरक्षित रखें", detail: "अपने डिवाइस के सुरक्षित लोकल फ़ोल्डर में प्रतियाँ रखें।" }
    ],
    platforms: {
      Instagram: [
        "आरोपी प्रोफ़ाइल या चैट खोलें और ऊपर दाईं ओर तीन बिंदुओं (⋯) पर टैप करें।",
        "पहले 'Copy Profile URL' पर टैप करें और ऊपर अपने लोकल लॉग में पेस्ट करें।",
        "'Report' → 'Something about this account' या 'Specific post/message' पर टैप करें।",
        "'Bullying or harassment' या 'Pretending to be someone else' चुनें।",
        "'Block' और 'Restrict' करें ताकि वे आपको संदेश न भेज सकें।"
      ],
      WhatsApp: [
        "चैट या ग्रुप खोलें और सबसे ऊपर कॉन्टैक्ट/ग्रुप के नाम पर टैप करें।",
        "उनके फ़ोन नंबर और अपमानजनक संदेशों का स्क्रीनशॉट लें।",
        "व्यक्तिगत चैट में: नीचे स्क्रॉल करें, 'Report' पर टैप करें और 'Block contact' चुना रहने दें।",
        "ग्रुप चैट में: Group Admins सूची का स्क्रीनशॉट लें, 'Report group' करें और बाहर निकलें।",
        "Settings → Privacy में जाकर 'Silence Unknown Callers' चालू करें।"
      ],
      Snapchat: [
        "आपत्तिजनक Snap, संदेश या स्टोरी को दबाकर रखें (Press & hold)।",
        "मेनू से 'Report' पर टैप करें।",
        "'Harassment or Bullying' या 'Impersonation' चुनें।",
        "अपने नोट्स में सटीक Snapchat यूज़रनेम (सिर्फ़ डिस्प्ले नाम नहीं) लिखें।",
        "'Manage Friendship' → 'Block' पर टैप करें।"
      ]
    }
  },
  mr: {
    scenarios: [
      {
        id: "abuse",
        title: "चॅटमध्ये अपमानास्पद मेसेज किंवा धमक्या",
        desc: "DM किंवा कॉलेज WhatsApp ग्रुपमध्ये वारंवार शिवीगाळ, धमक्या किंवा बुलिंग.",
        urgency: "प्राधान्य // चॅट आणि ॲडमिन माहिती जतन करा",
        summary: "उत्तर देऊ नका किंवा वाद घालू नका. पाठवणाऱ्याचे युजरनेम किंवा फोन नंबर, वेळ आणि ग्रुप ॲडमिनची यादी दिसेल असे फुल-स्क्रीन स्क्रीनशॉट घ्या.",
        route: "शिफारस केलेला मार्ग: ॲपमध्ये रिपोर्ट करा → कॉलेज अँटी-रॅगिंग सेल किंवा cybercrime.gov.in वर तक्रार करा."
      },
      {
        id: "impersonation",
        title: "बनावट प्रोफाइल किंवा ओळखीचा गैरवापर",
        desc: "कोणीतरी तुमचे नाव, फोटो किंवा कॉलेज ओळख वापरून बनावट अकाउंट तयार केले आहे.",
        urgency: "प्राधान्य // कायमस्वरूपी प्रोफाइल URL कॉपी करा",
        summary: "युजरनेम कधीही बदलता येते. रिपोर्ट करण्यापूर्वी बनावट प्रोफाइल उघडून त्याचा थेट Profile URL कॉपी करा.",
        route: "शिफारस केलेला मार्ग: ॲपवर Impersonation रिपोर्ट सबमिट करा → cybercrime.gov.in वर तक्रार नोंदवा."
      },
      {
        id: "morphed",
        title: "मॉर्फ केलेले किंवा खाजगी फोटो शेअर करणे",
        desc: "एडिट केलेले फोटो किंवा खाजगी फोटो लीक करणे किंवा ब्लॅकमेल करण्यासाठी वापरणे.",
        urgency: "अतिगंभीर // निनावी तक्रार सुविधा उपलब्ध",
        summary: "पोस्टची लिंक आणि ब्लॅकमेल मेसेज जतन करा. कधीही पैसे देऊ नका किंवा धमक्यांना बळी पडू नका.",
        route: "शिफारस केलेला मार्ग: cybercrime.gov.in वर 'Women/Child Related Crime' अंतर्गत (निनावी पर्यायासह) तक्रार करा किंवा 1930 / 112 वर कॉल करा."
      },
      {
        id: "campus",
        title: "कॅम्पस / कॉलेज ग्रुपमधील छळ",
        desc: "वर्गमित्र किंवा सीनियर्सकडून सामूहिक बुलिंग, रॅगिंग किंवा अफवा पसरवणे.",
        urgency: "प्राधान्य // संस्थात्मक संरक्षण",
        summary: "महाविद्यालयांना त्यांच्या अँटी-रॅगिंग कमिटी किंवा अंतर्गत तक्रार समितीद्वारे (ICC) लेखी तक्रारींवर कारवाई करणे बंधनकारक आहे.",
        route: "शिफारस केलेला मार्ग: खालील तक्रार मसुदा वापरा किंवा UGC हेल्पलाइन 1800-180-5522 वर कॉल करा."
      }
    ],
    checklist: [
      { id: "ev1", title: "उत्तर देऊ नका किंवा प्रत्युत्तर देऊ नका", detail: "जाब विचारल्यास त्रास देणारे पुरावे जतन करण्यापूर्वीच पोस्ट डिलीट करतात." },
      { id: "ev2", title: "तारीख आणि वेळेसह फुल-स्क्रीन स्क्रीनशॉट घ्या", detail: "घड्याळ, पाठवणाऱ्याचा नंबर/हँडल आणि संपूर्ण मेसेज स्पष्ट दिसेल याची खात्री करा." },
      { id: "ev3", title: "अचूक प्रोफाइल URL किंवा पोस्ट लिंक कॉपी करा", detail: "फक्त नावाचा स्क्रीनशॉट न घेता कायमस्वरूपी लिंक जतन करा." },
      { id: "ev4", title: "ग्रुप माहिती आणि ॲडमिन यादी जतन करा", detail: "ग्रुपचे वर्णन आणि ॲडमिनचे फोन नंबर/हँडल यांचे स्क्रीनशॉट घ्या." },
      { id: "ev5", title: "बॅकअप ऑफलाइन सुरक्षित ठेवा", detail: "तुमच्या डिव्हाइसवरील सुरक्षित फोल्डरमध्ये प्रती जतन करा." }
    ],
    platforms: {
      Instagram: [
        "त्रास देणारे प्रोफाइल किंवा चॅट उघडा आणि वर उजवीकडे तीन ठिपक्यांवर (⋯) टॅप करा.",
        "प्रथम 'Copy Profile URL' वर टॅप करा आणि वरील स्थानिक लॉगमध्ये पेस्ट करा.",
        "'Report' → 'Something about this account' किंवा 'Specific post/message' निवडा.",
        "'Bullying or harassment' किंवा 'Pretending to be someone else' निवडा.",
        "'Block' आणि 'Restrict' करा जेणेकरून ते पुन्हा मेसेज करू शकणार नाहीत."
      ],
      WhatsApp: [
        "चॅट किंवा ग्रुप उघडा आणि सर्वात वर कॉन्टॅक्ट/ग्रुपच्या नावावर टॅप करा.",
        "त्यांचा फोन नंबर आणि आक्षेपार्ह मेसेजचे स्क्रीनशॉट घ्या.",
        "वैयक्तिक चॅटमध्ये: खाली स्क्रोल करा, 'Report' वर टॅप करा आणि 'Block contact' निवडलेले ठेवा.",
        "ग्रुप चॅटमध्ये: Group Admins यादीचा स्क्रीनशॉट घ्या, 'Report group' करा आणि बाहेर पडा.",
        "Settings → Privacy मध्ये जाऊन 'Silence Unknown Callers' सुरू करा."
      ],
      Snapchat: [
        "आक्षेपार्ह Snap, मेसेज किंवा स्टोरीवर दाबून ठेवा (Press & hold).",
        "मेनूमधून 'Report' वर टॅप करा.",
        "'Harassment or Bullying' किंवा 'Impersonation' निवडा.",
        "तुमच्या नोट्समध्ये अचूक Snapchat युजरनेम लिहून ठेवा.",
        "'Manage Friendship' → 'Block' वर टॅप करा."
      ]
    }
  }
};

const HELPLINES_LIST = [
  { name: "National Cybercrime Helpline", number: "1930", tag: "24X7 POLICE", desc: "Cybercrime reporting guidance and urgent escalation." },
  { name: "Emergency Response", number: "112", tag: "URGENT SAFETY", desc: "Immediate police assistance if threats involve physical danger." },
  { name: "UGC Anti-Ragging Helpline", number: "1800-180-5522", tag: "CAMPUS SAFETY", desc: "24x7 toll-free support for college ragging and online bullying." },
  { name: "Tele-MANAS Counselling", number: "14416", tag: "MENTAL HEALTH", desc: "24x7 free, confidential government counselling support." },
  { name: "Childline India (Under 18)", number: "1098", tag: "SCHOOL STUDENTS", desc: "24x7 confidential support for students under 18." },
  { name: "Pune Cyber Police / Bharosa Cell", number: "020-29710097", tag: "LOCAL NODE", desc: "Dedicated cybercrime and student/women safety desk." }
];

const FORENSIC_WAVES = [
  {
    media: {
      file: "MORPHED_IMG_04.JPG",
      badge: "BLURRED // EXIF",
      gradient: "from-rose-600/60 via-purple-600/50 to-cyan-500/50",
      label: "[REDACTED // HASH LOCKED]",
      hash: "SHA256: 9F84...E21C",
      status: "URL_SAVED ✓"
    },
    message: {
      header: "LEAK_THREAT_INTERCEPT",
      time: "14:02 IST",
      handle: "@fake_campus_node",
      tag: "EXTORTION",
      beforeBlur: "Sending your ",
      blurredWord: "private photos",
      afterBlur: " to the batch group unless...",
      footerLeft: "ACTION: DO NOT REPLY",
      footerRight: "PROOF_CAPTURED"
    },
    extraTag: {
      title: "CLONE_URL_DETECTED",
      detail: "instagram.com/priya_official_99"
    }
  },
  {
    media: {
      file: "DEEPFAKE_REEL_19.MP4",
      badge: "DISTORTED // AI",
      gradient: "from-amber-500/60 via-rose-600/50 to-indigo-600/50",
      label: "[FACE_SWAP // QUARANTINED]",
      hash: "SHA256: 3B17...A90F",
      status: "LINK_LOCKED ✓"
    },
    message: {
      header: "GROUP_BULLYING_SCAN",
      time: "14:07 IST",
      handle: "TY_UNOFFICIAL_WA_GRP",
      tag: "HARASSMENT",
      beforeBlur: "Look at this ",
      blurredWord: "edited screenshot",
      afterBlur: " everyone forward it fast!",
      footerLeft: "ADMINS: 2 NUMBERS SAVED",
      footerRight: "CHAT_LOGGED"
    },
    extraTag: {
      title: "IMPERSONATION_ALERT",
      detail: "Fake DP match • 94% similarity"
    }
  },
  {
    media: {
      file: "PRIVATE_SNAP_88.WEBP",
      badge: "CENSORED // RAW",
      gradient: "from-cyan-500/60 via-teal-500/50 to-rose-600/50",
      label: "[SENSITIVE // ZERO_UPLOAD]",
      hash: "SHA256: 7C42...D11B",
      status: "EVIDENCE_OK ✓"
    },
    message: {
      header: "BLACKMAIL_DM_SHIELD",
      time: "14:12 IST",
      handle: "+91 98XXX-XX410",
      tag: "THREAT_DM",
      beforeBlur: "Delete your post or ",
      blurredWord: "leaking your number",
      afterBlur: " on public pages tonight.",
      footerLeft: "ROUTE: CYBERCRIME 1930",
      footerRight: "ANON_READY"
    },
    extraTag: {
      title: "METADATA_PRESERVED",
      detail: "Timestamp + Handle verified"
    }
  }
];

function getLogic() {
  return window.KavachLogic || null;
}

function getActiveScenarios() {
  const logic = getLogic();
  if (currentLang === "hi") return CONTENT_BY_LANG.hi.scenarios;
  if (logic?.getScenarios) return logic.getScenarios(currentLang);
  return CONTENT_BY_LANG[currentLang]?.scenarios || CONTENT_BY_LANG.en.scenarios;
}

function getActiveChecklist() {
  const logic = getLogic();
  if (currentLang === "hi") return CONTENT_BY_LANG.hi.checklist;
  if (logic?.getEvidenceChecklist) return logic.getEvidenceChecklist(currentLang);
  return CONTENT_BY_LANG[currentLang]?.checklist || CONTENT_BY_LANG.en.checklist;
}

function getActivePlatformSteps(platform) {
  const logic = getLogic();
  if (currentLang === "hi") return CONTENT_BY_LANG.hi.platforms[platform];
  if (logic?.getPlatformSteps) return logic.getPlatformSteps(platform, currentLang);
  return (CONTENT_BY_LANG[currentLang]?.platforms || CONTENT_BY_LANG.en.platforms)[platform];
}

function initFrontend() {
  const scenarios = getActiveScenarios();
  if (!selectedScenario && scenarios.length > 0) {
    selectedScenario = scenarios[0];
  }
  renderScenarios();
  renderEvidenceChecklist();
  renderPlatformTabs();
  renderPlatformSteps();
  renderHelplines();
  refreshCollegeLetter();
  initScrollReveal();
  init3DTrinetraGlobe();
  startGlobePopoutCycle();
  if (window.lucide) lucide.createIcons();
}

function changeLanguage(langCode) {
  if (!UI_TRANSLATIONS[langCode]) langCode = "en";
  currentLang = langCode;
  const pack = UI_TRANSLATIONS[currentLang];

  // Update Active Language Pill Styling (EN | हिन्दी | मराठी)
  document.querySelectorAll(".lang-pill").forEach((btn) => {
    const isMatch = btn.getAttribute("data-lang") === currentLang;
    btn.className = isMatch
      ? "lang-pill px-2.5 py-1 rounded-md font-bold transition bg-cyan-400 text-slate-950 cursor-pointer"
      : "lang-pill px-2.5 py-1 rounded-md font-semibold transition text-cyan-200 hover:text-white cursor-pointer";
  });

  // Apply translated UI strings
  document.getElementById("ui-stat-badge").textContent = pack.statBadge;
  document.getElementById("ui-hero-title-1").textContent = pack.hero1;
  document.getElementById("ui-hero-title-2").textContent = pack.hero2;
  document.getElementById("ui-hero-subtitle").textContent = pack.subtitle;
  document.querySelector("#ui-start-btn span").textContent = pack.startBtn;
  document.getElementById("ui-demo-btn").textContent = pack.demoBtn;
  document.getElementById("btn-wipe-screen").textContent = pack.wipeBtn;
  document.querySelector("#btn-quick-exit span").textContent = pack.exitBtn;
  document.getElementById("ui-layer1-heading").textContent = pack.layer1;
  document.getElementById("ui-layer2-heading").textContent = pack.layer2;
  document.getElementById("ui-layer2-sub").textContent = pack.layer2Sub;
  document.getElementById("ui-tactical-rule").innerHTML = pack.tacticalRule;
  document.getElementById("local-notes").placeholder = pack.notesPlaceholder;
  document.getElementById("ui-export-btn").textContent = pack.exportBtn;
  document.getElementById("ui-layer3-heading").textContent = pack.layer3;
  document.getElementById("ui-layer4-heading").textContent = pack.layer4;

  // Toggle banner when Hindi or Marathi is active
  const banner = document.getElementById("active-lang-banner");
  const bannerText = document.getElementById("active-lang-text");
  if (currentLang !== "en") {
    banner.classList.remove("hidden");
    bannerText.textContent = `ACTIVE_LANGUAGE: ${pack.name} // ZERO-SERVER PRIVACY ACTIVE`;
  } else {
    banner.classList.add("hidden");
  }

  const scenarios = getActiveScenarios();
  if (selectedScenario) {
    selectedScenario = scenarios.find(s => s.id === selectedScenario.id) || scenarios[0];
  }
  renderScenarios();
  renderEvidenceChecklist();
  renderPlatformSteps();
}

function startGlobePopoutCycle() {
  renderForensicWave();
  setInterval(() => {
    forensicWaveIndex = (forensicWaveIndex + 1) % FORENSIC_WAVES.length;
    renderForensicWave();
  }, 5000);
}

function renderForensicWave() {
  const layer = document.getElementById("globe-popout-layer");
  if (!layer) return;
  const wave = FORENSIC_WAVES[forensicWaveIndex];

  layer.innerHTML = `
    <div style="--origin-x: 95px; --origin-y: 95px; animation-delay: 0ms;"
         class="globe-pop-card sm:absolute sm:top-2 sm:left-0 w-full sm:w-60 bg-slate-950/92 backdrop-blur-xl border border-rose-500/45 rounded-xl p-3 shadow-2xl shadow-rose-950/60 relative overflow-hidden">
      <div class="scan-beam"></div>
      <div class="flex items-center justify-between font-mono text-[10px] mb-2">
        <span class="text-rose-400 font-bold flex items-center gap-1">
          <i data-lucide="image-off" class="w-3 h-3"></i> ${wave.media.file}
        </span>
        <span class="bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">${wave.media.badge}</span>
      </div>

      <div class="relative h-16 rounded-lg overflow-hidden border border-white/10 bg-slate-900 flex items-center justify-center">
        <div class="distorted-media-sim absolute inset-0 bg-gradient-to-tr ${wave.media.gradient} flex items-center justify-center">
          <div class="w-10 h-10 rounded-full bg-slate-200/45"></div>
          <div class="w-16 h-8 rounded-t-full bg-slate-300/35 -ml-4 mt-6"></div>
        </div>
        <div class="crt-lines absolute inset-0"></div>
        <span class="relative z-10 font-mono text-[10px] font-bold tracking-wider bg-slate-950/90 text-rose-200 border border-rose-400/45 px-2 py-0.5 rounded">
          ${wave.media.label}
        </span>
      </div>

      <div class="mt-2 flex items-center justify-between font-mono text-[9px] text-slate-400">
        <span>${wave.media.hash}</span>
        <span class="text-emerald-400 font-bold">${wave.media.status}</span>
      </div>
    </div>

    <div style="--origin-x: -90px; --origin-y: 85px; animation-delay: 180ms;"
         class="globe-pop-card hidden sm:block sm:absolute sm:top-4 sm:right-0 w-56 bg-slate-950/92 backdrop-blur-xl border border-cyan-400/40 rounded-xl p-2.5 shadow-2xl">
      <div class="flex items-center gap-1.5 font-mono text-[10px] text-cyan-300 font-bold">
        <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
        <span>${wave.extraTag.title}</span>
      </div>
      <p class="font-mono text-[10px] text-slate-300 mt-1 truncate">${wave.extraTag.detail}</p>
    </div>

    <div style="--origin-x: -95px; --origin-y: -85px; animation-delay: 120ms;"
         class="globe-pop-card sm:absolute sm:bottom-2 sm:right-0 w-full sm:w-64 bg-slate-950/92 backdrop-blur-xl border border-amber-500/45 rounded-xl p-3 shadow-2xl">
      <div class="flex items-center justify-between font-mono text-[10px] mb-1.5">
        <span class="text-amber-300 font-bold flex items-center gap-1">
          <i data-lucide="message-square-warning" class="w-3 h-3"></i> ${wave.message.header}
        </span>
        <span class="text-slate-400">${wave.message.time}</span>
      </div>

      <div class="bg-slate-900/95 border border-white/10 rounded-lg p-2 space-y-1.5 font-mono text-[10px]">
        <div class="flex items-center justify-between text-slate-400">
          <span>${wave.message.handle}</span>
          <span class="text-rose-400 font-bold">${wave.message.tag}</span>
        </div>
        <p class="text-slate-300 leading-snug">
          "${wave.message.beforeBlur}<span class="bg-slate-700 text-transparent rounded px-1 select-none blur-[2px]">${wave.message.blurredWord}</span>${wave.message.afterBlur}"
        </p>
      </div>

      <div class="mt-2 flex items-center justify-between font-mono text-[9px]">
        <span class="text-cyan-300">${wave.message.footerLeft}</span>
        <span class="text-emerald-400 font-bold">${wave.message.footerRight}</span>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

function init3DTrinetraGlobe() {
  const canvas = document.getElementById("trinetra-globe");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = 126;

  let rotY = 0.6;
  let rotX = 0.25;
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  const points = [];
  for (let lat = -75; lat <= 75; lat += 15) {
    const phi = (lat * Math.PI) / 180;
    const count = Math.max(6, Math.round(24 * Math.cos(phi)));
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      points.push({
        x: Math.cos(phi) * Math.cos(theta),
        y: Math.sin(phi),
        z: Math.cos(phi) * Math.sin(theta),
        beacon: (lat === 15 && i % 5 === 0),
        threat: (lat === -15 && i % 5 === 0)
      });
    }
  }

  canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener("mouseup", () => { isDragging = false; });
  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    rotY += (e.clientX - lastX) * 0.008;
    rotX += (e.clientY - lastY) * 0.008;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  function project(p) {
    let x1 = p.x * Math.cos(rotY) - p.z * Math.sin(rotY);
    let z1 = p.z * Math.cos(rotY) + p.x * Math.sin(rotY);
    let y2 = p.y * Math.cos(rotX) - z1 * Math.sin(rotX);
    let z2 = z1 * Math.cos(rotX) + p.y * Math.sin(rotX);

    const scale = 320 / (320 - z2 * radius);
    return {
      sx: cx + x1 * radius * scale,
      sy: cy + y2 * radius * scale,
      z: z2,
      beacon: p.beacon,
      threat: p.threat
    };
  }

  let pulse = 0;
  function draw() {
    ctx.clearRect(0, 0, w, h);
    if (!isDragging) rotY += 0.006;
    pulse += 0.055;

    const grad = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius * 1.25);
    grad.addColorStop(0, "rgba(34, 211, 238, 0.10)");
    grad.addColorStop(1, "rgba(2, 6, 23, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(34, 211, 238, 0.28)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const projected = points.map(project).sort((a, b) => a.z - b.z);

    for (let i = 0; i < projected.length; i++) {
      const a = projected[i];
      if (a.z < -0.15) continue;
      for (let j = i + 1; j < projected.length; j++) {
        const b = projected[j];
        if (b.z < -0.15) continue;
        const dx = a.sx - b.sx;
        const dy = a.sy - b.sy;
        const dist = Math.hypot(dx, dy);
        if (dist < 38) {
          ctx.strokeStyle = `rgba(45, 212, 191, ${(1 - dist / 38) * 0.26})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.stroke();
        }
      }
    }

    projected.forEach((pt) => {
      const front = pt.z > 0;
      ctx.beginPath();
      const nodeRadius = (pt.beacon || pt.threat) && front ? 3.8 : front ? 2 : 1.2;
      ctx.arc(pt.sx, pt.sy, nodeRadius, 0, Math.PI * 2);

      if (pt.threat && front) {
        ctx.fillStyle = "#fb7185";
      } else if (pt.beacon && front) {
        ctx.fillStyle = "#22d3ee";
      } else if (front) {
        ctx.fillStyle = "rgba(94, 234, 212, 0.85)";
      } else {
        ctx.fillStyle = "rgba(100, 116, 139, 0.25)";
      }
      ctx.fill();

      if ((pt.beacon || pt.threat) && front) {
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, 7 + Math.sin(pulse) * 3.2, 0, Math.PI * 2);
        ctx.strokeStyle = pt.threat ? "rgba(251, 113, 133, 0.6)" : "rgba(34, 211, 238, 0.45)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    });

    requestAnimationFrame(draw);
  }
  draw();
}

function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: 0.08 });

  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
}

function handleCardMove(e, card) {
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  card.style.setProperty("--mx", `${x}px`);
  card.style.setProperty("--my", `${y}px`);
  const rotateY = ((x / rect.width) - 0.5) * 5;
  const rotateX = ((y / rect.height) - 0.5) * -5;
  card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
}

function resetCardTilt(card) {
  card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
}

function renderScenarios() {
  const scenarios = getActiveScenarios();
  const grid = document.getElementById("scenario-grid");

  grid.innerHTML = scenarios.map((item, idx) => {
    const isSelected = selectedScenario && selectedScenario.id === item.id;
    return `
      <button onclick="selectScenario('${item.id}')"
        onmousemove="handleCardMove(event, this)"
        onmouseleave="resetCardTilt(this)"
        class="vector-node-card text-left p-5 rounded-2xl border backdrop-blur-md cursor-pointer ${
          isSelected
            ? "bg-cyan-500/15 border-cyan-400 shadow-lg shadow-cyan-500/15"
            : "bg-slate-900/70 border-white/10 hover:border-cyan-400/50"
        }">
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <span class="font-mono text-[10px] text-cyan-400">VECTOR_0${idx + 1}</span>
          <span class="w-2 h-2 rounded-full ${isSelected ? "bg-cyan-400 shadow-[0_0_10px_#22d3ee]" : "bg-slate-700"}"></span>
        </div>
        <h3 class="font-bold text-white text-base">${item.title}</h3>
        <p class="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">${item.desc}</p>
      </button>
    `;
  }).join("");

  if (selectedScenario) {
    const box = document.getElementById("scenario-advice");
    box.classList.remove("hidden");
    document.getElementById("advice-title").textContent = selectedScenario.title;
    document.getElementById("advice-urgency").textContent = selectedScenario.urgency;
    document.getElementById("advice-summary").textContent = selectedScenario.summary;
    document.getElementById("advice-route").textContent = selectedScenario.route;
    if (window.lucide) lucide.createIcons();
  }
}

function selectScenario(id) {
  const scenarios = getActiveScenarios();
  selectedScenario = scenarios.find(s => s.id === id) || scenarios[0];
  renderScenarios();
  refreshCollegeLetter();
}

function renderEvidenceChecklist() {
  const items = getActiveChecklist();
  const container = document.getElementById("evidence-list");

  container.innerHTML = items.map(item => {
    const checked = checkedEvidenceIds.has(item.id);
    return `
      <label class="flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
        checked
          ? "bg-cyan-500/10 border-cyan-400/40"
          : "bg-slate-950/70 border-white/10 hover:border-white/20"
      }">
        <input type="checkbox" ${checked ? "checked" : ""} onchange="toggleEvidence('${item.id}')"
          class="mt-1 h-4 w-4 accent-cyan-400 rounded cursor-pointer" />
        <div>
          <p class="text-sm font-semibold transition ${checked ? "line-through text-cyan-300/70" : "text-white"}">${item.title}</p>
          <p class="text-xs text-slate-400 mt-0.5">${item.detail}</p>
        </div>
      </label>
    `;
  }).join("");

  const total = items.length;
  const done = checkedEvidenceIds.size;
  const pct = total ? Math.round((done / total) * 100) : 0;

  document.getElementById("checklist-progress").textContent = `${done} / ${total} LOCKED`;
  document.getElementById("progress-percent").textContent = `${pct}%`;

  const circle = document.getElementById("progress-ring-circle");
  if (circle) {
    const circumference = 113.1;
    circle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
    circle.style.stroke = pct === 100 ? "#34d399" : "#22d3ee";
  }
}

function toggleEvidence(id) {
  if (checkedEvidenceIds.has(id)) {
    checkedEvidenceIds.delete(id);
  } else {
    checkedEvidenceIds.add(id);
  }
  renderEvidenceChecklist();
}

function renderPlatformTabs() {
  const platforms = ["Instagram", "WhatsApp", "Snapchat"];
  const tabs = document.getElementById("platform-tabs");
  tabs.innerHTML = platforms.map(platform => {
    const active = platform === activePlatform;
    return `
      <button onclick="switchPlatform('${platform}')"
        class="font-mono px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
          active
            ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/25"
            : "text-slate-300 hover:text-white hover:bg-white/5"
        }">
        ${platform.toUpperCase()}
      </button>
    `;
  }).join("");
}

function switchPlatform(platform) {
  activePlatform = platform;
  renderPlatformTabs();
  renderPlatformSteps();
}

function renderPlatformSteps() {
  const steps = getActivePlatformSteps(activePlatform);
  const container = document.getElementById("platform-content");
  container.innerHTML = `
    <ol class="space-y-2.5">
      ${steps.map((step, index) => `
        <li style="animation-delay: ${index * 65}ms"
            class="protocol-step flex items-start gap-3.5 text-sm text-slate-200 bg-slate-950/75 p-4 rounded-xl border border-white/10">
          <span class="font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 font-bold text-xs w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5">
            0${index + 1}
          </span>
          <span class="leading-relaxed">${step}</span>
        </li>
      `).join("")}
    </ol>
  `;
}

function renderHelplines() {
  const logic = getLogic();
  const helplines = logic?.getHelplines ? logic.getHelplines() : HELPLINES_LIST;
  const grid = document.getElementById("helpline-grid");

  grid.innerHTML = helplines.map(h => `
    <div class="border border-white/10 rounded-xl p-4 bg-slate-950/80 hover:border-cyan-400/45 transition flex flex-col justify-between space-y-3">
      <div>
        <span class="font-mono text-[10px] font-bold bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded">${h.tag}</span>
        <h4 class="font-bold text-sm text-white mt-2">${h.name}</h4>
        <p class="text-xs text-slate-400 mt-1 leading-relaxed">${h.desc}</p>
      </div>
      <a href="tel:${h.number}" class="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-cyan-300 hover:text-cyan-200 pt-1">
        <i data-lucide="phone-call" class="w-3.5 h-3.5"></i> ${h.number}
      </a>
    </div>
  `).join("");
  if (window.lucide) lucide.createIcons();
}

function handleDownloadLog() {
  const notes = document.getElementById("local-notes").value.trim();
  const payload = {
    scenarioTitle: selectedScenario ? selectedScenario.title : "Not selected",
    route: selectedScenario ? selectedScenario.route : "",
    checkedIds: Array.from(checkedEvidenceIds),
    notes
  };

  const logic = getLogic();
  if (logic?.downloadEvidenceLog) {
    logic.downloadEvidenceLog(payload);
    return;
  }

  const text = [
    "TRINETRA — PRIVATE LOCAL EVIDENCE LOG",
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    "Privacy: Generated strictly in your browser. Zero data sent to any server.",
    "------------------------------------------------------------",
    `Situation: ${payload.scenarioTitle}`,
    `Recommended Route: ${payload.route}`,
    `Notes: ${notes || "None entered"}`
  ].join("\n");

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Trinetra-Evidence-Log.txt";
  a.click();
  URL.revokeObjectURL(url);
}

function refreshCollegeLetter() {
  const params = {
    collegeName: document.getElementById("input-college").value.trim() || "[College / Institution Name]",
    platform: document.getElementById("input-platform").value.trim() || "[Platform / WhatsApp Group]",
    incidentDate: document.getElementById("input-date").value.trim() || "[Date of Incident]",
    scenarioTitle: selectedScenario ? selectedScenario.title : "Online Harassment"
  };

  const logic = getLogic();
  if (logic?.generateCollegeLetter) {
    document.getElementById("college-letter-box").textContent = logic.generateCollegeLetter(params);
    return;
  }

  document.getElementById("college-letter-box").textContent =
`To,
The Chairperson, Anti-Ragging Committee / Internal Complaints Committee (ICC),
${params.collegeName}

Subject: Formal Complaint Regarding Online Harassment / Cyberbullying

Respected Sir/Madam,

I am writing to report an incident of online harassment on ${params.platform} starting on ${params.incidentDate} involving ${params.scenarioTitle.toLowerCase()}.

I have preserved dated screenshots, account URLs, and message logs as evidence, which I am ready to share confidentially with the committee. I request prompt inquiry and protective action under UGC and institutional anti-harassment rules.

Sincerely,
[Your Name / Roll Number]
[Contact Number]`;
}

function copyCollegeLetter() {
  const text = document.getElementById("college-letter-box").textContent;
  navigator.clipboard.writeText(text);
  const btn = document.getElementById("copy-letter-btn");
  const original = btn.innerHTML;
  btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> <span>COPIED</span>`;
  if (window.lucide) lucide.createIcons();
  setTimeout(() => {
    btn.innerHTML = original;
    if (window.lucide) lucide.createIcons();
  }, 1800);
}

function handleLoadDemo() {
  const logic = getLogic();
  const demo = logic?.getSampleDemoData ? logic.getSampleDemoData() : null;

  selectScenario(demo?.scenarioId || "impersonation");
  checkedEvidenceIds = new Set(demo?.checkedIds || ["ev1", "ev2", "ev3", "ev4", "ev5"]);
  renderEvidenceChecklist();

  document.getElementById("local-notes").value =
    demo?.notes || "Fake Instagram profile '@pune_campus_leaks' posting morphed student photos. URL: https://instagram.com/pune_campus_leaks (Spotted 21 Nov 2026 at 1:15 PM).";
  document.getElementById("input-college").value = demo?.collegeName || demo?.college || "Pimpri Chinchwad College of Engineering (PCCOE), Pune";
  document.getElementById("input-platform").value = demo?.platform || "Instagram";
  document.getElementById("input-date").value = demo?.incidentDate || demo?.date || "21 Nov 2026";
  refreshCollegeLetter();

  document.getElementById("layer-01").scrollIntoView({ behavior: "smooth" });
}

function resetSession() {
  checkedEvidenceIds.clear();
  document.getElementById("local-notes").value = "";
  document.getElementById("input-college").value = "";
  document.getElementById("input-platform").value = "";
  document.getElementById("input-date").value = "";
  renderEvidenceChecklist();
  refreshCollegeLetter();
}

function quickExit() {
  resetSession();
  window.location.replace("https://www.google.com");
}

initFrontend();