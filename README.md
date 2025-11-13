# Smart Study Assistant

An AI-inspired study helper that combines live topic lookups with generated summaries, quizzes, and math practice. Students enter any topic, choose between a standard study pack or Math Mode, and receive structured learning materials in seconds.

## Features

- Topic-aware summaries condensed into three key bullet points.
- Auto-generated multiple-choice quiz with explanations for each answer.
- Actionable study tip tailored to the topic.
- Math Mode that produces a quantitative or logic prompt with a worked solution.
- Live loading and error states in the UI, plus Wikipedia attribution for transparency.

## Project Structure

```
frontend/  # Vite + React single-page app
backend/   # Express API with Wikipedia fetch + mock AI generator
```

## Getting Started

### Prerequisites

- Node.js 18 or newer (for native `fetch` support on the backend).
- npm 9+.

### Backend Setup

```bash
cd backend
npm install
npm run start   # or `npm run dev` for watch mode
```

Environment variables (optional):

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | HTTP port for the API | `4000` |
| `ALLOWED_ORIGINS` | Comma-separated list of origins permitted by CORS | All origins |
| `GEMINI_API_KEY` | Google Gemini API key – enables live AI generation when set (required for Math Mode) | _unset_ |
| `GEMINI_MODEL` | Gemini model name | `gemini-2.5-flash` |

The API exposes:

- `GET /health` – quick status check.
- `POST /study` – accepts JSON `{ "topic": string, "mode": "standard" | "math" }`.

#### Example Request

```bash
curl -X POST http://localhost:4000/study \
  -H "Content-Type: application/json" \
  -d '{ "topic": "Photosynthesis", "mode": "standard" }'
```

#### Sample Response (Standard Mode)

```json
{
  "topic": "Photosynthesis",
  "mode": "standard",
  "generatedAt": "2025-11-13T12:00:00.000Z",
  "summary": ["...", "...", "..."],
  "quiz": [
    {
      "prompt": "Which statement about Photosynthesis is accurate?",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 1,
      "explanation": "..."
    }
  ],
  "studyTip": "Create a quick concept map...",
  "sourceAttribution": {
    "source": "Wikipedia",
    "url": "https://en.wikipedia.org/wiki/Photosynthesis",
    "license": "https://creativecommons.org/licenses/by-sa/3.0/",
    "retrievedAt": "2025-11-13T11:59:40.000Z"
  }
}
```

Math mode swaps the `summary`, `quiz`, and `studyTip` keys for `question`, `answer`, and `explanation`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

- The app expects `VITE_API_BASE_URL` in `.env` (defaults to `http://localhost:4000`).
- Update the value with your deployed backend URL when hosting.

### Prompt Strategy (Mock AI Generation)

The backend auto-detects whether a Gemini API key is present:

- **With `GEMINI_API_KEY`**: Uses Google Gemini (via the official `@google/genai` SDK) to produce summaries, quizzes, and math prompts from Wikipedia context. Default model is `gemini-2.5-flash`; override with `GEMINI_MODEL` if desired.
- **Without a key**: Falls back to a deterministic mock generator for standard mode. Math Mode will respond with a 503 error until a Gemini key is configured.

Current mock/Gemini prompt strategy:

1. Fetches topic context from Wikipedia.
2. Extracts up to three key sentences as summary bullets.
3. Crafts multiple-choice questions and distractors from those bullets.
4. Builds a study tip encouraging retrieval practice.
5. Generates math problems (linear equations, geometry, probability, calculus, or logic) depending on the topic text.

To swap in a real AI service (e.g., OpenAI, Gemini, or Hugging Face), replace `generateStudyPackage` in `backend/src/services/mockAiClient.js` with calls to your provider.

## Deployment

- **Backend**: Deployable to platforms like Render, Railway, or Fly.io. Set `PORT` via the platform dashboard.
- **Frontend**: Deployable to Vercel or Netlify. Configure `VITE_API_BASE_URL` to point to the live backend.

> ℹ️ Deployments are not included in this repository. Once you provision production URLs, list them below:
>
> - Backend: `https://your-backend-url.example`
> - Frontend: `https://your-frontend-url.example`

## Testing

- Manually verify both modes:
  - Fetch a standard topic (e.g., "Photosynthesis") to confirm summary + quiz + tip.
  - Fetch Math Mode (e.g., topic "calculus") to confirm question + answer + explanation structure.
- Confirm loading and error states by disabling the backend or using a nonsense topic.

## License

MIT © 2025 Smart Study Assistant Contributors

