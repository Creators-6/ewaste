import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { getDoc, doc } from 'firebase/firestore';

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
  padding: '14px',
  background: 'linear-gradient(90deg, #2E7D32, #388E3C)',
  color: '#fff',
  border: 'none',
  borderRadius: '12px', // slightly more rounded
  fontWeight: 700,
  fontSize: '18px',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)',
  marginBottom: '10px',
  transition: 'all 0.3s ease',
  outline: 'none',
};

const buttonHoverStyle = {
  background: '#388E3C',
  transform: 'translateY(-2px)',
  boxShadow: '0 6px 16px rgba(56, 142, 60, 0.3)',
};

const buttonActiveStyle = {
  transform: 'scale(0.98)',
  boxShadow: '0 2px 8px rgba(46, 125, 50, 0.2)',
};

const buttonFocusStyle = {
  outline: '2px solid #A5D6A7',
  outlineOffset: '2px',
};

const headingStyle = {
  fontSize: 32,
  fontWeight: 800,
  color: '#2E7D32',
  marginBottom: 30,
  letterSpacing: '-1px',
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      // Fetch user role from Firestore
      const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
      let redirectUrl = '/dashboard';
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === 'organization') {
          redirectUrl = '/orgdashboard';
        } else {
          redirectUrl = '/dashboard';
        }
      }
      window.location.href = redirectUrl;
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
        <h2 style={headingStyle}>Login</h2>
        <form onSubmit={handleLogin} style={{ width: '100%' }}>
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
          {error && <div style={{ color: '#e57373', marginBottom: 14 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={buttonStyle}
            onMouseOver={e => (e.currentTarget.style.background = '#66BB6A')}
            onMouseOut={e => (e.currentTarget.style.background = '#2E7D32')}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div style={{ marginTop: 18, color: '#555', fontSize: 15 }}>
          Don't have an account?{' '}
          <a href="/signup" style={{ color: '#2E7D32', textDecoration: 'underline', fontWeight: 500 }}>
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;