import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const cardStyle = {
  background: 'rgba(255,255,255,0.95)',
  borderRadius: 20,
  boxShadow: '0 8px 32px rgba(60,72,88,0.15)',
  padding: '48px 36px',
  maxWidth: 380,
  width: '100%',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};
const inputStyle = {
  width: '100%',
  padding: 12,
  marginTop: 8,
  borderRadius: 8,
  border: '1.5px solid #C8E6C9',
  fontSize: 17,
  outline: 'none',
  background: '#F8FAF9',
  marginBottom: 18,
  transition: 'border 0.2s',
};
const buttonStyle = {
  width: '100%',
  padding: 14,
  background: '#2E7D32',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 18,
  cursor: 'pointer',
  boxShadow: '0 2px 8px #C8E6C9',
  marginBottom: 10,
  transition: 'background 0.3s ease, transform 0.2s ease', // Improved transition
};

const headingStyle = {
  fontSize: 32,
  fontWeight: 800,
  color: '#2E7D32',
  marginBottom: 30,
  letterSpacing: '-1px',
};

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      localStorage.setItem('signupName', name); // Store name for dashboard
      window.location.href = '/login';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
        fontFamily: 'Segoe UI, Arial, sans-serif',
      }}
    >
      <div style={cardStyle}>
        <h2 style={headingStyle}>Sign Up</h2>
        <form onSubmit={handleSignup} style={{ width: '100%' }}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Name"
            style={inputStyle}
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="Email"
            style={inputStyle}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="Password"
            style={inputStyle}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm Password"
            style={inputStyle}
          />
          {error && <div style={{ color: '#e57373', marginBottom: 14 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={buttonStyle}
            onMouseOver={e => (e.currentTarget.style.background = '#66BB6A')}
            onMouseOut={e => (e.currentTarget.style.background = '#2E7D32')}
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
        <div style={{ marginTop: 18, color: '#555', fontSize: 15 }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: '#2E7D32', textDecoration: 'underline', fontWeight: 500 }}>
            Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default Signup;
