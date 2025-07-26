import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';

const cardStyle = {
  background: 'rgba(255,255,255,0.98)',
  borderRadius: 24,
  boxShadow: '0 12px 40px rgba(60,72,88,0.2)',
  padding: '40px 32px',
  maxWidth: 420,
  width: '100%',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.2)',
};

const toggleContainerStyle = {
  display: 'flex',
  background: '#f0f0f0',
  borderRadius: 12,
  padding: 4,
  marginBottom: 24,
  width: '100%',
  maxWidth: 280,
};

const toggleButtonStyle = (isActive) => ({
  flex: 1,
  padding: '12px 16px',
  background: isActive ? '#2E7D32' : 'transparent',
  color: isActive ? '#fff' : '#666',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: isActive ? '0 2px 8px rgba(46,125,50,0.3)' : 'none',
});

const inputStyle = {
  width: '100%',
  padding: 14,
  marginTop: 8,
  borderRadius: 12,
  border: '2px solid #e0e0e0',
  fontSize: 16,
  outline: 'none',
  background: '#fafafa',
  marginBottom: 16,
  transition: 'all 0.3s ease',
  boxSizing: 'border-box',
};

const inputFocusStyle = {
  border: '2px solid #2E7D32',
  background: '#fff',
  boxShadow: '0 0 0 3px rgba(46,125,50,0.1)',
};

const buttonStyle = {
  width: '100%',
  padding: 16,
  background: 'linear-gradient(135deg, #2E7D32 0%, #388E3C 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 16,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(46,125,50,0.3)',
  marginBottom: 16,
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
};

const headingStyle = {
  fontSize: 28,
  fontWeight: 800,
  color: '#2E7D32',
  marginBottom: 8,
  letterSpacing: '-0.5px',
};

const subtitleStyle = {
  fontSize: 14,
  color: '#666',
  marginBottom: 24,
  fontWeight: 400,
};

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [role, setRole] = useState('user');
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
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      // Prepare user data
      const userData = {
        name,
        email,
        role,
      };
      if (role === 'user') {
        userData.organisationName = organisationName;
      }
      // Store user info and role in Firestore
      await setDoc(doc(db, 'users', userCred.user.uid), userData);
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
        background: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 50%, #A5D6A7 100%)',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: -50,
        right: -50,
        width: 200,
        height: 200,
        background: 'rgba(46,125,50,0.1)',
        borderRadius: '50%',
        zIndex: 0,
      }} />
      <div style={{
        position: 'absolute',
        bottom: -80,
        left: -80,
        width: 300,
        height: 300,
        background: 'rgba(76,175,80,0.08)',
        borderRadius: '50%',
        zIndex: 0,
      }} />
      
      <div style={{ ...cardStyle, position: 'relative', zIndex: 1 }}>
        <h2 style={headingStyle}>Create Account</h2>
        <p style={subtitleStyle}>Join the e-waste recycling revolution</p>
        
        {/* Role Toggle at the top */}
        <div style={toggleContainerStyle}>
          <button
            type="button"
            style={toggleButtonStyle(role === 'user')}
            onClick={() => setRole('user')}
          >
            👤 User
          </button>
          <button
            type="button"
            style={toggleButtonStyle(role === 'organization')}
            onClick={() => setRole('organization')}
          >
            🏢 Organization
          </button>
        </div>

        <form onSubmit={handleSignup} style={{ width: '100%' }}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder={role === 'user' ? "Your Name" : "Organization Name"}
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => {
              e.target.style.border = '2px solid #e0e0e0';
              e.target.style.background = '#fafafa';
              e.target.style.boxShadow = 'none';
            }}
          />
          
          {role === 'user' && (
            <input
              type="text"
              value={organisationName}
              onChange={e => setOrganisationName(e.target.value)}
              placeholder="Organisation Name (Optional)"
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.border = '2px solid #e0e0e0';
                e.target.style.background = '#fafafa';
                e.target.style.boxShadow = 'none';
              }}
            />
          )}
          
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="Email Address"
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => {
              e.target.style.border = '2px solid #e0e0e0';
              e.target.style.background = '#fafafa';
              e.target.style.boxShadow = 'none';
            }}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="Password"
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => {
              e.target.style.border = '2px solid #e0e0e0';
              e.target.style.background = '#fafafa';
              e.target.style.boxShadow = 'none';
            }}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm Password"
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => {
              e.target.style.border = '2px solid #e0e0e0';
              e.target.style.background = '#fafafa';
              e.target.style.boxShadow = 'none';
            }}
          />
          
          {error && (
            <div style={{ 
              color: '#d32f2f', 
              marginBottom: 16, 
              padding: '12px',
              background: '#ffebee',
              borderRadius: 8,
              fontSize: 14,
              border: '1px solid #ffcdd2'
            }}>
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseOver={e => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(46,125,50,0.4)';
              }
            }}
            onMouseOut={e => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(46,125,50,0.3)';
              }
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div style={{ 
          marginTop: 24, 
          color: '#666', 
          fontSize: 14,
          fontWeight: 400
        }}>
          Already have an account?{' '}
          <a 
            href="/login" 
            style={{ 
              color: '#2E7D32', 
              textDecoration: 'none', 
              fontWeight: 600,
              borderBottom: '1px solid transparent',
              transition: 'border-color 0.3s ease',
            }}
            onMouseOver={(e) => e.target.style.borderBottomColor = '#2E7D32'}
            onMouseOut={(e) => e.target.style.borderBottomColor = 'transparent'}
          >
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
};

export default Signup;
