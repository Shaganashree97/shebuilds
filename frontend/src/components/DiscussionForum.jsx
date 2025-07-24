import React, { useState, useEffect } from 'react';
import './DiscussionForum.css';

// Component to display a single topic's details and its posts
const TopicDetail = ({ topic, onBackToList, onNewPost }) => {
    const [newPostContent, setNewPostContent] = useState('');
    const [postLoading, setPostLoading] = useState(false);
    const [postError, setPostError] = useState(null);

    const API_BASE_URL = 'http://localhost:8000/api';

    const handlePostSubmit = async (e) => {
        e.preventDefault();
        setPostLoading(true);
        setPostError(null);

        if (!newPostContent.trim()) {
            setPostError("Post content cannot be empty.");
            setPostLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/discussion_topics/${topic.id}/posts/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newPostContent, author_name: 'Frontend User' }), // 'Frontend User' as dummy author
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.content || `HTTP error! status: ${response.status}`);
            }

            setNewPostContent(''); // Clear input
            onNewPost(); // Callback to parent to refresh topic details
        } catch (e) {
            console.error("Failed to post:", e);
            setPostError(e.message || "Failed to add post. Please try again.");
        } finally {
            setPostLoading(false);
        }
    };

    return (
        <div className="topic-detail">
            <button onClick={onBackToList} className="back-button">← Back to Topics</button>
            <h3>{topic.title}</h3>
            <p className="topic-meta">By {topic.author_name} on {new Date(topic.created_at).toLocaleString()}
                {topic.related_skill_name && <span> | Skill: {topic.related_skill_name}</span>}
                {topic.related_company_name && <span> | Company: {topic.related_company_name}</span>}
            </p>

            <h4>Posts:</h4>
            {topic.posts && topic.posts.length > 0 ? (
                <div className="posts-list">
                    {topic.posts.map(post => (
                        <div key={post.id} className="post-item">
                            <p className="post-content">{post.content}</p>
                            <p className="post-meta">By {post.author_name} on {new Date(post.created_at).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p>No posts yet. Be the first to reply!</p>
            )}

            <div className="new-post-form">
                <h4>Add a New Post:</h4>
                <form onSubmit={handlePostSubmit}>
                    <textarea
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder="Type your reply here..."
                        rows="4"
                        required
                    ></textarea>
                    <button type="submit" disabled={postLoading}>
                        {postLoading ? 'Posting...' : 'Post Reply'}
                    </button>
                    {postError && <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>Error: {postError}</div>}
                </form>
            </div>
        </div>
    );
};


// Main DiscussionForum component to list topics and handle navigation
const DiscussionForum = () => {
    const [topics, setTopics] = useState([]);
    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [newTopicAuthor, setNewTopicAuthor] = useState('Anonymous');
    const [selectedTopic, setSelectedTopic] = useState(null); // State to hold the currently selected topic for detail view
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState(null);

    const API_BASE_URL = 'http://localhost:8000/api';

    // Fetch all discussion topics
    const fetchTopics = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/discussion_topics/`);
            if (!response.ok) throw new Error('Failed to fetch topics.');
            const data = await response.json();
            setTopics(data);
        } catch (e) {
            console.error("Error fetching topics:", e);
            setError(e.message || "Failed to load topics. Please ensure backend is running and data exists.");
        } finally {
            setLoading(false);
        }
    };

    // Fetch a single topic's details including its posts
    const fetchTopicDetails = async (topicId) => {
        setLoading(true); // Indicate loading for topic detail
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/discussion_topics/${topicId}/`);
            if (!response.ok) throw new Error('Failed to fetch topic details.');
            const data = await response.json();
            setSelectedTopic(data);
        } catch (e) {
            console.error("Error fetching topic details:", e);
            setError(e.message || "Failed to load topic details.");
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch of topics when component mounts
    useEffect(() => {
        fetchTopics();
    }, []);

    // Handler for creating a new discussion topic
    const handleNewTopicSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        if (!newTopicTitle.trim()) {
            setFormError("Topic title cannot be empty.");
            setFormLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/discussion_topics/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTopicTitle,
                    author_name: newTopicAuthor.trim() || 'Anonymous', // Use 'Anonymous' if empty
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.title || `HTTP error! status: ${response.status}`);
            }

            setNewTopicTitle(''); // Clear input
            setNewTopicAuthor('Anonymous'); // Reset author
            fetchTopics(); // Refresh the list of topics
        } catch (e) {
            console.error("Failed to create topic:", e);
            setFormError(e.message || "Failed to create topic. Please try again.");
        } finally {
            setFormLoading(false);
        }
    };

    // Callback to refresh topic details after a new post is added
    const handleNewPostAdded = () => {
        if (selectedTopic) {
            fetchTopicDetails(selectedTopic.id);
        }
    };

    // Render loading/error states
    if (loading && !selectedTopic) return <div className="container">Loading discussion topics...</div>;
    if (error) return <div className="container error-message">Error: {error}</div>;

    return (
        <div className="container">
            <h2>Collaborative Learning: Discussion Forum</h2>

            {selectedTopic ? (
                // If a topic is selected, display its details
                <TopicDetail
                    topic={selectedTopic}
                    onBackToList={() => { setSelectedTopic(null); fetchTopics(); }} // Go back and refresh list
                    onNewPost={handleNewPostAdded}
                />
            ) : (
                // Otherwise, display the list of topics and the "create new topic" form
                <div className="topic-list-view">
                    <div className="new-topic-form">
                        <h3>Start a New Discussion:</h3>
                        <form onSubmit={handleNewTopicSubmit}>
                            <div className="form-group">
                                <label htmlFor="newTopicTitle">Topic Title:</label>
                                <input
                                    type="text"
                                    id="newTopicTitle"
                                    value={newTopicTitle}
                                    onChange={(e) => setNewTopicTitle(e.target.value)}
                                    placeholder="e.g., How to approach System Design for FAANG?"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="newTopicAuthor">Your Name (optional):</label>
                                <input
                                    type="text"
                                    id="newTopicAuthor"
                                    value={newTopicAuthor}
                                    onChange={(e) => setNewTopicAuthor(e.target.value)}
                                    placeholder="Anonymous"
                                />
                            </div>
                            <button type="submit" disabled={formLoading}>
                                {formLoading ? 'Creating...' : 'Create Topic'}
                            </button>
                            {formError && <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>Error: {formError}</div>}
                        </form>
                    </div>

                    <h3>All Discussion Topics:</h3>
                    {topics.length === 0 ? (
                        <p>No discussion topics yet. Be the first to start one!</p>
                    ) : (
                        <div className="topics-grid">
                            {topics.map(topic => (
                                <div key={topic.id} className="topic-card" onClick={() => fetchTopicDetails(topic.id)}>
                                    <h4>{topic.title}</h4>
                                    <p className="topic-meta">By {topic.author_name} on {new Date(topic.created_at).toLocaleDateString()}</p>
                                    <p className="topic-meta">{topic.post_count} {topic.post_count === 1 ? 'post' : 'posts'}</p>
                                    {topic.related_skill_name && <span className="topic-tag skill-tag">{topic.related_skill_name}</span>}
                                    {topic.related_company_name && <span className="topic-tag company-tag">{topic.related_company_name}</span>}
                                    <button className="view-topic-button">View Discussion →</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DiscussionForum;