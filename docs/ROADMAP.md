# Roadmap

Built and live: routing for 19 dispute types, 12 languages, letters and labels, legal aid check, city offices for 6 cities, assistant chat, no-JS journeys.

Next, in order:

1. **Streaming chat drawer** on the result page (the `/api/chat` SSE endpoint exists; today the assistant is its own page).
2. **Voice input** (flag `voice_input`, off): BHASHINI speech recognition through the Worker, Web Speech API as fallback, and "Read aloud". The code path is planned behind the flag; the button stays hidden until it works.
3. **State grievance portals** for states beyond Maharashtra, from official sources only, marked "Check before you go" until the link checker confirms them.
4. **Real filing** to a DIGIT/UPYOG city once a tenant and credentials are issued (currently a labelled demo sandbox).
5. **BHASHINI translation** of dynamic text (needs onboarding keys).
6. **Map preview** on "Get there" with Leaflet and OpenStreetMap tiles, opt-in.
7. **Native-speaker review** of all 11 translations, starting with Marathi and Hindi.
8. **Share images** per route for social previews, and maskable app icons.
