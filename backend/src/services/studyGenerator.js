import { generateMockStudyPackage } from './mockAiClient.js';
import { generateGeminiStudyPackage, hasGeminiClient } from './geminiClient.js';

export async function generateStudyPackage(params) {
  if (hasGeminiClient()) {
    try {
      const result = await generateGeminiStudyPackage(params);
      console.log(
        `[Gemini] Generated study package with model ${process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest'}.`,
      );
      return result;
    } catch (error) {
      console.warn('Gemini generation failed, falling back to mock generator:', error);
    }
  }

  try {
    const fallback = await generateMockStudyPackage(params);
    console.log('[MockAI] Generated study package using the built-in mock service.');
    return fallback;
  } catch (mockError) {
    console.error('Mock generator failed:', mockError);
    throw mockError;
  }
}

