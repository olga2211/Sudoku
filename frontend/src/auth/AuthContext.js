import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Configure default axios headers
const setupAxiosAuth = (token) => {
  if (token) {
    console.log('Setting up token:', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    console.log('Removing token');
    delete axios.defaults.headers.common['Authorization'];
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    console.log('Initial token check:', token);
    if (token) {
      setUser({ token });
      setupAxiosAuth(token);
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    console.log('Login with token:', token);
    if (!token) {
      console.error('Attempted to login with null token');
      return;
    }
    localStorage.setItem('token', token);
    setupAxiosAuth(token);
    setUser({ token });
  };

  const logout = () => {
    console.log('Logging out');
    localStorage.removeItem('token');
    setupAxiosAuth(null);
    setUser(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user?.token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 