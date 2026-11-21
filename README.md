# 🛡️ TRINETRA Voice Shield

**TRINETRA** is a real-time, multilingual AI emergency cyber-defense assistant built for Indian students. It combines an interactive web dashboard with a live **WhatsApp Voice Bot** that listens to voice notes in **English, Hindi, or Marathi** and responds with spoken audio guidance within seconds.

---

## ✨ Key Features

- **Multilingual Voice-to-Voice AI:** Accepts incoming WhatsApp `audio/ogg` voice notes, automatically detects **English, Hindi, or Marathi**, and replies with a synthesized OGG/Opus voice note in the same language.
- **Resilient Gemini Model Pipeline:** Uses `@google/genai` (`gemini-3.8-flash`) with an automatic retry and fallback loop to handle temporary `503` high-demand spikes without dropping user requests.
- **Live WhatsApp Cloud API Integration:** Connects Meta's Graph API webhooks to a local Node.js/Express backend via `ngrok`.
- **Web Frontend + Floating WhatsApp Launcher:** Includes a browser interface (`index.html`) equipped with a floating **Voice Shield on WhatsApp** button that opens a direct chat session with the bot.

---

## 📁 Project Structure

```text
TRINETRA/
├── index.html          # Main web frontend & floating WhatsApp chat button
├── app.js              # Frontend UI interactions and state handling
├── logic.js            # Core client-side cyber-defense workflows
├── data.js             # Scenarios, emergency helplines, and reference data
├── server.js           # Express webhook server, Gemini AI & voice synthesis
├── package.json        # Node.js dependencies
└── README.md           # Project setup and documentation