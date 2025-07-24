import React, { useState } from 'react';
import './ResumeBuilder.css'; // Your CSS file

const ResumeBuilder = () => {
    const [resumeFile, setResumeFile] = useState(null);
    const [jobDescriptionText, setJobDescriptionText] = useState('');
    const [analysisResult, setAnalysisResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const API_BASE_URL = 'http://localhost:8000/api'; // Your Django API base URL

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

        // Use FormData to send file and text together
        const formData = new FormData();
        formData.append('resume_file', resumeFile);
        formData.append('job_description_text', jobDescriptionText);

        try {
            const response = await fetch(`${API_BASE_URL}/resume_checker/`, {
                method: 'POST',
                // Don't set Content-Type header explicitly for FormData; browser does it automatically
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setAnalysisResult(data);
        } catch (e) {
            console.error("Failed to perform ATS check:", e);
            setError(e.message || "Failed to perform ATS check. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <h2>ATS Friendly Resume Checker</h2>
            <p>Upload your resume (PDF/DOCX/TXT) and paste a job description to get keyword matching analysis and suggestions for improvement.</p>
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
                    <h3>Analysis Results:</h3>
                    {analysisResult.extracted_resume_text_sample && (
                        <div className="extracted-text-preview">
                            <h4>Extracted Resume Text (Sample):</h4>
                            <pre>{analysisResult.extracted_resume_text_sample}</pre>
                            <p className="disclaimer-note">
                                * This is a sample of text extracted from your file. Discrepancies may occur due to complex formatting.
                            </p>
                        </div>
                    )}
                    <p><strong>Keyword Match Score:</strong> {analysisResult.match_score}</p>

                    <div className="keyword-section">
                        <h4>Matching Keywords:</h4>
                        {analysisResult.matching_keywords && analysisResult.matching_keywords.length > 0 ? (
                            <div className="keywords-list green-keywords">
                                {analysisResult.matching_keywords.map((keyword, index) => (
                                    <span key={index} className="keyword-tag">{keyword}</span>
                                ))}
                            </div>
                        ) : (
                            <p>No direct matching keywords found.</p>
                        )}
                    </div>

                    <div className="keyword-section">
                        <h4>Missing Keywords from Job Description:</h4>
                        {analysisResult.missing_keywords && analysisResult.missing_keywords.length > 0 ? (
                            <div className="keywords-list red-keywords">
                                {analysisResult.missing_keywords.map((keyword, index) => (
                                    <span key={index} className="keyword-tag">{keyword}</span>
                                ))}
                            </div>
                        ) : (
                            <p>All identified keywords from the job description appear to be present!</p>
                        )}
                    </div>

                    {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                        <div className="suggestions-section">
                            <h4>Suggestions for Improvement:</h4>
                            <ul>
                                {analysisResult.suggestions.map((suggestion, index) => (
                                    <li key={index}>{suggestion}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <p className="disclaimer-note">{analysisResult.disclaimer}</p>
                </div>
            )}
        </div>
    );
};

export default ResumeBuilder;