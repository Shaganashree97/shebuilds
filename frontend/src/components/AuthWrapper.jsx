import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';

const AuthWrapper = ({ onAuthSuccess }) => {
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
    const navigate = useNavigate();

    const handleLoginSuccess = (user) => {
        onAuthSuccess(user);
        // Navigation will be handled by the parent App component
        // since it controls the authentication state
    };

    const handleSignupSuccess = (user) => {
        onAuthSuccess(user);
        // Navigation will be handled by the parent App component
        // since it controls the authentication state
    };

    const switchToSignup = () => {
        setAuthMode('signup');
    };

    const switchToLogin = () => {
        setAuthMode('login');
    };

    return (
        <>
            {/* Floating geometric shapes for background animation */}
            <div className="floating-shape"></div>
            <div className="floating-shape"></div>
            <div className="floating-shape"></div>
            <div className="floating-shape"></div>
            <div className="floating-shape"></div>
            <div className="floating-shape"></div>
            {authMode === 'login' ? (
                <Login
                    onLoginSuccess={handleLoginSuccess}
                    onSwitchToSignup={switchToSignup}
                />
            ) : (
                <Signup
                    onSignupSuccess={handleSignupSuccess}
                    onSwitchToLogin={switchToLogin}
                />
            )}
        </>
    );
};

export default AuthWrapper; 