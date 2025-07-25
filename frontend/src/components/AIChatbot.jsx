import React, { useState, useRef, useEffect } from 'react';
import './AIChatbot.css';
import authService from '../services/authService';

const API_BASE_URL = 'http://localhost:8000/api';

const AIChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Hi! I'm your AI assistant for Connect & Conquer. I can help you with career preparation, platform features, and answer any questions you have!",
            isBot: true,
            timestamp: new Date()
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0);
            inputRef.current?.focus();
        }
    }, [isOpen]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            text: inputMessage.trim(),
            isBot: false,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const currentUser = authService.getCurrentUser();
            const requestBody = {
                message: userMessage.text
            };

            // Add user context if logged in
            if (currentUser) {
                requestBody.user_id = currentUser.user_id;
            }

            // Use the abstracted API service to send the request with token
            const response = await authService.makeAuthenticatedRequest('/ai_chatbot/', {
                method: 'POST',
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            const botMessage = {
                id: Date.now() + 1,
                text: data.response || "I'm sorry, I couldn't process your request right now.",
                isBot: true,
                timestamp: new Date(),
                error: data.error
            };

            setMessages(prev => [...prev, botMessage]);

            // If chatbot is closed, increment unread count
            if (!isOpen) {
                setUnreadCount(prev => prev + 1);
            }

        } catch (error) {
            console.error('Error sending message to chatbot:', error);
            const errorMessage = {
                id: Date.now() + 1,
                text: "I'm having trouble connecting right now. Please try again later.",
                isBot: true,
                timestamp: new Date(),
                error: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickQuestion = (question) => {
        setInputMessage(question);
        inputRef.current?.focus();
    };

    const quickQuestions = [
        "How do I create a preparation plan?",
        "What features are available?",
        "How does the mock interview work?",
        "How to optimize my resume?",
        "Tell me about discussion forums"
    ];

    const formatTime = (timestamp) => {
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(timestamp);
    };

    return (
        <div className="ai-chatbot">
            {/* Chat Toggle Button */}
            <button 
                className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle AI Assistant"
            >
                {isOpen ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                ) : (
                    <>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                        {unreadCount > 0 && (
                            <span className="unread-badge">{unreadCount}</span>
                        )}
                    </>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className={`chatbot-window ${isOpen ? 'open' : ''}`}>
                    {/* Header */}
                    <div className="chatbot-header">
                        <div className="chatbot-title">
                            <div className="bot-avatar">🤖</div>
                            <div>
                                <h3>AI Assistant</h3>
                                <span className="status">Online</span>
                            </div>
                        </div>
                        <button 
                            className="close-button"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close chat"
                        >
                            ×
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="chatbot-messages">
                        {messages.map((message) => (
                            <div 
                                key={message.id} 
                                className={`message ${message.isBot ? 'bot-message' : 'user-message'}`}
                            >
                                {message.isBot && (
                                    <div className="message-avatar">🤖</div>
                                )}
                                <div className="message-content">
                                    <div className={`message-bubble ${message.error ? 'error' : ''}`}>
                                        {message.text}
                                    </div>
                                    <div className="message-time">
                                        {formatTime(message.timestamp)}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {isLoading && (
                            <div className="message bot-message">
                                <div className="message-avatar">🤖</div>
                                <div className="message-content">
                                    <div className="message-bubble typing">
                                        <div className="typing-indicator">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Questions */}
                    {messages.length <= 1 && (
                        <div className="quick-questions">
                            <p>Quick questions:</p>
                            <div className="question-buttons">
                                {quickQuestions.map((question, index) => (
                                    <button
                                        key={index}
                                        className="question-button"
                                        onClick={() => handleQuickQuestion(question)}
                                    >
                                        {question}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <form className="chatbot-input" onSubmit={handleSendMessage}>
                        <input
                            style={{ color: 'black' }}
                            
                            ref={inputRef}
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Ask me anything about career preparation..."
                            disabled={isLoading}
                            maxLength={500}
                        />
                        <button 
                            type="submit" 
                            disabled={!inputMessage.trim() || isLoading}
                            aria-label="Send message"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
                            </svg>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AIChatbot; 