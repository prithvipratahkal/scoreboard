// frontend/src/EventDetails.js
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './EventDetails.css';

function EventDetails() {
  const location = useLocation();
  const judge = location.state ? location.state.judge : null;
  const email = judge ? judge.email : '';
  const specialJudgeEmail = 'judge1@sjsu.edu';

  // Base URL from environment variable or default to 'http://localhost:5000'
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

  // State for the list of performers
  const [performerOptions, setPerformerOptions] = useState([]);

  // State to track if the event is ongoing
  const [eventOngoing, setEventOngoing] = useState(false);

  // State for the current performer
  const [currentPerformer, setCurrentPerformer] = useState(null);

  // State for scores
  const [scores, setScores] = useState({
    presentation: '',
    stagePresence: '',
    choreography: '',
    timing: '',
    performance: '',
  });

  // State for selecting the next performer (only for the special judge)
  const [nextPerformer, setNextPerformer] = useState('');

  // Options for the score dropdowns
  const scoreOptions = [1, 2, 3, 4, 5];

  // **New State to track voting eligibility**
  const [canVote, setCanVote] = useState(false);

  // Fetch performers from the backend when the component mounts
  useEffect(() => {
    const fetchPerformers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/performers`);
        const data = await response.json();
        console.log('Fetched performers:', data);
        if (response.ok) {
          setPerformerOptions(data.performers);
          console.log('Performer options set:', data.performers);
        } else {
          console.error('Error fetching performers:', data.error);
        }
      } catch (error) {
        console.error('Error fetching performers:', error);
      }
    };

    fetchPerformers();
  }, [API_BASE_URL]);

  // Fetch event status every 5 seconds
  useEffect(() => {
    const fetchEventStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/event-status`);
        const data = await response.json();
        if (response.ok) {
          setEventOngoing(data.is_ongoing);
        } else {
          console.error('Error fetching event status:', data.error);
        }
      } catch (error) {
        console.error('Error fetching event status:', error);
      }
    };

    // Initial fetch
    fetchEventStatus();

    // Set interval to fetch every 5 seconds
    const interval = setInterval(fetchEventStatus, 5000);

    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, [API_BASE_URL]);

  // Function to fetch current performer
  const fetchCurrentPerformer = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/current-performer`);
      const data = await response.json();
      if (response.ok && data.performer) {
        setCurrentPerformer(data.performer);
      } else {
        console.error('Error fetching current performer:', data.error);
        setCurrentPerformer(null);
      }
    } catch (error) {
      console.error('Error fetching current performer:', error);
      setCurrentPerformer(null);
    }
  };

  // Fetch current performer every 5 seconds
  useEffect(() => {
    // Initial fetch
    fetchCurrentPerformer();

    // Set interval to fetch every 5 seconds
    const interval = setInterval(fetchCurrentPerformer, 5000);

    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, [API_BASE_URL]);

  // **New useEffect to check voting eligibility**
  useEffect(() => {
    const fetchCanVote = async () => {
      if (judge && eventOngoing) {
        try {
          const response = await fetch(`${API_BASE_URL}/canVote/${judge.judge_id}`);
          const data = await response.json();
          if (response.ok) {
            setCanVote(data.canVote);
          } else {
            console.error('Error checking voting eligibility:', data.error);
            setCanVote(false);
          }
        } catch (error) {
          console.error('Error checking voting eligibility:', error);
          setCanVote(false);
        }
      } else {
        // If judge not available or event not ongoing, set canVote to false
        setCanVote(false);
      }
    };

    // Initial fetch
    fetchCanVote();

    // Set interval to fetch every 5 seconds
    const interval = setInterval(fetchCanVote, 5000);

    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, [API_BASE_URL, judge, eventOngoing]);

  const handleScoreChange = (e) => {
    setScores({
      ...scores,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmitScores = async (e) => {
    e.preventDefault();

    // Ensure that judge and currentPerformer are available
    if (!judge || !currentPerformer) {
      alert('Judge or current performer information is missing.');
      return;
    }

    // **Check if judge can vote before submitting**
    if (!canVote) {
      alert('You are not eligible to vote at this time.');
      return;
    }

    // Construct the data to send
    const data = {
      judge_id: judge.judge_id,
      performer_id: currentPerformer.id,
      scores: {
        presentation: parseInt(scores.presentation),
        stage_presence: parseInt(scores.stagePresence),
        choreography: parseInt(scores.choreography),
        timing: parseInt(scores.timing),
        performance: parseInt(scores.performance),
      },
    };

    try {
      const response = await fetch(`${API_BASE_URL}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Scores submitted successfully!');
        // Reset scores
        setScores({
          presentation: '',
          stagePresence: '',
          choreography: '',
          timing: '',
          performance: '',
        });
        // **Reset canVote after submission**
        setCanVote(false);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error submitting scores:', error);
      alert('An error occurred while submitting scores.');
    }
  };

  const handleNextPerformerChange = (e) => {
    setNextPerformer(e.target.value);
  };

  const handleSetNextPerformer = async (e) => {
    e.preventDefault();

    if (!nextPerformer) {
      alert('Please select a performer.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/set-current-performer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performer_id: nextPerformer }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Current performer updated successfully!');
        // Reset next performer selection
        setNextPerformer('');
        // Fetch the updated current performer
        fetchCurrentPerformer();
        // **Reset canVote when a new performer is set**
        setCanVote(false);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating current performer:', error);
      alert('An error occurred while updating the current performer.');
    }
  };

  return (
    <div className="event-details-container">
      <h1>Event Details</h1>

      {/* Modal displayed when the event is not ongoing */}
      {!eventOngoing && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>No event in progress.</h2>
          </div>
        </div>
      )}

      {/* Display current performer name */}
      <h2>
        Current Performance: {currentPerformer ? currentPerformer.name : 'Performance Name'}
      </h2>

      {/* **Display warning message if judge cannot vote** */}
      {!canVote && (
        <div className="warning-message">
          <p>You are not eligible to vote yet. Please wait for your turn.</p>
        </div>
      )}

      {/* Form for entering scores */}
      <form onSubmit={handleSubmitScores} className="score-form">
        <h3>Enter Scores</h3>

        <div className="form-group">
          <label>Presentation:</label>
          <select
            name="presentation"
            value={scores.presentation}
            onChange={handleScoreChange}
            required
            disabled={!eventOngoing || !canVote}
          >
            <option value="">Select a score</option>
            {scoreOptions.map((score) => (
              <option key={score} value={score}>
                {score}
              </option>
            ))}
          </select>
        </div>

        {/* Repeat for other score categories */}
        <div className="form-group">
          <label>Stage Presence:</label>
          <select
            name="stagePresence"
            value={scores.stagePresence}
            onChange={handleScoreChange}
            required
            disabled={!eventOngoing || !canVote}
          >
            <option value="">Select a score</option>
            {scoreOptions.map((score) => (
              <option key={score} value={score}>
                {score}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Choreography:</label>
          <select
            name="choreography"
            value={scores.choreography}
            onChange={handleScoreChange}
            required
            disabled={!eventOngoing || !canVote}
          >
            <option value="">Select a score</option>
            {scoreOptions.map((score) => (
              <option key={score} value={score}>
                {score}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Timing:</label>
          <select
            name="timing"
            value={scores.timing}
            onChange={handleScoreChange}
            required
            disabled={!eventOngoing || !canVote}
          >
            <option value="">Select a score</option>
            {scoreOptions.map((score) => (
              <option key={score} value={score}>
                {score}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Performance:</label>
          <select
            name="performance"
            value={scores.performance}
            onChange={handleScoreChange}
            required
            disabled={!eventOngoing || !canVote}
          >
            <option value="">Select a score</option>
            {scoreOptions.map((score) => (
              <option key={score} value={score}>
                {score}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="submit-button"
          disabled={!eventOngoing || !canVote}
        >
          Submit Scores
        </button>
      </form>

      {/* Section only visible to the special judge */}
      {email === specialJudgeEmail && (
        <div className="next-performer-section">
          <h3>Set Next Performer</h3>
          <form onSubmit={handleSetNextPerformer}>
            <div className="form-group">
              <label>Select Next Performer:</label>
              <select
                value={nextPerformer}
                onChange={handleNextPerformerChange}
                required
                disabled={!eventOngoing}
              >
                <option value="">Select a performer</option>
                {performerOptions.map((performer) => (
                  <option key={performer.id} value={performer.id}>
                    {performer.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="submit-button" disabled={!eventOngoing}>
              Set Next Performer
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default EventDetails;