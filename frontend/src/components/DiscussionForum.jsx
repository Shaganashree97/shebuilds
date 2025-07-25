import React, { useState, useEffect, useRef, useCallback } from 'react';
import './DiscussionForum.css';
import authService from '../services/authService';

const API_BASE_URL = 'http://localhost:8000/api';
const WS_BASE_URL = 'ws://localhost:8000/ws';

// WebSocket Hook for Real-time Communication
const useWebSocket = (url, onMessage) => {
    const ws = useRef(null);
    const onMessageRef = useRef(onMessage);
    const [connectionStatus, setConnectionStatus] = useState('Connecting');
    const [authenticated, setAuthenticated] = useState(false);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 3;

    // Update the ref when onMessage changes
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    const connect = useCallback(() => {
        if (!url) return;

        // Close existing connection if any
        if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
            ws.current.close();
        }

        try {
            // Don't send token in URL to avoid authentication issues
            ws.current = new WebSocket(url);

            ws.current.onopen = () => {
                setConnectionStatus('Connected');
                reconnectAttemptsRef.current = 0;
                console.log('WebSocket connected:', url);
            };

            ws.current.onclose = (event) => {
                setConnectionStatus('Disconnected');
                console.log('WebSocket disconnected:', url, event.code);
                
                // Attempt to reconnect if not manually closed
                if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
                    reconnectAttemptsRef.current += 1;
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log(`Reconnecting... Attempt ${reconnectAttemptsRef.current}`);
                        connect();
                    }, 2000 * reconnectAttemptsRef.current);
                }
            };

            ws.current.onerror = (error) => {
                setConnectionStatus('Error');
                console.error('WebSocket error - falling back to HTTP polling:', error);
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Handle connection establishment
                    if (data.type === 'connection_established') {
                        setAuthenticated(data.authenticated);
                        return;
                    }
                    
                    // Use the ref to call the latest onMessage callback
                    onMessageRef.current(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            setConnectionStatus('Error');
        }
    }, [url]); // Removed onMessage from dependencies

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (ws.current) {
                ws.current.close(1000); // Normal closure
            }
        };
    }, []);

    const sendMessage = (message) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
            return true;
        }
        return false;
    };

    return { sendMessage, connectionStatus, authenticated };
};

// Real-time Chat Component for Topic Discussion
const TopicChat = ({ topic, onBackToCategory }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [typingUsers, setTypingUsers] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const currentUser = authService.getCurrentUser();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load existing posts as chat messages
    useEffect(() => {
        if (topic.posts) {
            const chatMessages = topic.posts.map(post => ({
                id: post.id,
                post_id: post.id, // Add post_id for deduplication consistency
                type: 'chat_message',
                content: post.content,
                author_name: post.author_name,
                created_at: post.created_at,
                timestamp: post.created_at
            }));
            setMessages(chatMessages);
        }
    }, [topic.posts]);

    const handleWebSocketMessage = (data) => {
        switch (data.type) {
            case 'chat_message':
                // Prevent duplicate messages by checking if message already exists
                setMessages(prev => {
                    const messageExists = prev.some(msg => msg.post_id === data.post_id || msg.id === data.post_id);
                    if (messageExists) {
                        console.log('Duplicate message detected, skipping:', data.post_id);
                        return prev;
                    }
                    return [...prev, data];
                });
                break;
            case 'typing':
                setTypingUsers(prev => {
                    if (data.is_typing) {
                        return prev.includes(data.user) ? prev : [...prev, data.user];
                    } else {
                        return prev.filter(user => user !== data.user);
                    }
                });
                break;
            case 'user_join':
                setOnlineUsers(prev => {
                    const exists = prev.some(user => user.user_id === data.user_id);
                    return exists ? prev : [...prev, { user: data.user, user_id: data.user_id }];
                });
                break;
            case 'user_leave':
                setOnlineUsers(prev => prev.filter(user => user.user_id !== data.user_id));
                break;
            default:
                break;
        }
    };

    const { sendMessage, connectionStatus, authenticated } = useWebSocket(
        `${WS_BASE_URL}/discussion/${topic.id}/`,
        handleWebSocketMessage
    );

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser) return;

        const messageContent = newMessage.trim();
        
        // Try WebSocket first
        const sent = sendMessage({
            type: 'chat_message',
            content: messageContent
        });

        if (sent) {
            // Optimistic UI update for sender (since backend excludes sender from broadcast)
            const optimisticMessage = {
                id: `temp-${Date.now()}`, // Temporary ID
                post_id: `temp-${Date.now()}`, // Use same temp ID for deduplication
                type: 'chat_message',
                content: messageContent,
                author_name: currentUser.first_name || currentUser.username,
                author_id: currentUser.id,
                created_at: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                isOptimistic: true // Flag to identify optimistic messages
            };
            
            setMessages(prev => [...prev, optimisticMessage]);
            setNewMessage('');
            
            // Stop typing notification
            sendMessage({
                type: 'typing',
                is_typing: false
            });
        } else {
            // Fallback to HTTP API if WebSocket fails
            try {
                const response = await authService.makeAuthenticatedRequest(`/discussion_topics/${topic.id}/posts/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        content: messageContent,
                        author_name: currentUser.first_name || currentUser.username
                    })
                });

                if (response.ok) {
                    const newPost = await response.json();
                    // Add message to local state
                    setMessages(prev => [...prev, {
                        id: newPost.id,
                        post_id: newPost.id,
                        type: 'chat_message',
                        content: newPost.content,
                        author_name: newPost.author_name,
                        created_at: newPost.created_at,
                        timestamp: newPost.created_at
                    }]);
                    setNewMessage('');
                } else {
                    console.error('Failed to send message via HTTP');
                }
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        
        if (!currentUser) return;

        // Send typing notification
        sendMessage({
            type: 'typing',
            is_typing: true
        });

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 3 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            sendMessage({
                type: 'typing',
                is_typing: false
            });
        }, 3000);
    };

    const formatMessageTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="topic-chat">
            {/* Chat Header */}
            <div className="chat-header">
                <button onClick={onBackToCategory} className="back-button">
                    ← Back
                </button>
                <div className="topic-info">
                    <h3>{topic.title}</h3>
                    <div className="topic-meta">
                        <span className="category-badge" style={{ backgroundColor: topic.category_color,color:"white" }}>
                            {topic.category_icon} {topic.category_name}
                        </span>
                        <span className={`connection-status status-${connectionStatus.toLowerCase()}`} style={{color:"white"}}>
                            {connectionStatus === 'Connected' ? '🟢 Real-time' : 
                             connectionStatus === 'Error' ? '🟡 HTTP mode' : 
                             '🔴 Connecting...'}
                        </span>
                    </div>
                </div>
                {/* <div className="online-users">
                    <span className="online-count">{onlineUsers.length} online</span>
                    <div className="user-list">
                        {onlineUsers.map(user => (
                            <div key={user.user_id} className="online-user">
                                {user.user}
                            </div>
                        ))}
                    </div>
                </div> */}
            </div>

            {/* Messages Area */}
            <div className="messages-container">
                <div className="messages-list">
                    {messages.map((message, index) => (
                        <div key={`${message.id}-${index}`} className="message-bubble">
                            <div className="message-header">
                                <span className="author-name">{message.author_name}</span>
                                <span className="message-time">
                                    {formatMessageTime(message.created_at || message.timestamp)}
                                </span>
                            </div>
                            <div className="message-content">{message.content}</div>
                        </div>
                    ))}
                    
                    {/* Typing Indicators */}
                    {typingUsers.length > 0 && (
                        <div className="typing-indicator">
                            <div className="typing-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                            <span className="typing-text">
                                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                            </span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Message Input */}
            <div className="message-input-container">
                {!currentUser ? (
                    <div className="login-prompt">
                        <p>Please log in to participate in the discussion</p>
                    </div>
                ) : (
                    <form onSubmit={handleSendMessage} className="message-form">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={handleTyping}
                            placeholder={`Message #${topic.title.toLowerCase().replace(/\s+/g, '-')}`}
                            className="message-input"
                            maxLength={2000}
                        />
                        <button 
                            type="submit" 
                            disabled={!newMessage.trim()}
                            className="send-button"
                            title={connectionStatus === 'Connected' ? 'Send in real-time' : 'Send via HTTP (slower)'}
                        >
                            Send
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

// Forum Category Component
const ForumCategory = ({ category, onSelectTopic }) => {
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreateTopic, setShowCreateTopic] = useState(false);
    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [newTopicContent, setNewTopicContent] = useState('');

    const fetchTopics = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/discussion_topics/?category=${category.id}`);
            if (response.ok) {
                const data = await response.json();
                setTopics(data);
            }
        } catch (error) {
            console.error('Error fetching topics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTopics();
    }, [category.id]);

    const handleCreateTopic = async (e) => {
        e.preventDefault();
        if (!newTopicTitle.trim()) return;

        try {
            const response = await authService.makeAuthenticatedRequest('/discussion_topics/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTopicTitle,
                    content: newTopicContent,
                    category: category.id
                })
            });

            if (response.ok) {
                setNewTopicTitle('');
                setNewTopicContent('');
                setShowCreateTopic(false);
                fetchTopics();
            }
        } catch (error) {
            console.error('Error creating topic:', error);
        }
    };

    return (
        <div className="forum-category">
            <div className="category-header">
                <div className="category-info">
                    <div className="category-title">
                        <span className="category-icon" style={{ color: category.color }}>
                            {category.icon}
                        </span>
                        <h3>{category.name}</h3>
                        <span className="topic-count">{category.topic_count} topics</span>
                    </div>
                    <p className="category-description">{category.description}</p>
                </div>
                <button 
                    onClick={() => setShowCreateTopic(!showCreateTopic)}
                    className="create-topic-btn"
                >
                    ➕ New Topic
                </button>
            </div>

            {/* Create Topic Form */}
            {showCreateTopic && (
                <div className="create-topic-form">
                    <form onSubmit={handleCreateTopic}>
                        <input
                            type="text"
                            value={newTopicTitle}
                            onChange={(e) => setNewTopicTitle(e.target.value)}
                            placeholder="Topic title..."
                            className="topic-title-input"
                            required
                            maxLength={255}
                        />
                        <textarea
                            value={newTopicContent}
                            onChange={(e) => setNewTopicContent(e.target.value)}
                            placeholder="Start the discussion... (optional)"
                            className="topic-content-input"
                            rows={3}
                            maxLength={2000}
                        />
                        <div className="form-actions">
                            <button type="submit" className="submit-btn">Create Topic</button>
                            <button 
                                type="button" 
                                onClick={() => setShowCreateTopic(false)}
                                className="cancel-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Topics List */}
            <div className="topics-list">
                {loading ? (
                    <div className="loading">Loading topics...</div>
                ) : topics.length === 0 ? (
                    <div className="empty-topics">
                        <p>No topics yet. Be the first to start a discussion!</p>
                    </div>
                ) : (
                    topics.map(topic => (
                        <div 
                            key={topic.id} 
                            className={`topic-item ${topic.is_pinned ? 'pinned' : ''} ${topic.is_locked ? 'locked' : ''}`}
                            onClick={() => onSelectTopic(topic)}
                        >
                            <div className="topic-content">
                                <div className="topic-title">
                                    {topic.is_pinned && <span className="pin-icon">📌</span>}
                                    {topic.is_locked && <span className="lock-icon">🔒</span>}
                                    <h4>{topic.title}</h4>
                                </div>
                                <div className="topic-meta">
                                    <span>by {topic.author_name}</span>
                                    <span>{topic.post_count} replies</span>
                                    <span>{topic.view_count} views</span>
                                    {topic.last_post && (
                                        <span>
                                            Last: {topic.last_post.author_name} • {new Date(topic.last_post.created_at).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="topic-arrow">→</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// Main Discussion Forum Component
const DiscussionForum = () => {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCategories = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/forum_categories/`);
            if (!response.ok) throw new Error('Failed to fetch categories');
            const data = await response.json();
            setCategories(data);
            if (data.length > 0 && !selectedCategory) {
                setSelectedCategory(data[0]);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchTopicDetails = async (topicId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/discussion_topics/${topicId}/`);
            if (response.ok) {
                const topicData = await response.json();
                setSelectedTopic(topicData);
            }
        } catch (error) {
            console.error('Error fetching topic details:', error);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSelectTopic = (topic) => {
        fetchTopicDetails(topic.id);
    };

    const handleBackToCategory = () => {
        setSelectedTopic(null);
    };

    if (loading) {
        return (
            <div className="forum-loading">
                <div className="loading-spinner"></div>
                <p>Loading discussion forums...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="forum-error">
                <h3>Error loading forums</h3>
                <p>{error}</p>
                <button onClick={fetchCategories}>Try Again</button>
            </div>
        );
    }

    return (
        <div className="discussion-forum">
            <div className="forum-header">
                <h2>💬 Discussion Forums</h2>
                <p>Connect with peers, share knowledge, and get help with your career preparation</p>
            </div>

            {selectedTopic ? (
                <TopicChat 
                    topic={selectedTopic} 
                    onBackToCategory={handleBackToCategory}
                />
            ) : (
                <div className="forum-content">
                    {/* Category Sidebar */}
                    <div className="category-sidebar">
                        <h3>Categories</h3>
                        <div className="category-list">
                            {categories.map(category => (
                                <div
                                    key={category.id}
                                    className={`category-item ${selectedCategory?.id === category.id ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(category)}
                                >
                                    <span className="category-icon" style={{ color: category.color }}>
                                        {category.icon}
                                    </span>
                                    <div className="category-info">
                                        <span className="category-name">{category.name}</span>
                                        <span className="category-count">{category.topic_count}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="main-content">
                        {selectedCategory ? (
                            <ForumCategory 
                                category={selectedCategory} 
                                onSelectTopic={handleSelectTopic}
                            />
                        ) : (
                            <div className="select-category">
                                <h3>Select a category to view topics</h3>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiscussionForum;