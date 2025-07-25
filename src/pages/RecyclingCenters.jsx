import React, { useState, useEffect } from 'react';

function RecyclingCenters() {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState('');

  useEffect(() => {
    // Mock data - replace with real location service
    setTimeout(() => {
      setCenters([
        {
          id: '1',
          name: 'GreenTech Recycling Center',
          address: '123 Eco Street, Green Valley, CA 90210',
          phone: '(555) 123-4567',
          hours: 'Mon-Fri: 8AM-6PM, Sat: 9AM-4PM',
          distance: '2.3 miles',
          rating: 4.8,
          specialties: ['Smartphones', 'Laptops', 'Tablets']
        },
        {
          id: '2',
          name: 'EcoWaste Solutions',
          address: '456 Recycling Blvd, Sustainability City, CA 90211',
          phone: '(555) 987-6543',
          hours: 'Mon-Sat: 7AM-7PM, Sun: 10AM-3PM',
          distance: '3.7 miles',
          rating: 4.6,
          specialties: ['CRT Monitors', 'Printers', 'Audio Equipment']
        },
        {
          id: '3',
          name: 'Earth First Electronics',
          address: '789 Planet Ave, Eco Park, CA 90212',
          phone: '(555) 456-7890',
          hours: 'Mon-Fri: 9AM-5PM',
          distance: '5.1 miles',
          rating: 4.9,
          specialties: ['Batteries', 'Cables', 'Small Electronics']
        }
      ]);
      setLoading(false);
    }, 1000);

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation('Current Location');
        },
        () => {
          setUserLocation('Location access denied');
        }
      );
    }
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div className="loading-spinner" style={{ marginBottom: '16px' }}></div>
        <p style={{ color: '#6b7280' }}>Finding recycling centers near you...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>Nearby Recycling Centers</h3>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          color: '#10B981',
          background: 'none',
          border: 'none',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'color 0.3s ease'
        }}>
          🧭 Update Location
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {centers.map((center) => (
          <div key={center.id} style={{
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
            transition: 'box-shadow 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>{center.name}</h4>
                <div style={{ display: 'flex', alignItems: 'center', color: '#F59E0B', marginBottom: '8px' }}>
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      style={{ 
                        color: i < Math.floor(center.rating) ? '#F59E0B' : '#d1d5db',
                        marginRight: '2px'
                      }}
                    >
                      ⭐
                    </span>
                  ))}
                  <span style={{ marginLeft: '4px', color: '#6b7280', fontSize: '14px' }}>({center.rating})</span>
                </div>
              </div>
              <span style={{ color: '#10B981', fontWeight: '600', fontSize: '14px' }}>{center.distance}</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ marginRight: '8px' }}>📍</span>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>{center.address}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '8px' }}>📞</span>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>{center.phone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '8px' }}>🕒</span>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>{center.hours}</span>
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <h5 style={{ fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>Specializes in:</h5>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {center.specialties.map((specialty, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '4px 12px',
                      background: '#d1fae5',
                      color: '#065f46',
                      fontSize: '12px',
                      borderRadius: '16px'
                    }}
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }}>
                Get Directions
              </button>
              <button className="btn btn-secondary" style={{ flex: 1 }}>
                Call Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecyclingCenters;