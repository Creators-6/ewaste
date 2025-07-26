import React, { useEffect, useState, useRef } from 'react';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { FaUpload, FaSun, FaMoon, FaExpand, FaCompress, FaTimes } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';

const PRIMARY = '#2E7D32';
const BG_LIGHT = '#E8F5E9';
const BG_DARK = '#1B1B1B';
const TEXT_LIGHT = '#212121';
const TEXT_DARK = '#F1F1F1';

// Gemini setup
const genAI = new GoogleGenerativeAI("AIzaSyBJl5sgKjyH9hWV5XgcJJecs1DOOTq0838");
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
async function getGeminiImageAnswer(file) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const imageBase64 = await fileToBase64(file);
  const prompt = `You are a waste recognition AI. A user uploaded an image of an electronic item. \nFirst, try to identify what object is in the image (e.g., mobile phone, battery, laptop, etc.). \nThen explain the potential e-waste hazards of this item. Return the answer in this format:\n\nRecognized Item: <what it is>\nHazards:\n- <hazard 1>\n- <hazard 2>\n- ...`;
  const result = await model.generateContent({
    contents: [{
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: file.type,
            data: imageBase64,
          },
        },
      ],
    }],
  });
  return result.response.text();
}
async function getGeminiTextAnswer(text) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `You are a helpful assistant for e-waste recycling.\n${text}`;
  const result = await model.generateContent({
    contents: [{ parts: [{ text: prompt }] }],
  });
  return result.response.text();
}

const Dashboard = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [user, setUser] = useState(null);
  const [signupName, setSignupName] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedTab, setSelectedTab] = useState('ai');
  const [ecoPoints, setEcoPoints] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [animatePoints, setAnimatePoints] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [file, setFile] = useState(null);
  const [showRecyclePrompt, setShowRecyclePrompt] = useState(false);
  const [lastImageData, setLastImageData] = useState(null); // { url, aiMsg }
  const [recentActivities, setRecentActivities] = useState([]); // { url, status, aiMsg, uploadedAt }
  const [fullscreen, setFullscreen] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser || null);
      if (firebaseUser) {
        await fetchEcoPoints(firebaseUser.uid);
        await fetchRecentActivities(firebaseUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem('signupName');
    if (storedName) setSignupName(storedName);
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const fetchEcoPoints = async (uid) => {
    // Sum points from uploads
    const q = query(collection(db, 'uploads'), where('userId', '==', uid));
    const snapshot = await getDocs(q);
    let points = 0;
    snapshot.forEach(doc => {
      points += doc.data().points || 0;
    });
    setEcoPoints(points);
  };

  const fetchRecentActivities = async (uid) => {
    const q = query(collection(db, 'uploads'), where('userId', '==', uid));
    const snapshot = await getDocs(q);
    const activities = snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id }));
    // Sort by uploadedAt desc
    activities.sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
    setRecentActivities(activities);
  };

  const getDisplayName = () => {
    if (signupName) return signupName;
    if (!user) return 'User';
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split('@')[0];
    return 'User';
  };

  const getProfilePic = () => {
    if (user?.photoURL) return user.photoURL;
    const name = getDisplayName();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2E7D32&color=fff&rounded=true&size=64`;
  };

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiError('');
    const userMsg = { role: 'user', text: aiInput };
    setChatHistory((prev) => [...prev, userMsg]);
    try {
      const aiMsg = await getGeminiTextAnswer(aiInput);
      setChatHistory((prev) => [...prev, { role: 'ai', text: aiMsg }]);
      setAiInput('');
      setAnimatePoints(true);
      setTimeout(() => setAnimatePoints(false), 600);
    } catch (err) {
      setAiError('Error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleChooseFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleImageUpload = async () => {
    if (!file) return;
    setAiLoading(true);
    setAiError('');
    setImagePreview(URL.createObjectURL(file));
    setChatHistory((prev) => [...prev, { role: 'user', text: '[Image uploaded]', image: imagePreview }] );
    try {
      const aiMsg = await getGeminiImageAnswer(file);
      setChatHistory((prev) => [...prev, { role: 'ai', text: aiMsg, image: imagePreview }]);
      setLastImageData({ url: imagePreview, aiMsg });
      setShowRecyclePrompt(true);
      setFile(null);
      setImagePreview(null);
    } catch (err) {
      setAiError('Error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRecycleChoice = async (choice) => {
    if (!user || !lastImageData) return;
    setShowRecyclePrompt(false);
    let status = choice === 'recycle' ? 'recycled' : 'not_interested';
    let points = choice === 'recycle' ? 10 : 0;
    try {
      await addDoc(collection(db, 'uploads'), {
        userId: user.uid,
        url: lastImageData.url,
        aiMsg: lastImageData.aiMsg,
        status,
        points,
        uploadedAt: serverTimestamp(),
      });
      if (choice === 'recycle') {
        setEcoPoints((prev) => prev + 10);
      }
      await fetchRecentActivities(user.uid);
    } catch (err) {
      setAiError('Error saving activity: ' + err.message);
    }
    setLastImageData(null);
  };

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const askAISection = (
    <>
      {/* Large Modal for Fullscreen */}
      {fullscreen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.25)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '80vw',
            height: '80vh',
            background: darkMode ? '#2A2A2A' : '#F9FFF9',
            borderRadius: 18,
            boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
            padding: 32,
            position: 'relative',
            display: 'flex', flexDirection: 'column',
          }}>
            <button
              onClick={() => setFullscreen(false)}
              style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 26, color: PRIMARY, cursor: 'pointer' }}
              aria-label="Close Fullscreen"
            >
              <FaTimes />
            </button>
            {/* Ask AI content below */}
            {renderAskAIContent(true)}
          </div>
        </div>
      )}
      {/* Normal (non-fullscreen) Ask AI section */}
      {!fullscreen && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            flex: 1,
            background: darkMode ? '#2A2A2A' : '#F9FFF9',
            borderRadius: 16,
            padding: 24,
            boxShadow: darkMode ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px #C8E6C9',
            display: 'flex',
            flexDirection: 'column',
            height: 400,
            transition: 'background 0.3s ease-in-out',
            position: 'relative',
          }}
        >
          {renderAskAIContent(false)}
        </motion.div>
      )}
    </>
  );

  function renderAskAIContent(isFullscreen) {
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
          <div>
            <button onClick={() => setSelectedTab('ai')} style={{ background: selectedTab === 'ai' ? PRIMARY : '#eee', color: selectedTab === 'ai' ? '#fff' : TEXT_LIGHT, padding: 10, borderRadius: 8 }}>Ask AI</button>
            <button onClick={() => navigate('/nearby-centers')} style={{ background: '#eee', color: TEXT_LIGHT, padding: 10, borderRadius: 8, marginLeft: 8 }}>Recycle Centres</button>
          </div>
          <button
            onClick={() => setFullscreen(f => !f)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: PRIMARY, marginLeft: 8 }}
            aria-label={fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
        {selectedTab === 'ai' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, marginBottom: 10 }}>
              {chatHistory.length === 0 && (
                <p style={{ textAlign: 'center', color: '#999' }}>Start a conversation about e-waste...</p>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} style={{ marginBottom: 8, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                  {msg.image && (
                    <img src={msg.image} alt="Uploaded" style={{ width: 80, maxHeight: 80, objectFit: 'contain', borderRadius: 8, marginBottom: 6, border: '1px solid #ccc' }} />
                  )}
                  <span style={{ background: msg.role === 'user' ? '#C8E6C9' : '#F1F8E9', padding: 10, borderRadius: 10, display: 'inline-block', maxWidth: '80%' }}>{msg.text}</span>
                </div>
              ))}
              {aiLoading && <p style={{ fontStyle: 'italic', color: '#999', textAlign: 'left' }}>🤖 Gemini is thinking...</p>}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleAiSubmit} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask something about e-waste..."
                style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
                disabled={aiLoading}
              />
              <button type="submit" disabled={aiLoading} style={{ padding: '10px 16px', background: PRIMARY, color: '#fff', border: 'none', borderRadius: 8 }}>
                {aiLoading ? 'Sending...' : 'Send'}
              </button>
            </form>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleChooseFile}
                style={{ display: 'none' }}
                disabled={aiLoading}
              />
              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                style={{
                  padding: '10px 18px',
                  background: PRIMARY,
                  color: '#fff',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 15,
                  border: 'none',
                  cursor: aiLoading ? 'not-allowed' : 'pointer',
                  opacity: aiLoading ? 0.7 : 1,
                }}
                disabled={aiLoading}
              >
                <FaUpload style={{ marginRight: 6 }} /> Upload Image
              </button>
              {file && (
                <button
                  onClick={handleImageUpload}
                  style={{
                    padding: '10px 18px',
                    background: '#66BB6A',
                    color: '#fff',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 15,
                    border: 'none',
                    cursor: aiLoading ? 'not-allowed' : 'pointer',
                    opacity: aiLoading ? 0.7 : 1,
                  }}
                  disabled={aiLoading}
                >
                  Analyze
                </button>
              )}
              {imagePreview && (
                <img src={imagePreview} alt="Preview" style={{ width: 40, maxHeight: 40, objectFit: 'contain', borderRadius: 6, border: '1px solid #ccc' }} />
              )}
            </div>
            {showRecyclePrompt && lastImageData && (
              <div style={{ marginTop: 18, textAlign: 'center' }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Are you interested in recycling this item?</div>
                <img src={lastImageData.url} alt="Uploaded" style={{ width: 120, maxHeight: 120, objectFit: 'contain', borderRadius: 8, marginBottom: 8, border: '1px solid #ccc' }} />
                <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6, margin: '12px 0' }}>{lastImageData.aiMsg}</div>
                <button
                  onClick={() => handleRecycleChoice('recycle')}
                  style={{ margin: '0 8px', padding: '8px 24px', background: PRIMARY, color: '#fff', borderRadius: 6, fontWeight: 600, fontSize: 15, border: 'none' }}
                >
                  Yes, Recycle
                </button>
                <button
                  onClick={() => handleRecycleChoice('not_interested')}
                  style={{ margin: '0 8px', padding: '8px 24px', background: '#ccc', color: '#000', borderRadius: 6, fontWeight: 600, fontSize: 15, border: 'none' }}
                >
                  Not Interested
                </button>
              </div>
            )}
            {aiError && <p style={{ color: 'red', marginTop: 10 }}>{aiError}</p>}
          </>
        )}
      </>
    );
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Segoe UI, Arial, sans-serif', background: darkMode ? BG_DARK : BG_LIGHT, color: darkMode ? TEXT_DARK : TEXT_LIGHT }}>
      {/* Navbar */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px', backgroundColor: darkMode ? '#333' : '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', transition: 'all 0.3s ease-in-out'
      }}>
        <h2 style={{ color: PRIMARY }}>♻ E-Waste Recycle</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <motion.div
            initial={{ scale: 1 }}
            animate={animatePoints ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5 }}
            style={{
              backgroundColor: '#C8E6C9', padding: '6px 12px', borderRadius: 16, fontSize: 14,
              fontWeight: 'bold', color: PRIMARY
            }}
          >
            🌱 Eco Points: {ecoPoints}
          </motion.div>

          <button onClick={toggleDarkMode} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            {darkMode ? <FaSun color={PRIMARY} /> : <FaMoon color={PRIMARY} />}
          </button>

          <img src={getProfilePic()} alt="Profile" style={{ borderRadius: '50%', width: 40, height: 40, cursor: 'pointer' }} onClick={() => navigate('/profile')} />
        </div>
      </nav>

      {/* Main Content */}
      <section style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', padding: 40, gap: 24 }}>
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          style={{ flex: 1 }}
        >
          <h2 style={{ color: PRIMARY }}>Hey, {getDisplayName()}!</h2>
          <h1 style={{ fontSize: 36, color: PRIMARY }}>♻ Welcome to E-Waste Recycle</h1>
          <p style={{ fontSize: 18 }}>
            Our platform helps you locate nearby recycling centers, track your eco points, and dispose of e-waste responsibly.
          </p>
        </motion.div>

        {askAISection}
      </section>

      {/* Recent Activities Section */}
      <section style={{ maxWidth: 900, margin: '0 auto', marginTop: 24, background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: 24 }}>
        <h3 style={{ color: PRIMARY, fontWeight: 700, marginBottom: 18 }}>Recent Activities</h3>
        {recentActivities.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center' }}>No recent activities yet.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
            {recentActivities.map((item) => (
              <div key={item.id} style={{ background: '#F1F8E9', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: 14, minWidth: 180, maxWidth: 220, flex: '1 1 180px', textAlign: 'center' }}>
                {item.url && (
                  <img src={item.url} alt="Activity" style={{ width: 80, maxHeight: 80, objectFit: 'contain', borderRadius: 8, marginBottom: 8, border: '1px solid #ccc' }} />
                )}
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.status === 'recycled' ? 'Recycled' : 'Not Interested'}</div>
                <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>{item.aiMsg && item.aiMsg.slice(0, 60)}{item.aiMsg && item.aiMsg.length > 60 ? '...' : ''}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{item.uploadedAt?.seconds ? new Date(item.uploadedAt.seconds * 1000).toLocaleString() : ''}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer style={{ backgroundColor: '#fff', textAlign: 'center', padding: '16px 0', borderTop: '1px solid #ddd', marginTop: 'auto', color: '#555', fontSize: 14 }}>
        © {new Date().getFullYear()} E-Waste Recycle. All rights reserved.
      </footer>
    </div>
  );
};

export default Dashboard;
