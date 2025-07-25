import React, { useState } from 'react';
import './ResumeBuilder.css'; // Your CSS file
import authService from '../services/authService';

const ResumeBuilder = () => {
    const [resumeFile, setResumeFile] = useState(null);
    const [jobDescriptionText, setJobDescriptionText] = useState('');
    const [analysisResult, setAnalysisResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setAnalysisResult(null); // Clear previous results

        if (!resumeFile || !jobDescriptionText.trim()) {
            setError("Please upload your resume file and provide the job description text.");
            setLoading(false);
            return;
        }

        // Validate file type
        const allowedTypes = ['pdf', 'docx', 'txt'];
        const fileExtension = resumeFile.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
            setError("Please upload a PDF, DOCX, or TXT file only.");
            setLoading(false);
            return;
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (resumeFile.size > maxSize) {
            setError("File size too large. Please upload a file smaller than 10MB.");
            setLoading(false);
            return;
        }

        // Use FormData to send file and text together
        const formData = new FormData();
        formData.append('resume_file', resumeFile);
        formData.append('job_description_text', jobDescriptionText);

        try {
            const response = await authService.makeAuthenticatedRequest('/resume_checker/', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                
                try {
                const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                    // Handle specific error types
                    if (response.status === 400) {
                        if (errorMessage.includes('PDF')) {
                            errorMessage += "\n\nTips for PDF issues:\n• Try re-saving your resume as a new PDF\n• Ensure the PDF is not password protected\n• Use 'Print to PDF' instead of scanning\n• Try converting to DOCX format instead";
                        } else if (errorMessage.includes('DOCX')) {
                            errorMessage += "\n\nTry saving your document in a newer DOCX format or convert to PDF.";
                        } else if (errorMessage.includes('text file') || errorMessage.includes('encoding')) {
                            errorMessage += "\n\nTry saving your text file with UTF-8 encoding or convert to PDF/DOCX.";
                        }
                    }
                } catch (parseError) {
                    console.error("Error parsing error response:", parseError);
                    errorMessage = `Request failed with status ${response.status}. Please try again or contact support.`;
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            setAnalysisResult(data);
        } catch (e) {
            console.error("Failed to perform ATS check:", e);
            let displayError = e.message || "Failed to perform ATS check. Please try again.";
            
            // Handle network errors
            if (e.name === 'TypeError' && e.message.includes('fetch')) {
                displayError = "Network error. Please check your connection and try again.";
            }
            
            setError(displayError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <h2>🎯 AI-Powered Resume Analyzer</h2>
            <p>Upload your resume and provide a job description to get comprehensive AI-powered analysis with ATS optimization suggestions.</p>
            <form onSubmit={handleSubmit} className="ats-form">
                <div className="form-group">
                    <label htmlFor="resumeFile">Upload Your Resume:</label>
                    <input
                        type="file"
                        id="resumeFile"
                        accept=".pdf,.docx,.txt"
                        onChange={(e) => setResumeFile(e.target.files[0])}
                        required
                    />
                    {resumeFile && <p className="file-info">Selected: {resumeFile.name}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="jobDescriptionText">Job Description Text:</label>
                    <textarea
                        id="jobDescriptionText"
                        value={jobDescriptionText}
                        onChange={(e) => setJobDescriptionText(e.target.value)}
                        rows="10"
                        placeholder="Paste the full job description here."
                        required
                    ></textarea>
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Analyzing...' : 'Perform ATS Check'}
                </button>
            </form>

            {error && <div className="error-message" style={{ color: 'red', marginTop: '20px' }}>Error: {error}</div>}

            {analysisResult && (
                <div className="analysis-result">
                    <div className="analysis-header">
                        <h3>🎯 AI-Powered Resume Analysis</h3>
                        <div className="score-cards">
                            <div className="score-card overall-score">
                                <div className="score-label">Overall Match</div>
                                <div className="score-value">{analysisResult.overall_match_score}</div>
                            </div>
                            <div className="score-card ats-score">
                                <div className="score-label">ATS Compatibility</div>
                                <div className="score-value">{analysisResult.ats_compatibility_score}</div>
                            </div>
                        </div>
                    </div>

                    {/* Resume Strengths */}
                    {analysisResult.resume_strengths && analysisResult.resume_strengths.length > 0 && (
                        <div className="strengths-section">
                            <h4>✅ Resume Strengths</h4>
                            <div className="strengths-list">
                                {analysisResult.resume_strengths.map((strength, index) => (
                                    <div key={index} className="strength-item">
                                        <span className="strength-icon">💪</span>
                                        <span>{strength}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Keywords Analysis */}
                    <div className="keywords-analysis">
                        <div className="keyword-section matched">
                            <h4>✅ Matched Keywords</h4>
                            {analysisResult.matched_keywords && analysisResult.matched_keywords.length > 0 ? (
                                <div className="keywords-list">
                                    {analysisResult.matched_keywords.map((keyword, index) => (
                                        <span key={index} className="keyword-tag matched">{keyword}</span>
                                    ))}
                                </div>
                            ) : (
                                <p className="no-keywords">No matching keywords found</p>
                            )}
                        </div>

                        <div className="keyword-section missing">
                            <h4>⚠️ Missing Important Keywords</h4>
                            {analysisResult.missing_important_keywords && analysisResult.missing_important_keywords.length > 0 ? (
                                <div className="keywords-list">
                                    {analysisResult.missing_important_keywords.map((keyword, index) => (
                                        <span key={index} className="keyword-tag missing">{keyword}</span>
                                    ))}
                                </div>
                            ) : (
                                <p className="no-keywords">Great! All important keywords are present</p>
                            )}
                        </div>
                    </div>

                    {/* Improvement Suggestions */}
                    {analysisResult.improvement_suggestions && analysisResult.improvement_suggestions.length > 0 && (
                        <div className="suggestions-section">
                            <h4>💡 Improvement Suggestions</h4>
                            <div className="suggestions-grid">
                                {analysisResult.improvement_suggestions.map((category, index) => (
                                    <div key={index} className="suggestion-category">
                                        <h5>{category.category}</h5>
                                        <ul>
                                            {category.suggestions.map((suggestion, sIndex) => (
                                                <li key={sIndex}>{suggestion}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Items */}
                    {analysisResult.action_items && analysisResult.action_items.length > 0 && (
                        <div className="action-items-section">
                            <h4>🚀 Immediate Action Items</h4>
                            <div className="action-items-list">
                                {analysisResult.action_items.map((action, index) => (
                                    <div key={index} className="action-item">
                                        <span className="action-number">{index + 1}</span>
                                        <span className="action-text">{action}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommended Additions */}
                    {analysisResult.recommended_additions && analysisResult.recommended_additions.length > 0 && (
                        <div className="recommendations-section">
                            <h4>➕ Recommended Additions</h4>
                            <div className="recommendations-list">
                                {analysisResult.recommended_additions.map((recommendation, index) => (
                                    <div key={index} className="recommendation-item">
                                        <span className="recommendation-icon">📝</span>
                                        <span>{recommendation}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Extracted Resume Text */}
                    {analysisResult.extracted_resume_text_sample && (
                        <div className="extracted-text-section">
                            <h4>📄 Extracted Resume Text (Sample)</h4>
                            <div className="extracted-text-preview">
                                <pre>{analysisResult.extracted_resume_text_sample}</pre>
                            </div>
                        </div>
                    )}

                    <div className="disclaimer">
                        <p>{analysisResult.disclaimer}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResumeBuilder;