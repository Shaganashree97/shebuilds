import React, { useState } from 'react';
import './index.css'; // Global styles
import CompanyList from './components/CompanyList';
import PreparationPlan from './components/PreparationPlan'; // Import the new component
// import MockInterviews from './components/MockInterviews'; // Will add later

function App() {
  const [activeModule, setActiveModule] = useState('companies'); // 'companies', 'preparation', 'mock_interviews'

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
          {/* Add Mock Interviews button here later */}
          {/*
          <button onClick={() => setActiveModule('mock_interviews')}
                  style={{ backgroundColor: activeModule === 'mock_interviews' ? '#007bff' : '#3498db' }}>
            Mock Interviews
          </button>
          */}
        </nav>
      </header>
      <main>
        {activeModule === 'companies' && <CompanyList />}
        {activeModule === 'preparation' && <PreparationPlan />} {/* Render the PreparationPlan component */}
        {/*
        {activeModule === 'mock_interviews' && <MockInterviews />}
        */}
      </main>
    </div>
  );
}

export default App;