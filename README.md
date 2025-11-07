# Palestinian Legal Advisor

This is a legal advisory application for Palestinian law that allows users to analyze legal cases using AI.

## Features

- Save and manage multiple legal cases
- AI-powered legal analysis using Google Gemini or OpenRouter
- Persistent storage of cases using localStorage
- Arabic language interface

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Data Persistence

All case data is stored in the browser's localStorage, ensuring that your cases persist between sessions. 
If you experience issues with data not appearing across different ports or sessions:

1. Check that you're accessing the app from the same domain/protocol
2. Use the debugging tools in Settings to view/export/import your data
3. Note that localStorage is tied to the specific origin (protocol + domain + port)
