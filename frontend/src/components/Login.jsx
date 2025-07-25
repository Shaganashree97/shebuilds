import React, { useState } from 'react';
import authService from '../services/authService';
import './Auth.css';

const Login = ({ onLoginSuccess, onSwitchToSignup }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear specific error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            const result = await authService.login(formData.email, formData.password);
            
            if (result.success) {
                onLoginSuccess(result.user);
            } else {
                // Handle Django REST Framework error format
                const backendErrors = result.errors;
                const formattedErrors = {};
                
                // Handle non_field_errors (general authentication errors)
                if (backendErrors.non_field_errors) {
                    formattedErrors.general = backendErrors.non_field_errors[0];
                }
                
                // Handle field-specific errors
                if (backendErrors.email) {
                    formattedErrors.email = Array.isArray(backendErrors.email) 
                        ? backendErrors.email[0] 
                        : backendErrors.email;
                }
                
                if (backendErrors.password) {
                    formattedErrors.password = Array.isArray(backendErrors.password) 
                        ? backendErrors.password[0] 
                        : backendErrors.password;
                }
                
                // If no specific errors found, show a general error
                if (Object.keys(formattedErrors).length === 0) {
                    formattedErrors.general = 'Invalid email or password. Please try again.';
                }
                
                setErrors(formattedErrors);
            }
        } catch (error) {
            console.error('Login error:', error);
            setErrors({ general: 'An unexpected error occurred. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Welcome Back</h2>
                    <p>Sign in to continue your career journey</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {errors.general && (
                        <div className="error-message general-error">
                            {errors.general}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={errors.email ? 'error' : ''}
                            placeholder="Enter your email"
                            disabled={loading}
                        />
                        {errors.email && (
                            <span className="error-message">{errors.email}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className={errors.password ? 'error' : ''}
                            placeholder="Enter your password"
                            disabled={loading}
                        />
                        {errors.password && (
                            <span className="error-message">{errors.password}</span>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="loading-spinner">
                                <div className="spinner"></div>
                                Loading...
                            </div>
                        ) : (
                            <>🚀 Sign In</>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Don't have an account?{' '}
                        <button
                            type="button"
                            className="link-button"
                            onClick={onSwitchToSignup}
                            disabled={loading}
                        >
                            Sign Up
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login; 