import type { Language, Verdict, VerificationReport } from '../app/types';

type SummaryCopy = Record<Verdict, (synthetic: boolean) => string>;

const summaries: Record<Language, SummaryCopy> = {
  English: {
    VERIFIED: synthetic =>
      synthetic
        ? "Demonstration example: VERIFIED. This simulated result demonstrates how SATYAM displays a supported claim. No real-world fact-check was performed."
        : 'Your result is VERIFIED. Reliable evidence supports this information. You can read the sources in the report.',
    FALSE: synthetic =>
      synthetic
        ? "Demonstration example: FALSE. This is a simulated result used to demonstrate SATYAM's interface. No real-world fact-check was performed. Please check a trusted source before sharing."
        : 'Your result is FALSE. Reliable evidence shows this information is false. Do not forward this message. Check trusted sources before sharing.',
    MISLEADING: synthetic =>
      synthetic
        ? "Demonstration example: MISLEADING. This is a simulated result used to demonstrate SATYAM's interface. No real-world fact-check was performed. Check the original information before forwarding."
        : 'Your result is MISLEADING. This message may give an incorrect impression. Check the original information before forwarding it.',
    UNVERIFIED: synthetic =>
      synthetic
        ? 'Your result is UNVERIFIED. This demonstration could not confirm the message. That does not mean it is false. No real-world fact-check was performed.'
        : 'Your result is UNVERIFIED. We could not find enough reliable information to confirm this message. This does not mean it is false. Please check an official source before sharing.',
    CONFLICTING: synthetic =>
      synthetic
        ? "Demonstration example: CONFLICTING. This is a simulated result used to demonstrate SATYAM's interface. No real-world fact-check was performed. Please review trusted sources before deciding."
        : 'Your result is CONFLICTING. Reliable sources provide different information. Please review the evidence before making a decision.',
  },
  Hindi: {
    VERIFIED: synthetic =>
      synthetic
        ? 'डेमो उदाहरण: VERIFIED। यह नकली नतीजा दिखाता है कि SATYAM सही जानकारी को कैसे दिखाएगा। असली दुनिया की तथ्य-जाँच नहीं हुई है।'
        : 'आपका नतीजा VERIFIED है। भरोसेमंद जानकारी इस बात का समर्थन करती है। आप रिपोर्ट में स्रोत पढ़ सकते हैं।',
    FALSE: synthetic =>
      synthetic
        ? 'डेमो उदाहरण: FALSE। यह SATYAM का तरीका दिखाने के लिए नकली नतीजा है। असली दुनिया की तथ्य-जाँच नहीं हुई है। आगे भेजने से पहले भरोसेमंद स्रोत देखें।'
        : 'आपका नतीजा FALSE है। भरोसेमंद जानकारी बताती है कि यह बात गलत है। इस संदेश को आगे न भेजें। साझा करने से पहले भरोसेमंद स्रोत देखें।',
    MISLEADING: synthetic =>
      synthetic
        ? 'डेमो उदाहरण: MISLEADING। यह SATYAM का तरीका दिखाने के लिए नकली नतीजा है। असली दुनिया की तथ्य-जाँच नहीं हुई है। आगे भेजने से पहले असली जानकारी देखें।'
        : 'आपका नतीजा MISLEADING है। इस संदेश से गलतफहमी हो सकती है। आगे भेजने से पहले असली जानकारी देखें।',
    UNVERIFIED: synthetic =>
      synthetic
        ? 'आपका नतीजा UNVERIFIED है। इस डेमो में संदेश की पुष्टि नहीं हो सकी। इसका मतलब यह नहीं कि संदेश गलत है। असली दुनिया की तथ्य-जाँच नहीं हुई है।'
        : 'आपका नतीजा UNVERIFIED है। हमें इस संदेश की पुष्टि के लिए पर्याप्त भरोसेमंद जानकारी नहीं मिली। इसका मतलब यह नहीं कि संदेश गलत है। साझा करने से पहले सरकारी स्रोत देखें।',
    CONFLICTING: synthetic =>
      synthetic
        ? 'डेमो उदाहरण: CONFLICTING। यह SATYAM का तरीका दिखाने के लिए नकली नतीजा है। असली दुनिया की तथ्य-जाँच नहीं हुई है। फैसला करने से पहले भरोसेमंद स्रोत देखें।'
        : 'आपका नतीजा CONFLICTING है। भरोसेमंद स्रोतों में अलग-अलग जानकारी है। फैसला करने से पहले सबूत देखें।',
  },
  Marathi: {
    VERIFIED: synthetic =>
      synthetic
        ? 'डेमो उदाहरण: VERIFIED. हा नमुना निकाल SATYAM समर्थित माहिती कशी दाखवेल हे सांगतो. प्रत्यक्ष तथ्य-पडताळणी केलेली नाही.'
        : 'तुमचा निकाल VERIFIED आहे. विश्वासार्ह माहिती या गोष्टीला समर्थन देते. अहवालातील स्रोत तुम्ही वाचू शकता.',
    FALSE: synthetic =>
      synthetic
        ? 'डेमो उदाहरण: FALSE. हा SATYAM कसे काम करते हे दाखवण्यासाठी तयार केलेला नमुना निकाल आहे. प्रत्यक्ष तथ्य-पडताळणी केलेली नाही. पुढे पाठवण्यापूर्वी विश्वासार्ह स्रोत तपासा.'
        : 'तुमचा निकाल FALSE आहे. विश्वासार्ह माहिती ही गोष्ट चुकीची असल्याचे दाखवते. हा संदेश पुढे पाठवू नका. शेअर करण्यापूर्वी विश्वासार्ह स्रोत तपासा.',
    MISLEADING: synthetic =>
      synthetic
        ? 'डेमो उदाहरण: MISLEADING. हा SATYAM कसे काम करते हे दाखवण्यासाठी तयार केलेला नमुना निकाल आहे. प्रत्यक्ष तथ्य-पडताळणी केलेली नाही. पुढे पाठवण्यापूर्वी मूळ माहिती तपासा.'
        : 'तुमचा निकाल MISLEADING आहे. या संदेशामुळे चुकीचा समज होऊ शकतो. पुढे पाठवण्यापूर्वी मूळ माहिती तपासा.',
    UNVERIFIED: synthetic =>
      synthetic
        ? 'तुमचा निकाल UNVERIFIED आहे. या डेमोमध्ये संदेशाची खात्री करता आली नाही. याचा अर्थ संदेश खोटा आहे असा नाही. प्रत्यक्ष तथ्य-पडताळणी केलेली नाही.'
        : 'तुमचा निकाल UNVERIFIED आहे. या संदेशाची खात्री करण्यासाठी पुरेशी विश्वासार्ह माहिती आम्हाला मिळाली नाही. याचा अर्थ हा संदेश खोटा आहे असा नाही. शेअर करण्यापूर्वी अधिकृत स्रोत तपासा.',
    CONFLICTING: synthetic =>
      synthetic
        ? 'डेमो उदाहरण: CONFLICTING. हा SATYAM कसे काम करते हे दाखवण्यासाठी तयार केलेला नमुना निकाल आहे. प्रत्यक्ष तथ्य-पडताळणी केलेली नाही. निर्णय घेण्यापूर्वी विश्वासार्ह स्रोत तपासा.'
        : 'तुमचा निकाल CONFLICTING आहे. विश्वासार्ह स्रोतांमध्ये वेगवेगळी माहिती आहे. निर्णय घेण्यापूर्वी पुरावे तपासा.',
  },
};

export function createSpokenSummary(report: VerificationReport, language: Language): string {
  const synthetic = report.claims.some(claim => claim.evidence?.demoOnly);
  return summaries[language][report.overall](synthetic);
}
