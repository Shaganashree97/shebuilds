import React, { useState, useEffect } from 'react';
import './MockInterviews.css'; // Will create this CSS file

const MockInterviews = () => {
    const [companyName, setCompanyName] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [mockInterviewQuestions, setMockInterviewQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [interviewStarted, setInterviewStarted] = useState(false);
    const [interviewFinished, setInterviewFinished] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [audioLoading, setAudioLoading] = useState(false);
    const [currentAudio, setCurrentAudio] = useState(null);
    const [autoPlay, setAutoPlay] = useState(true);
    const [evaluationLoading, setEvaluationLoading] = useState(false);
    const [answerEvaluations, setAnswerEvaluations] = useState([]);
    const [overallSummary, setOverallSummary] = useState(null);

    const API_BASE_URL = 'http://localhost:8000/api'; // Your Django API base URL

    // Stop current audio when component unmounts
    useEffect(() => {
        return () => {
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }
        };
    }, [currentAudio]);

    // Auto-play question audio when question changes
    useEffect(() => {
        if (interviewStarted && currentQuestion && autoPlay) {
            playQuestionAudio();
        }
    }, [currentQuestionIndex, interviewStarted]);

    const startMockInterview = async () => {
        if (!companyName.trim() || !jobDescription.trim()) {
            setError("Please provide both company name and job description.");
            return;
        }
        setLoading(true);
        setError(null);
        setMockInterviewQuestions([]);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setInterviewFinished(false);

        try {
            const response = await fetch(`${API_BASE_URL}/generate_mock_interview/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_name: companyName.trim(),
                    job_description: jobDescription.trim(),
                    num_questions: 5 // Request 5 questions
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.questions && data.questions.length > 0) {
                setMockInterviewQuestions(data.questions);
                setInterviewStarted(true);
            } else {
                setError("No mock interview questions were generated. Please try again with a different job description.");
                setInterviewStarted(false);
            }
        } catch (e) {
            console.error("Failed to start mock interview:", e);
            setError(e.message || "Failed to start mock interview. Please try again.");
            setInterviewStarted(false);
        } finally {
            setLoading(false);
        }
    };

    const playQuestionAudio = async () => {
        const currentQuestion = mockInterviewQuestions[currentQuestionIndex];
        if (!currentQuestion) return;

        // Stop current audio if playing
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        setAudioLoading(true);
        try {
            // If audio_url is provided, use it directly
            if (currentQuestion.audio_url) {
                const audio = new Audio(currentQuestion.audio_url);
                audio.onloadeddata = () => setAudioLoading(false);
                audio.onerror = () => {
                    setAudioLoading(false);
                    console.error("Failed to load audio");
                };
                setCurrentAudio(audio);
                await audio.play();
            } 
            // If audio_data is provided (base64), convert and play
            else if (currentQuestion.audio_data) {
                const audioBlob = new Blob([
                    Uint8Array.from(atob(currentQuestion.audio_data), c => c.charCodeAt(0))
                ], { type: 'audio/mpeg' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audio.onloadeddata = () => setAudioLoading(false);
                audio.onerror = () => {
                    setAudioLoading(false);
                    console.error("Failed to load audio");
                };
                audio.onended = () => URL.revokeObjectURL(audioUrl); // Clean up
                setCurrentAudio(audio);
                await audio.play();
            } else {
                setAudioLoading(false);
                console.warn("No audio data available for this question");
            }
        } catch (error) {
            setAudioLoading(false);
            console.error("Error playing audio:", error);
        }
    };

    const handleAnswerChange = (e) => {
        setUserAnswers({
            ...userAnswers,
            [currentQuestionIndex]: e.target.value,
        });
    };

    const evaluateAnswers = async () => {
        setEvaluationLoading(true);
        setError(null);

        try {
            // Prepare the data for evaluation
            const questionAnswers = mockInterviewQuestions.map((question, index) => ({
                question_text: question.question_text,
                difficulty_level: question.difficulty_level,
                user_answer: userAnswers[index] || ""
            }));

            const response = await fetch(`${API_BASE_URL}/evaluate_interview_answers/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_name: companyName.trim(),
                    job_description: jobDescription.trim(),
                    question_answers: questionAnswers
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setAnswerEvaluations(data.evaluations || []);
            setOverallSummary(data.overall_summary || null);

        } catch (e) {
            console.error("Failed to evaluate answers:", e);
            setError("Failed to evaluate your answers. You can still review your responses below.");
        } finally {
            setEvaluationLoading(false);
        }
    };

    const nextQuestion = () => {
        // Stop current audio when moving to next question
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        if (currentQuestionIndex < mockInterviewQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            setInterviewFinished(true);
            setInterviewStarted(false); // End the interview session
            // Evaluate answers when interview finishes
            evaluateAnswers();
        }
    };

    const currentQuestion = mockInterviewQuestions[currentQuestionIndex];

    return (
        <div className="container">
            <h2>🎤 AI Mock Interview Practice</h2>
            <p className="subtitle">Practice with AI-generated questions and realistic interviewer voice</p>

            {!interviewStarted && !interviewFinished && (
                <div className="interview-setup">
                    <div className="form-group">
                        <label htmlFor="companyName">Company Name:</label>
                        <input
                            type="text"
                            id="companyName"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="e.g., Google, Microsoft, Amazon..."
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="jobDescription">Job Description:</label>
                        <textarea
                            id="jobDescription"
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Paste the complete job description here, including requirements, responsibilities, and qualifications..."
                            rows="8"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={autoPlay}
                                onChange={(e) => setAutoPlay(e.target.checked)}
                            />
                            Auto-play question audio (recommended for realistic experience)
                        </label>
                    </div>
                    <button 
                        className="start-interview-btn" 
                        onClick={startMockInterview} 
                        disabled={loading}
                    >
                        {loading ? '🔄 Generating Interview...' : '🚀 Start AI Mock Interview'}
                    </button>
                    {error && <div className="error-message">{error}</div>}
                </div>
            )}

            {interviewStarted && currentQuestion && (
                <div className="interview-session">
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ width: `${((currentQuestionIndex + 1) / mockInterviewQuestions.length) * 100}%` }}
                        ></div>
                    </div>
                    <div className="question-header">
                        <h3>Question {currentQuestionIndex + 1} of {mockInterviewQuestions.length}</h3>
                        <span className="difficulty-badge difficulty-{currentQuestion.difficulty_level}">
                            {currentQuestion.difficulty_level}
                        </span>
                    </div>
                    
                    <div className="question-section">
                        <div className="audio-controls">
                            <button 
                                className="replay-btn" 
                                onClick={playQuestionAudio}
                                disabled={audioLoading}
                            >
                                {audioLoading ? '🔄' : '🔊'} 
                                {audioLoading ? 'Loading...' : 'Play Question'}
                            </button>
                            {currentAudio && (
                                <span className="audio-status">
                                    🎙️ Interviewer speaking...
                                </span>
                            )}
                        </div>
                        <div className="question-text-container">
                            <p className="question-text">{currentQuestion.question_text}</p>
                        </div>
                    </div>

                    <div className="answer-section">
                        <label htmlFor="answerTextarea">Your Answer:</label>
                        <textarea
                            id="answerTextarea"
                            className="answer-textarea"
                            placeholder="Think about your answer and type it here. Take your time..."
                            value={userAnswers[currentQuestionIndex] || ''}
                            onChange={handleAnswerChange}
                            rows="8"
                        ></textarea>
                        <div className="answer-tips">
                            💡 <strong>Tip:</strong> Use the STAR method (Situation, Task, Action, Result) for behavioral questions
                        </div>
                    </div>

                    <div className="navigation-controls">
                        <button className="next-question-btn" onClick={nextQuestion}>
                            {currentQuestionIndex < mockInterviewQuestions.length - 1 ? 
                                '➡️ Next Question' : '✅ Finish Interview'}
                        </button>
                    </div>
                </div>
            )}

            {interviewFinished && (
                <div className="interview-summary">
                    <h3>🎉 Interview Complete!</h3>
                    
                    {evaluationLoading && (
                        <div className="evaluation-loading">
                            <div className="loading-spinner">🤖</div>
                            <p>AI is analyzing your answers...</p>
                            <p className="loading-subtext">This may take a few moments</p>
                        </div>
                    )}

                    {!evaluationLoading && overallSummary && (
                        <div className="overall-performance">
                            <h4>📊 Overall Performance</h4>
                            <div className="performance-card">
                                <div className="score-display">
                                    <span className="score-number">{overallSummary.average_score}</span>
                                    <span className="score-text">/ 10</span>
                                </div>
                                <div className="performance-details">
                                    <div className="performance-level">
                                        <span className={`level-badge level-${overallSummary.performance_level.toLowerCase().replace(' ', '-')}`}>
                                            {overallSummary.performance_level}
                                        </span>
                                    </div>
                                    <p className="performance-comment">{overallSummary.summary_comment}</p>
                                    <p className="questions-completed">
                                        Questions Answered: {overallSummary.total_questions}/{mockInterviewQuestions.length}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="completion-stats">
                        <p>🏢 Company: <strong>{companyName}</strong></p>
                        <p>✅ Interview session completed successfully!</p>
                    </div>

                    {!evaluationLoading && answerEvaluations.length > 0 && (
                        <>
                            <h4>📝 Detailed Answer Analysis:</h4>
                            <div className="answers-evaluation">
                                {answerEvaluations.map((evaluation, idx) => (
                                    <div key={idx} className="evaluation-item">
                                        <div className="evaluation-header">
                                            <div className="question-info">
                                                <span className="question-number">Q{idx + 1}</span>
                                                <span className={`difficulty-badge difficulty-${evaluation.question_text && mockInterviewQuestions[idx] ? mockInterviewQuestions[idx].difficulty_level : 'medium'}`}>
                                                    {mockInterviewQuestions[idx]?.difficulty_level || 'medium'}
                                                </span>
                                            </div>
                                            <div className="score-badge">
                                                <span className="score">{evaluation.score}/10</span>
                                            </div>
                                        </div>
                                        
                                        <div className="question-text-eval">
                                            <strong>Question:</strong> {evaluation.question_text}
                                        </div>
                                        
                                        <div className="user-answer-eval">
                                            <strong>Your Answer:</strong>
                                            <p className="answer-text">
                                                {evaluation.user_answer || "No answer provided"}
                                            </p>
                                        </div>

                                        <div className="feedback-sections">
                                            {evaluation.strengths && evaluation.strengths.length > 0 && (
                                                <div className="feedback-section strengths">
                                                    <h5>✅ Strengths</h5>
                                                    <ul>
                                                        {evaluation.strengths.map((strength, sIdx) => (
                                                            <li key={sIdx}>{strength}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {evaluation.improvements && evaluation.improvements.length > 0 && (
                                                <div className="feedback-section improvements">
                                                    <h5>🔄 Areas for Improvement</h5>
                                                    <ul>
                                                        {evaluation.improvements.map((improvement, iIdx) => (
                                                            <li key={iIdx}>{improvement}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {evaluation.suggestions && evaluation.suggestions.length > 0 && (
                                                <div className="feedback-section suggestions">
                                                    <h5>💡 Suggestions</h5>
                                                    <ul>
                                                        {evaluation.suggestions.map((suggestion, sgIdx) => (
                                                            <li key={sgIdx}>{suggestion}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {evaluation.overall_comment && (
                                            <div className="overall-comment">
                                                <p><strong>Overall Feedback:</strong> {evaluation.overall_comment}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {!evaluationLoading && answerEvaluations.length === 0 && !error && (
                        <div className="basic-summary">
                            <h4>📝 Your Responses:</h4>
                            <div className="answers-summary">
                                {mockInterviewQuestions.map((q, idx) => (
                                    <div key={idx} className="question-summary-item">
                                        <div className="question-header-summary">
                                            <span className="question-number">Q{idx + 1}</span>
                                            <span className={`difficulty-badge difficulty-${q.difficulty_level}`}>
                                                {q.difficulty_level}
                                            </span>
                                        </div>
                                        <p className="question-text-summary">{q.question_text}</p>
                                        <div className="answer-summary">
                                            <strong>Your Answer:</strong>
                                            <p className="user-answer">
                                                {userAnswers[idx] || "No answer provided."}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="next-steps">
                        <h4>🚀 Next Steps for Improvement:</h4>
                        <ul>
                            <li>Practice your answers out loud with a timer</li>
                            <li>Research more about {companyName}'s culture and values</li>
                            <li>Prepare specific examples using the STAR method</li>
                            <li>Practice with different job descriptions and roles</li>
                            <li>Record yourself answering to improve delivery and confidence</li>
                        </ul>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="action-buttons">
                        <button 
                            className="new-interview-btn"
                            onClick={() => {
                                setInterviewFinished(false);
                                setInterviewStarted(false);
                                setCompanyName('');
                                setJobDescription('');
                                setMockInterviewQuestions([]);
                                setUserAnswers({});
                                setCurrentQuestionIndex(0);
                                setAnswerEvaluations([]);
                                setOverallSummary(null);
                                setEvaluationLoading(false);
                                if (currentAudio) {
                                    currentAudio.pause();
                                    currentAudio.currentTime = 0;
                                }
                            }}
                        >
                            🔄 Start New Interview
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MockInterviews;