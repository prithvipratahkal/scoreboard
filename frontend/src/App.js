import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Admin from './Admin';
import JudgeLogin from './JudgeLogin';
import EventDetails from './EventDetails';
import Bystander from './Bystander'; // Import the new component
import './Admin.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/judge" element={<JudgeLogin />} />
        <Route path="/judge/event-details" element={<EventDetails />} />
        <Route path="/bystander" element={<Bystander />} /> {/* Add the new route */}
      </Routes>
    </Router>
  );
}

export default App;