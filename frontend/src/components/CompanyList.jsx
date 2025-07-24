import React, { useState, useEffect } from 'react';
import './CompanyList.css'; // Will create this CSS file

const CompanyList = () => {
    const [companies, setCompanies] = useState([]);
    const [filteredSearch, setFilteredSearch] = useState(''); // Unified search for role/domain/company_name
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // IMPORTANT: Ensure this matches your Django backend URL
    const API_BASE_URL = 'http://localhost:8000/api';

    useEffect(() => {
        fetchCompanies();
    }, [filteredSearch]); // Re-fetch when the search filter changes

    const fetchCompanies = async () => {
        setLoading(true);
        setError(null);
        let url = `${API_BASE_URL}/companies/`;
        const params = new URLSearchParams();

        if (filteredSearch) {
            params.append('search', filteredSearch); // Use Django's SearchFilter
        }

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setCompanies(data);
        } catch (e) {
            console.error("Failed to fetch companies:", e);
            setError("Failed to load company data. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        setFilteredSearch(e.target.value);
    };

    if (loading) return <div className="container">Loading companies...</div>;
    if (error) return <div className="container" style={{ color: 'red' }}>Error: {error}</div>;

    return (
        <div className="container">
            <h2>Company Drives</h2>
            <div className="filters">
                <input
                    type="text"
                    placeholder="Search by Role, Domain, or Company"
                    value={filteredSearch}
                    onChange={handleSearchChange}
                />
                <button onClick={() => setFilteredSearch('')}>Clear Search</button>
            </div>
            <div className="company-grid">
                {companies.length === 0 ? (
                    <p>No companies found matching your criteria.</p>
                ) : (
                    companies.map(company => (
                        <div key={company.id} className="company-card">
                            <h3>{company.company_name} - {company.role}</h3>
                            <p><strong>Domain:</strong> {company.domain}</p>
                            <p><strong>Salary:</strong> {company.salary_range || 'N/A'}</p>
                            <p><strong>Timeline:</strong> {company.hiring_timeline}</p>
                            <p><strong>Drive Date:</strong> {company.drive_date}</p>
                            <p><strong>Location:</strong> {company.location}</p>
                            <details>
                                <summary>Interview Process</summary>
                                <p>{company.interview_process_description}</p>
                            </details>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CompanyList;