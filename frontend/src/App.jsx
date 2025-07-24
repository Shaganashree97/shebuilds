import React, { useState } from 'react';
import './index.css'; // Global styles
import CompanyList from './components/CompanyList';
import PreparationPlan from './components/PreparationPlan';
import MockInterviews from './components/MockInterviews';
import ResumeBuilder from './components/ResumeBuilder';
import DiscussionForum from './components/DiscussionForum'; // Import the new component

function App() {
  // State to manage which module is currently active
  // Options: 'companies', 'preparation', 'mock_interviews', 'resume_builder', 'discussion_forum'
  const [activeModule, setActiveModule] = useState('companies');

  return (
    <div className="App">
      <header className="App-header">
        <h1>Connect & Conquer Placements</h1>
        <nav className="module-nav">
          {/* Navigation buttons for each module */}
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
          <button onClick={() => setActiveModule('discussion_forum')}
                  style={{ backgroundColor: activeModule === 'discussion_forum' ? '#007bff' : '#3498db' }}>
            Discussion Forum
          </button>
        </nav>
      </header>
      <main>
        {/* Conditional rendering based on activeModule state */}
        {activeModule === 'companies' && <CompanyList />}
        {activeModule === 'preparation' && <PreparationPlan />}
        {activeModule === 'mock_interviews' && <MockInterviews />}
        {activeModule === 'resume_builder' && <ResumeBuilder />}
        {activeModule === 'discussion_forum' && <DiscussionForum />} {/* Render DiscussionForum */}
      </main>
    </div>
  );
}

export default App;