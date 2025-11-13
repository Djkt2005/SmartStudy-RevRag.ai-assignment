import { GoogleGenAI } from '@google/genai';
import { forceSentenceCase, truncate } from '../utils/text.js';

const FALLBACK_MODEL = 'gemini-2.5-flash';

let cachedClient = null;
let cachedApiKey = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new GoogleGenAI({ apiKey });
    cachedApiKey = apiKey;
  }

  return cachedClient;
}

export function hasGeminiClient() {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

export async function generateGeminiStudyPackage({ topic, mode, source }) {
  const client = getGeminiClient();

  if (!client) {
    throw new Error('Gemini API key is not configured.');
  }

  const model = process.env.GEMINI_MODEL || FALLBACK_MODEL;
  console.log(`[Gemini] Using model ${model}.`);
  const prompt = mode === 'math' ? buildMathPrompt(topic, source) : buildStandardPrompt(topic, source);

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
  });

  const rawText = await extractText(response);
  const parsedOutput = tryParseJson(rawText);

  if (!parsedOutput) {
    throw new Error('Gemini response did not include valid JSON content.');
  }

  const normalizedTopic = forceSentenceCase(source?.title ?? topic);
  const generatedAt = new Date().toISOString();

  if (mode === 'math') {
    const question = assertString(parsedOutput.question, 'Gemini response missing math question.');
    const answer = assertString(parsedOutput.answer, 'Gemini response missing math answer.');
    const explanation = assertString(parsedOutput.explanation, 'Gemini response missing math explanation.');

    return {
      topic: normalizedTopic,
      mode,
      generatedAt,
      payload: { question, answer, explanation },
    };
  }

  const summary = ensureArrayOfStrings(parsedOutput.summary, 3, 'Gemini response missing summary items.');
  const quiz = normalizeQuiz(parsedOutput.quiz, normalizedTopic);
  const studyTip = assertString(parsedOutput.studyTip, 'Gemini response missing study tip.');

  return {
    topic: normalizedTopic,
    mode,
    generatedAt,
    payload: {
      summary,
      quiz,
      studyTip,
    },
  };
}

function buildStandardPrompt(topic, source) {
  const context = buildContext(source);
  return [
    'You are Smart Study Assistant, an educational AI that creates concise study materials.',
    'Using ONLY the reference material provided, produce JSON that matches this schema exactly:',
    '{',
    '  "summary": ["", "", ""],',
    '  "quiz": [',
    '    {',
    '      "prompt": "",',
    '      "options": ["", "", "", ""],',
    '      "correctIndex": 0,',
    '      "explanation": ""',
    '    },',
    '    { ... second question ... },',
    '    { ... third question ... }',
    '  ],',
    '  "studyTip": ""',
    '}',
    'Rules:',
    '- Return exactly 3 summary bullet points, each under 200 characters.',
    '- Quiz must contain 3 multiple-choice questions.',
    '- Each quiz entry needs 4 distinct answer options and a zero-based "correctIndex".',
    '- The explanation should reference why the correct option is true.',
    '- Respond with STRICT JSON only, without markdown fences or commentary.',
    '',
    `Topic: ${topic}`,
    `Reference material: ${context}`,
  ].join('\n');
}

function buildMathPrompt(topic, source) {
  const context = buildContext(source);
  return [
    'You are Smart Study Assistant, an AI that creates quantitative or logic practice.',
    'Create a JSON object that follows this schema exactly:',
    '{',
    '  "question": "",',
    '  "answer": "",',
    '  "explanation": ""',
    '}',
    'Requirements:',
    '- Provide ONE well-posed quantitative or logic question tied to the topic theme.',
    '- Give the correct answer as a concise string.',
    '- Provide a step-by-step explanation that justifies the answer.',
    '- Respond with STRICT JSON only, without markdown fences or commentary.',
    '',
    `Topic: ${topic}`,
    `Reference material: ${context}`,
  ].join('\n');
}

function buildContext(source) {
  const parts = [];
  if (source?.description) {
    parts.push(`Description: ${source.description}`);
  }
  if (source?.extract) {
    parts.push(`Extract: ${truncate(source.extract, 2400)}`);
  } else if (source?.sentences?.length) {
    parts.push(`Key facts: ${source.sentences.slice(0, 5).join(' ')}`);
  }
  return parts.join('\n') || 'No additional reference material provided.';
}

async function extractText(result) {
  if (!result) {
    return null;
  }

  if (typeof result.text === 'function') {
    try {
      const value = await result.text();
      if (value) {
        return value;
      }
    } catch {
      // ignore
    }
  }

  if (typeof result.text === 'string') {
    return result.text;
  }

  if (typeof result.output_text === 'string') {
    return result.output_text;
  }

  if (typeof result.outputText === 'string') {
    return result.outputText;
  }

  const candidate = result.response?.candidates?.[0];
  if (candidate?.output_text) {
    return candidate.output_text;
  }

  const parts = candidate?.content?.parts;
  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (typeof part?.text === 'string' && part.text.trim()) {
        return part.text;
      }
    }
  }

  return null;
}

function tryParseJson(rawText) {
  if (!rawText) {
    return null;
  }

  const trimmed = rawText.trim();

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return safeJsonParse(fencedMatch[1]);
  }

  const jsonCandidate = safeJsonParse(trimmed);
  if (jsonCandidate) {
    return jsonCandidate;
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return safeJsonParse(trimmed.slice(firstBrace, lastBrace + 1));
  }

  return null;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function ensureArrayOfStrings(value, minLength, errorMessage) {
  if (!Array.isArray(value) || value.length < minLength) {
    throw new Error(errorMessage);
  }
  return value.map((item) => assertString(item, errorMessage));
}

function normalizeQuiz(rawQuiz, topic) {
  if (!Array.isArray(rawQuiz) || rawQuiz.length < 3) {
    throw new Error('Gemini response missing quiz questions.');
  }

  const normalized = rawQuiz.slice(0, 3).map((question, index) => {
    const prompt = assertString(question.prompt, `Quiz question ${index + 1} missing prompt.`);
    const options = ensureArrayOfStrings(question.options, 4, `Quiz question ${index + 1} missing options.`).slice(0, 4);
    const correctIndex = Number.isInteger(question.correctIndex) ? question.correctIndex : -1;
    if (correctIndex < 0 || correctIndex >= options.length) {
      throw new Error(`Quiz question ${index + 1} has an invalid correctIndex.`);
    }
    const explanation = assertString(
      question.explanation,
      `Quiz question ${index + 1} missing explanation for ${topic}.`,
    );

    return {
      prompt,
      options,
      correctIndex,
      explanation,
    };
  });

  return normalized;
}

function assertString(value, errorMessage) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(errorMessage);
  }
  return value.trim();
}

