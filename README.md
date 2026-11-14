<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1BUW6xCl-XbUrrP2RUzL2tk2kJCep3Jwi

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## RM-808 Studio (`rm808/`)

Boîte à rythmes + synthé wavetable/FM + rack d'effets pilotable par le contrôleur iDance RM-808 (ou tout contrôleur MIDI) via Web MIDI.

- Dev : `npm run dev` puis ouvrir `http://localhost:3000/rm808/`
- Build : `npm run build` → `dist/rm808/index.html`
- Navigateur : Chrome / Edge (Web MIDI). Sur iPad, utiliser un navigateur iOS compatible Web MIDI.
- Aucune dépendance : JavaScript ES modules natif dans `rm808/js/`.
