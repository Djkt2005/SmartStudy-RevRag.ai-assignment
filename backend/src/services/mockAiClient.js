import { forceSentenceCase, truncate } from '../utils/text.js';

const GENERIC_DISTRACTORS = [
  'It is primarily a concept from modern pop culture.',
  'It deals exclusively with culinary arts and cooking techniques.',
  'It is mostly focused on professional sports trivia.',
  'It originated as a fictional idea in a popular novel.',
  'It is known chiefly as a style of contemporary music.',
  'It refers to a recent social media trend.',
  'It is concerned only with interior design aesthetics.',
];

const QUIZ_PROMPTS = [
  (topic) => `Which statement about ${topic} is accurate?`,
  (topic) => `What is a key takeaway about ${topic}?`,
  (topic) => `Which of these facts correctly relates to ${topic}?`,
];

export async function generateMockStudyPackage({ topic, mode, source }) {
  if (mode === 'math') {
    const error = new Error('Math mode requires Gemini. Set GEMINI_API_KEY to enable quantitative generation.');
    error.code = 'MATH_MODE_REQUIRES_GEMINI';
    throw error;
  }

  const normalizedTopic = forceSentenceCase(source?.title ?? topic);
  const generatedAt = new Date().toISOString();

  const summary = buildSummary(source, normalizedTopic);
  const quiz = buildQuiz(summary, normalizedTopic);
  const studyTip = buildStudyTip(summary, normalizedTopic);

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

function buildSummary(source, topic) {
  const sentences = source?.sentences ?? [];
  if (sentences.length >= 3) {
    return sentences.slice(0, 3).map((sentence) => truncate(sentence.trim(), 220));
  }

  if (!sentences.length) {
    const fallback = source?.extract
      ? truncate(source.extract, 220)
      : `${topic} is an area worth exploring further.`;
    return [fallback, `Start by identifying the core ideas that define ${topic}.`, `Look for examples of ${topic} applied in real situations.`];
  }

  const padded = [...sentences];
  while (padded.length < 3) {
    padded.push(`Explore additional aspects of ${topic} to reinforce this point.`);
  }
  return padded.slice(0, 3).map((sentence) => truncate(sentence.trim(), 220));
}

function buildQuiz(summary, topic) {
  const distractors = [...GENERIC_DISTRACTORS];
  const questions = [];

  for (let i = 0; i < 3; i += 1) {
    const fact = summary[i] ?? summary[summary.length - 1];
    const incorrectOptions = getUniqueDistractors(distractors, 3, topic);
    const options = shuffle([fact, ...incorrectOptions]);
    const correctIndex = options.indexOf(fact);

    questions.push({
      prompt: QUIZ_PROMPTS[i % QUIZ_PROMPTS.length](topic),
      options,
      correctIndex,
      explanation: `The accurate statement is “${fact}”. This detail reflects what reliable sources say about ${topic}.`,
    });
  }

  return questions;
}

function buildStudyTip(summary, topic) {
  const primaryFact = summary[0] ?? `the central ideas of ${topic}`;
  return `Create a quick concept map that links “${primaryFact}” to supporting examples. Teaching ${topic} aloud to a friend or an empty room consolidates your understanding.`;
}

function getUniqueDistractors(pool, count, topic) {
  const results = [];
  while (results.length < count && pool.length) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    const [candidate] = pool.splice(randomIndex, 1);
    results.push(candidate.replace('It', `${forceSentenceCase(topic)}`).replace(' it ', ` ${topic} `));
  }

  while (results.length < count) {
    results.push(`${forceSentenceCase(topic)} still has more to explore.`);
  }

  return results;
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

