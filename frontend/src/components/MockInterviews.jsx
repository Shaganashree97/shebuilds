import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './MockInterviews.css';
import authService from '../services/authService';

const MockInterviews = () => {
    const location = useLocation();
    
    // Form states
    const [companyName, setCompanyName] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [planContext, setPlanContext] = useState(null); // Store preparation plan context
    
    // Interview states
    const [mockInterviewQuestions, setMockInterviewQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [interviewStarted, setInterviewStarted] = useState(false);
    const [interviewFinished, setInterviewFinished] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Voice and video states
    const [isRecording, setIsRecording] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [webcamStream, setWebcamStream] = useState(null);
    const [aiSpeaking, setAiSpeaking] = useState(false);
    const [userCanSpeak, setUserCanSpeak] = useState(false);
    const [showTextInput, setShowTextInput] = useState(false);
    const [textAnswer, setTextAnswer] = useState('');
    
    // Chat conversation
    const [conversation, setConversation] = useState([]);
    
    // Audio and evaluation states
    const [currentAudio, setCurrentAudio] = useState(null);
    const [evaluationLoading, setEvaluationLoading] = useState(false);
    const [answerEvaluations, setAnswerEvaluations] = useState([]);
    const [overallSummary, setOverallSummary] = useState(null);

    // Refs
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const speechRecognitionRef = useRef(null);
    const conversationEndRef = useRef(null);

    const [speechRetryCount, setSpeechRetryCount] = useState(0);
const [speechReady, setSpeechReady] = useState(false);
const MAX_RETRY_ATTEMPTS = 3;

    // Handle prefilled data from PreparationPlan navigation
    useEffect(() => {
        if (location.state?.prefillData) {
            const { companyName: prefillCompany, jobDescription: prefillJobDesc, planContext: prefillPlanContext } = location.state.prefillData;
            
            setCompanyName(prefillCompany || '');
            setJobDescription(prefillJobDesc || '');
            setPlanContext(prefillPlanContext || null);
            
            // Clear the navigation state to prevent re-prefilling on re-renders
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Initialize speech recognition
    useEffect(() => {
    const initializeSpeechRecognition = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            speechRecognitionRef.current = new SpeechRecognition();
            
            // Safe configuration - only set supported properties
            speechRecognitionRef.current.continuous = false;
            speechRecognitionRef.current.interimResults = true;
            speechRecognitionRef.current.lang = 'en-US';
            speechRecognitionRef.current.maxAlternatives = 1;

            speechRecognitionRef.current.onstart = () => {
                setIsListening(true);
                setError(null);
                console.log('Speech recognition started successfully');
            };

            speechRecognitionRef.current.onresult = (event) => {
                let transcript = '';
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        finalTranscript += result[0].transcript;
                    } else {
                        transcript += result[0].transcript;
                    }
                }
                
                setCurrentTranscript(transcript || finalTranscript);
                
                if (finalTranscript.trim()) {
                    setCurrentTranscript(finalTranscript);
                    setTimeout(() => {
                        handleVoiceAnswer(finalTranscript.trim());
                    }, 500);
                }
            };

            speechRecognitionRef.current.onend = () => {
                setIsListening(false);
                console.log('Speech recognition ended');
            };

            speechRecognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
                setIsRecording(false);
                
                let errorMessage = '';
                
                switch (event.error) {
                    case 'network':
                        errorMessage = 'Network connection issue. Please check your internet connection and try again, or use text input instead.';
                        setShowTextInput(true);
                        break;
                    case 'not-allowed':
                        errorMessage = 'Microphone access denied. Please allow microphone permissions and refresh the page.';
                        break;
                    case 'no-speech':
                        errorMessage = 'No speech detected. Please speak clearly and try again.';
                        break;
                    case 'aborted':
                        errorMessage = 'Speech recognition was stopped. Click "Start Recording" to try again.';
                        break;
                    case 'audio-capture':
                        errorMessage = 'Microphone not found. Please check your microphone connection.';
                        break;
                    case 'service-not-allowed':
                        errorMessage = 'Speech recognition service not available. Try typing your answer instead.';
                        setShowTextInput(true);
                        break;
                    default:
                        errorMessage = `Speech recognition error: ${event.error}. Please try text input instead.`;
                        setShowTextInput(true);
                }
                
                setError(errorMessage);
            };
        } else {
            setError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
            setShowTextInput(true);
        }
    };

    // Check if we're in a secure context
    const isSecureContext = window.location.protocol === 'https:' || 
                           window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
    
    if (!isSecureContext) {
        setError('Speech recognition requires HTTPS. Using text input mode.');
        setShowTextInput(true);
    } else {
        initializeSpeechRecognition();
    }

        return () => {
        if (speechRecognitionRef.current) {
            try {
                speechRecognitionRef.current.stop();
            } catch (e) {
                console.log('Speech recognition cleanup error:', e);
            }
        }
    };
}, []);

// CORRECTED startRecording function
const startRecording = () => {
    if (!userCanSpeak || aiSpeaking) return;

    setCurrentTranscript('');
    setIsRecording(true);
    setError(null);
    
    try {
        if (speechRecognitionRef.current) {
            speechRecognitionRef.current.start();
        }
    } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setIsRecording(false);
        
        if (error.name === 'InvalidStateError') {
            setError('Speech recognition is already running. Please wait and try again.');
        } else {
            setError('Failed to start voice recording. Please try text input instead.');
            setShowTextInput(true);
        }
    }
};

// CORRECTED stopRecording function
const stopRecording = () => {
    setIsRecording(false);
    try {
        if (speechRecognitionRef.current) {
            speechRecognitionRef.current.stop();
        }
    } catch (error) {
        console.error('Error stopping speech recognition:', error);
    }
};


const retryStartRecording = () => {
    if (!userCanSpeak || aiSpeaking) return;
    
    setCurrentTranscript('');
    setIsRecording(true);
    setError(null);
    
    try {
        if (speechRecognitionRef.current && speechReady) {
            speechRecognitionRef.current.start();
        }
    } catch (error) {
        console.error('Retry failed:', error);
        setIsRecording(false);
        setError('Voice recording failed. Please use text input instead.');
        setShowTextInput(true);
    }
};

// Enhanced startRecording function
// const startRecording = async () => {
//     if (!userCanSpeak || aiSpeaking) return;

//     // Check microphone permissions first
//     try {
//         const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//         stream.getTracks().forEach(track => track.stop()); // Stop the test stream
//     } catch (error) {
//         console.error('Microphone access denied:', error);
//         setError('Microphone access required for voice recording. Please allow microphone permissions or use text input.');
//         setShowTextInput(true);
//         return;
//     }

//     setCurrentTranscript('');
//     setIsRecording(true);
//     setError(null);
//     setSpeechRetryCount(0);
    
//     try {
//         if (speechRecognitionRef.current && speechReady) {
//             speechRecognitionRef.current.start();
//         } else {
//             throw new Error('Speech recognition not ready');
//         }
//     } catch (error) {
//         console.error('Failed to start speech recognition:', error);
//         setIsRecording(false);
        
//         if (error.name === 'InvalidStateError') {
//             // Recognition is already running, stop it first
//             try {
//                 speechRecognitionRef.current.stop();
//                 setTimeout(() => {
//                     startRecording();
//                 }, 1000);
//             } catch (e) {
//                 setError('Speech recognition conflict. Please use text input instead.');
//                 setShowTextInput(true);
//             }
//         } else {
//             setError('Failed to start voice recording. Please try text input instead.');
//             setShowTextInput(true);
//         }
//     }
// };

// // Enhanced stopRecording function
// const stopRecording = () => {
//     setIsRecording(false);
//     try {
//         if (speechRecognitionRef.current) {
//             speechRecognitionRef.current.stop();
//         }
//     } catch (error) {
//         console.error('Error stopping speech recognition:', error);
//     }
//     setSpeechRetryCount(0);
// };

// Add connection quality check
const checkConnectionQuality = async () => {
    try {
        const start = Date.now();
        await fetch('https://www.google.com/favicon.ico', { 
            mode: 'no-cors',
            cache: 'no-cache'
        });
        const latency = Date.now() - start;
        
        if (latency > 3000) {
            setError('Slow internet connection detected. Consider using text input for better reliability.');
        }
    } catch (error) {
        setError('Network connectivity issues detected. Please check your internet connection.');
    }
};

// Call this when starting the interview
useEffect(() => {
    if (interviewStarted) {
        checkConnectionQuality();
    }
}, [interviewStarted]);
    

    // Auto-scroll conversation
    useEffect(() => {
        conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation]);

    // Setup webcam
    const setupWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 }, 
                audio: false 
            });
            setWebcamStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Error accessing webcam:', error);
            setError('Unable to access webcam. Please allow camera permissions.');
        }
    };

    // Cleanup function
    const cleanup = () => {
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            setWebcamStream(null);
        }
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }
        if (speechRecognitionRef.current && speechRecognitionRef.current.abort) {
            speechRecognitionRef.current.abort();
        }
        setIsRecording(false);
        setIsListening(false);
        setAiSpeaking(false);
        setUserCanSpeak(false);
        setCurrentTranscript('');
        setShowTextInput(false);
        setTextAnswer('');
    };

    // Start interview
    const startMockInterview = async () => {
        if (!companyName.trim() || !jobDescription.trim()) {
            setError("Please provide both company name and job description.");
            return;
        }

        setLoading(true);
        setError(null);
        
        // Reset states
        setMockInterviewQuestions([]);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setInterviewFinished(false);
        setConversation([]);

        try {
            // Setup webcam first
            await setupWebcam();

            // Generate interview questions
            const response = await authService.makeAuthenticatedRequest('/generate_mock_interview/', {
                method: 'POST',
                body: JSON.stringify({
                    company_name: companyName.trim(),
                    job_description: jobDescription.trim(),
                    num_questions: 5
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
                
                // Add welcome message to conversation
                setConversation([{
                    id: Date.now(),
                    type: 'ai',
                    text: `Hello! I'm your AI interviewer for ${companyName}. We'll have a conversation about the role. Let's begin with our first question.`,
                    timestamp: new Date()
                }]);

                // Start with first question after a delay
                setTimeout(() => {
                    askQuestion(0, data.questions);
                }, 2000);
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

    // Ask a question (AI speaking)
    const askQuestion = async (questionIndex, questions = mockInterviewQuestions) => {
        const question = questions[questionIndex];
        if (!question) return;

        setAiSpeaking(true);
        setUserCanSpeak(false);
        setCurrentTranscript('');

        // Add question to conversation
        const questionMessage = {
            id: Date.now(),
            type: 'ai',
            text: question.question_text,
            timestamp: new Date(),
            questionNumber: questionIndex + 1
        };

        setConversation(prev => [...prev, questionMessage]);

        try {
            // Play question audio if available
            if (question.audio_data) {
                const audioBlob = new Blob([
                    Uint8Array.from(atob(question.audio_data), c => c.charCodeAt(0))
                ], { type: 'audio/mpeg' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                
                setCurrentAudio(audio);
                
                audio.onended = () => {
                    setAiSpeaking(false);
                    setUserCanSpeak(true);
                    URL.revokeObjectURL(audioUrl);
                    
                    // Add instruction message
                    setConversation(prev => [...prev, {
                        id: Date.now() + 1,
                        type: 'system',
                        text: 'Click "Start Recording" to give your answer. Speak clearly and take your time.',
                        timestamp: new Date()
                    }]);
                };
                
                audio.onerror = () => {
                    setAiSpeaking(false);
                    setUserCanSpeak(true);
                    URL.revokeObjectURL(audioUrl);
                };
                
                await audio.play();
            } else {
                // If no audio, just wait a moment then allow user to speak
                setTimeout(() => {
                    setAiSpeaking(false);
                    setUserCanSpeak(true);
                    setConversation(prev => [...prev, {
                        id: Date.now() + 1,
                        type: 'system',
                        text: 'Click "Start Recording" to give your answer. Speak clearly and take your time.',
                        timestamp: new Date()
                    }]);
                }, 1000);
            }
        } catch (error) {
            console.error('Error playing question audio:', error);
            setAiSpeaking(false);
            setUserCanSpeak(true);
        }
    };

    // Start voice recording
    // const startRecording = () => {
    //     if (!userCanSpeak || aiSpeaking) {
    //         return;
    //     }

    //     setCurrentTranscript('');
    //     setIsRecording(true);
    //     setError(null); // Clear any previous errors
        
    //     try {
    //         if (speechRecognitionRef.current) {
    //             speechRecognitionRef.current.start();
    //         }
    //     } catch (error) {
    //         console.error('Failed to start speech recognition:', error);
    //         setIsRecording(false);
    //         setError('Failed to start voice recording. Please try the text input option instead.');
    //         setShowTextInput(true);
    //     }
    // };

    // Stop voice recording
    // const stopRecording = () => {
    //     setIsRecording(false);
    //     if (speechRecognitionRef.current) {
    //         speechRecognitionRef.current.stop();
    //     }
    // };

    // Handle text input submission
    const handleTextSubmit = () => {
        if (!textAnswer.trim()) {
            setError('Please enter your answer before submitting.');
            return;
        }

        handleVoiceAnswer(textAnswer.trim());
        setTextAnswer('');
        setShowTextInput(false);
    };

    // Toggle between voice and text input
    const toggleInputMode = () => {
        if (isRecording) {
            stopRecording();
        }
        setShowTextInput(!showTextInput);
        setCurrentTranscript('');
        setTextAnswer('');
        setError(null);
    };

    // Handle voice answer
    const handleVoiceAnswer = (transcript) => {
        if (!transcript.trim()) return;

        // Add user answer to conversation
        const answerMessage = {
            id: Date.now(),
            type: 'user',
            text: transcript,
            timestamp: new Date()
        };

        setConversation(prev => [...prev, answerMessage]);

        // Store the answer
        setUserAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: transcript
        }));

        setCurrentTranscript('');
        setUserCanSpeak(false);

        // Move to next question or finish interview
        setTimeout(() => {
            if (currentQuestionIndex < mockInterviewQuestions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                askQuestion(currentQuestionIndex + 1);
            } else {
                finishInterview();
            }
        }, 1500);
    };

    // Finish interview
    const finishInterview = () => {
        setInterviewFinished(true);
        setInterviewStarted(false);
        setAiSpeaking(false);
        setUserCanSpeak(false);
        cleanup();

        // Add completion message
        setConversation(prev => [...prev, {
            id: Date.now(),
            type: 'ai',
            text: 'Thank you for completing the interview! I\'m now analyzing your responses and will provide detailed feedback shortly.',
            timestamp: new Date()
        }]);

        // Evaluate answers
        evaluateAnswers();
    };

    // Evaluate answers
    const evaluateAnswers = async () => {
        setEvaluationLoading(true);
        setError(null);

        try {
            // Validate we have the required data
            if (!companyName.trim() || !jobDescription.trim()) {
                throw new Error("Company name and job description are required for evaluation.");
            }

            if (!mockInterviewQuestions || mockInterviewQuestions.length === 0) {
                throw new Error("No interview questions available for evaluation.");
            }

            const questionAnswers = mockInterviewQuestions.map((question, index) => {
                const answer = userAnswers[index];
                
                // Ensure all values are clean strings
                const cleanedAnswer = {
                    question_text: String(question.question_text || "").trim(),
                    difficulty_level: String(question.difficulty_level || "medium").trim(),
                    user_answer: String(answer || "").trim()
                };

                // Validate that we have the required fields
                if (!cleanedAnswer.question_text) {
                    throw new Error(`Question ${index + 1} is missing question text`);
                }

                return cleanedAnswer;
            });

            // Final validation of the request data
            const requestData = {
                    company_name: companyName.trim(),
                    job_description: jobDescription.trim(),
                    question_answers: questionAnswers
            };

            // Ensure no field is empty
            if (!requestData.company_name) {
                throw new Error("Company name cannot be empty");
            }
            if (!requestData.job_description) {
                throw new Error("Job description cannot be empty");
            }
            if (requestData.question_answers.length === 0) {
                throw new Error("No questions to evaluate");
            }

            console.log("Sending evaluation request with data:", requestData);

            const response = await authService.makeAuthenticatedRequest('/evaluate_interview_answers/', {
                method: 'POST',
                body: JSON.stringify(requestData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Evaluation API error:", response.status, errorData);
                
                if (response.status === 400) {
                    throw new Error("Invalid request data. Please check your interview responses and try again.");
                } else if (response.status === 401) {
                    throw new Error("Authentication failed. Please refresh the page and try again.");
                } else if (response.status === 500) {
                    throw new Error("Server error during evaluation. Please try again later.");
                } else {
                    throw new Error(errorData.error || errorData.detail || `Request failed with status ${response.status}`);
                }
            }

            const data = await response.json();
            console.log("Evaluation response received:", data);
            
            setAnswerEvaluations(data.evaluations || []);
            setOverallSummary(data.overall_summary || null);

        } catch (e) {
            console.error("Failed to evaluate answers:", e);
            setError(e.message || "Failed to evaluate your answers. You can still review your responses below.");
        } finally {
            setEvaluationLoading(false);
        }
    };

    // Reset interview
    const resetInterview = () => {
        cleanup();
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
        setConversation([]);
        setCurrentTranscript('');
        setShowTextInput(false);
        setTextAnswer('');
        setError(null);
    };

    const currentQuestion = mockInterviewQuestions[currentQuestionIndex];

    useEffect(() => {
        if (videoRef.current && webcamStream) {
            videoRef.current.srcObject = webcamStream;
        }
    }, [webcamStream]);

    return (
        <div className="voice-interview-container">
            <div className="interview-header">
                <h2>🎤 AI Voice Interview</h2>
                <p className="subtitle">Interactive voice-based interview with real-time conversation</p>
            </div>

            {!interviewStarted && !interviewFinished && (
                <div className="interview-setup">
                    {planContext && (
                        <div className="prefill-notification">
                            <div className="prefill-icon">🎯</div>
                            <div className="prefill-content">
                                <h4>Interview Ready from Preparation Plan!</h4>
                                <p>
                                    Based on your "{planContext.planName}" plan covering {planContext.skillAreas?.length || 0} skill areas. 
                                    Progress: {planContext.completedTopics || 0}/{planContext.totalTopics || 0} topics ({Math.round(planContext.progressPercentage || 0)}% complete).
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <div className="setup-form">
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
                                placeholder="Paste the complete job description here..."
                                rows="6"
                            required
                        />
                    </div>
                        <div className="browser-check">
                            <p>📋 <strong>Requirements:</strong></p>
                            <ul>
                                <li>✅ Chrome, Edge, or Safari browser (for speech recognition)</li>
                                <li>🎥 Camera access (for video)</li>
                                <li>🎙️ Microphone access (for voice recording)</li>
                                <li>🔒 HTTPS connection (required for voice features)</li>
                                <li>🌐 Stable internet connection (for speech processing)</li>
                            </ul>
                            <p className="note">
                                <strong>Note:</strong> If voice recognition doesn't work, you can always use the text input option during the interview.
                            </p>
                    </div>
                    <button 
                            className="start-voice-interview-btn" 
                        onClick={startMockInterview} 
                        disabled={loading}
                    >
                            {loading ? '🔄 Setting up Interview...' : '🚀 Start Voice Interview'}
                    </button>
                    {error && <div className="error-message">{error}</div>}
                    </div>
                </div>
            )}

            {interviewStarted && (
                <div className="voice-interview-session">
                    <div className="interview-main">
                        {/* Left side - Video feeds */}
                        <div className="video-section">
                            {/* <div className="user-video">
                                <div className="video-container">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="webcam-feed"
                                        width={320}
                                        height={240}
                                    />
                                    <div className="video-label">You</div>
                                    {isRecording && (
                                        <div className="recording-indicator">
                                            🔴 Recording
                                        </div>
                                    )}
                                </div>
                            </div> */}
                            
                            <div className="ai-video">
                                <div className="ai-interviewer">
                                    <div className={`ai-avatar ${aiSpeaking ? 'speaking' : ''}`}>
                                        <div className="ai-face">
                                            <div className="ai-eyes">
                                                <div className="eye left-eye"></div>
                                                <div className="eye right-eye"></div>
                                            </div>
                                            <div className="ai-mouth"></div>
                                        </div>
                                        {aiSpeaking && (
                                            <div className="sound-waves">
                                                <div className="wave"></div>
                                                <div className="wave"></div>
                                                <div className="wave"></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="video-label">AI Interviewer</div>
                                    {aiSpeaking && (
                                        <div className="speaking-indicator">
                                            🗣️ Speaking
                                        </div>
                                    )}
                                </div>
                    </div>

                            <div className="interview-controls">
                                <div className="progress-info">
                                    Question {currentQuestionIndex + 1} of {mockInterviewQuestions.length}
                    </div>
                    
                                {userCanSpeak && !showTextInput && (
                                    <div className="voice-controls">
                                        {!isRecording && (
                                            <button 
                                                className="record-btn start-recording"
                                                onClick={startRecording}
                                            >
                                                🎙️ Start Voice Recording
                                            </button>
                                        )}
                                        
                                        {isRecording && (
                                            <button 
                                                className="record-btn stop-recording"
                                                onClick={stopRecording}
                                            >
                                                ⏹️ Stop Recording
                                            </button>
                                        )}
                                        
                                        <button 
                                            className="toggle-input-btn"
                                            onClick={toggleInputMode}
                                        >
                                            ⌨️ Use Text Input Instead
                                        </button>
                                    </div>
                                )}

                                {userCanSpeak && showTextInput && (
                                    <div className="text-input-controls">
                                        <textarea
                                            className="text-answer-input"
                                            value={textAnswer}
                                            onChange={(e) => setTextAnswer(e.target.value)}
                                            placeholder="Type your answer here..."
                                            rows="4"
                                        />
                                        <div className="text-input-buttons">
                                            <button 
                                                className="submit-text-btn"
                                                onClick={handleTextSubmit}
                                                disabled={!textAnswer.trim()}
                                            >
                                                ✅ Submit Answer
                                            </button>
                            <button 
                                                className="toggle-input-btn"
                                                onClick={toggleInputMode}
                            >
                                                🎙️ Try Voice Instead
                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                {!userCanSpeak && !aiSpeaking && (
                                    <div className="waiting-indicator">
                                        <div className="spinner"></div>
                                        Processing...
                                    </div>
                                )}

                                {currentTranscript && !showTextInput && (
                                    <div className="live-transcript">
                                        <strong>You're saying:</strong> "{currentTranscript}"
                                    </div>
                                )}

                                {error && (
                                    <div className="error-message">
                                        {error}
                                    </div>
                            )}
                        </div>
                        </div>

                        {/* Right side - Conversation */}
                        <div className="conversation-section">
                            <div className="conversation-header">
                                <h3>💬 Interview Conversation</h3>
                                <div className="interview-status">
                                    {aiSpeaking && <span className="status-ai">🤖 AI Speaking</span>}
                                    {userCanSpeak && <span className="status-user">🎙️ Your Turn</span>}
                                    {isListening && <span className="status-listening">👂 Listening</span>}
                        </div>
                    </div>

                            <div className="conversation-messages">
                                {conversation.map((message) => (
                                    <div 
                                        key={message.id} 
                                        className={`message ${message.type}`}
                                    >
                                        <div className="message-header">
                                            <span className="sender">
                                                {message.type === 'ai' ? '🤖 AI Interviewer' : 
                                                 message.type === 'user' ? '👤 You' : '📋 System'}
                                            </span>
                                            <span className="timestamp">
                                                {message.timestamp.toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className="message-content">
                                            {message.questionNumber && (
                                                <div className="question-number">
                                                    Question {message.questionNumber}
                                                </div>
                                            )}
                                            <p>{message.text}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={conversationEndRef} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {interviewFinished && (
                <div className="interview-results">
                    <h3>🎉 Voice Interview Complete!</h3>
                    
                    {evaluationLoading && (
                        <div className="evaluation-loading">
                            <div className="loading-spinner">🤖</div>
                            <p>AI is analyzing your voice responses...</p>
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
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Rest of evaluation display remains the same */}
                    {!evaluationLoading && answerEvaluations.length > 0 && (
                        <>
                            <h4>📝 Detailed Answer Analysis:</h4>
                            <div className="answers-evaluation">
                                {answerEvaluations.map((evaluation, idx) => (
                                    <div key={idx} className="evaluation-item">
                                        <div className="evaluation-header">
                                            <div className="question-info">
                                                <span className="question-number">Q{idx + 1}</span>
                                            </div>
                                            <div className="score-badge">
                                                <span className="score">{evaluation.score}/10</span>
                                            </div>
                                        </div>
                                        
                                        <div className="question-text-eval">
                                            <strong>Question:</strong> {evaluation.question_text}
                                        </div>
                                        
                                        <div className="user-answer-eval">
                                            <strong>Your Voice Answer:</strong>
                                            <p className="answer-text">
                                                {evaluation.user_answer || "No answer provided"}
                                            </p>
                                        </div>

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
                    
                    <div className="next-steps">
                        <h4>🚀 Voice Interview Tips:</h4>
                        <ul>
                            <li>Practice speaking clearly and at a moderate pace</li>
                            <li>Use the STAR method when answering behavioral questions</li>
                            <li>Maintain good posture and eye contact with the camera</li>
                            <li>Practice in a quiet environment to improve speech recognition</li>
                            <li>Take pauses to collect your thoughts - it's natural in interviews</li>
                        </ul>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="action-buttons">
                        <button 
                            className="new-interview-btn"
                            onClick={resetInterview}
                        >
                            🔄 Start New Voice Interview
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MockInterviews;