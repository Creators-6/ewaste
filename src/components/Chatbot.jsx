import React, { useState, useRef, useEffect } from 'react';

const PRIMARY = '#2E7D32';

const Chatbot = ({ darkMode = false }) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMsg = { role: 'user', type: 'text', content: aiInput };
    setChatHistory((prev) => [...prev, userMsg]);
    setAiInput('');
    setAiLoading(true);
    setAiError('');

    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyBJl5sgKjyH9hWV5XgcJJecs1DOOTq0838', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: aiInput }]
            }
          ]
        })
      });

      const data = await res.json();
      const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI.';
      setChatHistory((prev) => [...prev, { role: 'ai', type: 'text', content: aiReply }]);
    } catch (err) {
      setAiError('Something went wrong with Gemini AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result.split(',')[1];
      const userImageMsg = { role: 'user', type: 'image', content: reader.result };
      setChatHistory((prev) => [...prev, userImageMsg]);
      setAiLoading(true);

      try {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=AIzaSyBJl5sgKjyH9hWV5XgcJJecs1DOOTq0838', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inlineData: { mimeType: 'image/png', data: base64 } },
                  { text: 'Can you identify the hazards or recyclable components in this e-waste image?' }
                ]
              }
            ]
          })
        });

        const data = await res.json();
        const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI.';
        setChatHistory((prev) => [...prev, { role: 'ai', type: 'text', content: aiReply }]);
      } catch (err) {
        setAiError('AI Image Response Failed');
      } finally {
        setAiLoading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 16, background: darkMode ? '#222' : '#F1F8E9', borderRadius: 12 }}>
      <h2 style={{ color: PRIMARY }}>♻ Ask AI About E-Waste</h2>

      <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: 16, padding: 8, background: darkMode ? '#333' : '#fff', borderRadius: 8 }}>
        {chatHistory.length === 0 && <p style={{ textAlign: 'center', color: darkMode ? '#bbb' : '#999' }}>Start a conversation or upload an image...</p>}
        {chatHistory.map((msg, i) => (
          <div key={i} style={{ textAlign: msg.role === 'user' ? 'right' : 'left', marginBottom: 12 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '8px 12px',
                borderRadius: 16,
                background: msg.role === 'user' ? (darkMode ? '#388e3c' : '#C8E6C9') : (darkMode ? '#444' : '#E0E0E0'),
                color: darkMode ? '#fff' : '#212121',
                maxWidth: '80%',
                whiteSpace: 'pre-wrap'
              }}
            >
              {msg.type === 'image' ? <img src={msg.content} alt="Uploaded" style={{ maxWidth: '100%', borderRadius: 8 }} /> : msg.content}
            </span>
          </div>
        ))}
        {aiLoading && <div style={{ color: darkMode ? '#bbb' : '#777' }}>🤖 AI is typing...</div>}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleAiSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          placeholder="Ask something..."
          style={{ flexGrow: 1, padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
        />
        <input type="file" accept="image/*" id="imageUploadInput" style={{ display: 'none' }} onChange={handleImageUpload} />
        <button
          type="button"
          onClick={() => document.getElementById('imageUploadInput').click()}
          style={{ padding: '10px 14px', background: '#FFD54F', border: 'none', borderRadius: 8 }}
        >
          📷
        </button>
        <button type="submit" disabled={aiLoading} style={{ padding: '10px 16px', backgroundColor: PRIMARY, color: '#fff', border: 'none', borderRadius: 8 }}>
          Send
        </button>
      </form>
      {aiError && <p style={{ color: 'red', marginTop: 10 }}>{aiError}</p>}
    </div>
  );
};

export default Chatbot;
