import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import {
  FaLeaf,
  FaEdit,
  FaSave,
  FaHome,
  FaMapMarkerAlt,
  FaUserAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaBox,
  FaCheck,
  FaSearch
} from "react-icons/fa";

const PRIMARY = "#2E7D32";
const IMPACT_BG = "#E8F5E9";
const TEXT = "#212121";

const ProfilePage = () => {
  const [uploads, setUploads] = useState([]);
  const [user, setUser] = useState(null);
  const [ecoPoints, setEcoPoints] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (u) {
        setUser(u);
        await fetchUploads(u.uid);
        await fetchProfile(u.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchProfile = async (uid) => {
    const snap = await getDocs(query(collection(db, "profiles"), where("userId", "==", uid)));
    if (!snap.empty) {
      const data = snap.docs[0].data();
      setPhone(data.phone || "");
      setLocation(data.location || "");
    }
  };

  const fetchUploads = async (uid) => {
    const q = query(collection(db, "uploads"), where("userId", "==", uid));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setUploads(data);
    const points = data.reduce((sum, u) => sum + (u.points || 0), 0);
    setEcoPoints(points);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    await setDoc(doc(db, "profiles", user.uid), {
      userId: user.uid,
      phone,
      location,
    });
    setEditMode(false);
  };

  const getProfilePic = () => {
    if (user?.photoURL) return user.photoURL;
    const name = user?.displayName || user?.email?.split("@")?.[0] || "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2E7D32&color=fff&rounded=true&size=128`;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "Segoe UI, Arial, sans-serif",
        background: "#fff",
        color: TEXT,
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f8f8f8",
          padding: "20px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          margin: "30px 0",
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: "20px", color: PRIMARY }}>
          ♻ E-Waste Recycle
        </div>
        <div
          style={{
            display: "flex",
            gap: "20px",
            alignItems: "center",
            fontSize: "16px",
          }}
        >
          <span
            onClick={() => navigate("/dashboard")}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <FaHome /> Dashboard
          </span>
          <span
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <FaMapMarkerAlt /> Nearby Centers
          </span>
          <span
            style={{
              background: "#C8E6C9",
              color: PRIMARY,
              borderRadius: "12px",
              padding: "4px 10px",
              fontWeight: "bold",
            }}
          >
            🌱 {ecoPoints} Eco Points
          </span>
        </div>
      </nav>
      <main
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "20px",
        }}
      >
        <h2 style={{ marginBottom: "5px" }}>My Profile</h2>
        <p style={{ marginBottom: "20px", color: "#555" }}>
          Manage your account and track your eco-friendly journey
        </p>
        <div
          style={{
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "30px",
          }}
        >
          {/* Profile Card */}
          <div
            style={{
              flex: 1,
              background: "#fff",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              minWidth: "300px",
            }}
          >
            <div style={{ textAlign: "left", marginTop: "20px" }}>
              <img
                src={getProfilePic()}
                alt="Avatar"
                style={{
                  display: "block",
                  margin: "0 auto 20px",
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                }}
              />
              <p>
                <strong>Name:</strong>{" "}
                {user?.displayName && user.displayName.trim() !== ""
                  ? user.displayName
                  : user?.email?.split("@")?.[0] || "User"}
              </p>
              <p><strong>Email:</strong> {user?.email}</p>
              <div style={{ marginTop: "10px" }}>
                <p><strong>Phone:</strong> {editMode ? (
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      marginLeft: "10px",
                      padding: "4px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                ) : (
                  <span style={{ marginLeft: "10px" }}>{phone || "Not set"}</span>
                )}</p>
                <p><strong>Location:</strong> {editMode ? (
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    style={{
                      marginLeft: "10px",
                      padding: "4px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                ) : (
                  <span style={{ marginLeft: "10px" }}>{location || "Not set"}</span>
                )}</p>
                {editMode ? (
                  <button
                    onClick={handleSaveProfile}
                    style={{
                      marginTop: "10px",
                      padding: "8px 12px",
                      background: PRIMARY,
                      color: "#fff",
                      borderRadius: "6px",
                      border: "none",
                      width: "100%",
                      cursor: "pointer",
                    }}
                  >
                    <FaSave /> Save
                  </button>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    style={{
                      marginTop: "10px",
                      padding: "8px 12px",
                      background: "#ccc",
                      color: "#000",
                      borderRadius: "6px",
                      border: "none",
                      width: "100%",
                      cursor: "pointer",
                    }}
                  >
                    <FaEdit /> Edit
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Your Impact */}
          <div
            style={{
              flex: 2,
              background: IMPACT_BG,
              padding: "30px",
              borderRadius: "8px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              minWidth: "300px",
            }}
          >
            <h3 style={{ textAlign: "center", marginBottom: "20px" }}>
              🌟 Your Impact
            </h3>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "20px",
                justifyContent: "space-between",
              }}
            >
              <div style={impactBox}>
                <div style={{ fontSize: "22px", fontWeight: "bold" }}>{ecoPoints}</div>
                <div>EcoPoints</div>
              </div>
              <div style={impactBox}>
                <div style={{ fontSize: "22px", fontWeight: "bold" }}>{uploads.length}</div>
                <div>Total Items</div>
              </div>
              <div style={impactBox}>
                <div style={{ fontSize: "22px", fontWeight: "bold" }}>{uploads.filter(u => u.status === "recycled").length}</div>
                <div>Items Recycled</div>
              </div>
              <div style={impactBox}>
                <div style={{ fontSize: "22px", fontWeight: "bold" }}>{uploads.filter(u => u.status === "not_interested").length}</div>
                <div>Items Not Interested</div>
              </div>
            </div>
          </div>
        </div>
        {/* Upload History (Recent Activities) */}
        <section>
          <h3>📦 Recent Activities</h3>
          <div>
            {uploads.length === 0 ? (
              <div style={{ color: '#888', textAlign: 'center' }}>No recent activities yet.</div>
            ) : (
              uploads.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "#fff",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    marginBottom: "10px",
                  }}
                >
                  {item.url && (
                    <img
                      src={item.url}
                      alt="Activity"
                      style={{
                        width: 60,
                        height: 60,
                        marginRight: 10,
                        objectFit: "cover",
                        borderRadius: "4px",
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                      {item.status === 'pickup_scheduled'
                        ? `Pickup Scheduled${item.pickupDateTime ? ': ' + (item.pickupDateTime.toDate ? item.pickupDateTime.toDate().toLocaleString() : new Date(item.pickupDateTime.seconds * 1000).toLocaleString()) : ''}${item.pickupLocation ? ' | Location: ' + item.pickupLocation : ''}`
                        : item.status === 'accepted'
                        ? 'Accepted'
                        : item.status === 'recycled'
                        ? 'Recycled'
                        : 'Not Interested'}
                    </div>
                    <div style={{ fontSize: 13, color: '#555', marginBottom: 4, whiteSpace: 'pre-wrap' }}>
                      {item.aiMsg && item.aiMsg.slice(0, 80)}{item.aiMsg && item.aiMsg.length > 80 ? '...' : ''}
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>{item.uploadedAt?.seconds ? new Date(item.uploadedAt.seconds * 1000).toLocaleString() : ''}</div>
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      marginRight: 20,
                      fontWeight: "bold",
                      color: item.status === 'accepted' ? 'blue' : item.status === 'recycled' ? 'green' : '#888',
                    }}
                  >
                    {item.status === 'accepted' ? `+${item.points || 0}` : item.status === 'recycled' ? `+${item.points || 0}` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

const impactBox = {
  background: "#fff",
  textAlign: "center",
  padding: "24px",
  borderRadius: "10px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  width: "48%", // Ensure two per row with space between
  boxSizing: "border-box",
};

export default ProfilePage;