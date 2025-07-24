import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import authService from '../services/authService';

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [analytics, setAnalytics] = useState({
        preparationPlans: [],
        mockInterviews: [],
        overallProgress: 0,
        totalStudyHours: 0,
        completedTopics: 0,
        totalTopics: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUserProfile();
        fetchUserAnalytics();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const currentUser = authService.getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    };

    const fetchUserAnalytics = async () => {
        try {
            // Fetch preparation plans
            const plansResponse = await authService.makeAuthenticatedRequest('/user_plans/');
            if (plansResponse.ok) {
                const plansData = await plansResponse.json();
                
                const plans = plansData.plans || [];
                const totalTopics = plans.reduce((sum, plan) => sum + plan.total_topics, 0);
                const completedTopics = plans.reduce((sum, plan) => sum + plan.completed_topics, 0);
                const overallProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

                setAnalytics(prevAnalytics => ({
                    ...prevAnalytics,
                    preparationPlans: plans,
                    overallProgress,
                    totalTopics,
                    completedTopics,
                    totalStudyHours: plans.length * 25 // Estimated hours per plan
                }));
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const getProgressColor = (percentage) => {
        if (percentage >= 80) return '#10b981'; // Green
        if (percentage >= 60) return '#f59e0b'; // Yellow
        if (percentage >= 40) return '#f97316'; // Orange
        return '#ef4444'; // Red
    };

    const CircularProgress = ({ percentage, size = 120, strokeWidth = 8, color = '#667eea' }) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const strokeDasharray = circumference;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;

        return (
            <div className="circular-progress" style={{ width: size, height: size }}>
                <svg width={size} height={size}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="#e5e7eb"
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                        style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                    />
                </svg>
                <div className="progress-text">
                    <span className="progress-percentage">{percentage}%</span>
                </div>
            </div>
        );
    };

    const ProgressBar = ({ percentage, color = '#667eea', height = 8 }) => (
        <div className="progress-bar-container" style={{ height }}>
            <div 
                className="progress-bar-fill" 
                style={{ 
                    width: `${percentage}%`, 
                    backgroundColor: color,
                    height: '100%'
                }}
            />
        </div>
    );

    if (loading) {
        return (
            <div className="profile-loading">
                <div className="loading-spinner"></div>
                <p>Loading your profile...</p>
            </div>
        );
    }

    return (
        <div className="profile-container">
            {/* Profile Header */}
            <div className="profile-header">
                <div className="profile-avatar">
                    <div className="avatar-circle">
                        {user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                    </div>
                </div>
                <div className="profile-info">
                    <h1>{user?.first_name} {user?.last_name}</h1>
                    <p className="profile-email">{user?.email}</p>
                    <p className="profile-joined">Member since {new Date(user?.date_joined).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long',
                        day: 'numeric'
                    })}</p>
                </div>
                <div className="profile-actions">
                    {/* <button className="edit-profile-btn">
                        ✏️ Edit Profile
                    </button> */}
                </div>
            </div>

            {/* Analytics Overview */}
            <div className="analytics-overview">
                <div className="overview-card">
                    <div className="card-icon">📚</div>
                    <div className="card-content">
                        <h3>{analytics.preparationPlans.length}</h3>
                        <p>Preparation Plans</p>
                    </div>
                </div>
                <div className="overview-card">
                    <div className="card-icon">✅</div>
                    <div className="card-content">
                        <h3>{analytics.completedTopics}</h3>
                        <p>Topics Completed</p>
                    </div>
                </div>
                <div className="overview-card">
                    <div className="card-icon">⏱️</div>
                    <div className="card-content">
                        <h3>{analytics.totalStudyHours}h</h3>
                        <p>Study Hours</p>
                    </div>
                </div>
                <div className="overview-card">
                    <div className="card-icon">🎯</div>
                    <div className="card-content">
                        <h3>{analytics.overallProgress}%</h3>
                        <p>Overall Progress</p>
                    </div>
                </div>
            </div>

            {/* Progress Section */}
            <div className="progress-section">
                <div className="section-header">
                    <h2>📊 Your Progress</h2>
                </div>
                <div className="progress-grid">
                    <div className="progress-card">
                        <h3>Overall Completion</h3>
                        <CircularProgress 
                            percentage={analytics.overallProgress} 
                            color={getProgressColor(analytics.overallProgress)}
                        />
                        <p>{analytics.completedTopics} of {analytics.totalTopics} topics completed</p>
                    </div>
                    <div className="progress-card">
                        <h3>Weekly Goal</h3>
                        <CircularProgress 
                            percentage={75} 
                            color="#10b981"
                            size={100}
                        />
                        <p>15 of 20 hours this week</p>
                    </div>
                    <div className="progress-card">
                        <h3>Study Streak</h3>
                        <div className="streak-display">
                            <span className="streak-number">7</span>
                            <span className="streak-text">days</span>
                        </div>
                        <p>Keep it up! 🔥</p>
                    </div>
                </div>
            </div>

            {/* Preparation Plans Section */}
            <div className="plans-section">
                <div className="section-header">
                    <h2>🎯 Your Preparation Plans</h2>
                    <button 
                        className="create-plan-btn"
                        onClick={() => navigate('/preparation')}
                    >
                        ➕ Create New Plan
                    </button>
                </div>
                <div className="plans-grid">
                    {analytics.preparationPlans.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📚</div>
                            <h3>No preparation plans yet</h3>
                            <p>Create your first preparation plan to start your journey!</p>
                            <button 
                                className="cta-button"
                                onClick={() => navigate('/preparation')}
                            >
                                Create Your First Plan
                            </button>
                        </div>
                    ) : (
                        analytics.preparationPlans.map((plan) => (
                            <div key={plan.id} className="plan-card" onClick={() => navigate('/preparation')}>
                                <div className="plan-header">
                                    <h4>{plan.plan_name}</h4>
                                    <span className="plan-progress">{Math.round(plan.progress_percentage)}%</span>
                                </div>
                                <ProgressBar 
                                    percentage={plan.progress_percentage} 
                                    color={getProgressColor(plan.progress_percentage)}
                                />
                                <div className="plan-stats">
                                    <span>{plan.completed_topics}/{plan.total_topics} topics</span>
                                    <span>{new Date(plan.created_at).toLocaleDateString()}</span>
                                </div>
                                {plan.preferred_role && (
                                    <div className="plan-role">
                                        Role: {plan.preferred_role}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Mock Interviews Section */}
            <div className="interviews-section">
                <div className="section-header">
                    <h2>🎤 Mock Interview History</h2>
                    <button 
                        className="create-plan-btn"
                        onClick={() => navigate('/mock-interviews')}
                    >
                        ➕ Start New Interview
                    </button>
                </div>
                <div className="interviews-content">
                    <div className="empty-state">
                        <div className="empty-icon">🎤</div>
                        <h3>No mock interviews yet</h3>
                        <p>Practice with AI-powered mock interviews to improve your skills!</p>
                        <button 
                            className="cta-button"
                            onClick={() => navigate('/mock-interviews')}
                        >
                            Start Your First Interview
                        </button>
                    </div>
                </div>
            </div>

            {/* Activity Timeline */}
            <div className="activity-section">
                <div className="section-header">
                    <h2>📅 Recent Activity</h2>
                </div>
                <div className="activity-timeline">
                    <div className="timeline-item">
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                            <h4>Completed Data Structures Topic</h4>
                            <p>Made progress on your Software Engineer preparation plan</p>
                            <span className="timeline-date">2 hours ago</span>
                        </div>
                    </div>
                    <div className="timeline-item">
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                            <h4>Created New Preparation Plan</h4>
                            <p>Started preparation for Backend Developer role</p>
                            <span className="timeline-date">1 day ago</span>
                        </div>
                    </div>
                    <div className="timeline-item">
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                            <h4>Profile Created</h4>
                            <p>Welcome to Connect & Conquer!</p>
                            <span className="timeline-date">{new Date(user?.date_joined).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile; 