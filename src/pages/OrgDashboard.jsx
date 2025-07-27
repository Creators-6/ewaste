import React, { useEffect, useState, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, Timestamp, onSnapshot, addDoc, setDoc } from 'firebase/firestore';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'; // If you have this package, otherwise comment out

const PRIMARY = '#2E7D32';
const BG = '#E8F5E9';
const TEXT = '#212121';
const SUBTEXT = '#555';

// Add CSS for toast animation
const toastStyle = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

const OrgDashboard = () => {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [selected, setSelected] = useState(null); // for modal/expanded view
  const [pickupDateTime, setPickupDateTime] = useState('');
  const [pickupLoading, setPickupLoading] = useState(false);
  const [pickupLocation, setPickupLocation] = useState('');
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'accepted', 'pickup'
  const [notifications, setNotifications] = useState([]); // For new submission notifications
  const [showNotifications, setShowNotifications] = useState(false); // Toggle notification panel
  const tabsRef = useRef(null);
  const [fadingCards, setFadingCards] = useState([]);

  useEffect(() => {
    fetchUploads();
    fetchNotifications();
    
    // Set up real-time listener for all relevant uploads (interested, accepted, pickup_scheduled)
    const uploadsQuery = query(
      collection(db, 'uploads'),
      where('status', 'in', ['interested', 'accepted', 'pickup_scheduled'])
    );
    
    const unsubscribe = onSnapshot(uploadsQuery, (snapshot) => {
      console.log('Real-time update detected. Total documents:', snapshot.docs.length);
      
      snapshot.docChanges().forEach((change) => {
        const uploadData = change.doc.data();
        console.log(`Document ${change.type}: ID=${change.doc.id}, Status=${uploadData.status}`);
        
        if (change.type === 'added') {
          // New submission
          if (uploadData.status === 'interested') {
            console.log('New interested submission detected:', uploadData);
            
            // Create notification in Firestore
            const notificationData = {
              uploadId: change.doc.id,
              message: `New submission from ${uploadData.userName || 'User'} (${uploadData.userEmail})`,
              timestamp: Timestamp.now(),
              read: false,
              userId: auth.currentUser?.uid,
              userDetails: {
                name: uploadData.userName,
                email: uploadData.userEmail,
                phone: uploadData.userPhone,
                itemName: uploadData.itemName,
                description: uploadData.userDescription,
                location: uploadData.location
              }
            };
            
            // Save notification to Firestore
            addDoc(collection(db, 'notifications'), notificationData).then(() => {
              console.log('Notification saved to Firestore');
              // Refresh notifications
              fetchNotifications();
            }).catch(error => {
              console.error('Error saving notification:', error);
            });
            
            // Show toast notification
            setToast(`New submission from ${uploadData.userName || 'User'}`);
            setTimeout(() => setToast(''), 5000);
          }
        } else if (change.type === 'modified') {
          // Status change (interested -> accepted, accepted -> pickup_scheduled, etc.)
          console.log('Status change detected:', uploadData.status);
        }
        
        // Always refresh uploads when any change occurs
        fetchUploads();
      });
    });
    return () => unsubscribe();
  }, []);

  const fetchNotifications = async () => {
    try {
      if (!auth.currentUser) {
        console.error('No authenticated user for notifications');
        return;
      }

      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', auth.currentUser.uid)
      );
      
      const querySnapshot = await getDocs(notificationsQuery);
      const notificationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : new Date(doc.data().timestamp?.seconds * 1000)
      }));
      
      setNotifications(notificationsData);
      console.log('Fetched notifications:', notificationsData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      
      console.log('Notification marked as read:', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const fetchUploads = async () => {
    setLoading(true);
    try {
      // Check if user is authenticated
      if (!auth.currentUser) {
        console.error('No authenticated user');
        setLoading(false);
        return;
      }

      console.log('Fetching uploads for organization...');
      
      // Fetch only uploads with relevant statuses for organization
      const uploadsQuery = query(
        collection(db, 'uploads'),
        where('status', 'in', ['interested', 'accepted', 'pickup_scheduled'])
      );
      
      console.log('Executing query for organization uploads...');
      const querySnapshot = await getDocs(uploadsQuery);
      
      console.log('Query completed successfully');
      console.log('Total documents found:', querySnapshot.docs.length);
      
      const allUploads = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      console.log('Organization uploads from Firestore:', allUploads);
      
      // Log each upload's status for debugging
      allUploads.forEach((upload, index) => {
        console.log(`Upload ${index + 1}: ID=${upload.id}, Status=${upload.status}, User=${upload.userName || 'Unknown'}`);
      });
      
      // Filter on client side for better organization
      const pending = allUploads.filter(u => u.status === 'interested');
      const accepted = allUploads.filter(u => u.status === 'accepted');
      const pickupScheduled = allUploads.filter(u => u.status === 'pickup_scheduled');
      
      console.log('Data processed:', { 
        pending: pending.length, 
        accepted: accepted.length, 
        pickupScheduled: pickupScheduled.length,
        pendingData: pending,
        acceptedData: accepted,
        pickupData: pickupScheduled
      });
      
      setUploads([...pending, ...accepted, ...pickupScheduled]);
      console.log('Uploads state updated with total:', pending.length + accepted.length + pickupScheduled.length);
    } catch (error) {
      console.error('Error fetching uploads:', error);
      setSuccessMsg('Error fetching data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (uploadId) => {
    try {
      if (!auth.currentUser) {
        setSuccessMsg('Error: Not authenticated');
        return;
      }
      
      console.log('Accepting upload:', uploadId);
      console.log('Current user:', auth.currentUser.uid);
      
      const updateData = {
        status: 'accepted',
        acceptedBy: auth.currentUser.uid,
        acceptedAt: Timestamp.now(),
      };
      
      console.log('Updating with data:', updateData);
      
      await updateDoc(doc(db, 'uploads', uploadId), updateData);
      
      console.log('Update completed successfully');
      setSuccessMsg('Request accepted!');
      setToast('Request accepted successfully!');
      setTimeout(() => setToast(''), 3000);
      
      console.log('Refreshing uploads...');
      await fetchUploads();
      setSelected(null);
    } catch (err) {
      console.error('Error accepting upload:', err);
      setSuccessMsg('Error: ' + err.message);
    }
  };

  const handleReject = async (uploadId) => {
    try {
      if (!auth.currentUser) {
        setSuccessMsg('Error: Not authenticated');
        return;
      }
      
      console.log('Rejecting upload:', uploadId);
      await updateDoc(doc(db, 'uploads', uploadId), {
        status: 'rejected',
        rejectedBy: auth.currentUser.uid,
        rejectedAt: Timestamp.now(),
      });
      setSuccessMsg('Request rejected.');
      setToast('Request rejected successfully!');
      setTimeout(() => setToast(''), 3000);
      await fetchUploads();
      setSelected(null);
    } catch (err) {
      console.error('Error rejecting upload:', err);
      setSuccessMsg('Error: ' + err.message);
    }
  };

  const handleSchedulePickup = async (uploadId) => {
    if (!pickupDateTime) {
      setSuccessMsg('Please select a pickup date and time.');
      return;
    }
    if (!pickupLocation) {
      setSuccessMsg('Please enter a pickup location.');
      return;
    }
    
    if (!auth.currentUser) {
      setSuccessMsg('Error: Not authenticated');
      return;
    }
    
    setPickupLoading(true);
    try {
      console.log('Scheduling pickup for:', uploadId);
      await updateDoc(doc(db, 'uploads', uploadId), {
        pickupScheduled: true,
        pickupDateTime: Timestamp.fromDate(new Date(pickupDateTime)),
        pickupLocation: pickupLocation,
        status: 'pickup_scheduled',
        scheduledBy: auth.currentUser.uid,
        scheduledAt: Timestamp.now(),
      });
      setSuccessMsg('Pickup scheduled!');
      setToast('Pickup scheduled!');
      await fetchUploads();
      setSelected(null);
      setPickupDateTime('');
      setPickupLocation('');
    } catch (err) {
      console.error('Error scheduling pickup:', err);
      setSuccessMsg('Error scheduling pickup: ' + err.message);
    } finally {
      setPickupLoading(false);
    }
  };

  const handleMarkDone = async (uploadId) => {
    try {
      await updateDoc(doc(db, 'uploads', uploadId), {
        status: 'done',
      });
      setSuccessMsg('Marked as done!');
      setToast('Pickup marked as done!');
      setFadingCards((prev) => [...prev, uploadId]);
      setTimeout(async () => {
        await fetchUploads();
        setFadingCards((prev) => prev.filter(id => id !== uploadId));
      }, 400);
      setSelected(null);
    } catch (err) {
      setSuccessMsg('Error marking as done: ' + err.message);
    }
  };

  // For rescheduling
  const handleReschedulePickup = async (uploadId) => {
    if (!pickupDateTime) {
      setSuccessMsg('Please select a pickup date and time.');
      return;
    }
    if (!pickupLocation) {
      setSuccessMsg('Please enter a pickup location.');
      return;
    }
    setPickupLoading(true);
    try {
      await updateDoc(doc(db, 'uploads', uploadId), {
        pickupScheduled: true,
        pickupDateTime: Timestamp.fromDate(new Date(pickupDateTime)),
        pickupLocation: pickupLocation,
        status: 'pickup_scheduled',
      });
      setSuccessMsg('Pickup rescheduled!');
      setToast('Pickup rescheduled!');
      await fetchUploads();
      setSelected(null);
      setPickupDateTime('');
      setPickupLocation('');
    } catch (err) {
      setSuccessMsg('Error rescheduling pickup: ' + err.message);
    } finally {
      setPickupLoading(false);
    }
  };

  const pending = uploads.filter(u => u.status === 'interested');
  const accepted = uploads.filter(u => u.status === 'accepted');
  const pickupScheduled = uploads.filter(u => u.status === 'pickup_scheduled');
  const pendingCount = pending.length;
  const acceptedCount = accepted.length;
  const pickupScheduledCount = pickupScheduled.length;
  const totalCount = uploads.length;

  // Debug logging for state changes
  useEffect(() => {
    console.log('Uploads state changed:', {
      totalUploads: uploads.length,
      pendingCount,
      acceptedCount,
      pickupScheduledCount,
      pendingData: pending,
      activeTab
    });
  }, [uploads, pendingCount, acceptedCount, pickupScheduledCount, activeTab]);

  // Helper for org profile icon
  const getOrgProfileIcon = () => {
    if (auth.currentUser?.photoURL) return <img src={auth.currentUser.photoURL} alt="Profile" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />;
    // Default SVG icon
    return <img src="data:image/svg+xml,%3Csvg width='44' height='44' viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='32' cy='32' r='32' fill='%232E7D32'/%3E%3Ccircle cx='32' cy='26' r='12' fill='white'/%3E%3Cellipse cx='32' cy='48' rx='16' ry='10' fill='white'/%3E%3C/svg%3E" alt="Profile" style={{ width: 44, height: 44, borderRadius: '50%' }} />;
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, fontFamily: 'Segoe UI, Arial, sans-serif' }}>
      <style>{toastStyle}</style>
      
      {/* Navigation Bar */}
      <nav style={{
        background: '#fff',
        borderBottom: '1px solid #e0e0e0',
        padding: '0 40px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0'
        }}>
          {/* Left: Brand/Title */}
          <div style={{ fontSize: 24, fontWeight: 700, color: PRIMARY }}>
            Organization Dashboard
          </div>
          {/* Right: Notification bell, Profile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 22,
                  color: TEXT,
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  position: 'relative'
                }}
              >
                🔔
                {notifications.filter(n => !n.read).length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: '#f44336',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              {/* Notification Panel */}
              {showNotifications && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  width: '350px',
                  maxHeight: '400px',
                  background: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: '1px solid #e0e0e0',
                    fontWeight: 600,
                    fontSize: 14,
                    color: TEXT
                  }}>
                    <span>Notifications ({notifications.filter(n => !n.read).length})</span>
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
                  <div style={{ maxHeight: '300px' }}>
                    {notifications.filter(n => !n.read).length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: SUBTEXT }}>
                        No unread notifications
                      </div>
                    ) : (
                      notifications.filter(n => !n.read).map((notification, index) => (
                        <div 
                          key={notification.id || index}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #f0f0f0',
                            background: notification.read ? '#fff' : '#f8f9fa',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            position: 'relative'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: TEXT, marginBottom: 4 }}>
                              {notification.message}
                            </div>
                            <div style={{ fontSize: 11, color: SUBTEXT }}>
                              {notification.timestamp.toLocaleString()}
                            </div>
                            {notification.userDetails && (
                              <div style={{ fontSize: 11, color: SUBTEXT, marginTop: 4 }}>
                                Item: {notification.userDetails.itemName} | Location: {notification.userDetails.location}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markNotificationAsRead(notification.id);
                            }}
                            style={{
                              background: '#4caf50',
                              color: '#fff',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 500,
                              cursor: 'pointer',
                              marginLeft: 8,
                              transition: 'background 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#45a049'}
                            onMouseLeave={(e) => e.target.style.background = '#4caf50'}
                          >
                            Ok
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Dismiss notification (mark as read)
                              markNotificationAsRead(notification.id);
                            }}
                            style={{
                              background: 'transparent',
                              color: '#888',
                              border: 'none',
                              fontSize: 18,
                              cursor: 'pointer',
                              marginLeft: 4
                            }}
                            aria-label="Dismiss notification"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Profile logo */}
            <a href="/org-profile" style={{ textDecoration: 'none' }}>
              {getOrgProfileIcon()}
            </a>
          </div>
        </div>
      </nav>
      {/* Full Width Organization Banner */}
<div style={{ 
  background: '#E8F5E9', 
  color: '#000000', 
  padding: '60px 40px',
  textAlign: 'center',
  width: '100%',
  height: '300px',
  boxShadow: '0 4px 32px rgba(46,125,50,0.10)',
  borderBottomLeftRadius: 32,
  borderBottomRightRadius: 32,
  position: 'relative',
  overflow: 'hidden',
  justifyContent: 'center',  // Horizontal center
  alignItems: 'center',      // Vertical center
  textAlign: 'center'
}}>
  {/* Subtle pattern overlay */}
  <div style={{
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'radial-gradient(circle at 20% 40%, rgba(255,255,255,0.08) 0%, transparent 70%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.06) 0%, transparent 70%)',
    zIndex: 0
  }} />

  {/* Content container with flex layout */}
  <div style={{ 
    position: 'relative', 
    zIndex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
    width: '100%'
  }}>
    {/* Text content on the left */}
    <div style={{ 
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',      // ⬅️ horizontal center inside this column
      textAlign: 'center',
    }}>
      <div style={{ fontWeight: 700, fontSize: 48, marginBottom: 16 }}>♻ E-Waste Recycle</div>
      <div style={{ fontSize: 24, fontWeight: 500, opacity: 0.9, marginBottom: 8 }}>
        Welcome to your Organization Dashboard
      </div>
      <div style={{ fontSize: 16, opacity: 0.8 }}>
        Easily manage, track, and complete e-waste recycling pickups for your community.
      </div>
    </div>
    
    {/* Image on the right */}
    <div style={{
      flex: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%'
    }}>
      <img 
        src="https://i.postimg.cc/6QC2T97g/ly0-Rh-Nb-Dipxmdflgg9bqi-removebg-preview.png" 
        alt="E-Waste Recycling" 
        style={{
          maxHeight: '350px',
          maxWidth: '400px',
          objectFit: 'contain',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.1))'
        }}
      />
    </div>
  </div>
</div>
   
    {/* Summary Cards - Full Width */}
      <div style={{ 
        background: '#fff', 
        padding: '40px 0',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 30px' }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <div 
              onClick={() => {
                setActiveTab('pending');
                setTimeout(() => {
                  tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              style={{
                flex: 1, background: '#fffbe6', borderRadius: 14, boxShadow: '0 2px 8px #f5e9c6',
                padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center',
                cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 16px #f5e9c6';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px #f5e9c6';
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 20, color: '#7a5d00', marginBottom: 8 }}>Pending Reviews</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#7a5d00' }}>{pendingCount}</div>
            </div>
            <div 
              onClick={() => {
                setActiveTab('accepted');
                setTimeout(() => {
                  tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              style={{
                flex: 1, background: '#e8f5e9', borderRadius: 14, boxShadow: '0 2px 8px #c8e6c9',
                padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center',
                cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 16px #c8e6c9';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px #c8e6c9';
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 20, color: '#2e7d32', marginBottom: 8 }}>Accepted</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#2e7d32' }}>{acceptedCount}</div>
            </div>
            <div 
              onClick={() => {
                setActiveTab('pickup');
                setTimeout(() => {
                  tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              style={{
                flex: 1, background: '#e3f2fd', borderRadius: 14, boxShadow: '0 2px 8px #e3eafc',
                padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center',
                cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 16px #e3eafc';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px #e3eafc';
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 20, color: '#1e3a5c', marginBottom: 8 }}>Pickup Scheduled</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#1e3a5c' }}>{pickupScheduledCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#4caf50',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 2000,
          fontSize: 14,
          fontWeight: 500,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}

      {/* Main Content - Tabs Section */}
      <main ref={tabsRef} style={{ maxWidth: 1200, margin: '0 auto', padding: 40 }}>
        {/* Tab Menu */}
        <div style={{
          background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: 24, marginBottom: 24
        }}>
          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #f0f0f0' }}>
            <button
              onClick={() => setActiveTab('pending')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: activeTab === 'pending' ? PRIMARY : 'transparent',
                color: activeTab === 'pending' ? '#fff' : TEXT,
                borderRadius: '8px 8px 0 0',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 16,
                transition: 'all 0.2s ease'
              }}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('accepted')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: activeTab === 'accepted' ? PRIMARY : 'transparent',
                color: activeTab === 'accepted' ? '#fff' : TEXT,
                borderRadius: '8px 8px 0 0',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 16,
                transition: 'all 0.2s ease'
              }}
            >
              Accepted ({acceptedCount})
            </button>
            <button
              onClick={() => setActiveTab('pickup')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: activeTab === 'pickup' ? PRIMARY : 'transparent',
                color: activeTab === 'pickup' ? '#fff' : TEXT,
                borderRadius: '8px 8px 0 0',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 16,
                transition: 'all 0.2s ease'
              }}
            >
              Pickup Scheduled ({pickupScheduledCount})
            </button>
          </div>

          {/* Tab Content */}
          {loading ? (
            <div style={{ color: PRIMARY, textAlign: 'center', marginTop: 40 }}>Loading requests...</div>
          ) : (
            <>
              {/* Pending Tab */}
              {activeTab === 'pending' && (
                <div>
                  <h3 style={{ color: PRIMARY, fontWeight: 700, marginBottom: 8 }}>Pending Submissions</h3>
                  <p style={{ color: SUBTEXT, marginBottom: 18 }}>Review and manage user requests</p>
                  {pendingCount === 0 ? (
                    <div style={{ color: SUBTEXT, textAlign: 'center', marginTop: 40 }}>
                      <span style={{ fontSize: 48, display: 'block', marginBottom: 8 }}>📄</span>
                      No pending submissions
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                      {pending.map((item) => (
                        <div key={item.id} style={{
                          background: '#f9f9f9', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                          padding: 18, minWidth: 260, maxWidth: 320, flex: '1 1 260px', textAlign: 'center', cursor: 'pointer'
                        }} onClick={() => { setSelected(item); setPickupDateTime(''); }}>
                          {item.url && (
                            <img src={item.url} alt="E-waste" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 10, border: '1px solid #eee' }} />
                          )}
                          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{item.userName || 'User'}</div>
                          <div style={{ fontSize: 14, color: SUBTEXT, marginBottom: 6 }}>{item.userEmail}</div>
                          <div style={{ fontSize: 13, color: '#555', marginBottom: 10, whiteSpace: 'pre-wrap', textAlign: 'left' }}>{item.userDescription}</div>
                          <div style={{ fontSize: 13, padding: '2px 8px', borderRadius: 5, background: '#fffbe6', color: '#7a5d00', marginBottom: 10 }}>Pending</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Accepted Tab */}
              {activeTab === 'accepted' && (
                <div>
                  <h3 style={{ color: PRIMARY, fontWeight: 700, marginBottom: 8 }}>Accepted Submissions</h3>
                  {accepted.length === 0 ? (
                    <div style={{ color: SUBTEXT, textAlign: 'center', marginTop: 20 }}>No accepted submissions</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                      {accepted.map((item) => (
                        <div key={item.id} style={{
                          background: '#e8f5e9', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                          padding: 18, minWidth: 260, maxWidth: 320, flex: '1 1 260px', textAlign: 'center', cursor: 'pointer'
                        }} onClick={() => { setSelected(item); setPickupDateTime(''); setPickupLocation(''); }}>
                          {item.url && (
                            <img src={item.url} alt="E-waste" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 10, border: '1px solid #eee' }} />
                          )}
                          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{item.userName || 'User'}</div>
                          <div style={{ fontSize: 14, color: SUBTEXT, marginBottom: 6 }}>{item.userEmail}</div>
                          <div style={{ fontSize: 13, color: '#555', marginBottom: 10, whiteSpace: 'pre-wrap', textAlign: 'left' }}>{item.userDescription}</div>
                          <div style={{ fontSize: 13, padding: '2px 8px', borderRadius: 5, background: '#e8f5e9', color: '#2e7d32', marginBottom: 10 }}>Accepted</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pickup Scheduled Tab */}
              {activeTab === 'pickup' && (
                <div>
                  <h3 style={{ color: PRIMARY, fontWeight: 700, marginBottom: 8 }}>Pickup Scheduled</h3>
                  {pickupScheduled.length === 0 ? (
                    <div style={{ color: SUBTEXT, textAlign: 'center', marginTop: 20 }}>No pickups scheduled</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                      {pickupScheduled.map((item) => (
                        <div key={item.id} style={{
                          background: '#e3f2fd', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                          padding: 18, minWidth: 260, maxWidth: 320, flex: '1 1 260px', textAlign: 'center', cursor: 'pointer',
                          opacity: fadingCards.includes(item.id) ? 0 : 1,
                          transition: 'opacity 0.4s',
                        }} onClick={() => { setSelected(item); setPickupDateTime(''); setPickupLocation(''); }}>
                          {item.url && (
                            <img src={item.url} alt="E-waste" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 10, border: '1px solid #eee' }} />
                          )}
                          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{item.userName || 'User'}</div>
                          <div style={{ fontSize: 14, color: SUBTEXT, marginBottom: 6 }}>{item.userEmail}</div>
                          <div style={{ fontSize: 13, color: '#555', marginBottom: 10, whiteSpace: 'pre-wrap', textAlign: 'left' }}>{item.userDescription}</div>
                          <div style={{ fontSize: 13, padding: '2px 8px', borderRadius: 5, background: '#fffbe6', color: '#7a5d00', marginBottom: 10 }}>Pickup Scheduled</div>
                          {/* Show pickup info if scheduled */}
                          {item.pickupScheduled && item.pickupDateTime && (
                            <div style={{ fontSize: 13, color: '#1e3a5c', marginTop: 8, background: '#fff', borderRadius: 6, padding: '6px 0' }}>
                              <b>Pickup Scheduled:</b><br />
                              {item.pickupDateTime.toDate ? item.pickupDateTime.toDate().toLocaleString() : new Date(item.pickupDateTime.seconds * 1000).toLocaleString()}<br />
                              {item.pickupLocation && (<span><b>Location:</b> {item.pickupLocation}</span>)}
                            </div>
                          )}
                          {/* Pickup Done Button */}
                          <button
                            style={{
                              background: '#2E7D32',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              padding: '8px 16px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              marginLeft: 12,
                              marginTop: 8
                            }}
                            onClick={() => handleMarkDone(item.id)}
                            disabled={item.status === 'done'}
                          >
                            {item.status === 'done' ? 'Pickup Completed' : 'Pickup Done'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal/expanded view for selected card */}
        {selected && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelected(null)}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 32, minWidth: 320, maxWidth: 400, boxShadow: '0 4px 32px rgba(0,0,0,0.18)', position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 22, color: PRIMARY, cursor: 'pointer' }}>×</button>
              {selected.url && (
                <img src={selected.url} alt="E-waste" style={{ width: 180, height: 180, objectFit: 'cover', borderRadius: 10, marginBottom: 16, border: '1px solid #eee' }} />
              )}
              <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 8 }}>{selected.userName || 'User'}</div>
              <div style={{ fontSize: 15, color: TEXT, marginBottom: 6 }}><b>Email:</b> {selected.userEmail}</div>
              <div style={{ fontSize: 15, color: TEXT, marginBottom: 6 }}><b>Phone:</b> {selected.userPhone}</div>
              <div style={{ fontSize: 15, color: TEXT, marginBottom: 6 }}><b>Item Name:</b> {selected.itemName}</div>
              <div style={{ fontSize: 15, color: TEXT, marginBottom: 10, whiteSpace: 'pre-wrap' }}><b>Description:</b> {selected.userDescription}</div>
              {/* Pickup scheduling for accepted submissions */}
              {selected.status === 'accepted' && (
                <div style={{ marginTop: 18 }}>
                  <label style={{ fontWeight: 600, color: PRIMARY, marginBottom: 6, display: 'block' }}>Schedule Pickup:</label>
                  <input
                    type="datetime-local"
                    value={pickupDateTime}
                    onChange={e => setPickupDateTime(e.target.value)}
                    style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', marginBottom: 10, width: '100%' }}
                  />
                  <input
                    type="text"
                    value={pickupLocation}
                    onChange={e => setPickupLocation(e.target.value)}
                    required
                    placeholder="Pickup Location"
                    style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', marginBottom: 10, width: '100%' }}
                  />
                  <button
                    onClick={() => handleSchedulePickup(selected.id)}
                    style={{ padding: '8px 18px', background: PRIMARY, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer', width: '100%' }}
                    disabled={pickupLoading}
                  >
                    {pickupLoading ? 'Scheduling...' : 'Schedule Pickup'}
                  </button>
                </div>
              )}
              {/* Accept/Reject for pending submissions */}
              {selected.status === 'interested' && (
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={() => handleAccept(selected.id)} style={{ padding: '8px 18px', background: PRIMARY, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Accept</button>
                  <button onClick={() => handleReject(selected.id)} style={{ padding: '8px 18px', background: '#ccc', color: '#000', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Reject</button>
                </div>
              )}
              {/* Pickup scheduled info, reschedule, and Done button in modal */}
              {selected.status === 'pickup_scheduled' && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontWeight: 600, color: PRIMARY, marginBottom: 6 }}>Pickup Scheduled:</div>
                  <div style={{ marginBottom: 6 }}>
                    {selected.pickupDateTime && (selected.pickupDateTime.toDate ? selected.pickupDateTime.toDate().toLocaleString() : new Date(selected.pickupDateTime.seconds * 1000).toLocaleString())}
                  </div>
                  {selected.pickupLocation && (
                    <div style={{ marginBottom: 12 }}><b>Location:</b> {selected.pickupLocation}</div>
                  )}
                  {/* Map for location (if you have Google Maps API and @react-google-maps/api) */}
                  {/* {selected.pickupLocation && (
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '120px', marginTop: 8 }}
                      center={{ lat: ..., lng: ... }} // Geocode the address if needed
                      zoom={15}
                    >
                      <Marker position={{ lat: ..., lng: ... }} />
                    </GoogleMap>
                  )} */}
                  <button
                    onClick={() => handleMarkDone(selected.id)}
                    style={{ padding: '8px 18px', background: PRIMARY, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer', width: '100%', marginBottom: 10 }}
                  >
                    Done
                  </button>
                  {/* Reschedule UI */}
                  <label style={{ fontWeight: 600, color: PRIMARY, marginBottom: 6, display: 'block' }}>Reschedule Pickup:</label>
                  <input
                    type="datetime-local"
                    value={pickupDateTime}
                    onChange={e => setPickupDateTime(e.target.value)}
                    style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', marginBottom: 10, width: '100%' }}
                  />
                  <input
                    type="text"
                    value={pickupLocation}
                    onChange={e => setPickupLocation(e.target.value)}
                    required
                    placeholder="Pickup Location"
                    style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', marginBottom: 10, width: '100%' }}
                  />
                  <button
                    onClick={() => handleReschedulePickup(selected.id)}
                    style={{ padding: '8px 18px', background: '#388e3c', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer', width: '100%' }}
                    disabled={pickupLoading}
                  >
                    {pickupLoading ? 'Rescheduling...' : 'Reschedule Pickup'}
                  </button>
                </div>
              )}
              {/* Show toast/alert */}
              {toast && (
                <div style={{ background: '#d4f5d4', color: PRIMARY, padding: '10px', borderRadius: 8, margin: '10px 0', fontWeight: 600, textAlign: 'center' }}>{toast}</div>
              )}
            </div>
          </div>
        )}
      </main>
      <footer style={{ marginTop: 32, padding: '18px 0 12px 0', color: SUBTEXT, fontSize: 15, textAlign: 'center' }}>
        &copy; {new Date().getFullYear()} E-Waste Recycle. All rights reserved.
      </footer>
    </div>
  );
};

export default OrgDashboard; 
