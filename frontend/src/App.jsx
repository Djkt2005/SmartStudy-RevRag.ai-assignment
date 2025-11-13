import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export default function App() {
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [mathAnswer, setMathAnswer] = useState('');
  const [mathAnswerSubmitted, setMathAnswerSubmitted] = useState(false);
  const [mathAnswerCorrect, setMathAnswerCorrect] = useState(false);
  const [showMathAnswer, setShowMathAnswer] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    // Update localStorage and apply dark mode class
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      setError('Please enter a study topic.');
      setResult(null);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/study`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: trimmedTopic, mode }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error ?? 'Unable to generate study material.');
      }

      const payload = await response.json();
      setResult(payload);
      setSelectedAnswers({}); // Reset selected answers when new quiz is generated
      setMathAnswer(''); // Reset math answer input
      setMathAnswerSubmitted(false); // Reset submission status
      setMathAnswerCorrect(false); // Reset correctness
      setShowMathAnswer(false); // Reset show answer state
    } catch (fetchError) {
      setError(fetchError.message ?? 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex, optionIndex) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const normalizeAnswer = (answer) => {
    if (!answer) return '';
    // Remove extra whitespace, convert to lowercase, remove common units and punctuation
    return answer
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.-]/g, '') // Remove special characters except dots, dashes
      .replace(/\b(units?|unit)\b/g, '') // Remove "unit" or "units"
      .trim();
  };

  const compareAnswers = (userAnswer, correctAnswer) => {
    const normalizedUser = normalizeAnswer(userAnswer);
    const normalizedCorrect = normalizeAnswer(correctAnswer);
    
    // Direct comparison
    if (normalizedUser === normalizedCorrect) return true;
    
    // Try numeric comparison (handle cases like "6" vs "6.0")
    const userNum = parseFloat(normalizedUser);
    const correctNum = parseFloat(normalizedCorrect);
    if (!isNaN(userNum) && !isNaN(correctNum)) {
      return Math.abs(userNum - correctNum) < 0.0001; // Handle floating point precision
    }
    
    return false;
  };

  const handleMathAnswerSubmit = (e) => {
    e.preventDefault();
    if (!mathAnswer.trim() || !result?.answer) return;
    
    const isCorrect = compareAnswers(mathAnswer, result.answer);
    setMathAnswerSubmitted(true);
    setMathAnswerCorrect(isCorrect);
    
    if (isCorrect) {
      setShowMathAnswer(true); // Automatically show answer if correct
    }
  };

  const isMathMode = mode === 'math';

  return (
    <div className="app-shell">
      <header>
        <div className="header-content">
          <div>
            <h1>Smart Study Assistant</h1>
            <p className="tagline">AI-powered summaries, quizzes, and practice prompts for any topic.</p>
          </div>
          <button
            type="button"
            className="dark-mode-toggle"
            onClick={() => setDarkMode(!darkMode)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main>
        <form className="study-form" onSubmit={handleSubmit}>
          <label htmlFor="topic">Study topic</label>
          <input
            id="topic"
            name="topic"
            type="text"
            placeholder="e.g. Photosynthesis"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            autoComplete="off"
          />

          <div className="mode-toggle">
            <span>Mode</span>
            <label className="toggle">
              <input
                type="radio"
                name="mode"
                value="standard"
                checked={mode === 'standard'}
                onChange={(event) => setMode(event.target.value)}
              />
              <span>Standard</span>
            </label>
            <label className="toggle">
              <input
                type="radio"
                name="mode"
                value="math"
                checked={mode === 'math'}
                onChange={(event) => setMode(event.target.value)}
              />
              <span>Math Mode</span>
            </label>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Generating…' : 'Generate Study Pack'}
          </button>
        </form>

        {loading && (
          <div className="status loading">
            <span className="spinner" aria-hidden="true" />
            <span>Working on your study pack…</span>
          </div>
        )}

        {error && (
          <div className="status error" role="alert">
            {error}
          </div>
        )}

        {result && (
          <section className="results">
            <header className="results-header">
              <div>
                <h2>{result.topic}</h2>
                <p className="mode-label">{isMathMode ? 'Math / Quantitative Mode' : 'Standard Study Mode'}</p>
              </div>
              <p className="timestamp">
                Generated <time dateTime={result.generatedAt}>{new Date(result.generatedAt).toLocaleString()}</time>
              </p>
            </header>

            {!isMathMode && (
              <>
                <article>
                  <h3>Summary</h3>
                  <ul>
                    {result.summary?.map((item, index) => (
                      <li key={`summary-${index}`}>{item}</li>
                    ))}
                  </ul>
                </article>

                <article>
                  <h3>Quiz</h3>
                  <ol className="quiz-list">
                    {result.quiz?.map((question, index) => {
                      const selectedIndex = selectedAnswers[index];
                      const hasAnswered = selectedIndex !== undefined;
                      const isCorrect = selectedIndex === question.correctIndex;
                      
                      return (
                        <li key={`quiz-${index}`}>
                          <p className="question">{question.prompt}</p>
                          <ul className="options">
                            {question.options.map((option, optionIndex) => {
                              const isSelected = optionIndex === selectedIndex;
                              const isCorrectOption = optionIndex === question.correctIndex;
                              const showCorrect = hasAnswered && isCorrectOption;
                              const showIncorrect = hasAnswered && isSelected && !isCorrectOption;
                              
                              return (
                                <li key={`option-${optionIndex}`}>
                                  <button
                                    type="button"
                                    className={`option-button ${showCorrect ? 'correct' : ''} ${showIncorrect ? 'incorrect' : ''} ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleAnswerSelect(index, optionIndex)}
                                    disabled={hasAnswered}
                                  >
                                    <span className="option-label">{String.fromCharCode(65 + optionIndex)}.</span>
                                    <span>{option}</span>
                                    {showCorrect && <span className="correct-badge">Correct</span>}
                                    {showIncorrect && <span className="incorrect-badge">Incorrect</span>}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                          {hasAnswered && (
                            <p className="explanation">{question.explanation}</p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </article>

                <article>
                  <h3>Study Tip</h3>
                  <p>{result.studyTip}</p>
                </article>
              </>
            )}

            {isMathMode && (
              <article>
                <h3>Practice Question</h3>
                <p className="question">{result.question}</p>
                
                {!showMathAnswer && (
                  <form className="math-answer-form" onSubmit={handleMathAnswerSubmit}>
                    <label htmlFor="math-answer">Your Answer:</label>
                    <div className="math-input-group">
                      <input
                        id="math-answer"
                        type="text"
                        value={mathAnswer}
                        onChange={(e) => setMathAnswer(e.target.value)}
                        placeholder="Enter your answer"
                        disabled={mathAnswerSubmitted}
                        autoComplete="off"
                      />
                      {!mathAnswerSubmitted && (
                        <button type="submit" className="submit-answer-btn">
                          Submit
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {mathAnswerSubmitted && (
                  <>
                    {mathAnswerCorrect ? (
                      <div className="answer-feedback correct-feedback">
                        <span className="feedback-icon">✓</span>
                        <span>Correct!</span>
                      </div>
                    ) : (
                      <div className="answer-feedback incorrect-feedback">
                        <span className="feedback-icon">✗</span>
                        <span>Incorrect. Try again or view the answer.</span>
                      </div>
                    )}
                  </>
                )}

                {mathAnswerSubmitted && !mathAnswerCorrect && !showMathAnswer && (
                  <button
                    type="button"
                    className="show-answer-btn"
                    onClick={() => setShowMathAnswer(true)}
                  >
                    Show Answer
                  </button>
                )}

                {(showMathAnswer || (mathAnswerSubmitted && mathAnswerCorrect)) && (
                  <>
                    <p className="math-answer-display">
                      <strong>Answer:</strong> {result.answer}
                    </p>
                    <p className="explanation">
                      <strong>Explanation:</strong> {result.explanation}
                    </p>
                  </>
                )}
              </article>
            )}

            {result.sourceAttribution?.url && (
              <footer className="attribution">
                <p>
                  Source:{' '}
                  <a href={result.sourceAttribution.url} target="_blank" rel="noreferrer">
                    {result.sourceAttribution.source ?? 'Reference'}
                  </a>
                  {result.sourceAttribution.retrievedAt && (
                    <>
                      {' '}
                      · Retrieved{' '}
                      <time dateTime={result.sourceAttribution.retrievedAt}>
                        {new Date(result.sourceAttribution.retrievedAt).toLocaleDateString()}
                      </time>
                    </>
                  )}
                </p>
              </footer>
            )}
          </section>
        )}
      </main>

      <footer className="app-footer">
        <small>Built for focused learning. Deploy the backend first, then set VITE_API_BASE_URL for production.</small>
      </footer>
    </div>
  );
}

