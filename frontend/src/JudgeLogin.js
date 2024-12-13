import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './JudgeLogin.css';

function JudgeLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Base URL from environment variable or default to 'http://localhost:8000'
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/judge/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Navigate to Event Details and pass the judge data
        navigate('/judge/event-details', { state: { judge: data.judge } });
      } else {
        // Display error message
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Error during login:', err);
      setError('An error occurred. Please try again later.');
    }
  };

  return (
    <div className="login-container">
      <h2>Judge Login</h2>
      <form onSubmit={handleSubmit} className="login-form">
        {error && <p className="error-message">{error}</p>}
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />
        </div>
        <button type="submit" className="login-button">Submit</button>
      </form>
    </div>
  );
}

export default JudgeLogin; 