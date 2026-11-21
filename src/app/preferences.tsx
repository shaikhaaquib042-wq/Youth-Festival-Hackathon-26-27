import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Language } from './types';

export interface AccessibilitySettings {
  textScale: number;
  highContrast: boolean;
  reduceMotion: boolean;
  simpleLanguage: boolean;
}

interface Preferences {
  language: Language;
  setLanguage: (language: Language) => void;
  accessibility: AccessibilitySettings;
  updateAccessibility: (settings: Partial<AccessibilitySettings>) => void;
  resetAccessibility: () => void;
}

const defaultAccessibility: AccessibilitySettings = {
  textScale: 1,
  highContrast: false,
  reduceMotion: false,
  simpleLanguage: true,
};

const PreferencesContext = createContext<Preferences | null>(null);

function readStored<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
  } catch {
    return fallback;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = readStored<{ language: Language }>('satya-preferences', { language: 'English' });
    return stored.language;
  });
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(() =>
    readStored('satya-accessibility', defaultAccessibility),
  );

  useEffect(() => {
    localStorage.setItem('satya-preferences', JSON.stringify({ language }));
  }, [language]);

  useEffect(() => {
    localStorage.setItem('satya-accessibility', JSON.stringify(accessibility));
  }, [accessibility]);

  useEffect(() => {
    document.documentElement.lang = language === 'Hindi' ? 'hi' : language === 'Marathi' ? 'mr' : 'en';
    document.documentElement.style.setProperty('--text-scale', String(accessibility.textScale));
    document.documentElement.dataset.textScale = String(accessibility.textScale);
    document.documentElement.dataset.contrast = accessibility.highContrast ? 'high' : 'normal';
    document.documentElement.dataset.motion = accessibility.reduceMotion ? 'reduced' : 'normal';
  }, [language, accessibility]);

  const value = useMemo<Preferences>(() => ({
    language,
    setLanguage,
    accessibility,
    updateAccessibility: settings => setAccessibility(current => ({ ...current, ...settings })),
    resetAccessibility: () => setAccessibility(defaultAccessibility),
  }), [language, accessibility]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider.');
  return value;
}

const copy: Record<string, Record<Language, string>> = {
  accessibility: { English: 'Accessibility', Hindi: 'सुगम्यता', Marathi: 'सुलभता' },
  language: { English: 'Language', Hindi: 'भाषा', Marathi: 'भाषा' },
  home: { English: 'Home', Hindi: 'मुखपृष्ठ', Marathi: 'मुखपृष्ठ' },
  how: { English: 'How it works', Hindi: 'कैसे काम करता है', Marathi: 'कसे काम करते' },
  features: { English: 'Features', Hindi: 'सुविधाएँ', Marathi: 'वैशिष्ट्ये' },
  floating: { English: 'Floating assistant', Hindi: 'फ्लोटिंग सहायक', Marathi: 'फ्लोटिंग सहाय्यक' },
  technology: { English: 'Technology', Hindi: 'तकनीक', Marathi: 'तंत्रज्ञान' },
  tryDemo: { English: 'Try Demo', Hindi: 'डेमो देखें', Marathi: 'डेमो पाहा' },
  heroEyebrow: { English: 'A helpful way to check a message', Hindi: 'संदेश जाँचने का आसान तरीका', Marathi: 'संदेश तपासण्याचा सोपा मार्ग' },
  heroFirst: { English: 'Received a message?', Hindi: 'कोई संदेश मिला?', Marathi: 'संदेश मिळाला आहे?' },
  heroSecond: { English: 'Check it before sharing.', Hindi: 'आगे भेजने से पहले जाँचें।', Marathi: 'पुढे पाठवण्यापूर्वी तपासा.' },
  heroDescription: {
    English: 'SATYAM helps you understand what reliable information says. Choose a message, check it, and decide before you share.',
    Hindi: 'SATYAM आपको भरोसेमंद जानकारी समझने में मदद करता है। संदेश चुनें, जाँचें और फिर आगे भेजने का फैसला करें।',
    Marathi: 'विश्वासार्ह माहिती समजून घेण्यासाठी SATYAM मदत करते. संदेश निवडा, तपासा आणि मग पुढे पाठवायचे ठरवा.',
  },
  launchDemo: { English: 'Start checking a message', Hindi: 'संदेश जाँचना शुरू करें', Marathi: 'संदेश तपासायला सुरुवात करा' },
  explore: { English: 'See how it works', Hindi: 'कैसे काम करता है देखें', Marathi: 'कसे काम करते ते पाहा' },
  actionWhatsApp: { English: 'Check a WhatsApp message', Hindi: 'WhatsApp संदेश जाँचें', Marathi: 'WhatsApp संदेश तपासा' },
  actionWhatsAppHint: { English: 'Use the message on the left phone.', Hindi: 'बाएँ फ़ोन का संदेश इस्तेमाल करें।', Marathi: 'डाव्या फोनमधील संदेश वापरा.' },
  actionCopied: { English: 'Check a copied message', Hindi: 'कॉपी किया संदेश जाँचें', Marathi: 'कॉपी केलेला संदेश तपासा' },
  actionCopiedHint: { English: 'Paste text you copied from anywhere.', Hindi: 'कहीं से कॉपी किया पाठ यहाँ डालें।', Marathi: 'कुठूनही कॉपी केलेला मजकूर इथे टाका.' },
  actionListen: { English: 'Listen to an explanation', Hindi: 'समझाने वाली बात सुनें', Marathi: 'स्पष्टीकरण ऐका' },
  actionListenHint: { English: 'Hear a short introduction read aloud.', Hindi: 'संक्षिप्त परिचय सुनें।', Marathi: 'थोडक्यात परिचय ऐका.' },
  howTitle: { English: 'Three simple steps', Hindi: 'तीन आसान कदम', Marathi: 'तीन सोप्या पायऱ्या' },
  howDescription: { English: 'You stay in control at every step.', Hindi: 'हर कदम पर फैसला आपका है।', Marathi: 'प्रत्येक पायरीवर निर्णय तुमचा आहे.' },
  stepChoose: { English: 'Choose your message', Hindi: 'अपना संदेश चुनें', Marathi: 'तुमचा संदेश निवडा' },
  stepChooseBody: { English: 'Paste a message, choose a sample, or type it.', Hindi: 'संदेश डालें, नमूना चुनें या खुद लिखें।', Marathi: 'संदेश टाका, नमुना निवडा किंवा स्वतः लिहा.' },
  stepLanguage: { English: 'Choose your language', Hindi: 'अपनी भाषा चुनें', Marathi: 'तुमची भाषा निवडा' },
  stepLanguageBody: { English: 'Read or listen in English, Hindi or Marathi.', Hindi: 'अंग्रेज़ी, हिंदी या मराठी में पढ़ें या सुनें।', Marathi: 'इंग्रजी, हिंदी किंवा मराठीत वाचा किंवा ऐका.' },
  stepCheck: { English: 'Check the message', Hindi: 'संदेश की जाँच करें', Marathi: 'संदेश तपासा' },
  stepCheckBody: { English: 'See what the local sample information can tell you.', Hindi: 'देखें कि इस डेमो की जानकारी क्या बताती है।', Marathi: 'या डेमोमधील माहिती काय सांगते ते पाहा.' },
  featureTitle: { English: 'Helpful tools, made simple', Hindi: 'आसान और उपयोगी सुविधाएँ', Marathi: 'सोप्या आणि उपयुक्त सुविधा' },
  demoTitle: { English: 'Try checking a message', Hindi: 'संदेश जाँचकर देखें', Marathi: 'संदेश तपासून पाहा' },
  demoDescription: { English: 'Choose a message on the left. Send it to SATYAM and read or listen to the result.', Hindi: 'बाईं ओर संदेश चुनें। उसे SATYAM में भेजें और नतीजा पढ़ें या सुनें।', Marathi: 'डावीकडील संदेश निवडा. तो SATYAM ला पाठवा आणि निकाल वाचा किंवा ऐका.' },
  phoneOne: { English: '1. This is the message you received.', Hindi: '1. यह आपको मिला संदेश है।', Marathi: '1. हा तुम्हाला मिळालेला संदेश आहे.' },
  phoneTwo: { English: '2. SATYAM checks the message.', Hindi: '2. SATYAM संदेश की जाँच करता है।', Marathi: '2. SATYAM संदेश तपासते.' },
  chooseSample: { English: 'Choose a message', Hindi: 'एक संदेश चुनें', Marathi: 'एक संदेश निवडा' },
  loadMessage: { English: 'Load message', Hindi: 'संदेश डालें', Marathi: 'संदेश भरा' },
  transfer: { English: 'CHECK THIS MESSAGE WITH SATYAM →', Hindi: 'SATYAM से इस संदेश की जाँच करें →', Marathi: 'SATYAM कडून हा संदेश तपासा →' },
  transferHint: { English: 'Choose a message on the left, then press this button.', Hindi: 'बाईं ओर संदेश चुनें, फिर यह बटन दबाएँ।', Marathi: 'डावीकडील संदेश निवडा आणि हे बटण दाबा.' },
  ready: { English: 'Your message is ready to check!', Hindi: 'आपका संदेश जाँचने के लिए तैयार है!', Marathi: 'तुमचा संदेश तपासण्यासाठी तयार आहे!' },
  pasteMessage: { English: 'Paste the message you want to check.', Hindi: 'जिस संदेश की जाँच करनी है, उसे यहाँ डालें।', Marathi: 'तपासायचा संदेश इथे टाका.' },
  typeMessage: { English: 'Or type a message here', Hindi: 'या यहाँ संदेश लिखें', Marathi: 'किंवा इथे संदेश लिहा' },
  messageLabel: { English: 'Message to check', Hindi: 'जाँचने वाला संदेश', Marathi: 'तपासायचा संदेश' },
  selectLanguage: { English: 'Choose the language you want to read and hear.', Hindi: 'पढ़ने और सुनने के लिए भाषा चुनें।', Marathi: 'वाचण्यासाठी आणि ऐकण्यासाठी भाषा निवडा.' },
  english: { English: 'English', Hindi: 'अंग्रेज़ी', Marathi: 'इंग्रजी' },
  hindi: { English: 'Hindi', Hindi: 'हिंदी', Marathi: 'हिंदी' },
  marathi: { English: 'Marathi', Hindi: 'मराठी', Marathi: 'मराठी' },
  checkMessage: { English: 'CHECK THIS MESSAGE', Hindi: 'इस संदेश की जाँच करें', Marathi: 'हा संदेश तपासा' },
  checkStepTitle: { English: '3. Check this message', Hindi: '3. इस संदेश की जाँच करें', Marathi: '3. हा संदेश तपासा' },
  checking: { English: 'Please wait. We are checking the information.', Hindi: 'कृपया रुकें। हम जानकारी की जाँच कर रहे हैं।', Marathi: 'कृपया थांबा. आम्ही माहिती तपासत आहोत.' },
  resultTitle: { English: 'Your result', Hindi: 'आपका नतीजा', Marathi: 'तुमचा निकाल' },
  resultExplanation: { English: 'What this means', Hindi: 'इसका मतलब', Marathi: 'याचा अर्थ' },
  whatChecked: { English: 'What we checked', Hindi: 'हमने क्या जाँचा', Marathi: 'आम्ही काय तपासले' },
  whereFrom: { English: 'Where did this information come from?', Hindi: 'यह जानकारी कहाँ से आई?', Marathi: 'ही माहिती कुठून आली?' },
  nextStep: { English: 'What you can do next', Hindi: 'अब आप क्या कर सकते हैं', Marathi: 'आता तुम्ही काय करू शकता' },
  tryAnother: { English: 'Check another message', Hindi: 'दूसरा संदेश जाँचें', Marathi: 'दुसरा संदेश तपासा' },
  noEvidence: { English: 'We could not find enough reliable information to confirm whether this message is true or false.', Hindi: 'हमें यह पक्का करने के लिए पर्याप्त भरोसेमंद जानकारी नहीं मिली कि यह संदेश सच है या गलत।', Marathi: 'हा संदेश खरा आहे की खोटा हे ठरवण्यासाठी पुरेशी विश्वासार्ह माहिती आम्हाला मिळाली नाही.' },
  verifiedExplanation: { English: 'Reliable evidence supports this information.', Hindi: 'भरोसेमंद जानकारी इस बात का समर्थन करती है।', Marathi: 'विश्वासार्ह पुरावा या माहितीला समर्थन देतो.' },
  falseExplanation: { English: 'Reliable evidence shows that this information is false.', Hindi: 'भरोसेमंद जानकारी बताती है कि यह बात गलत है।', Marathi: 'विश्वासार्ह पुरावा ही माहिती चुकीची असल्याचे दाखवतो.' },
  misleadingExplanation: { English: 'This message contains information that may create the wrong impression.', Hindi: 'इस संदेश की कुछ बातें गलत समझ पैदा कर सकती हैं।', Marathi: 'या संदेशातील काही माहितीमुळे चुकीचा समज होऊ शकतो.' },
  conflictingExplanation: { English: 'Reliable sources provide different information about this claim.', Hindi: 'भरोसेमंद स्रोत इस दावे के बारे में अलग-अलग जानकारी देते हैं।', Marathi: 'विश्वासार्ह स्रोत या दाव्याबद्दल वेगवेगळी माहिती देतात.' },
  synthetic: { English: 'Sample information for demonstration only. This is not a real fact-check.', Hindi: 'यह केवल डेमो के लिए नमूना जानकारी है। यह असली तथ्य-जाँच नहीं है।', Marathi: 'ही फक्त डेमोसाठी नमुना माहिती आहे. ही खरी तथ्य-पडताळणी नाही.' },
  syntheticResult: { English: 'This result uses synthetic demonstration information. It is not a real fact-check.', Hindi: 'यह नतीजा डेमो की बनाई हुई नमूना जानकारी पर आधारित है। यह असली तथ्य-जाँच नहीं है।', Marathi: 'हा निकाल डेमोसाठी तयार केलेल्या नमुना माहितीवर आधारित आहे. ही खरी तथ्य-पडताळणी नाही.' },
  syntheticVerifiedDetail: { English: 'This sample demonstrates a VERIFIED result only. It is simulated; no real-world fact-check was performed.', Hindi: 'यह नमूना केवल VERIFIED नतीजे का तरीका दिखाता है। यह नकली है; असली दुनिया की तथ्य-जाँच नहीं हुई है।', Marathi: 'हा नमुना फक्त VERIFIED निकाल कसा दिसू शकतो हे दाखवतो. हा नमुना आहे; प्रत्यक्ष तथ्य-पडताळणी केलेली नाही.' },
  syntheticFalseDetail: { English: 'This sample demonstrates a FALSE result only. No real source was checked and no real-world conclusion is made.', Hindi: 'यह नमूना केवल FALSE नतीजे का तरीका दिखाता है। किसी असली स्रोत की जाँच नहीं हुई और असल दुनिया के बारे में कोई निष्कर्ष नहीं निकाला गया।', Marathi: 'हा नमुना फक्त FALSE निकाल कसा दिसू शकतो हे दाखवतो. कोणताही खरा स्रोत तपासलेला नाही आणि प्रत्यक्ष जगाबद्दल निष्कर्ष काढलेला नाही.' },
  syntheticMisleadingDetail: { English: 'This sample demonstrates a MISLEADING result only. A real check would need evidence for the missing or changed context.', Hindi: 'यह नमूना केवल MISLEADING नतीजे का तरीका दिखाता है। असली जाँच में छूटे या बदले संदर्भ का प्रमाण चाहिए।', Marathi: 'हा नमुना फक्त MISLEADING निकाल कसा दिसू शकतो हे दाखवतो. खरी तपासणी करण्यासाठी वगळलेल्या किंवा बदललेल्या संदर्भाचा पुरावा आवश्यक आहे.' },
  syntheticConflictingDetail: { English: 'This sample demonstrates a CONFLICTING result only. No real sources were compared.', Hindi: 'यह नमूना केवल CONFLICTING नतीजे का तरीका दिखाता है। किसी असली स्रोत की तुलना नहीं की गई।', Marathi: 'हा नमुना फक्त CONFLICTING निकाल कसा दिसू शकतो हे दाखवतो. कोणत्याही खऱ्या स्रोतांची तुलना केलेली नाही.' },
  syntheticUnverifiedDetail: { English: 'This sample demonstrates an UNVERIFIED result. No real-world fact-check was performed. Not finding a match does not mean the message is false.', Hindi: 'यह नमूना UNVERIFIED नतीजे का तरीका दिखाता है। असली दुनिया की तथ्य-जाँच नहीं हुई। जानकारी न मिलना, संदेश के गलत होने का सबूत नहीं है।', Marathi: 'हा नमुना UNVERIFIED निकाल कसा दिसू शकतो हे दाखवतो. प्रत्यक्ष तथ्य-पडताळणी केलेली नाही. माहिती न मिळणे म्हणजे संदेश खोटा आहे असे नाही.' },
  noSource: { English: 'No matching information was found in the local sample. This does not mean the message is false.', Hindi: 'स्थानीय नमूने में मिलती जानकारी नहीं मिली। इसका मतलब यह नहीं कि संदेश गलत है।', Marathi: 'स्थानिक नमुन्यात जुळणारी माहिती मिळाली नाही. याचा अर्थ संदेश खोटा आहे असा नाही.' },
  suggestion: { English: 'Good decision! Checking before sharing helps everyone.', Hindi: 'अच्छा किया! आगे भेजने से पहले जाँच करना सबकी मदद करता है।', Marathi: 'छान निर्णय! पुढे पाठवण्यापूर्वी तपासल्याने सर्वांना मदत होते.' },
  listen: { English: 'Listen to your result', Hindi: 'अपना नतीजा सुनें', Marathi: 'तुमचा निकाल ऐका' },
  listenTitle: { English: 'Listen to your result', Hindi: 'अपना नतीजा सुनें', Marathi: 'तुमचा निकाल ऐका' },
  audioLoading: { English: 'Preparing your voice… The first result may take a little longer.', Hindi: 'आवाज़ तैयार हो रही है… पहली बार थोड़ा ज़्यादा समय लग सकता है।', Marathi: 'आवाज तयार होत आहे… पहिल्यांदा थोडा जास्त वेळ लागू शकतो.' },
  audioLanguage: { English: 'Language for listening', Hindi: 'सुनने की भाषा', Marathi: 'ऐकण्याची भाषा' },
  voiceGender: { English: 'Choose a voice', Hindi: 'आवाज़ चुनें', Marathi: 'आवाज निवडा' },
  maleVoice: { English: 'Male voice', Hindi: 'पुरुष की आवाज़', Marathi: 'पुरुषाचा आवाज' },
  femaleVoice: { English: 'Female voice', Hindi: 'महिला की आवाज़', Marathi: 'महिलेचा आवाज' },
  speakingSpeed: { English: 'Speaking speed', Hindi: 'बोलने की गति', Marathi: 'बोलण्याचा वेग' },
  speechPitch: { English: 'Voice pitch', Hindi: 'आवाज़ का उतार-चढ़ाव', Marathi: 'आवाजाची पट्टी' },
  audioServiceNotice: { English: 'The neural voice service is unavailable. SATYAM is trying a matching voice on this device; the selected voice gender may not be available.', Hindi: 'न्यूरल आवाज़ सेवा उपलब्ध नहीं है। SATYAM इस डिवाइस पर इसी भाषा की आवाज़ आज़मा रहा है; चुना हुआ पुरुष या महिला स्वर उपलब्ध न भी हो सकता है।', Marathi: 'न्यूरल आवाज सेवा उपलब्ध नाही. SATYAM या उपकरणावरील त्याच भाषेतील आवाज वापरून पाहत आहे; निवडलेला पुरुष किंवा स्त्री आवाज कदाचित उपलब्ध नसेल.' },
  audioServicePrivacy: { English: 'The short transcript is sent to the configured voice server to make audio. Use a server you trust.', Hindi: 'आवाज़ बनाने के लिए छोटा लिखा हुआ संदेश चुने गए सर्वर पर भेजा जाता है। भरोसेमंद सर्वर ही इस्तेमाल करें।', Marathi: 'आवाज तयार करण्यासाठी छोटा मजकूर निवडलेल्या सर्व्हरकडे पाठवला जातो. विश्वासू सर्व्हरच वापरा.' },
  play: { English: 'Play', Hindi: 'चलाएँ', Marathi: 'ऐकवा' },
  pause: { English: 'Pause', Hindi: 'रोकें', Marathi: 'थांबवा' },
  resume: { English: 'Resume', Hindi: 'फिर चलाएँ', Marathi: 'पुन्हा सुरू करा' },
  replay: { English: 'Replay', Hindi: 'फिर से सुनें', Marathi: 'पुन्हा ऐका' },
  stop: { English: 'Stop', Hindi: 'बंद करें', Marathi: 'बंद करा' },
  audioUnavailable: { English: 'A voice for this language is not available in your browser. You can still read the full explanation on screen.', Hindi: 'आपके ब्राउज़र में इस भाषा की आवाज़ उपलब्ध नहीं है। आप पूरी जानकारी स्क्रीन पर पढ़ सकते हैं।', Marathi: 'तुमच्या ब्राउझरमध्ये या भाषेचा आवाज उपलब्ध नाही. तुम्ही संपूर्ण माहिती स्क्रीनवर वाचू शकता.' },
  pasteError: { English: 'We could not open the clipboard. Tap the box and paste your message there.', Hindi: 'हम कॉपी किया संदेश नहीं ला सके। बॉक्स पर टैप करके संदेश डालें।', Marathi: 'कॉपी केलेला संदेश आणता आला नाही. चौकटीत टॅप करून संदेश टाका.' },
  emptyError: { English: 'Please paste or type a message first.', Hindi: 'पहले संदेश डालें या लिखें।', Marathi: 'आधी संदेश टाका किंवा लिहा.' },
  shortError: { English: 'Please add a little more of the message so we can check it.', Hindi: 'जाँच के लिए संदेश का थोड़ा और हिस्सा लिखें।', Marathi: 'तपासण्यासाठी संदेशाचा थोडा अधिक भाग लिहा.' },
  readyToCheck: { English: 'Your message is ready to check!', Hindi: 'आपका संदेश जाँचने के लिए तैयार है!', Marathi: 'तुमचा संदेश तपासण्यासाठी तयार आहे!' },
  accessIncrease: { English: 'Increase text size', Hindi: 'अक्षर बड़े करें', Marathi: 'अक्षरे मोठी करा' },
  accessDecrease: { English: 'Decrease text size', Hindi: 'अक्षर छोटे करें', Marathi: 'अक्षरे लहान करा' },
  highContrast: { English: 'High contrast', Hindi: 'गहरा और साफ़ रंग', Marathi: 'ठळक रंग' },
  reduceMotion: { English: 'Reduce movement', Hindi: 'चलती चीज़ें कम करें', Marathi: 'हालचाल कमी करा' },
  simpleLanguage: { English: 'Use simple words', Hindi: 'आसान भाषा इस्तेमाल करें', Marathi: 'सोपे शब्द वापरा' },
  resetAccess: { English: 'Reset accessibility settings', Hindi: 'सुगम्यता सेटिंग रीसेट करें', Marathi: 'सुलभता सेटिंग पुन्हा ठेवा' },
  close: { English: 'Close', Hindi: 'बंद करें', Marathi: 'बंद करा' },
  sectionHowTitle: { English: 'From a message to a clear next step', Hindi: 'संदेश से सही कदम तक', Marathi: 'संदेशापासून योग्य पावलापर्यंत' },
  sectionFeaturesTitle: { English: 'Simple help for everyday messages', Hindi: 'रोज़ के संदेशों के लिए आसान मदद', Marathi: 'रोजच्या संदेशांसाठी सोपी मदत' },
  featureClaims: { English: 'Find the main points', Hindi: 'मुख्य बातें पहचानें', Marathi: 'मुख्य मुद्दे ओळखा' },
  featureClaimsBody: { English: 'SATYAM separates the important statements so you can look at them one by one.', Hindi: 'SATYAM ज़रूरी बातों को अलग करता है ताकि आप उन्हें एक-एक करके देख सकें।', Marathi: 'SATYAM महत्त्वाची वाक्ये वेगळी करते, ज्यामुळे ती एकेक करून पाहता येतात.' },
  featureEvidence: { English: 'Look at available information', Hindi: 'मिली जानकारी देखें', Marathi: 'उपलब्ध माहिती पाहा' },
  featureEvidenceBody: { English: 'The demo checks its small sample collection and tells you when it has no match.', Hindi: 'डेमो अपने छोटे नमूने जाँचता है और मिलान न मिलने पर बताता है।', Marathi: 'डेमो त्याचे छोटे नमुने तपासते आणि जुळणारी माहिती नसल्यास सांगते.' },
  featureLanguages: { English: 'Use your language', Hindi: 'अपनी भाषा चुनें', Marathi: 'तुमची भाषा वापरा' },
  featureLanguagesBody: { English: 'Read the main explanation in English, Hindi or Marathi.', Hindi: 'मुख्य जवाब अंग्रेज़ी, हिंदी या मराठी में पढ़ें।', Marathi: 'मुख्य उत्तर इंग्रजी, हिंदी किंवा मराठीत वाचा.' },
  featureReport: { English: 'See why', Hindi: 'कारण जानें', Marathi: 'कारण समजून घ्या' },
  featureReportBody: { English: 'See the result, what was checked, and where the sample information came from.', Hindi: 'नतीजा, जाँची गई बात और नमूना जानकारी का स्रोत देखें।', Marathi: 'निकाल, तपासलेली माहिती आणि नमुना माहितीचा स्रोत पाहा.' },
  featureWarnings: { English: 'Notice message clues', Hindi: 'संदेश के संकेत देखें', Marathi: 'संदेशातील संकेत पाहा' },
  featureWarningsBody: { English: 'See clues such as urgent wording, links, rewards or a missing source.', Hindi: 'जल्दी करने की बात, लिंक, इनाम या स्रोत न होने जैसे संकेत देखें।', Marathi: 'घाईची भाषा, लिंक, बक्षीस किंवा स्रोत नसणे असे संकेत पाहा.' },
  featurePause: { English: 'Take a moment', Hindi: 'थोड़ा रुकें', Marathi: 'थोडा वेळ थांबा' },
  featurePauseBody: { English: 'Use the information to decide whether you want to share the message.', Hindi: 'जानकारी देखकर तय करें कि संदेश आगे भेजना है या नहीं।', Marathi: 'माहिती पाहून संदेश पुढे पाठवायचा की नाही ते ठरवा.' },
  demoDisclaimer: { English: 'Sample records are demonstrations, not real fact-checks. If no match is found, the result stays UNVERIFIED. This demo does not search the internet or connect to WhatsApp.', Hindi: 'नमूना जानकारी केवल डेमो के लिए है, असली तथ्य-जाँच नहीं। जानकारी न मिलने पर नतीजा अपुष्ट रहता है। यह डेमो इंटरनेट पर खोज या WhatsApp से संपर्क नहीं करता।', Marathi: 'नमुना नोंदी फक्त डेमोसाठी आहेत, खरी तथ्य-पडताळणी नाही. जुळणारी माहिती न मिळाल्यास निकाल अपडताळलेला राहतो. हा डेमो इंटरनेटवर शोधत नाही किंवा WhatsApp शी जोडत नाही.' },
  floatingTitle: { English: 'A future helper, only when you ask', Hindi: 'भविष्य का सहायक, केवल आपके कहने पर', Marathi: 'भविष्यातील मदतनीस, फक्त तुमच्या विनंतीवर' },
  floatingBody: { English: 'A future Android app could let you select text in another app and ask SATYAM to check it. This website cannot float over WhatsApp or read other apps.', Hindi: 'भविष्य का Android ऐप आपको दूसरे ऐप में पाठ चुनकर SATYAM से जाँचने देगा। यह वेबसाइट WhatsApp के ऊपर नहीं दिख सकती और दूसरे ऐप नहीं पढ़ती।', Marathi: 'भविष्यातील Android अॅपमध्ये दुसऱ्या अॅपमधील मजकूर निवडून SATYAM कडून तपासता येईल. ही वेबसाइट WhatsApp वर दिसत नाही किंवा इतर अॅप वाचत नाही.' },
  privacyTitle: { English: 'Your privacy matters', Hindi: 'आपकी निजता ज़रूरी है', Marathi: 'तुमची गोपनीयता महत्त्वाची आहे' },
  privacyLocal: { English: 'Your choice', Hindi: 'आपकी पसंद', Marathi: 'तुमची निवड' },
  privacyLocalBody: { English: 'You choose when to send text to the demo. Nothing is read in the background.', Hindi: 'डेमो में संदेश कब भेजना है, यह आप चुनते हैं। पीछे से कुछ नहीं पढ़ा जाता।', Marathi: 'डेमोला संदेश कधी द्यायचा हे तुम्ही ठरवता. मागून काहीही वाचले जात नाही.' },
  privacyWhatsApp: { English: 'No WhatsApp connection', Hindi: 'WhatsApp से कोई जुड़ाव नहीं', Marathi: 'WhatsApp शी जोडणी नाही' },
  privacyWhatsAppBody: { English: 'SATYAM does not connect to your WhatsApp account or read private chats.', Hindi: 'SATYAM आपके WhatsApp खाते से नहीं जुड़ता और निजी चैट नहीं पढ़ता।', Marathi: 'SATYAM तुमच्या WhatsApp खात्याशी जोडले जात नाही किंवा खाजगी गप्पा वाचत नाही.' },
  privacyNoLive: { English: 'No live internet check', Hindi: 'इंटरनेट पर असली जाँच नहीं', Marathi: 'इंटरनेटवर प्रत्यक्ष तपासणी नाही' },
  privacyNoLiveBody: { English: 'This prototype checks only its small demonstration data.', Hindi: 'यह प्रोटोटाइप केवल अपने छोटे डेमो डेटा को जाँचता है।', Marathi: 'हा नमुना फक्त त्याचा छोटा डेमो डेटा तपासतो.' },
  privacyNoEvidence: { English: 'No match does not mean false', Hindi: 'मिलान न होना गलत होने का सबूत नहीं', Marathi: 'जुळणी न होणे म्हणजे खोटे असल्याचा पुरावा नाही' },
  privacyNoEvidenceBody: { English: 'When there is not enough information, SATYAM says it could not confirm the message.', Hindi: 'पर्याप्त जानकारी न होने पर SATYAM बताता है कि संदेश की पुष्टि नहीं हुई।', Marathi: 'पुरेशी माहिती नसल्यास SATYAM संदेशाची खात्री करता आली नाही असे सांगते.' },
  privacyNote: { English: 'Some examples use made-up sample information to demonstrate the screen. Do not treat sample verdicts as real-world facts.', Hindi: 'कुछ उदाहरण स्क्रीन दिखाने के लिए बनाई गई नमूना जानकारी हैं। नमूना नतीजों को असली दुनिया का सच न मानें।', Marathi: 'काही उदाहरणे स्क्रीन दाखवण्यासाठी तयार केलेली नमुना माहिती आहेत. नमुना निकालांना खरे तथ्य समजू नका.' },
  messageReady: { English: 'Your message is ready to check!', Hindi: 'आपका संदेश जाँचने के लिए तैयार है!', Marathi: 'तुमचा संदेश तपासण्यासाठी तयार आहे!' },
  verdict_VERIFIED: { English: 'Reliable evidence supports this information.', Hindi: 'भरोसेमंद जानकारी इस बात का समर्थन करती है।', Marathi: 'विश्वासार्ह पुरावा या माहितीला समर्थन देतो.' },
  verdict_FALSE: { English: 'Reliable evidence shows that this information is false.', Hindi: 'भरोसेमंद जानकारी बताती है कि यह बात गलत है।', Marathi: 'विश्वासार्ह पुरावा ही माहिती चुकीची असल्याचे दाखवतो.' },
  verdict_MISLEADING: { English: 'This message contains information that may create the wrong impression.', Hindi: 'इस संदेश की कुछ बातें गलत समझ पैदा कर सकती हैं।', Marathi: 'या संदेशातील काही माहितीमुळे चुकीचा समज होऊ शकतो.' },
  verdict_UNVERIFIED: { English: 'We could not find enough reliable information to confirm whether this message is true or false.', Hindi: 'हमें यह पक्का करने के लिए पर्याप्त भरोसेमंद जानकारी नहीं मिली कि यह संदेश सच है या गलत।', Marathi: 'हा संदेश खरा आहे की खोटा हे ठरवण्यासाठी पुरेशी विश्वासार्ह माहिती आम्हाला मिळाली नाही.' },
  verdict_CONFLICTING: { English: 'Reliable sources provide different information about this claim.', Hindi: 'भरोसेमंद स्रोत इस दावे के बारे में अलग-अलग जानकारी देते हैं।', Marathi: 'विश्वासार्ह स्रोत या दाव्याबद्दल वेगवेगळी माहिती देतात.' },
  nextRecommendation: { English: 'Good decision! Checking before sharing helps everyone. If you are still unsure, ask someone you trust or check an official source before forwarding.', Hindi: 'अच्छा किया! आगे भेजने से पहले जाँच करना सबकी मदद करता है। फिर भी शक हो, तो किसी भरोसेमंद व्यक्ति या आधिकारिक स्रोत से पूछें।', Marathi: 'छान निर्णय! पुढे पाठवण्यापूर्वी तपासल्याने सर्वांना मदत होते. तरीही शंका असल्यास विश्वासू व्यक्तीला किंवा अधिकृत स्रोताला विचारा.' },
  checkingWhat: { English: 'We looked for this message in the local demonstration information.', Hindi: 'हमने इस संदेश को डेमो की स्थानीय जानकारी में देखा।', Marathi: 'आम्ही हा संदेश डेमोमधील स्थानिक माहितीमध्ये शोधला.' },
  evidenceSource: { English: 'SATYAM demonstration sample', Hindi: 'SATYAM डेमो नमूना', Marathi: 'SATYAM डेमो नमुना' },
  appName: { English: 'SATYAM AI', Hindi: 'SATYAM AI', Marathi: 'SATYAM AI' },
  statusHelp: { English: 'The result uses words and an icon, not colour alone.', Hindi: 'नतीजा शब्द और निशान से बताया गया है, केवल रंग से नहीं।', Marathi: 'निकाल शब्द आणि चिन्हाने दाखवला आहे, फक्त रंगाने नाही.' },
  selectMessageLabel: { English: 'Choose a sample message', Hindi: 'नमूना संदेश चुनें', Marathi: 'नमुना संदेश निवडा' },
  menuLabel: { English: 'SATYAM sections', Hindi: 'SATYAM के भाग', Marathi: 'SATYAM चे विभाग' },
  resetDemo: { English: 'Reset demo', Hindi: 'डेमो रीसेट करें', Marathi: 'डेमो रीसेट करा' },
  textSize: { English: 'Text size', Hindi: 'अक्षरों का आकार', Marathi: 'अक्षरांचा आकार' },
  floatingBoundary: { English: 'A real floating helper needs a separate Android app and permission. It must not secretly watch your screen.', Hindi: 'असली फ्लोटिंग सहायक के लिए अलग Android ऐप और अनुमति चाहिए। उसे चुपके से स्क्रीन नहीं देखनी चाहिए।', Marathi: 'खऱ्या फ्लोटिंग मदतनीसासाठी वेगळे Android अॅप आणि परवानगी लागते. त्याने गुपचूप स्क्रीन पाहू नये.' },
  examplePost: { English: 'SAMPLE MESSAGE', Hindi: 'नमूना संदेश', Marathi: 'नमुना संदेश' },
  examplePostTitle: { English: 'A message to check', Hindi: 'जाँचने वाला संदेश', Marathi: 'तपासायचा संदेश' },
  examplePostBody: { English: '“All citizens are eligible for a special cash reward.”', Hindi: '“सभी नागरिकों को खास नकद इनाम मिलेगा।”', Marathi: '“सर्व नागरिकांना खास रोख बक्षीस मिळेल.”' },
  futureAssistant: { English: 'A future helper could check text you choose.', Hindi: 'भविष्य का सहायक आपके चुने पाठ को जाँच सकता है।', Marathi: 'भविष्यातील मदतनीस तुम्ही निवडलेला मजकूर तपासू शकतो.' },
  userLedReview: { English: 'You choose when to check', Hindi: 'जाँच का फैसला आपका', Marathi: 'तपासायचे की नाही हे तुम्ही ठरवा' },
  technologyTitle: { English: 'How SATYAM checks a message', Hindi: 'SATYAM संदेश कैसे जाँचता है', Marathi: 'SATYAM संदेश कसा तपासते' },
  technologyDescription: { English: 'This prototype uses a small set of local sample information. It does not search the internet.', Hindi: 'यह प्रोटोटाइप स्थानीय नमूना जानकारी इस्तेमाल करता है। यह इंटरनेट पर खोज नहीं करता।', Marathi: 'हा नमुना स्थानिक उदाहरण माहिती वापरतो. तो इंटरनेटवर शोध घेत नाही.' },
  technologyInput: { English: 'Choose a message', Hindi: 'संदेश चुनें', Marathi: 'संदेश निवडा' },
  technologyInputBody: { English: 'You choose the text to check.', Hindi: 'जाँचने वाला पाठ आप चुनते हैं।', Marathi: 'तपासायचा मजकूर तुम्ही निवडता.' },
  technologyUnderstand: { English: 'Read the message', Hindi: 'संदेश पढ़ें', Marathi: 'संदेश वाचा' },
  technologyUnderstandBody: { English: 'SATYAM finds separate statements and the language used.', Hindi: 'SATYAM अलग-अलग बातें और भाषा पहचानता है।', Marathi: 'SATYAM वेगवेगळी वाक्ये आणि भाषा ओळखते.' },
  technologyMatch: { English: 'Look at sample information', Hindi: 'नमूना जानकारी देखें', Marathi: 'नमुना माहिती पाहा' },
  technologyMatchBody: { English: 'The demo compares the message with its local examples.', Hindi: 'डेमो संदेश की तुलना स्थानीय उदाहरणों से करता है।', Marathi: 'डेमो संदेशाची तुलना स्थानिक उदाहरणांशी करते.' },
  technologyResult: { English: 'Show what was found', Hindi: 'मिली जानकारी दिखाएँ', Marathi: 'मिळालेली माहिती दाखवा' },
  technologyResultBody: { English: 'If nothing matches, SATYAM says it could not confirm the message.', Hindi: 'मिलान न होने पर SATYAM बताता है कि संदेश की पुष्टि नहीं हुई।', Marathi: 'जुळणी न झाल्यास SATYAM संदेशाची खात्री करता आली नाही असे सांगते.' },
  verdictLegend: { English: 'SATYAM result labels', Hindi: 'SATYAM नतीजे के नाम', Marathi: 'SATYAM निकालांची नावे' },
  footerTag: { English: 'Think before sharing · Demonstration website', Hindi: 'आगे भेजने से पहले जाँचें · डेमो वेबसाइट', Marathi: 'पुढे पाठवण्यापूर्वी तपासा · डेमो वेबसाइट' },
  sentBy: { English: '12 people · online', Hindi: '12 लोग · ऑनलाइन', Marathi: '12 जण · ऑनलाइन' },
  familyGroup: { English: 'Family Group', Hindi: 'परिवार समूह', Marathi: 'कुटुंब गट' },
  today: { English: 'TODAY', Hindi: 'आज', Marathi: 'आज' },
  forwarded: { English: 'Forwarded message', Hindi: 'आगे भेजा गया संदेश', Marathi: 'पुढे पाठवलेला संदेश' },
  conversationQuestion: { English: 'Is this true? Has anyone checked?', Hindi: 'क्या यह सच है? क्या किसी ने जाँचा?', Marathi: 'हे खरे आहे का? कुणी तपासले का?' },
  conversationReply: { English: 'Please check before sharing.', Hindi: 'आगे भेजने से पहले जाँचें।', Marathi: 'पुढे पाठवण्यापूर्वी तपासा.' },
  loading: { English: 'Please wait. We are checking the information.', Hindi: 'कृपया रुकें। हम जानकारी की जाँच कर रहे हैं।', Marathi: 'कृपया थांबा. आम्ही माहिती तपासत आहोत.' },
  autoLanguage: { English: 'Use selected language', Hindi: 'चुनी हुई भाषा इस्तेमाल करें', Marathi: 'निवडलेली भाषा वापरा' },
  resultEyebrow: { English: 'MESSAGE CHECK', Hindi: 'संदेश की जाँच', Marathi: 'संदेशाची तपासणी' },
  verdictHeading: { English: 'Result', Hindi: 'नतीजा', Marathi: 'निकाल' },
  claimsFound: { English: 'Things we found in the message', Hindi: 'संदेश में मिली बातें', Marathi: 'संदेशातील मुद्दे' },
  claim: { English: 'Message point', Hindi: 'संदेश की बात', Marathi: 'संदेशातील मुद्दा' },
  warningSigns: { English: 'Things to notice', Hindi: 'ध्यान देने वाली बातें', Marathi: 'लक्षात घेण्यासारखे मुद्दे' },
  recommendedAction: { English: 'A helpful next step', Hindi: 'अब क्या करें', Marathi: 'आता काय करावे' },
  evidenceNotFound: { English: 'We did not find matching information in this small demo.', Hindi: 'इस छोटे डेमो में मिलती जानकारी नहीं मिली।', Marathi: 'या छोट्या डेमोमध्ये जुळणारी माहिती मिळाली नाही.' },
  readDetails: { English: 'Read the full explanation', Hindi: 'पूरा जवाब पढ़ें', Marathi: 'संपूर्ण उत्तर वाचा' },
  transcript: { English: 'Full explanation', Hindi: 'पूरा जवाब', Marathi: 'संपूर्ण उत्तर' },
  controlsHint: { English: 'Use Play, Pause, Resume or Stop.', Hindi: 'सुनने, रोकने, फिर चलाने या बंद करने के बटन दबाएँ।', Marathi: 'ऐकण्यासाठी, थांबवण्यासाठी, पुन्हा सुरू करण्यासाठी किंवा बंद करण्यासाठी बटणे दाबा.' },
  copied: { English: 'Copied', Hindi: 'कॉपी हुआ', Marathi: 'कॉपी झाले' },
  copyMessage: { English: 'Copy message', Hindi: 'संदेश कॉपी करें', Marathi: 'संदेश कॉपी करा' },
  notConnected: { English: 'SIMULATED CHAT · NOT CONNECTED TO WHATSAPP', Hindi: 'डेमो चैट · WHATSAPP से जुड़ा नहीं', Marathi: 'डेमो गप्पा · WHATSAPP शी जोडलेले नाही' },
  paste: { English: 'Paste message', Hindi: 'संदेश डालें', Marathi: 'संदेश टाका' },
  type: { English: 'Type a message', Hindi: 'संदेश लिखें', Marathi: 'संदेश लिहा' },
  clear: { English: 'Clear', Hindi: 'मिटाएँ', Marathi: 'पुसून टाका' },
  pastePlaceholder: { English: 'Paste or type the message you want to check here…', Hindi: 'जाँचने वाला संदेश यहाँ डालें या लिखें…', Marathi: 'तपासायचा संदेश इथे टाका किंवा लिहा…' },
  characters: { English: 'characters', Hindi: 'अक्षर', Marathi: 'अक्षरे' },
  useSample: { English: 'Use selected sample', Hindi: 'चुना नमूना डालें', Marathi: 'निवडलेला नमुना भरा' },
  detectedMessageLanguage: { English: 'Message language', Hindi: 'संदेश की भाषा', Marathi: 'संदेशाची भाषा' },
  autoSelectedLanguage: { English: 'Selected language', Hindi: 'चुनी हुई भाषा', Marathi: 'निवडलेली भाषा' },
  chooseOutputLanguage: { English: '2. Choose your language', Hindi: '2. अपनी भाषा चुनें', Marathi: '2. तुमची भाषा निवडा' },
  enterMessageStep: { English: '1. Choose your message', Hindi: '1. अपना संदेश चुनें', Marathi: '1. तुमचा संदेश निवडा' },
  readyMessage: { English: 'Your message is ready to check!', Hindi: 'आपका संदेश जाँचने के लिए तैयार है!', Marathi: 'तुमचा संदेश तपासण्यासाठी तयार आहे!' },
  demoLocal: { English: 'This demo uses sample information saved on this device. It does not search the internet.', Hindi: 'यह डेमो इस डिवाइस में रखी नमूना जानकारी इस्तेमाल करता है। यह इंटरनेट पर खोज नहीं करता।', Marathi: 'हा डेमो या उपकरणातील नमुना माहिती वापरतो. तो इंटरनेटवर शोध घेत नाही.' },
  countClaims: { English: 'Things found', Hindi: 'मिली बातें', Marathi: 'सापडलेले मुद्दे' },
  familyTitle: { English: 'Family group', Hindi: 'परिवार समूह', Marathi: 'कुटुंब गट' },
  groupOnline: { English: '12 people · online', Hindi: '12 लोग · ऑनलाइन', Marathi: '12 जण · ऑनलाइन' },
  clipboardError: { English: 'Could not copy to your clipboard. The message was still sent to SATYAM if you used the check button.', Hindi: 'क्लिपबोर्ड पर कॉपी नहीं हुआ। जाँच बटन दबाया था तो संदेश SATYAM को भेज दिया गया है।', Marathi: 'क्लिपबोर्डवर कॉपी करता आले नाही. तपासणीचे बटण दाबले असल्यास संदेश SATYAM कडे पाठवला आहे.' },
  claimNumber: { English: 'Point', Hindi: 'बात', Marathi: 'मुद्दा' },
  detectedLanguage: { English: 'Message language', Hindi: 'संदेश की भाषा', Marathi: 'संदेशाची भाषा' },
  evidenceRecord: { English: 'Sample information', Hindi: 'नमूना जानकारी', Marathi: 'नमुना माहिती' },
  issuingAuthority: { English: 'Provided by', Hindi: 'जारी करने वाला', Marathi: 'जारी करणारी संस्था' },
  publicationDate: { English: 'Date', Hindi: 'तारीख', Marathi: 'दिनांक' },
  openSource: { English: 'Open source', Hindi: 'स्रोत खोलें', Marathi: 'स्रोत उघडा' },
  warningHeading: { English: 'Message clues to notice', Hindi: 'संदेश में ध्यान देने वाली बातें', Marathi: 'संदेशातील लक्ष देण्यासारखे संकेत' },
  noWarningSigns: { English: 'No common warning signs were noticed.', Hindi: 'आम तौर पर दिखने वाले चेतावनी संकेत नहीं मिले।', Marathi: 'सामान्य इशारे दिसले नाहीत.' },
  sourceMissing: { English: 'No matching information was found in the local sample. This does not mean the message is false. No live source search was done.', Hindi: 'स्थानीय नमूने में मिलती जानकारी नहीं मिली। इसका मतलब यह नहीं कि संदेश गलत है। इंटरनेट पर खोज नहीं की गई।', Marathi: 'स्थानिक नमुन्यात जुळणारी माहिती मिळाली नाही. याचा अर्थ संदेश खोटा आहे असा नाही. इंटरनेटवर शोध घेतला नाही.' },
  audioPlaying: { English: 'Reading the explanation aloud.', Hindi: 'जवाब पढ़कर सुनाया जा रहा है।', Marathi: 'उत्तर वाचून दाखवले जात आहे.' },
  audioPaused: { English: 'Audio paused.', Hindi: 'आवाज़ रोक दी गई है।', Marathi: 'आवाज थांबवला आहे.' },
  audioStopped: { English: 'Audio stopped.', Hindi: 'आवाज़ बंद है।', Marathi: 'आवाज बंद आहे.' },
  warningIndicators: { English: 'Message signs', Hindi: 'संदेश के संकेत', Marathi: 'संदेशातील संकेत' },
  evidenceSummary: { English: 'What the sample information says', Hindi: 'नमूना जानकारी क्या कहती है', Marathi: 'नमुना माहिती काय सांगते' },
  retry: { English: 'Try again', Hindi: 'फिर से कोशिश करें', Marathi: 'पुन्हा प्रयत्न करा' },
  warningUrgent: { English: 'Uses urgent or pressuring words.', Hindi: 'जल्दी करने या दबाव डालने वाले शब्द हैं।', Marathi: 'घाई करण्यास किंवा दबाव आणणारे शब्द आहेत.' },
  warningForward: { English: 'Asks people to forward the message quickly.', Hindi: 'संदेश जल्दी आगे भेजने को कहता है।', Marathi: 'संदेश पटकन पुढे पाठवण्यास सांगतो.' },
  warningLink: { English: 'Includes a link or asks you to open one.', Hindi: 'इसमें लिंक है या उसे खोलने को कहता है।', Marathi: 'यात लिंक आहे किंवा ती उघडण्यास सांगतो.' },
  warningReward: { English: 'Promises a reward or valuable offer.', Hindi: 'इनाम या कीमती चीज़ का वादा करता है।', Marathi: 'बक्षीस किंवा मौल्यवान गोष्टीचे आश्वासन देतो.' },
  warningNoSource: { English: 'Does not name a source that can be checked.', Hindi: 'जाँचने लायक स्रोत का नाम नहीं देता।', Marathi: 'तपासता येईल अशा स्रोताचे नाव देत नाही.' },
  welcome: { English: 'Welcome to SATYAM AI.', Hindi: 'SATYAM AI में आपका स्वागत है।', Marathi: 'SATYAM AI मध्ये तुमचे स्वागत आहे.' },
  welcomeQuestion: { English: 'Have you received a message you are unsure about?', Hindi: 'क्या आपको ऐसा संदेश मिला है जिस पर आपको भरोसा नहीं?', Marathi: 'तुम्हाला एखादा संशयास्पद संदेश मिळाला आहे का?' },
  welcomeHelp: { English: 'SATYAM helps you understand whether reliable information supports a message.', Hindi: 'SATYAM समझने में मदद करता है कि भरोसेमंद जानकारी संदेश का समर्थन करती है या नहीं।', Marathi: 'विश्वासार्ह माहिती संदेशाला समर्थन देते का हे समजून घेण्यासाठी SATYAM मदत करते.' },
  showHow: { English: 'Show me how it works', Hindi: 'मुझे तरीका दिखाएँ', Marathi: 'कसे वापरायचे ते दाखवा' },
  startChecking: { English: 'Start checking', Hindi: 'जाँच शुरू करें', Marathi: 'तपासायला सुरुवात करा' },
  skip: { English: 'Skip introduction', Hindi: 'परिचय छोड़ें', Marathi: 'माहिती वगळा' },
};

export function t(key: string, language: Language) {
  return copy[key]?.[language] ?? copy[key]?.English ?? key;
}
