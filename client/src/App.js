import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DocumentList from './components/DocumentList/DocumentList';
import DocumentViewer from './components/DocumentViewer/DocumentViewer';
import Header from './components/Layout/Header';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DocumentList />} />
            <Route path="/document/:id" element={<DocumentViewer />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;