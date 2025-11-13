import { splitIntoSentences } from '../utils/text.js';

const WIKI_BASE_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

export async function fetchTopicSummary(topic) {
  const encodedTopic = encodeURIComponent(topic.trim());
  const url = `${WIKI_BASE_URL}${encodedTopic}`;
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'Smart Study Assistant/0.1 (https://github.com/SmartStudyAssistant)',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Wikipedia request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (data.type === 'disambiguation' || !data.extract) {
    return null;
  }

  const sentences = splitIntoSentences(data.extract);

  return {
    title: data.title ?? topic,
    description: data.description ?? '',
    extract: data.extract,
    sentences,
    contentUrl: data.content_urls?.desktop?.page ?? null,
    attribution: {
      source: 'Wikipedia',
      url: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodedTopic}`,
      license: data.license?.url ?? 'https://creativecommons.org/licenses/by-sa/3.0/',
      retrievedAt: new Date().toISOString(),
    },
  };
}

