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

### Prompt Examples

#### Standard Mode Prompt

The standard mode prompt instructs Gemini to create a structured JSON response with summaries, quiz questions, and study tips:

```
You are Smart Study Assistant, an educational AI that creates concise study materials.
Using ONLY the reference material provided, produce JSON that matches this schema exactly:
{
  "summary": ["", "", ""],
  "quiz": [
    {
      "prompt": "",
      "options": ["", "", "", ""],
      "correctIndex": 0,
      "explanation": ""
    },
    { ... second question ... },
    { ... third question ... }
  ],
  "studyTip": ""
}
Rules:
- Return exactly 3 summary bullet points, each under 200 characters.
- Quiz must contain 3 multiple-choice questions.
- Each quiz entry needs 4 distinct answer options and a zero-based "correctIndex".
- The explanation should reference why the correct option is true.
- Respond with STRICT JSON only, without markdown fences or commentary.

Topic: [user-provided topic]
Reference material: [Wikipedia extract/description]
```

#### Math Mode Prompt

The math mode prompt generates quantitative or logic practice problems:

```
You are Smart Study Assistant, an AI that creates quantitative or logic practice.
Create a JSON object that follows this schema exactly:
{
  "question": "",
  "answer": "",
  "explanation": ""
}
Requirements:
- Provide ONE well-posed quantitative or logic question tied to the topic theme.
- Give the correct answer as a concise string.
- Provide a step-by-step explanation that justifies the answer.
- Respond with STRICT JSON only, without markdown fences or commentary.

Topic: [user-provided topic]
Reference material: [Wikipedia extract/description]
```

#### Example Prompt Execution

For topic "Photosynthesis" in standard mode:
1. Backend fetches Wikipedia article extract
2. Extracts description and up to 2400 characters of content
3. Sends to Gemini with the standard prompt template
4. Parses JSON response and validates structure
5. Returns formatted study package to frontend

## Deployment

- **Backend**: Deployable to platforms like Render, Railway, or Fly.io. Set `PORT` via the platform dashboard.
- **Frontend**: Deployable to Vercel or Netlify. Configure `VITE_API_BASE_URL` to point to the live backend.

### Hosted URLs

- **Backend**: `https://smartstudy-revrag-ai-assignment.onrender.com`
- **Frontend**: _[Add your frontend deployment URL here]_

## Testing

### Automated Backend Tests

The project includes automated test cases for the backend API using Node.js built-in test runner.

**To run the tests:**

1. Start the backend server in one terminal:
   ```bash
   cd backend
   npm run start
   ```

2. In another terminal, run the tests:
   ```bash
   cd backend
   npm test
   ```

**Test Cases:**
- **Test Case 1**: Health endpoint returns OK status
- **Test Case 2**: Standard mode generates complete study package for valid topic (Photosynthesis)
- **Test Case 3**: Returns 404 error for invalid/non-existent topic

The tests verify:
- Correct HTTP status codes
- Response structure and data types
- Error handling for invalid inputs
- Wikipedia source attribution

### Manual Test Plan

#### Test Case 1: Standard Mode - Valid Topic
**Objective**: Verify standard mode generates summary, quiz, and study tip correctly.

**Steps**:
1. Start backend server: `cd backend && npm run start`
2. Start frontend: `cd frontend && npm run dev`
3. Open frontend in browser (typically `http://localhost:5173`)
4. Enter topic: "Photosynthesis"
5. Ensure mode is set to "Standard"
6. Click "Generate Study Pack"

**Expected Results**:
- Loading indicator appears
- Response includes:
  - 3 summary bullet points
  - 3 multiple-choice quiz questions with 4 options each
  - 1 study tip
  - Source attribution from Wikipedia
- No errors displayed

#### Test Case 2: Math Mode - Valid Topic
**Objective**: Verify math mode generates quantitative question with answer and explanation.

**Steps**:
1. Ensure `GEMINI_API_KEY` is set in backend `.env`
2. Enter topic: "Calculus"
3. Select "Math Mode"
4. Click "Generate Study Pack"

**Expected Results**:
- Loading indicator appears
- Response includes:
  - 1 quantitative/logic question
  - Correct answer
  - Step-by-step explanation
  - Source attribution from Wikipedia
- Math answer input field is functional

#### Test Case 3: Error Handling - Invalid Topic
**Objective**: Verify proper error handling for topics not found in Wikipedia.

**Steps**:
1. Enter topic: "XyZ123AbC999" (nonsense topic)
2. Click "Generate Study Pack"

**Expected Results**:
- Error message displayed: "We could not find any information for 'XyZ123AbC999'."
- No study content displayed
- User can retry with a different topic

#### Test Case 4: Error Handling - Backend Unavailable
**Objective**: Verify frontend handles backend connection errors gracefully.

**Steps**:
1. Stop backend server
2. Attempt to generate study pack for any topic

**Expected Results**:
- Error message displayed indicating connection failure
- Loading state clears
- User can retry after backend is restored

### API Testing with cURL

```bash
# Test health endpoint
curl http://localhost:4000/health

# Test standard mode
curl -X POST http://localhost:4000/study \
  -H "Content-Type: application/json" \
  -d '{"topic": "Photosynthesis", "mode": "standard"}'

# Test math mode (requires GEMINI_API_KEY)
curl -X POST http://localhost:4000/study \
  -H "Content-Type: application/json" \
  -d '{"topic": "Calculus", "mode": "math"}'

# Test error handling - invalid topic
curl -X POST http://localhost:4000/study \
  -H "Content-Type: application/json" \
  -d '{"topic": "InvalidTopic123", "mode": "standard"}'
```

## AI Tools Disclosure

This project was developed with assistance from AI tools. The following components were AI-assisted:

- **Code Generation**: Initial project structure, API endpoint setup, and React component scaffolding were created with AI assistance (ChatGPT/Copilot)
- **Prompt Engineering**: AI prompts for Gemini were iteratively refined with AI assistance to ensure proper JSON formatting and educational content quality
- **Error Handling**: Error handling patterns and validation logic were developed with AI assistance
- **Documentation**: README structure and API documentation were drafted with AI assistance and then manually reviewed and customized

**Original Work**:
- Project architecture and design decisions
- Integration of Wikipedia API and Gemini API
- Frontend UI/UX design and styling
- Testing strategy and manual test cases
- Deployment configuration

All code has been reviewed, tested, and customized to meet the specific requirements of this assignment. No code was copy-pasted without understanding or modification.

## License

MIT © 2025 Smart Study Assistant Contributors

