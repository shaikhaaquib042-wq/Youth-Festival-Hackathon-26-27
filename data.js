/**
 * TRINETRA — Static Privacy-First Data Store
 * Exposes: window.TrinetraData (aliased as window.KavachData for compatibility)
 * Architecture: 100% browser-local, zero network calls, zero persistent storage.
 * Supports: English ('en'), Marathi ('mr'), Hindi ('hi')
 */
(function (global) {
  "use strict";

  const TrinetraData = {
    meta: {
      appName: "TRINETRA",
      tagline: {
        en: "Save Evidence Safely. Report to the Right Place. Zero Server Tracking.",
        mr: "पुरावे सुरक्षित जतन करा. योग्य ठिकाणी तक्रार करा. कोणताही सर्व्हर डेटा नाही.",
        hi: "सबूत सुरक्षित रखें। सही जगह रिपोर्ट करें। कोई सर्वर डेटा सेव नहीं।"
      },
      supportedLanguages: ["en", "mr", "hi"]
    },

    scenarios: [
      {
        id: "abusive-chats",
        urgency: {
          en: "High Priority",
          mr: "उच्च प्राधान्य",
          hi: "उच्च प्राथमिकता"
        },
        title: {
          en: "Abusive messages or threats in chats",
          mr: "चॅट्समध्ये शिवीगाळ किंवा धमक्या",
          hi: "चैट में गाली-गलौज या धमकियाँ"
        },
        desc: {
          en: "Repeated hate messages, verbal abuse, blackmail, or threats of harm sent via DMs, WhatsApp, or texts.",
          mr: "डीएम, व्हॉट्सअ‍ॅप किंवा मेसेजद्वारे सतत होणारी शिवीगाळ, ब्लॅकमेलिंग किंवा नुकसानीच्या धमक्या.",
          hi: "डीएम, व्हाट्सएप या मैसेज के ज़रिए लगातार गाली-गलौज, ब्लैकमेल या नुकसान पहुँचाने की धमकियाँ।"
        },
        summary: {
          en: "Do not delete the chat or fight back. Preserve full-screen screenshots with visible timestamps and sender details first, then report on the platform and escalate to Cybercrime Track B (or 112 if there is an immediate physical threat).",
          mr: "चॅट डिलीट करू नका किंवा प्रत्युत्तर देऊ नका. आधी तारीख, वेळ आणि पाठवणाऱ्याचे नाव/नंबर दिसणारे पूर्ण स्क्रीनशॉट घ्या, नंतर प्लॅटफॉर्मवर रिपोर्ट करून सायबरक्राइम ट्रॅक B वर तक्रार करा (तातडीचा धोका असल्यास 112 वर कॉल करा).",
          hi: "चैट डिलीट न करें और जवाब न दें। पहले तारीख, समय और भेजने वाले के नाम/नंबर के साथ पूरे स्क्रीनशॉट लें, फिर प्लेटफॉर्म पर रिपोर्ट करें और साइबरक्राइम ट्रैक B पर शिकायत दर्ज करें (तुरंत खतरे में 112 पर कॉल करें)।"
        },
        route: {
          en: "Platform Report + cybercrime.gov.in (Track B: Other Cybercrimes) / Emergency 112 if threat is immediate",
          mr: "प्लॅटफॉर्म रिपोर्ट + cybercrime.gov.in (ट्रॅक B: इतर सायबर गुन्हे) / तातडीच्या धोक्यासाठी 112",
          hi: "प्लेटफॉर्म रिपोर्ट + cybercrime.gov.in (ट्रैक B: अन्य साइबर अपराध) / तुरंत खतरे के लिए 112"
        }
      },
      {
        id: "fake-profile",
        urgency: {
          en: "High Priority",
          mr: "उच्च प्राधान्य",
          hi: "उच्च प्राथमिकता"
        },
        title: {
          en: "Fake profile or impersonation",
          mr: "बनावट प्रोफाइल किंवा तोतयागिरी",
          hi: "नकली प्रोफ़ाइल या प्रतिरूपण (Impersonation)"
        },
        desc: {
          en: "Someone created a fake account using your name, photos, or college identity to harass you or message your friends.",
          mr: "कोणीतरी तुमचे नाव, फोटो किंवा कॉलेजची ओळख वापरून बनावट खाते तयार केले आहे आणि मित्रांना मेसेज करत आहे.",
          hi: "किसी ने आपके नाम, फ़ोटो या कॉलेज की पहचान का उपयोग करके नकली अकाउंट बनाया है और दोस्तों को मैसेज कर रहा है।"
        },
        summary: {
          en: "Copy the exact profile URL before reporting—once the account is removed or blocks you, the link disappears. Report as 'Pretending to be me' in-app and file on cybercrime.gov.in with the exact URL and screenshots.",
          mr: "रिपोर्ट करण्यापूर्वी प्रोफाइलची अचूक URL कॉपी करा—खाते डिलीट झाल्यावर लिंक मिळत नाही. अ‍ॅपमध्ये 'Impersonation' म्हणून रिपोर्ट करा आणि अचूक URL व स्क्रीनशॉटसह cybercrime.gov.in वर तक्रार नोंदवा.",
          hi: "रिपोर्ट करने से पहले प्रोफ़ाइल का सही URL कॉपी कर लें—अकाउंट हटने के बाद लिंक नहीं मिलता। ऐप में 'Impersonation' रिपोर्ट करें और URL व स्क्रीनशॉट के साथ cybercrime.gov.in पर शिकायत दर्ज करें।"
        },
        route: {
          en: "Copy Profile URL → Platform Impersonation Report → cybercrime.gov.in (Track B) + College ICC if peer-linked",
          mr: "प्रोफाइल URL कॉपी करा → प्लॅटफॉर्म रिपोर्ट → cybercrime.gov.in (ट्रॅक B) + कॉलेज ICC",
          hi: "प्रोफ़ाइल URL कॉपी करें → प्लेटफॉर्म रिपोर्ट → cybercrime.gov.in (ट्रैक B) + कॉलेज ICC"
        }
      },
      {
        id: "morphed-photos",
        urgency: {
          en: "Critical — Act Immediately",
          mr: "अतिगंभीर — त्वरित कारवाई करा",
          hi: "अति गंभीर — तुरंत कार्रवाई करें"
        },
        title: {
          en: "Morphed or private photos shared",
          mr: "मॉर्फ केलेले किंवा खाजगी फोटो शेअर करणे",
          hi: "मॉर्फ की गई या निजी तस्वीरें साझा करना"
        },
        desc: {
          en: "Edited/AI-morphed images, deepfakes, or non-consensual private photos/videos shared or threatened to be leaked.",
          mr: "एडिट केलेले/एआय-मॉर्फ फोटो, डीपफेक किंवा परवानगीशिवाय खाजगी फोटो/व्हिडिओ शेअर करणे किंवा लीक करण्याची धमकी देणे.",
          hi: "एडिट/AI-मॉर्फ की गई तस्वीरें, डीपफेक या बिना अनुमति निजी फोटो/वीडियो शेयर करना या लीक करने की धमकी देना।"
        },
        summary: {
          en: "Save evidence securely offline and never pay blackmail demands. You can file anonymously under Track A ('Report Women/Child Related Crime') on cybercrime.gov.in, or call 1930 / Pune Cyber Police immediately.",
          mr: "पुरावे ऑफलाइन सुरक्षित ठेवा आणि कोणत्याही ब्लॅकमेलिंगला बळी पडून पैसे देऊ नका. तुम्ही cybercrime.gov.in वर ट्रॅक A ('महिला/बाल संबंधित गुन्हे') अंतर्गत निनावी तक्रार करू शकता किंवा 1930 / पुणे सायबर पोलिसांशी त्वरित संपर्क साधा.",
          hi: "सबूत ऑफ़लाइन सुरक्षित रखें और ब्लैकमेल के दबाव में पैसे न दें। आप cybercrime.gov.in पर ट्रैक A ('महिला/बाल संबंधी अपराध') के तहत गुमनाम शिकायत कर सकते हैं, या तुरंत 1930 / पुणे साइबर पुलिस को कॉल करें।"
        },
        route: {
          en: "cybercrime.gov.in (Track A: Women/Child Related Crime — Anonymous Option) + Helpline 1930 / Pune Bharosa Cell",
          mr: "cybercrime.gov.in (ट्रॅक A: महिला/बाल संबंधित गुन्हे — निनावी पर्याय) + हेल्पलाइन 1930 / पुणे भरोसा सेल",
          hi: "cybercrime.gov.in (ट्रैक A: महिला/बाल संबंधी अपराध — गुमनाम विकल्प) + हेल्पलाइन 1930 / पुणे भरोसा सेल"
        }
      },
      {
        id: "campus-group",
        urgency: {
          en: "High Priority — Institutional Action",
          mr: "उच्च प्राधान्य — संस्थात्मक कारवाई",
          hi: "उच्च प्राथमिकता — कॉलेज स्तर पर कार्रवाई"
        },
        title: {
          en: "Campus / college group harassment",
          mr: "कॅम्पस / कॉलेज ग्रुपमध्ये छळवणूक",
          hi: "कैंपस / कॉलेज ग्रुप में उत्पीड़न"
        },
        desc: {
          en: "Coordinated mocking, rumors, cyber-ragging, or targeted bullying inside unofficial college WhatsApp/Instagram groups.",
          mr: "कॉलेजच्या व्हॉट्सअ‍ॅप किंवा इंस्टाग्राम ग्रुपमध्ये सामूहिक टिंगल, अफवा, सायबर रॅगिंग किंवा लक्ष्य करून होणारा छळ.",
          hi: "कॉलेज के व्हाट्सएप या इंस्टाग्राम ग्रुप में सामूहिक मज़ाक, अफवाहें, साइबर रैगिंग या टारगेटेड बुलीइंग।"
        },
        summary: {
          en: "Screenshot both the offensive messages AND the Group Info screen showing Group Admins and participant phone numbers. Submit a written complaint to your College Anti-Ragging Committee / ICC and notify UGC 24x7 Anti-Ragging Helpline (1800-180-5522).",
          mr: "आक्षेपार्ह मेसेजसोबतच ग्रुप अ‍ॅडमिन आणि सदस्यांचे फोन नंबर दिसणारा 'Group Info' स्क्रीनशॉट घ्या. तुमच्या कॉलेजच्या अँटी-रॅगिंग कमिटी / ICC कडे लेखी तक्रार द्या आणि UGC अँटी-रॅगिंग हेल्पलाइन (1800-180-5522) वर कळवा.",
          hi: "आपत्तिजनक मैसेज के साथ-साथ ग्रुप एडमिन और सदस्यों के फ़ोन नंबर वाला 'Group Info' स्क्रीनशॉट भी लें। कॉलेज की एंटी-रैगिंग कमेटी / ICC को लिखित शिकायत दें और UGC एंटी-रैगिंग हेल्पलाइन (1800-180-5522) पर सूचना दें।"
        },
        route: {
          en: "College Anti-Ragging Committee / ICC Letter + UGC Anti-Ragging Helpline (1800-180-5522) + cybercrime.gov.in if severe",
          mr: "कॉलेज अँटी-रॅगिंग कमिटी / ICC लेखी तक्रार + UGC हेल्पलाइन (1800-180-5522) + गंभीर असल्यास cybercrime.gov.in",
          hi: "कॉलेज एंटी-रैगिंग कमेटी / ICC लिखित शिकायत + UGC हेल्पलाइन (1800-180-5522) + गंभीर होने पर cybercrime.gov.in"
        }
      }
    ],

    evidenceChecklist: [
      {
        id: "no-reply",
        title: {
          en: "Do not reply or retaliate",
          mr: "प्रत्युत्तर देऊ नका किंवा भांडू नका",
          hi: "जवाब न दें और न ही बहस करें"
        },
        detail: {
          en: "Replying escalates the harassment and gives the bully material to twist out of context. Stay silent and document everything calmly.",
          mr: "प्रत्युत्तर दिल्यास छळ वाढू शकतो आणि समोरच्याला तुमचे शब्द वेगळ्या अर्थाने वापरण्याची संधी मिळते. शांत राहून फक्त पुरावे गोळा करा.",
          hi: "जवाब देने से उत्पीड़न बढ़ सकता है और सामने वाले को आपकी बातों को तोड़-मरोड़कर दिखाने का मौका मिलता है। शांत रहें और सबूत सहेजें।"
        }
      },
      {
        id: "full-screenshots",
        title: {
          en: "Take full-screen screenshots with date, time, and sender username/number visible",
          mr: "तारीख, वेळ आणि पाठवणाऱ्याचे युझरनेम/नंबर दिसणारे पूर्ण स्क्रीनशॉट घ्या",
          hi: "तारीख, समय और भेजने वाले के यूज़रनेम/नंबर के साथ पूरे स्क्रीनशॉट लें"
        },
        detail: {
          en: "Do not crop screenshots. Ensure the top phone clock, date separator, and the bully's actual phone number or @handle (not just saved contact name) are clearly visible.",
          mr: "स्क्रीनशॉट क्रॉप करू नका. फोनची वेळ, तारीख आणि समोरच्याचे मूळ @युझरनेम किंवा फोन नंबर स्पष्ट दिसेल याची खात्री करा.",
          hi: "स्क्रीनशॉट को क्रॉप न करें। सुनिश्चित करें कि फोन का समय, तारीख और भेजने वाले का असली @यूज़रनेम या फ़ोन नंबर साफ दिखे।"
        }
      },
      {
        id: "copy-url",
        title: {
          en: "Copy the exact profile URL or post link (not just display name)",
          mr: "फक्त डिस्प्ले नाव नाही, तर अचूक प्रोफाइल URL किंवा पोस्ट लिंक कॉपी करा",
          hi: "केवल डिस्प्ले नाम नहीं, बल्कि सटीक प्रोफ़ाइल URL या पोस्ट लिंक कॉपी करें"
        },
        detail: {
          en: "Harassers quickly change display names or bio text. The exact profile URL (e.g., instagram.com/username) is required by Cyber Police to trace the account.",
          mr: "छळ करणारे लोक डिस्प्ले नाव लगेच बदलतात. सायबर पोलिसांना खाते शोधण्यासाठी अचूक प्रोफाइल URL आवश्यक असते.",
          hi: "उत्पीड़न करने वाले जल्दी नाम बदल लेते हैं। साइबर पुलिस को अकाउंट ट्रैक करने के लिए सटीक प्रोफ़ाइल URL की ज़रूरत होती है।"
        }
      },
      {
        id: "group-info",
        title: {
          en: "Screenshot group info and admin list (if in a group chat)",
          mr: "ग्रुप चॅट असल्यास ग्रुप इन्फो आणि अ‍ॅडमिन लिस्टचा स्क्रीनशॉट घ्या",
          hi: "ग्रुप चैट होने पर ग्रुप इन्फो और एडमिन लिस्ट का स्क्रीनशॉट लें"
        },
        detail: {
          en: "Capture the group name, creation info, list of Group Admins, and the phone numbers of anyone participating before leaving or muting the group.",
          mr: "ग्रुप सोडण्यापूर्वी किंवा म्यूट करण्यापूर्वी ग्रुपचे नाव, अ‍ॅडमिन्सची यादी आणि सहभागी सदस्यांचे नंबर यांचा स्क्रीनशॉट घ्या.",
          hi: "ग्रुप छोड़ने या म्यूट करने से पहले ग्रुप का नाम, सभी एडमिन की लिस्ट और शामिल लोगों के फ़ोन नंबर का स्क्रीनशॉट लें।"
        }
      },
      {
        id: "offline-backup",
        title: {
          en: "Save backups offline",
          mr: "पुराव्यांचा ऑफलाइन बॅकअप सुरक्षित ठेवा",
          hi: "सबूतों का ऑफ़लाइन बैकअप सुरक्षित रखें"
        },
        detail: {
          en: "Copy all screenshots, screen recordings, and your TRINETRA Evidence Log onto a private USB drive, laptop folder, or trusted parent's device so nothing is lost if your phone resets.",
          mr: "सर्व स्क्रीनशॉट, स्क्रीन रेकॉर्डिंग आणि TRINETRA Evidence Log तुमच्या लॅपटॉप, पेनड्राईव्ह किंवा विश्वासू पालकांच्या डिव्हाइसवर सुरक्षित ठेवा.",
          hi: "सभी स्क्रीनशॉट, स्क्रीन रिकॉर्डिंग और TRINETRA Evidence Log को अपने लैपटॉप, पेनड्राइव या भरोसेमंद अभिभावक के डिवाइस पर सुरक्षित रखें।"
        }
      }
    ],

    platformGuides: {
      Instagram: {
        en: [
          "Copy Profile URL: Open the bully's profile → tap the three dots (⋯) in the top-right corner → tap 'Copy Profile URL' and paste it into your TRINETRA notes.",
          "Capture Evidence First: Take uncropped screenshots of the profile bio, DMs, comments, or Reels showing the exact @handle and timestamps.",
          "Report the Account or Message: Inside a DM, press and hold the abusive message → tap 'Report'. For a fake account, go to profile → (⋯) → 'Report' → 'Report Account' → 'It's pretending to be someone else'.",
          "Block & Restrict Future Accounts: Tap (⋯) on their profile → 'Block' → choose 'Block [username] and other accounts they may have or create'."
        ],
        mr: [
          "प्रोफाइल URL कॉपी करा: संबंधित प्रोफाइल उघडा → वरच्या उजव्या कोपऱ्यातील तीन ठिपक्यांवर (⋯) टॅप करा → 'Copy Profile URL' निवडा आणि TRINETRA नोट्समध्ये पेस्ट करा.",
          "आधी पुरावे जतन करा: प्रोफाइल, डीएम किंवा कमेंट्सचे अचूक @युझरनेम आणि वेळेसह पूर्ण स्क्रीनशॉट घ्या.",
          "खाते किंवा मेसेज रिपोर्ट करा: डीएममधील आक्षेपार्ह मेसेज दाबून धरा → 'Report' वर टॅप करा. बनावट खात्यासाठी प्रोफाइल → (⋯) → 'Report' → 'It's pretending to be someone else' निवडा.",
          "ब्लॉक करा: प्रोफाइलवर (⋯) → 'Block' → 'Block this account and other accounts they may create' हा पर्याय निवडा."
        ],
        hi: [
          "प्रोफ़ाइल URL कॉपी करें: सामने वाले की प्रोफ़ाइल खोलें → ऊपर दाईं ओर तीन डॉट्स (⋯) पर टैप करें → 'Copy Profile URL' चुनें और TRINETRA नोट्स में पेस्ट करें।",
          "पहले सबूत लें: @यूज़रनेम और समय के साथ प्रोफ़ाइल, DM या कमेंट के पूरे स्क्रीनशॉट लें।",
          "अकाउंट या मैसेज रिपोर्ट करें: आपत्तिजनक DM को दबाए रखें → 'Report' चुनें। नकली खाते के लिए प्रोफ़ाइल → (⋯) → 'Report' → 'It's pretending to be someone else' चुनें।",
          "ब्लॉक करें: प्रोफ़ाइल पर (⋯) → 'Block' → 'Block this account and other accounts they may create' चुनें।"
        ]
      },
      WhatsApp: {
        en: [
          "Reveal the Real Phone Number: If the sender is saved in your contacts, delete or rename the contact temporarily so their actual +91 mobile number appears at the top of the chat for screenshots.",
          "Capture Group & Export Chat: For groups, tap the Group Name → screenshot the Admin list. To preserve full text logs, tap (⋮) → 'More' → 'Export chat' (with media) to your private device folder.",
          "Report Directly to WhatsApp: Open the chat → tap the contact/number at the top → scroll down → tap 'Report [Number]'. WhatsApp receives the last 5 messages as proof without notifying the sender.",
          "Block & Lock Privacy: Keep 'Block contact and delete chat' UNCHECKED until your offline backup is confirmed, then tap 'Block'. Go to Settings → Privacy → Groups → set to 'My Contacts' so strangers cannot re-add you."
        ],
        mr: [
          "मूळ फोन नंबर दाखवा: पाठवणाऱ्याचा नंबर सेव्ह असल्यास तात्पुरता डिलीट करा जेणेकरून स्क्रीनशॉटमध्ये त्यांचा मूळ +91 मोबाईल नंबर स्पष्ट दिसेल.",
          "ग्रुप इन्फो आणि चॅट एक्सपोर्ट: ग्रुपसाठी ग्रुपच्या नावावर टॅप करून अ‍ॅडमिन लिस्टचा स्क्रीनशॉट घ्या. संपूर्ण चॅटसाठी (⋮) → 'More' → 'Export chat' वापरून ऑफलाइन जतन करा.",
          "व्हॉट्सअ‍ॅपवर रिपोर्ट करा: चॅट उघडा → वरच्या नंबरवर टॅप करा → खाली स्क्रोल करा → 'Report' निवडा. यामुळे पाठवणाऱ्याला न कळता शेवटचे 5 मेसेज व्हॉट्सअ‍ॅपला तपासणीसाठी जातात.",
          "ब्लॉक आणि प्रायव्हसी सेट करा: ऑफलाइन बॅकअप घेतल्यानंतरच ब्लॉक करा. तसेच Settings → Privacy → Groups → 'My Contacts' सेट करा."
        ],
        hi: [
          "असली फ़ोन नंबर दिखाएँ: यदि भेजने वाले का नंबर सेव है, तो उसे अस्थायी रूप से हटा दें ताकि स्क्रीनशॉट में उनका असली +91 नंबर ऊपर साफ दिखे।",
          "ग्रुप इन्फो और चैट एक्सपोर्ट: ग्रुप के नाम पर टैप करके एडमिन लिस्ट का स्क्रीनशॉट लें। पूरी चैट सहेजने के लिए (⋮) → 'More' → 'Export chat' से ऑफ़लाइन सेव करें।",
          "व्हाट्सएप पर रिपोर्ट करें: चैट खोलें → ऊपर नंबर पर टैप करें → नीचे स्क्रोल करें → 'Report' चुनें। इससे भेजने वाले को पता चले बिना आखिरी 5 मैसेज व्हाट्सएप को रिव्यू के लिए जाते हैं।",
          "ब्लॉक और प्राइवेसी सेट करें: ऑफ़लाइन बैकअप पक्का करने के बाद ही ब्लॉक करें। Settings → Privacy → Groups को 'My Contacts' पर सेट करें।"
        ]
      },
      Snapchat: {
        en: [
          "Record Username & Link Safely: Open the user's profile → note the exact lowercase username under their display name (not just the display name) → tap (⋯) → 'Share Profile' → 'Copy' to save their profile link.",
          "Preserve Disappearing Content: Use another phone's camera to photograph disappearing Snaps/chats if you want to avoid triggering a screenshot alert, or capture a screen recording if safety allows.",
          "Report User or Snap: Press and hold an abusive chat/Snap → tap 'Report'. For the full account, open their profile → tap (⋯) in the top right → 'Report' → select 'Harassment or Bullying' or 'Impersonation'.",
          "Block & Restrict Contact: Open their profile → tap (⋯) → 'Manage Friendship' → 'Block'. Then go to Settings → Privacy Controls → set 'Contact Me' and 'View My Story' to 'Friends Only'."
        ],
        mr: [
          "युझरनेम आणि लिंक सेव्ह करा: प्रोफाइल उघडा → डिस्प्ले नावाखालील अचूक युझरनेम नोंदवून ठेवा → (⋯) → 'Share Profile' → 'Copy' करून लिंक जतन करा.",
          "गायब होणारे मेसेज जतन करा: स्क्रीनशॉट अलर्ट टाळण्यासाठी दुसऱ्या फोनच्या कॅमेऱ्याने स्नॅप्स किंवा चॅटचा स्पष्ट फोटो काढून पुरावा सुरक्षित ठेवा.",
          "युझर किंवा स्नॅप रिपोर्ट करा: आक्षेपार्ह चॅट/स्नॅप दाबून धरा → 'Report' निवडा. खात्यासाठी प्रोफाइल → (⋯) → 'Report' → 'Harassment or Bullying' किंवा 'Impersonation' निवडा.",
          "ब्लॉक आणि प्रायव्हसी: प्रोफाइल → (⋯) → 'Manage Friendship' → 'Block' करा. नंतर Settings → Privacy Controls मध्ये 'Contact Me' फक्त 'Friends Only' वर सेट करा."
        ],
        hi: [
          "यूज़रनेम और लिंक सेव करें: प्रोफ़ाइल खोलें → डिस्प्ले नाम के नीचे लिखा असली यूज़रनेम नोट करें → (⋯) → 'Share Profile' → 'Copy' करके लिंक सहेजें।",
          "गायब होने वाले मैसेज बचाएँ: स्क्रीनशॉट नोटिफिकेशन से बचने के लिए किसी दूसरे फोन के कैमरे से स्नैप या चैट की स्पष्ट फोटो लेकर सबूत सुरक्षित करें।",
          "यूज़र या स्नैप रिपोर्ट करें: आपत्तिजनक चैट/स्नैप को दबाए रखें → 'Report' चुनें। पूरे अकाउंट के लिए प्रोफ़ाइल → (⋯) → 'Report' → 'Harassment or Bullying' या 'Impersonation' चुनें।",
          "ब्लॉक और प्राइवेसी सेट करें: प्रोफ़ाइल → (⋯) → 'Manage Friendship' → 'Block' करें। फिर Settings → Privacy Controls में 'Contact Me' को 'Friends Only' पर सेट करें।"
        ]
      }
    },

    cybercrimeTracks: [
      {
        id: "track-a",
        code: "Track A",
        portalUrl: "https://cybercrime.gov.in",
        anonymousAllowed: true,
        canWithdraw: false,
        title: {
          en: "Report Women/Child Related Crime",
          mr: "महिला / बाल संबंधित सायबर गुन्हा नोंदवा (Track A)",
          hi: "महिला / बाल संबंधी साइबर अपराध रिपोर्ट (Track A)"
        },
        bestFor: {
          en: "Morphed/intimate images, sexual harassment, obscene content, or cyberbullying involving women or minors (under 18).",
          mr: "मॉर्फ केलेले/खाजगी फोटो, लैंगिक छळ, अश्लील मजकूर किंवा महिला व 18 वर्षांखालील मुलांवरील सायबर छळ.",
          hi: "मॉर्फ की गई/निजी तस्वीरें, यौन उत्पीड़न, अश्लील सामग्री या महिलाओं और 18 वर्ष से कम उम्र के बच्चों के खिलाफ साइबर बुलीइंग।"
        },
        identityRule: {
          en: "Allows 100% Anonymous filing (you do not need to reveal your name or phone number if you choose the anonymous option).",
          mr: "100% निनावी (Anonymous) तक्रार करण्याची सुविधा उपलब्ध आहे (तुम्हाला तुमचे नाव किंवा फोन नंबर देणे बंधनकारक नाही).",
          hi: "100% गुमनाम (Anonymous) शिकायत का विकल्प मिलता है (नाम या फ़ोन नंबर देना अनिवार्य नहीं है)।"
        },
        withdrawalRule: {
          en: "Important: Once submitted, Track A complaints CANNOT be withdrawn. Submit only genuine, verified evidence.",
          mr: "महत्त्वाचे: एकदा सबमिट केल्यानंतर ट्रॅक A ची तक्रार मागे घेता येत नाही. फक्त खरे व खात्रीशीर पुरावेच सबमिट करा.",
          hi: "महत्वपूर्ण: एक बार सबमिट होने के बाद ट्रैक A की शिकायत वापस नहीं ली जा सकती। केवल सच्चे और पुख्ता सबूत ही अपलोड करें।"
        }
      },
      {
        id: "track-b",
        code: "Track B",
        portalUrl: "https://cybercrime.gov.in",
        anonymousAllowed: false,
        canWithdraw: true,
        title: {
          en: "Report Other Cybercrimes",
          mr: "इतर सायबर गुन्हे नोंदवा (Track B)",
          hi: "अन्य साइबर अपराध रिपोर्ट करें (Track B)"
        },
        bestFor: {
          en: "Fake profiles/impersonation, abusive threats, doxxing, social media account hacking, blackmail, or online extortion.",
          mr: "बनावट प्रोफाइल/तोतयागिरी, धमक्या, खाजगी माहिती लीक करणे (डॉक्सिंग), खाते हॅकिंग किंवा ऑनलाइन खंडणी.",
          hi: "नकली प्रोफ़ाइल/इम्पर्सनेशन, धमकियाँ, निजी जानकारी लीक करना (डॉक्सिंग), अकाउंट हैकिंग या ऑनलाइन ब्लैकमेल।"
        },
        identityRule: {
          en: "Requires complainant's Name and Mobile OTP verification to create a trackable acknowledgement number.",
          mr: "तक्रारदाराचे नाव आणि मोबाईल OTP पडताळणी आवश्यक आहे, ज्यामुळे तुम्हाला ट्रॅकिंग नंबर मिळतो.",
          hi: "शिकायतकर्ता का नाम और मोबाइल OTP सत्यापन आवश्यक है, जिससे आपको ट्रैकिंग नंबर मिलता है।"
        },
        withdrawalRule: {
          en: "Can be withdrawn on the portal before the complaint is formally converted into an FIR by police.",
          mr: "पोलिसांकडून तक्रारीचे अधिकृत FIR मध्ये रूपांतर होण्यापूर्वी तुम्ही ही तक्रार पोर्टलवरून मागे घेऊ शकता.",
          hi: "पुलिस द्वारा शिकायत को औपचारिक FIR में बदलने से पहले इसे पोर्टल से वापस लिया जा सकता है।"
        }
      }
    ],

    helplines: [
      {
        name: "National Cybercrime Helpline",
        number: "1930",
        tag: "24x7 National",
        desc: "Official Government of India helpline for cyber fraud, extortion, impersonation, and reporting guidance on cybercrime.gov.in."
      },
      {
        name: "Emergency Response Support System (Police / Safety)",
        number: "112",
        tag: "Emergency",
        desc: "Immediate police assistance across India if online threats escalate to stalking or physical danger."
      },
      {
        name: "UGC 24x7 National Anti-Ragging Helpline",
        number: "1800-180-5522",
        tag: "College / Student",
        desc: "Toll-free helpline for campus bullying, cyber-ragging, and college WhatsApp/Instagram group harassment (helpline@antiragging.in)."
      },
      {
        name: "Tele-MANAS Confidential Mental Health Counselling",
        number: "14416",
        tag: "Mental Health",
        desc: "Free, 24x7 confidential government tele-counselling (also 1-800-891-4416) if cyberbullying is causing severe stress or anxiety."
      },
      {
        name: "Childline India (For Under-18 Students)",
        number: "1098",
        tag: "Under 18",
        desc: "24x7 national emergency helpline and support service for minors facing online abuse, grooming, or harassment."
      },
      {
        name: "Pune Cyber Police / Bharosa Cell",
        number: "020-29710097",
        tag: "Pune Local",
        desc: "Dedicated Pune Police Cyber & Bharosa Cell support for local investigation, women/student safety, and counselling."
      },
      {
        name: "Sample: SPPU Affiliated Senior College — Internal Complaints Committee (ICC), Pune",
        number: "020-25601100",
        tag: "Sample College ICC",
        desc: "Sample institutional directory entry — replace with your college's verified ICC / Nodal Officer contact for confidential campus action."
      },
      {
        name: "Sample: PCMC Engineering & Science Campus — Anti-Ragging Cell, Pimpri-Chinchwad",
        number: "020-27475090",
        tag: "Sample College Cell",
        desc: "Sample institutional directory entry — student welfare & cyber-ragging redressal desk for Pimpri-Chinchwad colleges."
      }
    ]
  };

  global.TrinetraData = TrinetraData;
  global.KavachData = TrinetraData;
})(window);