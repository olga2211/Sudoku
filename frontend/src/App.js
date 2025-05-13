import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Button, Box, AppBar, Toolbar, Typography } from '@mui/material';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Login from './auth/Login';
import Register from './auth/Register';
import SudokuGrid from './SudokuGrid';
import GameList from './game/GameList';
import './App.css';

const NavBar = () => {
  const { logout } = useAuth();
  
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Sudoku
        </Typography>
        <Button color="inherit" onClick={logout}>
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
};

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? (
    <>
      <NavBar />
      {children}
    </>
  ) : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <GameList />
                </PrivateRoute>
              }
            />
            <Route
              path="/play/new"
              element={
                <PrivateRoute>
                  <SudokuGrid />
                </PrivateRoute>
              }
            />
            <Route
              path="/play/:gameId"
              element={
                <PrivateRoute>
                  <SudokuGrid />
                </PrivateRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
