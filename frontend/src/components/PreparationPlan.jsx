import React, { useState } from 'react';
import './PreparationPlan.css'; // Will create this CSS file

const PreparationPlan = () => {
    const [academicDetails, setAcademicDetails] = useState('');
    const [preferredRole, setPreferredRole] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [inputType, setInputType] = useState('role'); // 'role' or 'job_description'
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [completedTopics, setCompletedTopics] = useState(new Set());

    const API_BASE_URL = 'http://localhost:8000/api'; // Your Django API base URL

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setPlan(null); // Clear any previous plan

        try {
            const requestBody = {
                academic_course_details: academicDetails,
            };
            
            if (inputType === 'role') {
                requestBody.preferred_role = preferredRole;
            } else {
                requestBody.job_description = jobDescription;
            }

            const response = await fetch(`${API_BASE_URL}/generate_prep_plan/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json(); // Attempt to read error message from backend
                throw new Error(errorData.detail || errorData.preferred_role || errorData.job_description || errorData.academic_course_details || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setPlan(data);
        } catch (e) {
            console.error("Failed to generate plan:", e);
            setError(e.message || "Failed to generate plan. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const toggleTopicCompletion = (topicName) => {
        const newCompleted = new Set(completedTopics);
        if (newCompleted.has(topicName)) {
            newCompleted.delete(topicName);
        } else {
            newCompleted.add(topicName);
        }
        setCompletedTopics(newCompleted);
    };

    const getCompletionPercentage = () => {
        if (!plan || !plan.sections) return 0;
        const totalTopics = plan.sections.reduce((acc, section) => acc + section.topics.length, 0);
        return totalTopics > 0 ? Math.round((completedTopics.size / totalTopics) * 100) : 0;
    };

    return (
        <div className="container">
            <h2>🎯 Personalized Preparation Plan</h2>
            <form onSubmit={handleSubmit} className="prep-form">
                <div className="form-group">
                    <label htmlFor="academicDetails">📚 Your Academic Details:</label>
                    <textarea
                        id="academicDetails"
                        value={academicDetails}
                        onChange={(e) => setAcademicDetails(e.target.value)}
                        rows="4"
                        placeholder="e.g., 3rd year Computer Science student, currently learning Data Structures and Algorithms, familiar with Python and C++, completed Database Management course..."
                        required
                    ></textarea>
                </div>

                <div className="input-toggle">
                    <div className="toggle-buttons">
                        <button
                            type="button"
                            className={`toggle-btn ${inputType === 'role' ? 'active' : ''}`}
                            onClick={() => setInputType('role')}
                        >
                            🎯 Target Role
                        </button>
                        <button
                            type="button"
                            className={`toggle-btn ${inputType === 'job_description' ? 'active' : ''}`}
                            onClick={() => setInputType('job_description')}
                        >
                            📋 Job Description
                        </button>
                    </div>
                </div>

                {inputType === 'role' ? (
                    <div className="form-group">
                        <label htmlFor="preferredRole">🎯 Preferred Role:</label>
                        <input
                            type="text"
                            id="preferredRole"
                            value={preferredRole}
                            onChange={(e) => setPreferredRole(e.target.value)}
                            placeholder="e.g., Software Engineer, Data Analyst, Frontend Developer"
                            required
                        />
                    </div>
                ) : (
                    <div className="form-group">
                        <label htmlFor="jobDescription">📋 Company Job Description:</label>
                        <textarea
                            id="jobDescription"
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            rows="6"
                            placeholder="Paste the complete job description here, including requirements, responsibilities, and preferred qualifications..."
                            required
                        ></textarea>
                    </div>
                )}

                <button type="submit" disabled={loading} className="generate-btn">
                    {loading ? (
                        <>
                            <span className="spinner"></span>
                            Generating Plan...
                        </>
                    ) : (
                        <>
                            ✨ Generate AI-Powered Plan
                        </>
                    )}
                </button>
            </form>

            {error && <div className="error-message" style={{ color: 'red', marginTop: '20px' }}>Error: {error}</div>}

            {plan && (
                <div className="plan-output">
                    <div className="plan-header">
                        <h3>🚀 Your Learning Roadmap</h3>
                        <div className="progress-circle">
                            <div className="progress-text">{getCompletionPercentage()}%</div>
                            <svg className="progress-svg" viewBox="0 0 100 100">
                                <circle
                                    className="progress-bg"
                                    cx="50"
                                    cy="50"
                                    r="45"
                                />
                                <circle
                                    className="progress-fill"
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    style={{
                                        strokeDasharray: `${getCompletionPercentage() * 2.827} 282.7`,
                                    }}
                                />
                            </svg>
                        </div>
                    </div>
                    
                    <div className="plan-summary">
                        <p>{plan.summary}</p>
                        {plan.time_estimation && (
                            <div className="time-estimation">
                                <div className="time-badge">
                                    ⏱️ {plan.time_estimation.total_weeks} weeks
                                </div>
                                <div className="time-breakdown">
                                    {plan.time_estimation.breakdown}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Roadmap Timeline */}
                    {plan.roadmap && plan.roadmap.length > 0 && (
                        <div className="roadmap-timeline">
                            <h4>📈 Learning Phases</h4>
                            <div className="timeline">
                                {plan.roadmap.map((phase, index) => (
                                    <div key={index} className="timeline-item">
                                        <div className="timeline-marker">
                                            <span className="phase-number">{index + 1}</span>
                                        </div>
                                        <div className="timeline-content">
                                            <h5>{phase.phase}</h5>
                                            <span className="duration">{phase.duration_weeks} weeks</span>
                                            <div className="phase-skills">
                                                {phase.skills && phase.skills.slice(0, 3).map((skill, skillIndex) => (
                                                    <span key={skillIndex} className="skill-tag">{skill.skill}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Skills and Topics */}
                    <div className="skills-grid">
                        {plan.sections.map((section, index) => (
                            <div key={index} className={`skill-card ${section.priority || 'medium'}-priority`}>
                                <div className="skill-header">
                                    <h4>{section.skill}</h4>
                                    {section.priority && (
                                        <span className={`priority-badge ${section.priority}`}>
                                            {section.priority === 'high' && '🔥'}
                                            {section.priority === 'medium' && '⚡'}
                                            {section.priority === 'low' && '📝'}
                                            {section.priority}
                                        </span>
                                    )}
                                </div>
                                
                                {section.topics.length > 0 ? (
                                    <div className="topics-list">
                                        {section.topics.map((topic, tIndex) => (
                                            <div key={tIndex} className={`topic-item ${completedTopics.has(topic.name) ? 'completed' : ''}`}>
                                                <div className="topic-header">
                                                    <button
                                                        className="topic-checkbox"
                                                        onClick={() => toggleTopicCompletion(topic.name)}
                                                    >
                                                        {completedTopics.has(topic.name) ? '✅' : '⭕'}
                                                    </button>
                                                    <div className="topic-info">
                                                        <h6>{topic.name}</h6>
                                                        <p>{topic.description}</p>
                                                        {topic.estimated_hours && (
                                                            <span className="estimated-time">
                                                                ⏳ ~{topic.estimated_hours} hours
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {topic.resources && topic.resources.length > 0 && (
                                                    <div className="resources-grid">
                                                        {topic.resources.map((resource, rIndex) => (
                                                            <a
                                                                key={rIndex}
                                                                href={resource.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="resource-card"
                                                            >
                                                                <div className="resource-icon">
                                                                    {resource.type === 'video' && '🎥'}
                                                                    {resource.type === 'article' && '📰'}
                                                                    {resource.type === 'tutorial' && '📚'}
                                                                    {resource.type === 'course' && '🎓'}
                                                                    {!['video', 'article', 'tutorial', 'course'].includes(resource.type) && '🔗'}
                                                                </div>
                                                                <div className="resource-content">
                                                                    <div className="resource-title">{resource.title}</div>
                                                                    <div className="resource-type">{resource.type}</div>
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="no-topics">
                                        <p>🔍 No specific resources found yet. Try adding more data in the admin panel or contact support.</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PreparationPlan;