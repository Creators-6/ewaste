import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";

// ==== ♻ Custom Colors ====
const PRIMARY = '#2E7D32';
const PRIMARY_LIGHT = '#66BB6A';
const BG = '#E8F5E9';
const TEXT = '#212121';
const SUBTEXT = '#555';

// ==== 🔑 Gemini API Key ====
const genAI = new GoogleGenerativeAI("AIzaSyBLZj9q0VbXI0faFFW8MAgdyF2zN4tEu1c");

// ==== 🔄 Convert Image to Base64 ====
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// ==== 🤖 Call Gemini for Hazard Info ====
async function getGeminiAnswer(file) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const imageBase64 = await fileToBase64(file);

  const prompt = `You are a waste recognition AI. A user uploaded an image of an electronic item. 
First, try to identify what object is in the image (e.g., mobile phone, battery, laptop, etc.). 
Then explain the potential e-waste hazards of this item. Return the answer in this format:

Recognized Item: <what it is>
Hazards:
- <hazard 1>
- <hazard 2>
- ...`;

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

// ==== 📤 Main Upload Component ====
function CloudinaryImageUpload() {
  const [file, setFile] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploaded, setUploaded] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState('');
  const [llmResponse, setLlmResponse] = React.useState('');
  const [llmLoading, setLlmLoading] = React.useState(false);
  const [llmError, setLlmError] = React.useState('');
  const [showRecyclePrompt, setShowRecyclePrompt] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState('');
  const fileInputRef = React.useRef(null);
  const navigate = useNavigate();

  // ✅ Your Cloudinary Credentials
  const CLOUD_NAME = 'dxmjv8vff';
  const UPLOAD_PRESET = 'unsigned_ewaste';

  const handleChooseFile = (e) => {
    setFile(e.target.files[0]);
    setUploaded(false);
    setImageUrl('');
    setLlmResponse('');
    setLlmError('');
    setShowRecyclePrompt(false);
    setSuccessMsg('');
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploaded(false);
    setImageUrl('');
    setLlmResponse('');
    setLlmError('');
    setShowRecyclePrompt(false);
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.secure_url) throw new Error('Cloudinary upload failed');

      setImageUrl(data.secure_url);
      setUploaded(true);
      setLlmLoading(true);

      const geminiText = await getGeminiAnswer(file);
      setLlmResponse(geminiText);
      setShowRecyclePrompt(true);
    } catch (err) {
      setLlmError('Error: ' + err.message);
      console.error(err);
    } finally {
      setUploading(false);
      setLlmLoading(false);
    }
  };

  const handleRecycle = async (status) => {
    try {
      const userId = auth.currentUser?.uid || 'anonymous';
      await addDoc(collection(db, 'uploads'), {
        userId,
        url: imageUrl,
        name: 'Image Upload',
        status: status.toUpperCase(),
        points: status === 'recycle' ? 75 : 0,
        uploadedAt: serverTimestamp(),
      });
      setSuccessMsg(`✅ Item marked as ${status}.`);
      setShowRecyclePrompt(false);
      setTimeout(() => navigate('/profile'), 1000);
    } catch (err) {
      setLlmError('Error saving item: ' + err.message);
      console.error(err);
    }
  };

  return (
    <div style={{ margin: '32px 0', textAlign: 'center' }}>
      {/* 📁 File Input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleChooseFile}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        style={{
          padding: '14px 32px',
          background: PRIMARY,
          color: '#fff',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          marginRight: 16,
        }}
        disabled={uploading}
      >
        Choose Image
      </button>

      {/* ⬆ Upload Button */}
      <button
        onClick={handleUpload}
        style={{
          padding: '14px 32px',
          background: file ? PRIMARY : '#bdbdbd',
          color: '#fff',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
          cursor: file ? 'pointer' : 'not-allowed',
          opacity: uploading ? 0.7 : 1,
        }}
        disabled={!file || uploading}
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>

      {/* 💭 Loading */}
      {llmLoading && (
        <div style={{ marginTop: 18, color: PRIMARY }}>Generating educational answer...</div>
      )}

      {/* 📸 Image Preview + AI Answer */}
      {llmResponse && (
        <div
          style={{
            marginTop: 24,
            textAlign: 'left',
            maxWidth: 420,
            margin: 'auto',
            background: '#f4f4f4',
            padding: 20,
            borderRadius: 10,
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: PRIMARY }}>
            🔍 Gemini AI Analysis
          </div>
          <img
            src={URL.createObjectURL(file)}
            alt="Uploaded"
            style={{
              width: '100%',
              maxHeight: 240,
              objectFit: 'contain',
              marginBottom: 12,
              borderRadius: 8,
              border: '1px solid #ccc',
            }}
          />
          <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6 }}>
            {llmResponse}
          </div>
        </div>
      )}

      {/* ♻ Recycle Prompt */}
      {showRecyclePrompt && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 16, color: TEXT }}>Choose how to proceed with this item:</p>
          <button
            onClick={() => handleRecycle('recycle')}
            style={{ margin: '0 8px', padding: '8px 16px', background: PRIMARY, color: '#fff', borderRadius: 6 }}
          >
            Recycle
          </button>
          <button
            onClick={() => handleRecycle('analyzed')}
            style={{ margin: '0 8px', padding: '8px 16px', background: '#ccc', color: '#000', borderRadius: 6 }}
          >
            Analyzed
          </button>
        </div>
      )}

      {/* ✅ Success Message */}
      {successMsg && (
        <div style={{ marginTop: 24, color: PRIMARY, fontWeight: 600 }}>{successMsg}</div>
      )}

      {/* ❌ Error Message */}
      {llmError && (
        <div style={{ marginTop: 18, color: '#e57373' }}>{llmError}</div>
      )}
    </div>
  );
}

// ==== 📦 Page Wrapper ====
function UploadImage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        background: BG,
        color: TEXT,
      }}
    >
      {/* 🔝 Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          background: '#fff',
          borderBottom: `2px solid ${PRIMARY_LIGHT}`,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 22, color: PRIMARY }}>
          ♻ E-Waste Recycle
        </div>
        <div style={{ fontSize: 16, fontWeight: 500, color: TEXT }}>Dashboard</div>
      </header>

      {/* 💾 Upload Logic */}
      <CloudinaryImageUpload />

      {/* 📎 Footer */}
      <footer
        style={{
          marginTop: 32,
          padding: '18px 0 12px 0',
          color: SUBTEXT,
          fontSize: 15,
          textAlign: 'center',
        }}
      >
        &copy; {new Date().getFullYear()} E-Waste Analyzer. All rights reserved.
      </footer>
    </div>
  );
}

export default UploadImage;