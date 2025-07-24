import React, { useState } from 'react';
import './index.css'; // Global styles
import CompanyList from './components/CompanyList';
import PreparationPlan from './components/PreparationPlan';
import MockInterviews from './components/MockInterviews';
import ResumeBuilder from './components/ResumeBuilder'; // Import the new component

function App() {
  // 'companies', 'preparation', 'mock_interviews', 'resume_builder'
  const [activeModule, setActiveModule] = useState('companies');

  return (
    <div className="App">
      <header className="App-header">
        <h1>Connect & Conquer Placements</h1>
        <nav className="module-nav">
          <button onClick={() => setActiveModule('companies')}
                  style={{ backgroundColor: activeModule === 'companies' ? '#007bff' : '#3498db' }}>
            Company Drives
          </button>
          <button onClick={() => setActiveModule('preparation')}
                  style={{ backgroundColor: activeModule === 'preparation' ? '#007bff' : '#3498db' }}>
            Personalized Prep
          </button>
          <button onClick={() => setActiveModule('mock_interviews')}
                  style={{ backgroundColor: activeModule === 'mock_interviews' ? '#007bff' : '#3498db' }}>
            Mock Interviews
          </button>
          <button onClick={() => setActiveModule('resume_builder')}
                  style={{ backgroundColor: activeModule === 'resume_builder' ? '#007bff' : '#3498db' }}>
            Resume/ATS Check
          </button>
        </nav>
      </header>
      <main>
        {activeModule === 'companies' && <CompanyList />}
        {activeModule === 'preparation' && <PreparationPlan />}
        {activeModule === 'mock_interviews' && <MockInterviews />}
        {activeModule === 'resume_builder' && <ResumeBuilder />} {/* Render ResumeBuilder */}
      </main>
    </div>
  );
}

export default App;