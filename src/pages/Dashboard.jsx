import React, { useEffect, useState, useRef } from 'react';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { FaUpload, FaSun, FaMoon, FaExpand, FaCompress, FaTimes, FaBell, FaRecycle } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { setDoc, getDoc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';

const PRIMARY = '#2E7D32';
const BG_LIGHT = '#E8F5E9';
const BG_DARK = '#1B1B1B';
const TEXT_LIGHT = '#212121';
const TEXT_DARK = '#F1F1F1';

// Add Cloudinary credentials
const CLOUD_NAME = 'dxmjv8vff';
const UPLOAD_PRESET = 'unsigned_ewaste';

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
  const [cloudImageUrl, setCloudImageUrl] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '', itemName: '', description: '', location: '' });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

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

  // Removed auto-scroll behavior to prevent page scrolling to bottom
  // useEffect(() => {
  //   if (chatEndRef.current) {
  //     chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  //   }
  // }, [chatHistory]);

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

  useEffect(() => {
    // Check for relevant notifications in recentActivities
    const notifs = recentActivities.filter(a =>
              (['pickup_scheduled', 'accepted', 'done'].includes(a.status)) && !a.notificationRead
    ).map(a => {
      let message = '';
      if (a.status === 'pickup_scheduled') {
        message = `Your request for pickup of '${a.itemName || 'an item'}' is scheduled!`;
      } else if (a.status === 'accepted') {
        message = `Your request for '${a.itemName || 'an item'}' has been accepted!`;
              } else if (a.status === 'done') {
        message = `Pickup completed for '${a.itemName || 'an item'}'. Thank you for recycling!`;
      }
      return { id: a.id, message };
    });
    setNotifications(notifs);
  }, [recentActivities]);

  // Handler to mark notification as read
  const handleReadNotification = async (id) => {
    // Mark as read in Firestore
    await updateDoc(doc(db, 'uploads', id), { notificationRead: true });
    setNotifications(notifications.filter(n => n.id !== id));
    await fetchRecentActivities(user.uid);
  };

  // Handler to dismiss notification
  const handleDismissNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
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
    // Return a default SVG user icon as data URI
    return "data:image/svg+xml,%3Csvg width='64' height='64' viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='32' cy='32' r='32' fill='%232E7D32'/%3E%3Ccircle cx='32' cy='26' r='12' fill='white'/%3E%3Cellipse cx='32' cy='48' rx='16' ry='10' fill='white'/%3E%3C/svg%3E";
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

  // Cloudinary upload helper
  async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.secure_url) throw new Error('Cloudinary upload failed');
    return data.secure_url;
  }

  const handleImageUpload = async () => {
    if (!file) return;
    setAiLoading(true);
    setAiError('');
    setImagePreview(URL.createObjectURL(file));
    setChatHistory((prev) => [...prev, { role: 'user', text: '[Image uploaded]', image: imagePreview }] );
    try {
      // Upload to Cloudinary first
      const uploadedUrl = await uploadToCloudinary(file);
      setCloudImageUrl(uploadedUrl);
      // Then analyze with Gemini
      const aiMsg = await getGeminiImageAnswer(file);
      setChatHistory((prev) => [...prev, { role: 'ai', text: aiMsg, image: uploadedUrl }]);
      setLastImageData({ url: uploadedUrl, aiMsg });
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
    let status = choice === 'recycle' ? 'interested' : 'not_interested';
    let points = choice === 'recycle' ? 50 : 0;
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
        // Add 50 points to user doc
        

        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
          // Create the document with initial ecoPoints
          await setDoc(userDocRef, { ecoPoints: 0 });
        } else {
          // Document exists, just increment
          await updateDoc(userDocRef, { ecoPoints: increment(50) });
        }
        
        setEcoPoints((prev) => prev + 50);
      }
      await fetchRecentActivities(user.uid);
    } catch (err) {
      setAiError('Error saving activity: ' + err.message);
    }
    setLastImageData(null);
  };

  // Show user form when interested
  const handleShowUserForm = () => {
    setShowRecyclePrompt(false);
    setShowUserForm(true);
    setUserForm({
      name: user?.displayName || user?.email?.split('@')[0] || '',
      email: user?.email || '',
      phone: '',
      itemName: '',
      description: '',
      location: '',
    });
  };

  // Submit user form and save to Firestore
  const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    if (!user || !lastImageData) return;
    setShowUserForm(false);
    try {
      await addDoc(collection(db, 'uploads'), {
        userId: user.uid,
        url: lastImageData.url,
        aiMsg: lastImageData.aiMsg,
        status: 'interested',
        points: 50,
        uploadedAt: serverTimestamp(),
        userName: userForm.name,
        userEmail: userForm.email,
        userPhone: userForm.phone,
        itemName: userForm.itemName,
        userDescription: userForm.description,
        location: userForm.location,
      });
      // Add 50 points to user doc
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { ecoPoints: increment(50) });
      setEcoPoints((prev) => prev + 50);
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
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
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
                <div key={i} style={{ marginBottom: 8, textAlign: msg.role === 'user' ? 'right' : 'left', display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                  {msg.image && (
                    <img src={msg.image} alt="Uploaded" style={{ width: 80, maxHeight: 80, objectFit: 'contain', borderRadius: 8, margin: msg.role === 'user' ? '0 0 0 8px' : '0 8px 0 0', border: '1px solid #ccc' }} />
                  )}
                  <div style={{ 
                    background: msg.role === 'user' ? '#C8E6C9' : '#F1F8E9', 
                    padding: 12, 
                    borderRadius: 10, 
                    display: 'inline-block', 
                    maxWidth: '70%', 
                    wordBreak: 'break-word', 
                    overflowWrap: 'break-word', 
                    fontSize: 15,
                    lineHeight: '1.5'
                  }}>
                    {msg.role === 'user' ? (
                      <span>{msg.text}</span>
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p style={{ margin: '0 0 8px 0', lineHeight: '1.5' }}>{children}</p>,
                          h1: ({ children }) => <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0', color: PRIMARY }}>{children}</h1>,
                          h2: ({ children }) => <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px 0', color: PRIMARY }}>{children}</h2>,
                          h3: ({ children }) => <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 8px 0', color: PRIMARY }}>{children}</h3>,
                          ul: ({ children }) => <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>{children}</ul>,
                          ol: ({ children }) => <ol style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>{children}</ol>,
                          li: ({ children }) => <li style={{ margin: '0 0 4px 0', lineHeight: '1.4' }}>{children}</li>,
                          strong: ({ children }) => <strong style={{ fontWeight: 'bold', color: PRIMARY }}>{children}</strong>,
                          em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
                          code: ({ children }) => <code style={{ 
                            backgroundColor: '#f0f0f0', 
                            padding: '2px 4px', 
                            borderRadius: '4px', 
                            fontSize: '14px',
                            fontFamily: 'monospace'
                          }}>{children}</code>,
                          blockquote: ({ children }) => <blockquote style={{ 
                            borderLeft: `3px solid ${PRIMARY}`, 
                            margin: '0 0 8px 0', 
                            paddingLeft: '12px',
                            fontStyle: 'italic',
                            color: '#666'
                          }}>{children}</blockquote>
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              {/* Show AI info and buttons as a chat bubble if needed */}
              {showRecyclePrompt && lastImageData && (
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 }}>
                  <img src={lastImageData.url} alt="Uploaded" style={{ width: 80, maxHeight: 80, objectFit: 'contain', borderRadius: 8, marginRight: 8, border: '1px solid #ccc' }} />
                  <div style={{ background: '#F1F8E9', padding: 12, borderRadius: 10, maxWidth: '70%', wordBreak: 'break-word', overflowWrap: 'break-word', fontSize: 15, flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Are you interested in recycling this item?</div>
                    <button
                      onClick={handleShowUserForm}
                      style={{ margin: '0 8px 0 0', padding: '8px 24px', background: PRIMARY, color: '#fff', borderRadius: 6, fontWeight: 600, fontSize: 15, border: 'none' }}
                    >
                      Interested
                    </button>
                    <button
                      onClick={() => handleRecycleChoice('not_interested')}
                      style={{ margin: '0', padding: '8px 24px', background: '#ccc', color: '#000', borderRadius: 6, fontWeight: 600, fontSize: 15, border: 'none' }}
                    >
                      Not Interested
                    </button>
                  </div>
                </div>
              )}
              {/* User details form modal/inline */}
              {showUserForm && (
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 }}>
                  <img src={lastImageData?.url} alt="Uploaded" style={{ width: 80, maxHeight: 80, objectFit: 'contain', borderRadius: 8, marginRight: 8, border: '1px solid #ccc' }} />
                  <form onSubmit={handleUserFormSubmit} style={{ background: '#F1F8E9', padding: 16, borderRadius: 10, maxWidth: '70%', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Please provide your details</div>
                    <input
                      type="text"
                      value={userForm.name}
                      onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                      placeholder="Your Name"
                      required
                      style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                    />
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="Your Email"
                      required
                      style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                    />
                    <input
                      type="tel"
                      value={userForm.phone}
                      onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                      placeholder="Your Phone"
                      required
                      style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                    />
                    <input
                      type="text"
                      value={userForm.itemName}
                      onChange={e => setUserForm({ ...userForm, itemName: e.target.value })}
                      placeholder="Item Name"
                      required
                      style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                    />
                    <textarea
                      value={userForm.description}
                      onChange={e => setUserForm({ ...userForm, description: e.target.value })}
                      placeholder="Short description about your device or request"
                      required
                      style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', minHeight: 60 }}
                    />
                    <input
                      type="text"
                      value={userForm.location}
                      onChange={e => setUserForm({ ...userForm, location: e.target.value })}
                      required
                      placeholder="Location"
                      style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                    />
                    <button
                      type="submit"
                      style={{ padding: '8px 24px', background: PRIMARY, color: '#fff', borderRadius: 6, fontWeight: 600, fontSize: 15, border: 'none', marginTop: 6 }}
                    >
                      Submit
                    </button>
                  </form>
                </div>
              )}
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
            {aiError && <p style={{ color: 'red', marginTop: 10 }}>{aiError}</p>}
          </>
        )}
      </>
    );
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Segoe UI, Arial, sans-serif', background: darkMode ? BG_DARK : BG_LIGHT, color: darkMode ? TEXT_DARK : TEXT_LIGHT }}>
      {/* Navigation Bar */}
      <nav style={{
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 24px', 
        backgroundColor: darkMode ? '#1a1a1a' : '#ffffff', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
        borderBottom: `2px solid ${PRIMARY}`,
        transition: 'all 0.3s ease-in-out'
      }}>
        {/* Left side - Logo and Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            fontSize: '24px',
            fontWeight: 'bold',
            color: PRIMARY
          }}>
            <FaRecycle style={{ fontSize: '28px' }} />
            <span>E-Waste Recycle</span>
          </div>
        </div>

        {/* Right side - Navigation Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Eco Points */}
          <motion.div
            initial={{ scale: 1 }}
            animate={animatePoints ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5 }}
            style={{
              backgroundColor: '#C8E6C9', 
              padding: '8px 16px', 
              borderRadius: 20, 
              fontSize: 14,
              fontWeight: 'bold', 
              color: PRIMARY,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            🌱 {ecoPoints} Points
          </motion.div>

          {/* Notification Bell and Panel */}
          <div style={{ position: 'relative', marginRight: 16 }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 22,
                color: PRIMARY,
                padding: '8px',
                borderRadius: '50%',
                transition: 'background-color 0.2s',
                position: 'relative',
              }}
              onClick={() => setShowNotifications((prev) => !prev)}
              onMouseEnter={e => e.target.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
              aria-label="Show notifications"
            >
              <FaBell />
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  background: 'red',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 16,
                  height: 16,
                  fontSize: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>{notifications.length}</span>
              )}
            </button>
            {showNotifications && (
              <div style={{
                position: 'absolute',
                top: 40,
                right: 0,
                background: '#fff',
                color: '#222',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                borderRadius: 8,
                minWidth: 260,
                zIndex: 100,
                padding: 8,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 4px 8px 4px',
                  borderBottom: '1px solid #eee',
                  fontWeight: 600,
                  fontSize: 14,
                  color: PRIMARY
                }}>
                  <span>Notifications</span>
                  <button
                    onClick={() => setShowNotifications(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#888',
                      fontSize: 20,
                      cursor: 'pointer',
                      marginLeft: 8
                    }}
                    aria-label="Close notifications"
                  >
                    ×
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ 
                    padding: '16px 8px', 
                    textAlign: 'center', 
                    color: '#888',
                    fontSize: 14,
                    fontStyle: 'italic'
                  }}>
                    No notifications to read
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: 12, 
                      borderBottom: '1px solid #eee',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>{n.message}</span>
                      <button 
                        onClick={() => handleReadNotification(n.id)} 
                        style={{ 
                          marginLeft: 8, 
                          background: PRIMARY, 
                          color: '#fff', 
                          border: 'none', 
                          borderRadius: 6, 
                          padding: '4px 12px', 
                          cursor: 'pointer', 
                          fontSize: 12,
                          fontWeight: 500,
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#388E3C'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = PRIMARY}
                      >
                        Read
                      </button>
                      <button 
                        onClick={() => handleDismissNotification(n.id)} 
                        style={{ 
                          marginLeft: 4, 
                          background: 'transparent', 
                          color: '#888', 
                          border: 'none', 
                          fontSize: 16, 
                          cursor: 'pointer',
                          padding: '2px',
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

         

          {/* Profile */}
          <img 
            src={getProfilePic()} 
            alt="Profile" 
            style={{ 
              borderRadius: '50%', 
              width: 40, 
              height: 40, 
              cursor: 'pointer',
              border: `2px solid ${PRIMARY}`,
              transition: 'transform 0.2s'
            }} 
            onClick={() => navigate('/profile')}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          />
        </div>
      </nav>

      <section style={{
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#E8F5E9',
  padding: '40px 60px',
  minHeight: '80vh',
  fontFamily: `'Segoe UI', sans-serif`,
  overflow: 'hidden',
}}>
  {/* Left: Image */}
  <div style={{
    flex: 1,
    maxWidth: '500px',
  }}>
    <img
      src="https://cdn.gamma.app/cztzkil3c2kchn1/edited-images/D31Wa16u_2EqGswcId6kx.png"
      alt="E-Waste Recycling"
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
      }}
    />
  </div>

  {/* Right: Text */}
  <div style={{
    flex: 1,
    paddingLeft: '40px',
    color: '#2E7D32',
  }}>
   

    <h1 style={{
      fontSize: '38px',
      fontWeight: 800,
      marginBottom: '16px',
      lineHeight: 1.2,
      color: '#2E7D32'
    }}>
      Transform Your E-Waste Into Hope
    </h1>

    <h3 style={{
      fontSize: '20px',
      fontWeight: 600,
      marginBottom: '16px',
      color: '#1B5E20'
    }}>
      Your recycling journey starts here – every device matters!
    </h3>

    <p style={{
      fontSize: '16px',
      lineHeight: 1.6,
      marginBottom: '24px',
      color: '#388E3C'
    }}>
      Join the revolution of responsible recycling. Your old electronics can become someone's new opportunity. 
      Let's create a circular economy where nothing goes to waste!
    </p>

    <button
      onClick={() => document.getElementById('ask-ai-section')?.scrollIntoView({ behavior: 'smooth' })}
      style={{
        padding: '12px 24px',
        fontSize: '16px',
        backgroundColor: '#43a047',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        transition: 'background-color 0.3s ease'
      }}
      onMouseOver={(e) => e.target.style.backgroundColor = '#2E7D32'}
      onMouseOut={(e) => e.target.style.backgroundColor = '#43a047'}
    >
      🤖 Ask AI
    </button>
  </div>
</section>


     {/* AI Section */}
<section
  id="ask-ai-section"  // <-- Add this line
  style={{ padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' }}
>
  {askAISection}
</section>


      {/* Recent Activities Section */}
      <section style={{ 
        maxWidth: 1200, 
        margin: '0 auto', 
        marginTop: 40, 
        marginBottom: 40,
        padding: '0 24px'
      }}>
        <div style={{ 
          background: darkMode ? '#2a2a2a' : '#fff', 
          borderRadius: 16, 
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', 
          padding: 32,
          border: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`
        }}>
          <h3 style={{ 
            color: PRIMARY, 
            fontWeight: 700, 
            marginBottom: 24,
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FaRecycle /> Recent Activities
          </h3>
          {recentActivities.length === 0 ? (
            <div style={{ 
              color: '#888', 
              textAlign: 'center',
              padding: '40px',
              fontSize: '16px'
            }}>
              No recent activities yet. Start by uploading an image or asking the AI about e-waste!
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              {recentActivities.map((item) => (
                <div key={item.id} style={{ 
                  background: darkMode ? '#3a3a3a' : '#F1F8E9', 
                  borderRadius: 12, 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                  padding: 20, 
                  minWidth: 200, 
                  maxWidth: 250, 
                  flex: '1 1 200px', 
                  textAlign: 'center',
                  border: `1px solid ${darkMode ? '#555' : '#e8f5e8'}`
                }}>
                  {item.url && (
                    <img src={item.url} alt="Activity" style={{ 
                      width: 80, 
                      maxHeight: 80, 
                      objectFit: 'contain', 
                      borderRadius: 8, 
                      marginBottom: 12, 
                      border: '1px solid #ccc' 
                    }} />
                  )}
                  <div style={{ 
                    fontWeight: 600, 
                    fontSize: 16, 
                    marginBottom: 6,
                    color: darkMode ? '#fff' : '#333'
                  }}>
                    {item.status?.toLowerCase() === 'pickup_scheduled'
                      ? 'Pickup Scheduled'
                      : item.status?.toLowerCase() === 'accepted'
                      ? 'Accepted'
                      : item.status?.toLowerCase() === 'interested'
                      ? 'Interested'
                      : 'Pickup Done '}
                  </div>
                  <div style={{ 
                    fontSize: 14, 
                    color: item.status === 'accepted' ? '#2196F3' : item.status === 'interested' ? '#4CAF50' : '#888',
                    marginBottom: 8
                  }}>
                    {item.aiMsg && item.aiMsg.slice(0, 0)}{item.aiMsg && item.aiMsg.length > 60 ? ' ' : ''}
                  </div>
                  <div style={{ 
                    fontSize: 12, 
                    color: '#888' 
                  }}>
                    {item.uploadedAt?.seconds ? new Date(item.uploadedAt.seconds * 1000).toLocaleString() : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer style={{ 
        backgroundColor: darkMode ? '#1a1a1a' : '#fff', 
        textAlign: 'center', 
        padding: '24px 0', 
        borderTop: `1px solid ${darkMode ? '#333' : '#ddd'}`, 
        marginTop: 'auto', 
        color: darkMode ? '#ccc' : '#555', 
        fontSize: 14 
      }}>
        © {new Date().getFullYear()} E-Waste Recycle. All rights reserved.
      </footer>
    </div>
  );
};
export default Dashboard;


