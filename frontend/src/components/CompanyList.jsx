import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CompanyList.css'; // Will create this CSS file

const CompanyList = () => {
    const [companies, setCompanies] = useState([]);
    const [filteredSearch, setFilteredSearch] = useState(''); // Unified search for role/domain/company_name
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const navigate = useNavigate();

    // IMPORTANT: Ensure this matches your Django backend URL
    const API_BASE_URL = 'http://localhost:8000/api';

    useEffect(() => {
        fetchCompanies();
    }, [currentPage]); // Re-fetch when the search filter or page changes

    const fetchCompanies = async () => {
        setLoading(true);
        setError(null);

        const url = `https://jsearch.p.rapidapi.com/search?query=developer%20jobs%20in%20India&page=${currentPage}&num_pages=1&country=IN&date_posted=all`;
        const options = {
            method: 'GET',
            headers: {
                'x-rapidapi-key': '5c4dcd233dmsh9aa5bcef8f6dc4fp13d3c9jsna22055c28751',
                'x-rapidapi-host': 'jsearch.p.rapidapi.com'
            }
        };

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();

            if (result.status === "OK" && result.data) {
                setCompanies(result.data);
                setTotalPages(10); // Assuming 10 pages available
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error("Failed to fetch companies:", error);
            setError("Failed to load company data. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        setFilteredSearch(e.target.value);
        setCurrentPage(1); // Reset to first page when searching
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const formatTimeAgo = (timestamp) => {
        const now = Date.now();
        const diff = now - (timestamp * 1000);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        return 'Recently posted';
    };

    const prepareForRole = (jobData) => {
        // Create a comprehensive but concise job description from the job data
        let jobDescription = `Job Title: ${jobData.job_title}
Company: ${jobData.employer_name}
Location: ${jobData.job_location}
Employment Type: ${jobData.job_employment_type}`;

        if (jobData.job_salary) {
            jobDescription += `\nSalary: ${jobData.job_salary}`;
        }

        if (jobData.job_is_remote) {
            jobDescription += `\nRemote Work: Available`;
        }

        // Add job description (truncated if too long)
        const description = jobData.job_description || 'No detailed description available.';
        const truncatedDescription = description.length > 800 ? description.substring(0, 800) + '...' : description;
        jobDescription += `\n\nJob Description:\n${truncatedDescription}`;

        // Add highlights if available (limit to top 5)
        if (jobData.job_highlights && jobData.job_highlights.length > 0) {
            jobDescription += `\n\nKey Requirements/Highlights:`;
            jobData.job_highlights.slice(0, 5).forEach(highlight => {
                if (jobDescription.length < 1800) { // Leave room for remaining content
                    jobDescription += `\n• ${highlight}`;
                }
            });
        }

        // Add required skills if available (limit to top 8)
        if (jobData.job_required_skills && jobData.job_required_skills.length > 0) {
            jobDescription += `\n\nRequired Skills:`;
            jobData.job_required_skills.slice(0, 8).forEach(skill => {
                if (jobDescription.length < 1900) { // Leave room for final details
                    jobDescription += `\n• ${skill}`;
                }
            });
        }

        // Add posting info if there's room
        if (jobDescription.length < 1950) {
            jobDescription += `\n\nPosted: ${formatTimeAgo(jobData.job_posted_at_timestamp)}`;
        }

        // Ensure we don't exceed 2000 characters
        if (jobDescription.length > 2000) {
            jobDescription = jobDescription.substring(0, 1997) + '...';
        }

        // Navigate to preparation plan with job data
        navigate('/preparation', {
            state: {
                prefillData: {
                    jobDescription: jobDescription,
                    companyName: jobData.employer_name,
                    jobTitle: jobData.job_title,
                    jobLocation: jobData.job_location,
                    inputType: 'job_description' // Set input type to job description
                }
            }
        });
    };

    const filteredCompanies = companies.filter(company =>
        !filteredSearch ||
        company.job_title?.toLowerCase().includes(filteredSearch.toLowerCase()) ||
        company.employer_name?.toLowerCase().includes(filteredSearch.toLowerCase()) ||
        company.job_location?.toLowerCase().includes(filteredSearch.toLowerCase())
    );

    if (loading) {
        return (
            <div className="container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading job opportunities...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container">
                <div className="error-message">
                    <h3>⚠️ Error Loading Jobs</h3>
                    <p>{error}</p>
                    <button onClick={fetchCompanies} className="retry-btn">
                        🔄 Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="header-section">
                <h2>🏢 Job Opportunities</h2>
                <p className="subtitle">Discover your next career opportunity</p>
            </div>

            {/* Search and Filters */}
            <div className="search-section">
                <div className="search-container">
                    <div className="search-input-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search by job title, company, or location..."
                            value={filteredSearch}
                            onChange={handleSearchChange}
                            className="search-input"
                        />
                    </div>
                    <button
                        onClick={() => {
                            setFilteredSearch('');
                            setCurrentPage(1);
                        }}
                        className="clear-btn"
                    >
                        ✕ Clear
                    </button>
                </div>

                {/* Results Info */}
                <div className="results-info">
                    <span>Showing {filteredCompanies.length} jobs on page {currentPage}</span>
                </div>
            </div>

            {/* Job Cards Grid */}
            <div className="jobs-grid">
                {filteredCompanies.length === 0 ? (
                    <div className="no-results">
                        <div className="no-results-icon">🔍</div>
                        <h3>No jobs found</h3>
                        <p>Try adjusting your search criteria or browse all available positions.</p>
                    </div>
                ) : (
                    filteredCompanies.map(company => (
                        <div key={company.job_id} className="job-card">
                            <div className="job-card-header">
                                <div className="company-info">
                                    {company.employer_logo && (
                                        <img
                                            src={company.employer_logo}
                                            alt={`${company.employer_name} logo`}
                                            className="company-logo"
                                        />
                                    )}
                                    <div className="company-details">
                                        <h3 className="job-title">{company.job_title}</h3>
                                        <p className="company-name">{company.employer_name}</p>
                                    </div>
                                </div>
                                <div className="job-meta">
                                    <span className="job-type">{company.job_employment_type}</span>
                                    <span className="posted-time">{formatTimeAgo(company.job_posted_at_timestamp)}</span>
                                </div>
                            </div>

                            <div className="job-card-body">
                                <div className="job-location">
                                    <span className="location-icon">📍</span>
                                    <span>{company.job_location}</span>
                                    {company.job_is_remote && <span className="remote-badge">🏠 Remote</span>}
                                </div>

                                {company.job_salary && (
                                    <div className="salary-info">
                                        <span className="salary-icon">💰</span>
                                        <span>{company.job_salary}</span>
                                    </div>
                                )}

                                <div className="job-description">
                                    <p>{company.job_description?.substring(0, 200)}...</p>
                                </div>

                                {company.job_highlights && company.job_highlights.length > 0 && (
                                    <div className="job-highlights">
                                        <h4>Key Points:</h4>
                                        <ul>
                                            {company.job_highlights.slice(0, 3).map((highlight, index) => (
                                                <li key={index}>{highlight}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="job-card-footer">
                                <div className="job-publisher">
                                    <span>via {company.job_publisher}</span>
                                </div>
                                <div className="action-buttons">
                                    <button
                                        onClick={() => prepareForRole(company)}
                                        className="prepare-btn"
                                        title="Create a personalized preparation plan for this role"
                                    >
                                        🎯 Prepare for this Role
                                    </button>
                                    {company.employer_website && (
                                        <a
                                            href={company.employer_website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="company-website-btn"
                                        >
                                            🌐 Company
                                        </a>
                                    )}
                                    <a
                                        href={company.job_apply_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="apply-btn"
                                    >
                                        📝 Apply Now
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            <div className="pagination">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                >
                    ← Previous
                </button>

                <div className="page-numbers">
                    {[...Array(Math.min(5, totalPages))].map((_, index) => {
                        let pageNum;
                        if (totalPages <= 5) {
                            pageNum = index + 1;
                        } else if (currentPage <= 3) {
                            pageNum = index + 1;
                        } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + index;
                        } else {
                            pageNum = currentPage - 2 + index;
                        }

                        return (
                            <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                >
                    Next →
                </button>
            </div>

            <div className="page-info">
                Page {currentPage} of {totalPages}
            </div>
        </div>
    );
};

export default CompanyList;

