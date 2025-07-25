import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: '🎯',
            title: 'AI-Powered Preparation Roadmaps',
            description: 'Get personalized study plans that adapt to your academic calendar and skill gaps, powered by advanced AI technology.',
            path: '/preparation'
        },
        {
            icon: '🎤',
            title: 'Adaptive Mock Interviews',
            description: 'Practice with realistic AI-driven interviews featuring voice feedback and comprehensive evaluation to boost your confidence.',
            path: '/mock-interviews'
        },
        {
            icon: '📄',
            title: 'ATS-Friendly Resume Builder',
            description: 'Optimize your professional presence with our intelligent resume checker and LinkedIn optimization suite.',
            path: '/resume-builder'
        },
        {
            icon: '🏢',
            title: 'Centralized Company Hub',
            description: 'Access comprehensive company details including timelines, roles, required skills, and interview processes all in one place.',
            path: '/companies'
        },
        {
            icon: '👥',
            title: 'Collaborative Community',
            description: 'Connect with peers through discussion forums, personal chats, and skill-based groups for mentorship and support.',
            path: '/discussion-forum'
        },
        {
            icon: '📊',
            title: 'Progress Tracking',
            description: 'Monitor your preparation journey with detailed analytics and milestone tracking to stay on course.',
            path: '/preparation'
        }
    ];

    const benefits = [
        { icon: '😌', text: 'Reduce placement preparation stress' },
        { icon: '💪', text: 'Boost confidence and interview performance' },
        { icon: '🔍', text: 'Increase ATS and recruiter visibility' },
        { icon: '🎯', text: 'Higher success rate in securing placements' },
        { icon: '🤝', text: 'Find mentorship and peer support' },
        { icon: '🚀', text: 'Navigate career launch with clarity' }
    ];

    const handleFeatureClick = (path) => {
        navigate(path);
    };

    return (
        <div className="landing-container">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <div className="hero-text">
                        <h1 className="hero-title">
                            Connect & <span className="gradient-text">Conquer</span>
                        </h1>
                        <p className="hero-subtitle">
                            Transform Your Career Journey with AI-Enhanced Preparation
                        </p>
                        <p className="hero-description">
                            An intelligent, community-driven platform that revolutionizes career preparation through 
                            personalized AI roadmaps, realistic mock interviews, and collaborative learning.
                        </p>
                        <div className="hero-buttons">
                            <button className="cta-button primary" onClick={() => handleFeatureClick('/preparation')}>
                                🚀 Start Prep Plan
                            </button>
                            <button className="cta-button secondary" onClick={() => handleFeatureClick('/mock-interviews')}>
                                🎤 Try Mock Interview
                            </button>
                        </div>
                    </div>
                    <div className="hero-visual">
                        <div className="floating-card card-1" onClick={() => handleFeatureClick('/preparation')}>
                            <div className="card-icon">🎯</div>
                            <div className="card-text">AI Roadmaps</div>
                        </div>
                        <div className="floating-card card-2" onClick={() => handleFeatureClick('/mock-interviews')}>
                            <div className="card-icon">🎤</div>
                            <div className="card-text">Mock Interviews</div>
                        </div>
                        <div className="floating-card card-3" onClick={() => handleFeatureClick('/discussion-forum')}>
                            <div className="card-icon">👥</div>
                            <div className="card-text">Community</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="section-content">
                    <h2 className="section-title">Comprehensive Solution Suite</h2>
                    <p className="section-subtitle">
                        Everything you need to excel in your career preparation journey
                    </p>
                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <div 
                                key={index} 
                                className="feature-card clickable-card"
                                onClick={() => handleFeatureClick(feature.path)}
                            >
                                <div className="feature-icon">{feature.icon}</div>
                                <h3 className="feature-title">{feature.title}</h3>
                                <p className="feature-description">{feature.description}</p>
                                <div className="feature-action">
                                    <span className="action-text">Explore →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            {/* <section className="benefits-section">
                <div className="section-content">
                    <h2 className="section-title">Transform Your Career Outcomes</h2>
                    <div className="benefits-grid">
                        {benefits.map((benefit, index) => (
                            <div key={index} className="benefit-item">
                                <span className="benefit-icon">{benefit.icon}</span>
                                <span className="benefit-text">{benefit.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section> */}

            {/* How It Works */}
            <section className="process-section">
                <div className="section-content">
                    <h2 className="section-title">How Connect & Conquer Works</h2>
                    <div className="process-timeline">
                        <div className="process-step">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h3>Choose Your Path</h3>
                                <p>Select from our comprehensive suite of career preparation tools based on your current needs</p>
                            </div>
                        </div>
                        <div className="process-step">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h3>AI-Generated Roadmap</h3>
                                <p>Get a customized learning path with timelines, resources, and skill development priorities</p>
                            </div>
                        </div>
                        <div className="process-step">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h3>Practice & Improve</h3>
                                <p>Engage in mock interviews, optimize your resume, and track your progress consistently</p>
                            </div>
                        </div>
                        <div className="process-step">
                            <div className="step-number">4</div>
                            <div className="step-content">
                                <h3>Connect & Learn</h3>
                                <p>Join the community, find mentors, share experiences, and accelerate your growth</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-content">
                    <h2 className="cta-title">Ready to Transform Your Career Journey?</h2>
                    <p className="cta-description">
                        Join thousands of students who've already accelerated their career preparation with Connect & Conquer
                    </p>
                    <div className="cta-buttons-group">
                        <button className="cta-button primary large" onClick={() => handleFeatureClick('/preparation')}>
                            🎯 Start Prep Plan
                        </button>
                        <button className="cta-button secondary large" onClick={() => handleFeatureClick('/companies')}>
                            🏢 Browse Jobs
                        </button>
                    </div>
                    <p className="cta-note">Free to get started • No credit card required</p>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <div className="footer-brand">
                        <h3 className='footer-title'>Connect & Conquer</h3>
                        <p className='footer-description'>Empowering students to navigate their career launch with clarity and collective support.</p>
                    </div>
                    <div className="footer-links">
                        <div className="footer-section">
                            <h4>Platform</h4>
                            <ul>
                                <li><a href="#features">Features</a></li>
                                <li><a href="#pricing">Pricing</a></li>
                                <li><a href="#community">Community</a></li>
                            </ul>
                        </div>
                        <div className="footer-section">
                            <h4>Resources</h4>
                            <ul>
                                <li><a href="#blog">Blog</a></li>
                                <li><a href="#guides">Career Guides</a></li>
                                <li><a href="#support">Support</a></li>
                            </ul>
                        </div>
                        <div className="footer-section">
                            <h4>Company</h4>
                            <ul>
                                <li><a href="#about">About Us</a></li>
                                <li><a href="#contact">Contact</a></li>
                                <li><a href="#careers">Careers</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; 2024 Connect & Conquer. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage; 