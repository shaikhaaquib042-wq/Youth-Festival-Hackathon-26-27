import express from "express";
import axios from "axios";
import FormData from "form-data";
import { PassThrough } from "stream";
import { GoogleGenAI } from "@google/genai";
import gTTS from "node-gtts";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(express.json());

// ONLY PASTE YOUR TWO KEYS INSIDE THESE QUOTES:
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "YOUR_WHATSAPP_TOKEN";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY";

// Pre-configured for your TRINETRA Voice Shield app:
const PHONE_NUMBER_ID = "1395116353691250";
const VERIFY_TOKEN = "trinetra_verify_2026";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const SYSTEM_PROMPT = `
You are TRINETRA, a calm emergency cyber-defense assistant for Indian students.
Listen to the user's voice note. Detect if they speak English, Hindi, or Marathi.
Return ONLY valid JSON:
{
  "lang": "en" or "hi" or "mr",
  "reply": "Calm spoken advice in that exact language, under 45 words, no emojis or symbols. 1) Reassure them calmly. 2) Tell them NOT to reply or delete messages, and screenshot URLs/timestamps first. 3) Mention helpline 1930, emergency 112, or anonymous reporting on cybercrime.gov.in."
}
`;

const EMERGENCY_FALLBACK = {
  lang: "en",
  reply:
    "Stay calm. Do not reply, click links, or delete any messages. Take screenshots of numbers, URLs, and timestamps right now. Immediately call 1930, the National Cyber Crime Helpline, or 112 in an emergency, and report anonymously on cybercrime.gov.in."
};

function synthesizeOggOpusVoice(text, langCode = "en") {
  return new Promise((resolve, reject) => {
    const lang = ["en", "hi", "mr"].includes(langCode) ? langCode : "en";
    const mp3Stream = gTTS(lang).stream(text);
    const outStream = new PassThrough();
    const chunks = [];

    outStream.on("data", (chunk) => chunks.push(chunk));
    outStream.on("end", () => resolve(Buffer.concat(chunks)));
    outStream.on("error", reject);

    ffmpeg(mp3Stream)
      .inputFormat("mp3")
      .audioCodec("libopus")
      .audioChannels(1)
      .audioBitrate("32k")
      .format("ogg")
      .on("error", reject)
      .pipe(outStream);
  });
}

app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    return res.status(200).send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return;
  const sender = msg.from;

  if (msg.type !== "audio") {
    await axios.post(
      `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: sender,
        type: "text",
        text: {
          body: "🛡️ TRINETRA Voice Shield: Hold the mic button and send a voice note in English, Hindi, or Marathi. Nothing is saved."
        }
      },
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
    return;
  }

  try {
    const mediaMeta = await axios.get(`https://graph.facebook.com/v25.0/${msg.audio.id}`, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
    });

    const audioRes = await axios.get(mediaMeta.data.url, {
      responseType: "arraybuffer",
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
    });
    const base64Audio = Buffer.from(audioRes.data).toString("base64");

    const modelsToTry = ["gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash"];
    let aiRes = null;

    for (const modelName of modelsToTry) {
      try {
        aiRes = await ai.models.generateContent({
          model: modelName,
          contents: [
            { text: SYSTEM_PROMPT },
            { inlineData: { mimeType: "audio/ogg", data: base64Audio } }
          ],
          config: { responseMimeType: "application/json" }
        });
        break;
      } catch (e) {
        const errText = String(e.message || "");
        if (errText.includes("503") || errText.includes("404") || errText.includes("429")) {
          console.log(`${modelName} busy, fast-retrying in 800ms...`);
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        console.log("AI error, switching to emergency fallback:", errText);
        break;
      }
    }

    let parsed = EMERGENCY_FALLBACK;
    if (aiRes && aiRes.text) {
      try {
        const cleanJson = aiRes.text.replace(/```json|```/g, "").trim();
        const candidate = JSON.parse(cleanJson);
        if (candidate?.reply) {
          parsed = candidate;
        }
      } catch {
        console.log("⚠️ Could not parse AI JSON — using TRINETRA Emergency Fallback Voice.");
      }
    } else {
      console.log("⚠️ Cloud AI busy (503) — sending TRINETRA Emergency Fallback Voice!");
    }

    const oggBuffer = await synthesizeOggOpusVoice(parsed.reply, parsed.lang);

    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", "audio/ogg");
    form.append("file", oggBuffer, { filename: "reply.ogg", contentType: "audio/ogg" });

    const uploadRes = await axios.post(
      `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/media`,
      form,
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, ...form.getHeaders() } }
    );

    await axios.post(
      `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: sender,
        type: "audio",
        audio: { id: uploadRes.data.id, voice: true }
      },
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
});

app.listen(3000, () => console.log("🛡️ TRINETRA Voice AI live on port 3000"));