import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

import { fetchTopicSummary } from './services/wikiClient.js';
import { generateStudyPackage } from './services/studyGenerator.js';
import { hasGeminiClient } from './services/geminiClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 4000;
// Parse ALLOWED_ORIGINS: if set and non-empty, use it; otherwise allow all origins
const ALLOWED_ORIGINS_RAW = process.env.ALLOWED_ORIGINS?.trim();
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_RAW && ALLOWED_ORIGINS_RAW.length > 0
  ? ALLOWED_ORIGINS_RAW.split(',').map((origin) => origin.trim()).filter(Boolean)
  : null;

console.log(`[Startup] Gemini API key detected: ${hasGeminiClient() ? 'yes' : 'no'}.`);
console.log(`[Startup] CORS: ${ALLOWED_ORIGINS ? `Restricted to ${ALLOWED_ORIGINS.length} origin(s)` : 'Allowing all origins'}`);

app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) {
        callback(null, true);
        return;
      }

      // If ALLOWED_ORIGINS is not set or empty, allow all origins
      if (!ALLOWED_ORIGINS || ALLOWED_ORIGINS.length === 0) {
        callback(null, true);
        return;
      }

      // Check if origin is in allowed list
      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}. Allowed: ${ALLOWED_ORIGINS.join(', ')}`);
        callback(new Error('Origin not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/study', async (req, res) => {
  const { topic, mode = 'standard' } = req.body ?? {};

  if (!topic || typeof topic !== 'string') {
    res.status(400).json({ error: 'A non-empty string topic is required.' });
    return;
  }

  if (!['standard', 'math'].includes(mode)) {
    res.status(400).json({ error: "Mode must be either 'standard' or 'math'." });
    return;
  }

  try {
    const wikiData = await fetchTopicSummary(topic);

    if (!wikiData) {
      res.status(404).json({ error: `We could not find any information for “${topic}”.` });
      return;
    }

    const studyPackage = await generateStudyPackage({
      topic,
      mode,
      source: wikiData,
    });

    res.json({
      topic: studyPackage.topic,
      mode: studyPackage.mode,
      generatedAt: studyPackage.generatedAt,
      ...studyPackage.payload,
      sourceAttribution: wikiData.attribution,
    });
  } catch (error) {
    if (error.code === 'MATH_MODE_REQUIRES_GEMINI') {
      res
        .status(503)
        .json({
          error: 'Math mode requires a configured Gemini API key. Please set GEMINI_API_KEY and try again.',
        });
      return;
    }

    console.error('Failed to generate study package:', error);
    res.status(500).json({ error: 'Something went wrong while preparing your study materials. Please try again.' });
  }
});

app.use((err, _req, res, _next) => {
  if (err.message === 'Origin not allowed by CORS') {
    res.status(403).json({ error: err.message });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`Smart Study Assistant backend running on port ${PORT}`);
});

