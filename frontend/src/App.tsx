//import React from 'react'; 

import { BrowserRouter as Router, Route, Navigate, Routes } from 'react-router-dom';
import './App.css';

import LoginPage from './pages/LoginPage';
import CardPage from './pages/CardPage';
import RegisterPage from './pages/RegisterPage';
import SoundPage from './pages/SoundPage';
import DiscoverPage from './pages/DiscoverPage';
import AboutPage from "./pages/AboutPage.tsx";
function App() {
  return (
    <Router >
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/cards" element={<CardPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/sound" element={<SoundPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;