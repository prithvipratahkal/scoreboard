import React, { useState, useEffect } from 'react';
import './Admin.css';

function Admin() {
  // Base URL from environment variable or default to 'http://localhost:5000'
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

  // State to track event status (started or stopped)
  const [eventActive, setEventActive] = useState(false);

  // State to control the display of the modal
  const [showModal, setShowModal] = useState(false);

  // State to indicate if data is loading
  const [loading, setLoading] = useState(true);

  // New state variables
  const [finalScores, setFinalScores] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState(null);

  // Fetch event status from the backend on component mount
  useEffect(() => {
    const fetchEventStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/event-status`);
        const data = await response.json();
        setEventActive(data.is_ongoing);
      } catch (error) {
        console.error('Error fetching event status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventStatus();
  }, [API_BASE_URL]);

  // Function to fetch final scores
  const fetchFinalScores = async () => {
    setLoadingReport(true);
    try {
      const response = await fetch(`${API_BASE_URL}/final-scores`);
      const data = await response.json();
      if (response.ok) {
        // Initialize showDetails property
        const scoresWithDetails = data.scores.map((item) => ({
          ...item,
          showDetails: false,
        }));
        setFinalScores(scoresWithDetails);
        setError(null);
      } else {
        console.error('Error fetching final scores:', data.error);
        setError('Error fetching final scores.');
        setFinalScores([]);
      }
    } catch (error) {
      console.error('Error fetching final scores:', error);
      setError('Error fetching final scores.');
      setFinalScores([]);
    } finally {
      setLoadingReport(false);
    }
  };

  // Function to handle opening the modal and fetching scores
  const handleOpenModal = () => {
    setShowModal(true);
    fetchFinalScores();
  };

  // Function to close the modal
  const handleCloseModal = () => {
    setShowModal(false);
    setFinalScores([]);
  };

  // Function to toggle judge details for a performer
  const toggleDetails = (index) => {
    setFinalScores((prevScores) =>
      prevScores.map((item, idx) =>
        idx === index ? { ...item, showDetails: !item.showDetails } : item
      )
    );
  };

  // Handler to toggle event status
  const handleToggleEvent = async () => {
    try {
      // Send POST request to toggle the event status
      const response = await fetch(`${API_BASE_URL}/change-event`, {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        setEventActive(data.new_status);
      } else {
        console.error('Error toggling event status:', data.error);
      }
    } catch (error) {
      console.error('Error toggling event status:', error);
    }
  };

  return (
    <div className="admin-container">
      <h1>Admin Panel</h1>

      {loading ? (
        <p>Loading event status...</p>
      ) : (
        <>
          {/* Display current event status */}
          <p className="event-status">
            Event is currently{' '}
            <span className={eventActive ? 'status-active' : 'status-inactive'}>
              {eventActive ? 'Active' : 'Inactive'}
            </span>
          </p>

          {/* Start/Stop Event Button */}
          <button className="admin-button" onClick={handleToggleEvent}>
            {eventActive ? 'Stop Event' : 'Start Event'}
          </button>

          {/* View Full Report Button */}
          <button
            className="admin-button"
            onClick={handleOpenModal}
            disabled={eventActive}
          >
            View Full Report
          </button>
        </>
      )}

      {/* Modal Component */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={handleCloseModal}>
              &times;
            </button>
            <h2>Event Report</h2>
            {loadingReport ? (
              <p>Loading report...</p>
            ) : error ? (
              <p>{error}</p>
            ) : finalScores.length > 0 ? (
              <table className="scores-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Performer</th>
                    <th>Total Score</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {finalScores.map((performer, index) => (
                    <React.Fragment key={performer.performer_name}>
                      <tr>
                        <td>{index + 1}</td>
                        <td>{performer.performer_name}</td>
                        <td>{performer.total_score.toFixed(2)}</td>
                        <td>
                          <button onClick={() => toggleDetails(index)}>
                            {performer.showDetails ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>
                      {performer.showDetails && (
                        <tr>
                          <td colSpan="4">
                            <table className="judge-scores-table">
                              <thead>
                                <tr>
                                  <th>Judge Name</th>
                                  <th>Presentation</th>
                                  <th>Stage Presence</th>
                                  <th>Choreography</th>
                                  <th>Timing</th>
                                  <th>Performance</th>
                                  <th>Weight</th>
                                  <th>Weighted Score</th>
                                </tr>
                              </thead>
                              <tbody>
                                {performer.judge_scores.map((judgeScore, idx) => (
                                  <tr key={idx}>
                                    <td>{judgeScore.judge_name}</td>
                                    <td>{judgeScore.presentation}</td>
                                    <td>{judgeScore.stage_presence}</td>
                                    <td>{judgeScore.choreography}</td>
                                    <td>{judgeScore.timing}</td>
                                    <td>{judgeScore.performance}</td>
                                    <td>{judgeScore.weight}</td>
                                    <td>{judgeScore.weighted_score.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No scores available.</p>
            )}
            <button className="admin-button" onClick={handleCloseModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;