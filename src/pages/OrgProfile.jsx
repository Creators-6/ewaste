import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

const PRIMARY = '#2E7D32';
const BG = '#E8F5E9';
const TEXT = '#212121';
const SUBTEXT = '#555';

const OrgProfile = () => {
  const [user, setUser] = useState(null);
  const [orgDetails, setOrgDetails] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    description: ''
  });
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    acceptedSubmissions: 0,
    completedPickups: 0,
    totalEcoPoints: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  // Add state for edit mode:
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchOrgDetails(firebaseUser.uid);
        await fetchStats();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchOrgDetails = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setOrgDetails({
          name: data.name || data.displayName || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          website: data.website || '',
          description: data.description || '',
          photoURL: data.photoURL || '' // Add photoURL to state
        });
      }
    } catch (error) {
      console.error('Error fetching org details:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const uploadsQuery = query(collection(db, 'uploads'));
      const querySnapshot = await getDocs(uploadsQuery);
      const uploads = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setStats({
        totalSubmissions: uploads.length,
        acceptedSubmissions: uploads.filter(u => u.status === 'accepted' || u.status === 'pickup_scheduled' || u.status === 'done').length,
        completedPickups: uploads.filter(u => u.status === 'done').length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: orgDetails.name,
        email: orgDetails.email,
        phone: orgDetails.phone,
        address: orgDetails.address,
        website: orgDetails.website,
        description: orgDetails.description,
        updatedAt: new Date()
      });
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error updating profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: PRIMARY, fontSize: 18 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, fontFamily: 'Segoe UI, Arial, sans-serif' }}>
      {/* Navigation Bar */}
      <nav
        style={{
          padding: '20px 60px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'transparent',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700, color: PRIMARY }}>
          ♻ E-Waste Recycle
        </div>
        <div style={{ display: 'flex', gap: 30, fontSize: 15, fontWeight: 500 }}>
          <a
            href="/org-dashboard"
            aria-label="Go to organization dashboard"
            style={{
              padding: '10px 20px',
              background: PRIMARY,
              color: '#fff',
              borderRadius: 20,
              textDecoration: 'none',
              fontWeight: 600,
              transition: '0.3s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#66BB6A')}
            onMouseOut={e => (e.currentTarget.style.background = PRIMARY)}
          >
            Dashboard
          </a>
          <button 
            onClick={async () => {
              try {
                await auth.signOut();
                window.location.href = '/login';
              } catch (error) {
                console.error('Error signing out:', error);
              }
            }}
            style={{
              background: '#f44336',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 20,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 10
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 30 }}>
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', marginBottom: 32 }}>
          {/* Organization Details (left) */}
          <div style={{ flex: 2, background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
              {/* Profile Logo */}
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: PRIMARY, fontSize: 38 }}>
                {orgDetails.photoURL
                  ? <img src={orgDetails.photoURL} alt="Profile" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
                  : <img src="data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='32' cy='32' r='32' fill='%232E7D32'/%3E%3Ccircle cx='32' cy='26' r='12' fill='white'/%3E%3Cellipse cx='32' cy='48' rx='16' ry='10' fill='white'/%3E%3C/svg%3E" alt="Profile" style={{ width: 80, height: 80, borderRadius: '50%' }} />}
              </div>
              <div>
                <h2 style={{ color: PRIMARY, fontWeight: 700, margin: 0 }}>{orgDetails.name || 'Organization'}</h2>
                <div style={{ color: SUBTEXT, fontSize: 16 }}>{orgDetails.email}</div>
              </div>
            </div>
            {editMode ? (
              <>
                {message && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    marginBottom: 20,
                    background: message.includes('Error') ? '#ffebee' : '#e8f5e9',
                    color: message.includes('Error') ? '#c62828' : '#2e7d32',
                    border: `1px solid ${message.includes('Error') ? '#ffcdd2' : '#c8e6c9'}`
                  }}>
                    {message}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: TEXT }}>
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      value={orgDetails.name}
                      onChange={(e) => setOrgDetails({...orgDetails, name: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        fontSize: 16,
                        outline: 'none'
                      }}
                      placeholder="Enter organization name"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: TEXT }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={orgDetails.email}
                      onChange={(e) => setOrgDetails({...orgDetails, email: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        fontSize: 16,
                        outline: 'none'
                      }}
                      placeholder="Enter email address"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: TEXT }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={orgDetails.phone}
                      onChange={(e) => setOrgDetails({...orgDetails, phone: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        fontSize: 16,
                        outline: 'none'
                      }}
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: TEXT }}>
                      Website
                    </label>
                    <input
                      type="url"
                      value={orgDetails.website}
                      onChange={(e) => setOrgDetails({...orgDetails, website: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        fontSize: 16,
                        outline: 'none'
                      }}
                      placeholder="Enter website URL"
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: TEXT }}>
                      Address
                    </label>
                    <textarea
                      value={orgDetails.address}
                      onChange={(e) => setOrgDetails({...orgDetails, address: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        fontSize: 16,
                        outline: 'none',
                        minHeight: '80px',
                        resize: 'vertical'
                      }}
                      placeholder="Enter organization address"
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: TEXT }}>
                      Organization Description
                    </label>
                    <textarea
                      value={orgDetails.description}
                      onChange={(e) => setOrgDetails({...orgDetails, description: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        fontSize: 16,
                        outline: 'none',
                        minHeight: '100px',
                        resize: 'vertical'
                      }}
                      placeholder="Describe your organization and recycling services"
                    />
                  </div>
                </div>

                <div style={{ marginTop: 32, textAlign: 'right' }}>
                  <button
                    onClick={async () => { await handleSave(); setEditMode(false); }}
                    disabled={saving}
                    style={{
                      background: saving ? '#ccc' : PRIMARY,
                      color: '#fff',
                      border: 'none',
                      padding: '12px 32px',
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s ease',
                      marginRight: 8
                    }}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    style={{
                      background: '#ccc',
                      color: '#222',
                      border: 'none',
                      padding: '12px 32px',
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontWeight: 600, color: TEXT, marginBottom: 4 }}>Phone:</div>
                  <div style={{ color: '#444', marginBottom: 8 }}>{orgDetails.phone || 'N/A'}</div>
                  <div style={{ fontWeight: 600, color: TEXT, marginBottom: 4 }}>Website:</div>
                  <div style={{ color: '#444', marginBottom: 8 }}>{orgDetails.website || 'N/A'}</div>
                  <div style={{ fontWeight: 600, color: TEXT, marginBottom: 4 }}>Address:</div>
                  <div style={{ color: '#444', marginBottom: 8 }}>{orgDetails.address || 'N/A'}</div>
                  <div style={{ fontWeight: 600, color: TEXT, marginBottom: 4 }}>Description:</div>
                  <div style={{ color: '#444', marginBottom: 8 }}>{orgDetails.description || 'N/A'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => setEditMode(true)}
                    style={{
                      background: PRIMARY,
                      color: '#fff',
                      border: 'none',
                      padding: '10px 28px',
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    Edit
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Stats (right) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: PRIMARY, marginBottom: 8 }}>{stats.totalSubmissions}</div>
              <div style={{ fontWeight: 600, fontSize: 16, color: TEXT }}>Total Submissions</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1e3a5c', marginBottom: 8 }}>{stats.completedPickups}</div>
              <div style={{ fontWeight: 600, fontSize: 16, color: TEXT }}>Completed Pickups</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrgProfile; 
