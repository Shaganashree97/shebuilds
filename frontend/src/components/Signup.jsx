import React, { useState } from 'react';
import authService from '../services/authService';
import './Auth.css';

const Signup = ({ onSignupSuccess, onSwitchToLogin }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        password_confirm: '',
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

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        }

        if (!formData.first_name.trim()) {
            newErrors.first_name = 'First name is required';
        }

        if (!formData.last_name.trim()) {
            newErrors.last_name = 'Last name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }

        if (!formData.password_confirm) {
            newErrors.password_confirm = 'Please confirm your password';
        } else if (formData.password !== formData.password_confirm) {
            newErrors.password_confirm = 'Passwords do not match';
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
            const result = await authService.register({
                username: formData.email, // Using email as username
                email: formData.email,
                password: formData.password,
                password_confirm: formData.password_confirm,
                first_name: formData.first_name,
                last_name: formData.last_name,
            });
            
            if (result.success) {
                onSignupSuccess(result.user);
            } else {
                // Handle Django REST Framework error format
                const backendErrors = result.errors;
                const formattedErrors = {};
                
                // Handle non_field_errors (general errors)
                if (backendErrors.non_field_errors) {
                    formattedErrors.general = Array.isArray(backendErrors.non_field_errors) 
                        ? backendErrors.non_field_errors[0]
                        : backendErrors.non_field_errors;
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
                
                if (backendErrors.password_confirm) {
                    formattedErrors.password_confirm = Array.isArray(backendErrors.password_confirm) 
                        ? backendErrors.password_confirm[0] 
                        : backendErrors.password_confirm;
                }
                
                if (backendErrors.first_name) {
                    formattedErrors.first_name = Array.isArray(backendErrors.first_name) 
                        ? backendErrors.first_name[0] 
                        : backendErrors.first_name;
                }
                
                if (backendErrors.last_name) {
                    formattedErrors.last_name = Array.isArray(backendErrors.last_name) 
                        ? backendErrors.last_name[0] 
                        : backendErrors.last_name;
                }
                
                if (backendErrors.username) {
                    formattedErrors.username = Array.isArray(backendErrors.username) 
                        ? backendErrors.username[0] 
                        : backendErrors.username;
                }
                
                // If no specific errors found, show a general error
                if (Object.keys(formattedErrors).length === 0) {
                    formattedErrors.general = 'Registration failed. Please check your information and try again.';
                }
                
                setErrors(formattedErrors);
            }
        } catch (error) {
            console.error('Signup error:', error);
            setErrors({ general: 'An unexpected error occurred. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Create Account</h2>
                    <p>Join Connect & Conquer to accelerate your career</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {errors.general && (
                        <div className="error-message general-error">
                            {errors.general}
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="first_name">First Name</label>
                            <input
                                type="text"
                                id="first_name"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                className={errors.first_name ? 'error' : ''}
                                placeholder="First name"
                                disabled={loading}
                            />
                            {errors.first_name && (
                                <span className="error-message">{errors.first_name}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="last_name">Last Name</label>
                            <input
                                type="text"
                                id="last_name"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                className={errors.last_name ? 'error' : ''}
                                placeholder="Last name"
                                disabled={loading}
                            />
                            {errors.last_name && (
                                <span className="error-message">{errors.last_name}</span>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className={errors.username ? 'error' : ''}
                            placeholder="Choose a username"
                            disabled={loading}
                        />
                        {errors.username && (
                            <span className="error-message">{errors.username}</span>
                        )}
                    </div>

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
                            placeholder="Create a password (min. 8 characters)"
                            disabled={loading}
                        />
                        {errors.password && (
                            <span className="error-message">{errors.password}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="password_confirm">Confirm Password</label>
                        <input
                            type="password"
                            id="password_confirm"
                            name="password_confirm"
                            value={formData.password_confirm}
                            onChange={handleChange}
                            className={errors.password_confirm ? 'error' : ''}
                            placeholder="Confirm your password"
                            disabled={loading}
                        />
                        {errors.password_confirm && (
                            <span className="error-message">{errors.password_confirm}</span>
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
                            <>🎯 Create Account</>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Already have an account?{' '}
                        <button
                            type="button"
                            className="link-button"
                            onClick={onSwitchToLogin}
                            disabled={loading}
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup; 