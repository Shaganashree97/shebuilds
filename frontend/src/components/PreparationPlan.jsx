import React, { useState } from 'react';
import './PreparationPlan.css'; // Will create this CSS file

const PreparationPlan = () => {
    const [academicDetails, setAcademicDetails] = useState('');
    const [preferredRole, setPreferredRole] = useState('');
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const API_BASE_URL = 'http://localhost:8000/api'; // Your Django API base URL

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setPlan(null); // Clear any previous plan

        try {
            const response = await fetch(`${API_BASE_URL}/generate_prep_plan/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    academic_course_details: academicDetails,
                    preferred_role: preferredRole,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json(); // Attempt to read error message from backend
                throw new Error(errorData.detail || errorData.preferred_role || errorData.academic_course_details || `HTTP error! status: ${response.status}`);
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

    return (
        <div className="container">
            <h2>Personalized Preparation Plan</h2>
            <form onSubmit={handleSubmit} className="prep-form">
                <div className="form-group">
                    <label htmlFor="academicDetails">Your Academic Details (e.g., "3rd year CS, learning DBMS, Python"):</label>
                    <textarea
                        id="academicDetails"
                        value={academicDetails}
                        onChange={(e) => setAcademicDetails(e.target.value)}
                        rows="4"
                        placeholder="e.g., Currently studying Data Structures and Algorithms, have basic knowledge of C++."
                        required
                    ></textarea>
                </div>
                <div className="form-group">
                    <label htmlFor="preferredRole">Preferred Role (e.g., "Software Engineer", "Data Analyst"):</label>
                    <input
                        type="text"
                        id="preferredRole"
                        value={preferredRole}
                        onChange={(e) => setPreferredRole(e.target.value)}
                        placeholder="e.g., Software Engineer"
                        required
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Generating...' : 'Generate Plan'}
                </button>
            </form>

            {error && <div className="error-message" style={{ color: 'red', marginTop: '20px' }}>Error: {error}</div>}

            {plan && (
                <div className="plan-output">
                    <h3>Your Personalized Plan:</h3>
                    <p>{plan.summary}</p>
                    {plan.time_estimation && (
                        <p><strong>Time Estimation:</strong> {plan.time_estimation.total_weeks} weeks. {plan.time_estimation.breakdown}</p>
                    )}
                    {plan.sections.map((section, index) => (
                        <div key={index} className="plan-section">
                            <h4>{section.skill}</h4>
                            {section.topics.length > 0 ? (
                                <ul>
                                    {section.topics.map((topic, tIndex) => (
                                        <li key={tIndex}>
                                            <strong>{topic.name}:</strong> {topic.description}
                                            {topic.resources.length > 0 && (
                                                <ul>
                                                    {topic.resources.map((resource, rIndex) => (
                                                        <li key={rIndex}>
                                                            <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                                                [{resource.type}] {resource.title}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No specific topics or resources found for this skill yet. Consider expanding the data in the admin panel.</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PreparationPlan;