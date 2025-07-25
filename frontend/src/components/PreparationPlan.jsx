import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import './PreparationPlan.css'; // Will create this CSS file
import authService from '../services/authService';

const PreparationPlan = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [academicDetails, setAcademicDetails] = useState('');
    const [preferredRole, setPreferredRole] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [inputType, setInputType] = useState('role'); // 'role' or 'job_description'
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [completedTopics, setCompletedTopics] = useState(new Set());
    
    // New states for plan management
    const [planName, setPlanName] = useState('');
    const [savedPlans, setSavedPlans] = useState([]);
    const [showPlansList, setShowPlansList] = useState(false);
    const [currentPlanId, setCurrentPlanId] = useState(null);
    
    // AI Topic Explainer states
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [currentAiTopic, setCurrentAiTopic] = useState(null);
    const [aiExplanation, setAiExplanation] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);

    // Handle prefilled data from CompanyList navigation
    useEffect(() => {
        if (location.state?.prefillData) {
            const { jobDescription: prefillJobDesc, companyName, jobTitle, jobLocation, inputType: prefillInputType } = location.state.prefillData;
            
            setJobDescription(prefillJobDesc);
            setInputType(prefillInputType || 'job_description');
            
            // Set a default plan name based on the job
            if (companyName && jobTitle) {
                setPlanName(`${jobTitle} at ${companyName}`);
            }
            
            // Clear the navigation state to prevent re-prefilling on re-renders
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Load saved plans on component mount
    useEffect(() => {
        loadSavedPlans();
    }, []);

    // Load progress when plan changes
    useEffect(() => {
        if (plan && currentPlanId) {
            loadPlanProgress();
        }
    }, [plan, currentPlanId]);

    const loadSavedPlans = async () => {
        try {
            const response = await authService.makeAuthenticatedRequest(`/user_plans/`);
            if (response.ok) {
                const data = await response.json();
                setSavedPlans(data.plans || []);
            }
        } catch (error) {
            console.error('Failed to load saved plans:', error);
        }
    };

    const loadPlanProgress = async () => {
        if (!currentPlanId) return;
        
        try {
            const response = await authService.makeAuthenticatedRequest(`/plan/${currentPlanId}/`);
            if (response.ok) {
                const data = await response.json();
                // Update completed topics based on progress data
                const completed = new Set();
                data.progress_details?.forEach(progress => {
                    if (progress.is_completed) {
                        completed.add(progress.topic_name);
                    }
                });
                setCompletedTopics(completed);
            }
        } catch (error) {
            console.error('Failed to load plan progress:', error);
        }
    };

    const loadSavedPlan = async (planId) => {
        setLoading(true);
        try {
            const response = await authService.makeAuthenticatedRequest(`/plan/${planId}/`);
            if (response.ok) {
                const data = await response.json();
                setPlan(data);
                setCurrentPlanId(planId);
                setPlanName(data.plan_name);
                setAcademicDetails(data.academic_details);
                
                if (data.input_type === 'role') {
                    setInputType('role');
                    setPreferredRole(data.preferred_role || '');
                    setJobDescription('');
                } else {
                    setInputType('job_description');
                    setJobDescription(data.job_description || '');
                    setPreferredRole('');
                }
                
                setShowPlansList(false);
                setError(null);
            } else {
                setError('Failed to load saved plan');
            }
        } catch (error) {
            console.error('Failed to load saved plan:', error);
            setError('Failed to load saved plan');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setPlan(null); // Clear any previous plan
        setCurrentPlanId(null);
        setCompletedTopics(new Set()); // Reset progress for new plan

        try {
            const requestBody = {
                academic_course_details: academicDetails,
                plan_name: planName.trim() || `Plan for ${inputType === 'role' ? preferredRole : 'Job Application'} - ${new Date().toLocaleDateString()}`
            };
            
            if (inputType === 'role') {
                requestBody.preferred_role = preferredRole;
            } else {
                requestBody.job_description = jobDescription;
            }

            const response = await authService.makeAuthenticatedRequest(`/generate_prep_plan/`, {
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
            setCurrentPlanId(data.plan_id);
            
            // Reload saved plans list
            loadSavedPlans();
        } catch (e) {
            console.error("Failed to generate plan:", e);
            setError(e.message || "Failed to generate plan. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const toggleTopicCompletion = async (topicName, sectionName) => {
        if (!currentPlanId) {
            // Fallback to local state if no plan is saved
            const newCompleted = new Set(completedTopics);
            if (newCompleted.has(topicName)) {
                newCompleted.delete(topicName);
            } else {
                newCompleted.add(topicName);
            }
            setCompletedTopics(newCompleted);
            return;
        }

        const isCurrentlyCompleted = completedTopics.has(topicName);
        
        try {
            const response = await authService.makeAuthenticatedRequest(`/update_progress/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    plan_id: currentPlanId,
                    section_name: sectionName,
                    topic_name: topicName,
                    is_completed: !isCurrentlyCompleted
                }),
            });

            if (response.ok) {
                // Update local state
                const newCompleted = new Set(completedTopics);
                if (isCurrentlyCompleted) {
                    newCompleted.delete(topicName);
                } else {
                    newCompleted.add(topicName);
                }
                setCompletedTopics(newCompleted);
                
                // Reload saved plans to update progress percentage
                loadSavedPlans();
            } else {
                console.error('Failed to update progress');
            }
        } catch (error) {
            console.error('Error updating progress:', error);
        }
    };

    const getCompletionPercentage = () => {
        if (!plan || !plan.sections) return 0;
        const totalTopics = plan.sections.reduce((acc, section) => acc + section.topics.length, 0);
        return totalTopics > 0 ? Math.round((completedTopics.size / totalTopics) * 100) : 0;
    };

    const deletePlan = async (planId) => {
        if (!window.confirm('Are you sure you want to delete this plan?')) return;
        
        try {
            const response = await authService.makeAuthenticatedRequest(`/delete_plan/${planId}/`, {
                method: 'DELETE',
            });

            if (response.ok) {
                // Remove from saved plans list
                setSavedPlans(savedPlans.filter(p => p.id !== planId));
                
                // If current plan is deleted, clear it
                if (currentPlanId === planId) {
                    setPlan(null);
                    setCurrentPlanId(null);
                    setCompletedTopics(new Set());
                }
            } else {
                console.error('Failed to delete plan');
            }
        } catch (error) {
            console.error('Error deleting plan:', error);
        }
    };

    const createNewPlan = () => {
        setPlan(null);
        setCurrentPlanId(null);
        setAcademicDetails('');
        setPreferredRole('');
        setJobDescription('');
        setPlanName('');
        setInputType('role');
        setCompletedTopics(new Set());
        setShowPlansList(false);
        setError(null);
    };

    const handleAskAI = async (topic, skillContext) => {
        setCurrentAiTopic({ ...topic, skillContext });
        setAiModalOpen(true);
        setAiLoading(true);
        setAiError(null);
        setAiExplanation('');

        try {
            const response = await authService.makeAuthenticatedRequest('/ai_topic_explainer/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic_name: topic.name,
                    topic_description: topic.description || '',
                    skill_context: skillContext,
                    user_level: 'intermediate' // Could be made dynamic based on user preference
                })
            });

            if (response.ok) {
                const data = await response.json();
                setAiExplanation(data.explanation);
            } else {
                const errorData = await response.json();
                setAiError(errorData.error || 'Failed to generate explanation');
            }
        } catch (error) {
            console.error('Error getting AI explanation:', error);
            setAiError('Failed to connect to AI service. Please try again.');
        } finally {
            setAiLoading(false);
        }
    };

    const closeAiModal = () => {
        setAiModalOpen(false);
        setCurrentAiTopic(null);
        setAiExplanation('');
        setAiError(null);
    };

    const handleMockInterview = (planData) => {
        // Create a comprehensive job description from the plan data
        let interviewJobDescription = '';
        
        if (planData.input_type === 'role' && planData.preferred_role) {
            // For role-based plans, create a generic job description
            interviewJobDescription = `Position: ${planData.preferred_role}
Company: Various Companies
Location: Remote/On-site

Job Description:
We are looking for a qualified ${planData.preferred_role} to join our team. This role requires expertise in the following areas:

Key Skills Required:
${planData.sections ? planData.sections.map(section => `• ${section.skill}`).join('\n') : ''}

Academic Background:
${planData.academic_details || 'Relevant degree and experience required'}

Plan Focus Areas:
${planData.sections ? planData.sections.map(section => 
    `• ${section.skill}: ${section.topics?.length || 0} topics to master`
).join('\n') : ''}`;
        } else if (planData.job_description) {
            // For job description-based plans, use the original job description
            interviewJobDescription = planData.job_description;
        } else {
            // Fallback for plans without detailed job info
            interviewJobDescription = `Interview Preparation for: ${planData.plan_name}

This mock interview is based on your preparation plan focusing on:
${planData.sections ? planData.sections.map(section => `• ${section.skill}`).join('\n') : ''}

Academic Background: ${planData.academic_details || 'As per your preparation plan'}`;
        }

        // Navigate to mock interview page with pre-filled data
        navigate('/mock-interviews', {
            state: {
                prefillData: {
                    companyName: planData.plan_name.includes(' at ') ? 
                        planData.plan_name.split(' at ')[1] : 'Various Companies',
                    jobDescription: interviewJobDescription,
                    planContext: {
                        planName: planData.plan_name,
                        skillAreas: planData.sections?.map(s => s.skill) || [],
                        totalTopics: planData.total_topics || 0,
                        completedTopics: planData.completed_topics || 0,
                        progressPercentage: planData.progress_percentage || 0
                    }
                }
            }
        });
    };

    return (
        <div className="container">
            <div className="plan-header-section">
                <h2>🎯 Personalized Preparation Plan</h2>
                <div className="plan-management-buttons">
                    <button 
                        type="button" 
                        className="management-btn"
                        onClick={() => setShowPlansList(!showPlansList)}
                        style={{backgroundColor:"black"}}
                    >
                        📋 My Plans ({savedPlans.length})
                    </button>
                    <button 
                        type="button" 
                        className="management-btn create-new"
                        onClick={createNewPlan}
                    >
                        ➕ Create New Plan
                    </button>
                </div>
            </div>

            {showPlansList && (
                <div className="saved-plans-list">
                    <h3>📚 Your Saved Plans</h3>
                    {savedPlans.length === 0 ? (
                        <p className="no-plans">No saved plans yet. Create your first plan below!</p>
                    ) : (
                        <div className="plans-grid">
                            {savedPlans.map((savedPlan) => (
                                <div key={savedPlan.id} className="plan-card">
                                    <div className="plan-card-header">
                                        <h4>{savedPlan.plan_name}</h4>
                                        <div className="plan-actions">
                                            <button
                                                className="load-plan-btn"
                                                onClick={() => loadSavedPlan(savedPlan.id)}
                                            >
                                                📖 view
                                            </button>
                                            <button
                                                className="delete-plan-btn"
                                                onClick={() => deletePlan(savedPlan.id)}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                    <div className="plan-card-info">
                                        <p className="plan-summary">{savedPlan.summary}</p>
                                        <div className="plan-stats">
                                            <span className="progress-stat">
                                                Progress: {Math.round(savedPlan.progress_percentage)}%
                                            </span>
                                            <span className="topics-stat">
                                                {savedPlan.completed_topics}/{savedPlan.total_topics} topics
                                            </span>
                                        </div>
                                        <div className="plan-meta">
                                            <span>Created: {new Date(savedPlan.created_at).toLocaleDateString()}</span>
                                            {savedPlan.preferred_role && <span>Role: {savedPlan.preferred_role}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!showPlansList && !currentPlanId && (
                <>
                    {location.state?.prefillData && (
                        <div className="prefill-notification">
                            <div className="prefill-icon">🎯</div>
                            <div className="prefill-content">
                                <h4>Job Details Pre-filled!</h4>
                                <p>We've automatically filled in the job description from your selected position. You can modify it as needed.</p>
                            </div>
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="prep-form">
                        <div className="form-group">
                            <label htmlFor="planName">📝 Plan Name (Optional):</label>
                            <input
                                type="text"
                                id="planName"
                                value={planName}
                                onChange={(e) => setPlanName(e.target.value)}
                                placeholder="e.g., Software Engineer at Google, Data Science Prep, etc."
                            />
                        </div>

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
                </>
            )}

            {/* Show saved plan header when viewing a loaded plan */}
            {!showPlansList && currentPlanId && plan && (
                <div className="saved-plan-header">
                    <div className="saved-plan-info">
                        <h3>📖 {plan.plan_name || 'Viewing Saved Plan'}</h3>
                        <div className="saved-plan-meta">
                            <span>Created: {new Date(plan.created_at).toLocaleDateString()}</span>
                            <span>Progress: {Math.round(plan.progress_percentage || 0)}%</span>
                        </div>
                    </div>
              
                </div>
            )}

            {/* Plan output - shows for both new and loaded plans */}
            {!showPlansList && plan && (
                        <div className="plan-output">
                            <div className="plan-header">
                                <div className="plan-title-section">
                                    <h3>🚀 Your Learning Roadmap</h3>
                                    <button
                                        className="mock-interview-btn"
                                        onClick={() => handleMockInterview(plan)}
                                        title="Start a mock interview based on this preparation plan"
                                    >
                                        🎤 Take Mock Interview
                                    </button>
                                </div>
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
                                                                onClick={() => toggleTopicCompletion(topic.name, section.skill)}
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
                                                            <button
                                                                className="ask-ai-btn"
                                                                onClick={() => handleAskAI(topic, section.skill)}
                                                                title="Get AI explanation of this topic"
                                                            >
                                                                🤖 Ask AI
                                                            </button>
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

            {/* AI Topic Explanation Modal */}
            {aiModalOpen && (
                <div className="ai-modal-overlay" onClick={closeAiModal}>
                    <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ai-modal-header">
                            <h3>🤖 AI Explanation: {currentAiTopic?.name}</h3>
                            <button className="ai-modal-close" onClick={closeAiModal}>✕</button>
                        </div>
                        
                        <div className="ai-modal-content">
                            {aiLoading && (
                                <div className="ai-loading">
                                    <div className="ai-spinner"></div>
                                    <p>Generating explanation...</p>
                                </div>
                            )}
                            
                            {aiError && (
                                <div className="ai-error">
                                    <p>❌ {aiError}</p>
                                    <button 
                                        className="retry-btn"
                                        onClick={() => handleAskAI(currentAiTopic, currentAiTopic.skillContext)}
                                    >
                                        🔄 Try Again
                                    </button>
                                </div>
                            )}
                            
                            {aiExplanation && (
                                <div className="ai-explanation">
                                    <div className="topic-context">
                                        <strong>Skill Area:</strong> {currentAiTopic?.skillContext}
                                    </div>
                                    <div className="explanation-content" style={{textAlign:"left"}}>
                                        <ReactMarkdown>{aiExplanation}</ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="ai-modal-footer">
                            <button className="close-modal-btn" onClick={closeAiModal}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PreparationPlan;