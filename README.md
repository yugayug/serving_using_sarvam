# Daylight

**A multilingual voice companion that helps a family stay in sync.** Daylight brings meal planning, grocery runs, medication reminders, family notes, commute notes, and everyday spending into one calm household dashboard.

## Why it works for a demo

- Switch between Amma and Arjun to show one shared family view.
- Use the language picker, speak a task, and hear the reply in the chosen Indian language.
- From any screen, tell the assistant to add groceries, plan meals, log expenses, update commute notes, share a family note, or create/complete a routine reminder.
- Ask it for a friendly bargaining line using a seller's quoted price.
- Ask for a meal idea based on the current grocery list, or get a friendly bargaining phrase for a price you enter.
- Use the **Try a demo** shortcuts to show the main flows without a microphone.

## Run locally

Use Node 20.9 or newer (Node 26 is supported):

```bash
npm install
cp .env.local.example .env.local
# Add your Sarvam API key to .env.local
npm run dev
```

Open `http://localhost:3000`. Without a key, the app remains usable in demo mode; Sarvam chat and audio features require `SARVAM_API_KEY`.

## Deploy to Vercel

Import this repository into Vercel as a Next.js project, then add `SARVAM_API_KEY` under **Project Settings → Environment Variables** and redeploy. No separate API server is needed: UI and Sarvam proxy endpoints are served by the same Next.js app.

## Demo data and boundaries

Household data is saved in the current browser with `localStorage`; profile switching is a same-device demo, not account-based cross-device sync. Medication entries are reminders only, and the app does not make medical recommendations or send notifications while closed. Grocery bargaining suggestions use the price entered by the user and do not claim to know live market prices.
# serving_using_sarvam
