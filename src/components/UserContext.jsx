import React, { createContext, useContext, useState } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [ewasteHistory, setEwasteHistory] = useState([]);

  const addEWasteItem = (item) => {
    const newItem = {
      ...item,
      id: Date.now().toString(),
      uploadDate: new Date().toISOString(),
    };
    setEwasteHistory(prev => [newItem, ...prev]);
  };

  const updateRecyclingInterest = (id, interested) => {
    setEwasteHistory(prev =>
      prev.map(item =>
        item.id === id ? { ...item, interestedInRecycling: interested } : item
      )
    );
  };

  return (
    <UserContext.Provider value={{ ewasteHistory, addEWasteItem, updateRecyclingInterest }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}