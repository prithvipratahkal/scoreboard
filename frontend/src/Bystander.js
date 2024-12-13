// frontend/src/Bystander.js
import React, { useEffect, useState } from 'react';
import './Bystander.css';

function Bystander() {
  const [performers, setPerformers] = useState([]);
  const [judges, setJudges] = useState([]);
  const [scores, setScores] = useState({});

  // Base URL from environment variable or default to 'http://localhost:5000'
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchPerformersAndJudges = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/performers-and-judges`);
        const data = await response.json();
        if (response.ok) {
          setPerformers(data.performers);
          setJudges(data.judges);
        } else {
          console.error('Failed to fetch performers and judges:', data.error);
        }
      } catch (error) {
        console.error('Error fetching performers and judges:', error);
      }
    };

    fetchPerformersAndJudges();
  }, [API_BASE_URL]);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/current-scores`);
        const data = await response.json();
        if (response.ok) {
          // Transform the scores into a nested object for easy lookup
          const scoresData = {};
          data.scores.forEach((score) => {
            if (!scoresData[score.performer_id]) {
              scoresData[score.performer_id] = {};
            }
            scoresData[score.performer_id][score.judge_id] = score.total_score;
          });
          setScores(scoresData);
        } else {
          console.error('Failed to fetch current scores:', data.error);
        }
      } catch (error) {
        console.error('Error fetching current scores:', error);
      }
    };

    // Fetch scores every 5 seconds
    fetchScores();
    const intervalId = setInterval(fetchScores, 5000);

    // Cleanup interval on component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [API_BASE_URL]);

  return (
    <div className="bystander-container">
      <h2>Bystander View</h2>
      <table className="bystander-table">
        <thead>
          <tr>
            <th>Performer \ Judge</th>
            {judges.map((judge) => (
              <th key={judge.judge_id}>{judge.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {performers.map((performer) => (
            <tr key={performer.id}>
              <td>{performer.name}</td>
              {judges.map((judge) => (
                <td key={`${performer.id}-${judge.judge_id}`}>
                  {scores[performer.id] && scores[performer.id][judge.judge_id]
                    ? scores[performer.id][judge.judge_id]
                    : 'N/A'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Bystander;