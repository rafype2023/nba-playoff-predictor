import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [step, setStep] = useState(1);
  const [predictions, setPredictions] = useState({
    firstRound: {},
    semifinals: {},
    conferenceFinals: {},
    finals: { finals: {} }
  });
  const [playInSelections, setPlayInSelections] = useState({ east: {}, west: {} });
  const [userData, setUserData] = useState({ name: '', email: '', phone: '', comments: '', paymentMethod: '' });
  const [nbaStats, setNbaStats] = useState({});
  const [error, setError] = useState(null);

  const teams = [
    "Atlanta Hawks", "Boston Celtics", "Brooklyn Nets", "Charlotte Hornets", "Chicago Bulls",
    "Cleveland Cavaliers", "Dallas Mavericks", "Denver Nuggets", "Detroit Pistons", "Golden State Warriors",
    "Houston Rockets", "Indiana Pacers", "LA Clippers", "Los Angeles Lakers", "Memphis Grizzlies",
    "Miami Heat", "Milwaukee Bucks", "Minnesota Timberwolves", "New Orleans Pelicans", "New York Knicks",
    "Oklahoma City Thunder", "Orlando Magic", "Philadelphia 76ers", "Phoenix Suns", "Portland Trail Blazers",
    "Sacramento Kings", "San Antonio Spurs", "Toronto Raptors", "Utah Jazz", "Washington Wizards"
  ];

  const easternConference = teams.filter(team => 
    ["East"].includes(team.split(' ')[0]) || 
    ["Atlanta", "Boston", "Brooklyn", "Charlotte", "Chicago", "Cleveland", "Detroit", "Indiana", "Miami", "Milwaukee", "New York", "Orlando", "Philadelphia", "Toronto", "Washington"].includes(team.split(' ')[0])
  );
  const westernConference = teams.filter(team => 
    ["West"].includes(team.split(' ')[0]) || 
    ["Dallas", "Denver", "Golden State", "Houston", "LA", "Los Angeles", "Memphis", "Minnesota", "New Orleans", "Oklahoma City", "Phoenix", "Portland", "Sacramento", "San Antonio", "Utah"].includes(team.split(' ')[0])
  );

  const fetchNbaStats = async (team1, team2) => {
    try {
      const response = await fetch(`/api/nba-stats?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setNbaStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching NBA stats:', err);
      setError(`Load failed: ${err.message}`);
      setNbaStats({});
    }
  };

  const handlePredictionChange = (round, match, field, value) => {
    setPredictions(prev => ({
      ...prev,
      [round]: {
        ...prev[round],
        [match]: {
          ...prev[round]?.[match],
          [field]: value
        }
      }
    }));
  };

  const handlePlayInChange = (conference, position, team) => {
    setPlayInSelections(prev => ({
      ...prev,
      [conference]: {
        ...prev[conference],
        [position]: team
      }
    }));
  };

  const handleUserDataChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userData, predictions, playInSelections })
      });
      if (!response.ok) throw new Error('Failed to save prediction');
      const data = await response.json();
      console.log('Prediction saved:', data);
      
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userData, predictions, playInSelections })
      });
      setStep(4); // Move to next step after submission
    } catch (err) {
      console.error('Error submitting prediction:', err);
      setError('Failed to submit prediction');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2>Step 1 of 7: Play-In Selections</h2>
            <h3>Eastern Conference</h3>
            <select value={playInSelections.east.seven || ''} onChange={(e) => handlePlayInChange('east', 'seven', e.target.value)}>
              <option value="">Select No. 7 Seed</option>
              {easternConference.map(team => <option key={team} value={team}>{team}</option>)}
            </select>
            <select value={playInSelections.east.eight || ''} onChange={(e) => handlePlayInChange('east', 'eight', e.target.value)}>
              <option value="">Select No. 8 Seed</option>
              {easternConference.map(team => <option key={team} value={team}>{team}</option>)}
            </select>
            <h3>Western Conference</h3>
            <select value={playInSelections.west.seven || ''} onChange={(e) => handlePlayInChange('west', 'seven', e.target.value)}>
              <option value="">Select No. 7 Seed</option>
              {westernConference.map(team => <option key={team} value={team}>{team}</option>)}
            </select>
            <select value={playInSelections.west.eight || ''} onChange={(e) => handlePlayInChange('west', 'eight', e.target.value)}>
              <option value="">Select No. 8 Seed</option>
              {westernConference.map(team => <option key={team} value={team}>{team}</option>)}
            </select>
            <button onClick={() => setStep(2)}>Next</button>
          </div>
        );
      case 2:
        return (
          <div>
            <h2>Step 2 of 7: First Round Matchups</h2>
            <h3>Eastern Conference</h3>
            {[['east-1', 'east-8'], ['east-4', 'east-5'], ['east-3', 'east-6'], ['east-2', 'east-7']].map(([higher, lower]) => (
              <div key={higher}>
                <select value={predictions.firstRound[higher]?.winner || ''} onChange={(e) => handlePredictionChange('firstRound', higher, 'winner', e.target.value)}>
                  <option value="">Select Winner</option>
                  {[teams.find(t => t.includes(higher.split('-')[1])), teams.find(t => t.includes(lower.split('-')[1]))].filter(Boolean).map(team => <option key={team} value={team}>{team}</option>)}
                </select>
                <select value={predictions.firstRound[higher]?.games || ''} onChange={(e) => handlePredictionChange('firstRound', higher, 'games', e.target.value)}>
                  <option value="">Games</option>
                  {[4, 5, 6, 7].map(games => <option key={games} value={games}>{games}</option>)}
                </select>
                {error && <p style={{ color: 'red' }}>{error}</p>}
              </div>
            ))}
            <h3>Western Conference</h3>
            {[['west-1', 'west-8'], ['west-4', 'west-5'], ['west-3', 'west-6'], ['west-2', 'west-7']].map(([higher, lower]) => (
              <div key={higher}>
                <select value={predictions.firstRound[higher]?.winner || ''} onChange={(e) => handlePredictionChange('firstRound', higher, 'winner', e.target.value)}>
                  <option value="">Select Winner</option>
                  {[teams.find(t => t.includes(higher.split('-')[1])), teams.find(t => t.includes(lower.split('-')[1]))].filter(Boolean).map(team => <option key={team} value={team}>{team}</option>)}
                </select>
                <select value={predictions.firstRound[higher]?.games || ''} onChange={(e) => handlePredictionChange('firstRound', higher, 'games', e.target.value)}>
                  <option value="">Games</option>
                  {[4, 5, 6, 7].map(games => <option key={games} value={games}>{games}</option>)}
                </select>
                {error && <p style={{ color: 'red' }}>{error}</p>}
              </div>
            ))}
            <button onClick={() => setStep(3)}>Next</button>
          </div>
        );
      case 3:
        return (
          <div>
            <h2>Step 3 of 7: First Round</h2>
            <h3>Eastern Conference</h3>
            {[['east-1', 'east-8'], ['east-4', 'east-5'], ['east-3', 'east-6'], ['east-2', 'east-7']].map(([higher, lower]) => {
              const team1 = teams.find(t => t.includes(higher.split('-')[1])) || '';
              const team2 = teams.find(t => t.includes(lower.split('-')[1])) || '';
              useEffect(() => {
                fetchNbaStats(team1, team2);
              }, [team1, team2]);
              return (
                <div key={higher}>
                  <p>{team1} vs {team2}</p>
                  {nbaStats.team1?.stats ? (
                    <div>
                      <p>{team1} - Avg Score: {nbaStats.team1.stats.avgScore}, Avg Allowed: {nbaStats.team1.stats.avgAllowed}, Record: {nbaStats.team1.stats.record}</p>
                      <p>{team2} - Avg Score: {nbaStats.team2.stats.avgScore}, Avg Allowed: {nbaStats.team2.stats.avgAllowed}, Record: {nbaStats.team2.stats.record}</p>
                      {nbaStats.regularSeasonResults.length > 0 && (
                        <p>Regular Season Results: {nbaStats.regularSeasonResults.map(result => `${result.date}: ${result.team1Score}-${result.team2Score} (${result.location})`).join(', ')}</p>
                      )}
                    </div>
                  ) : error ? (
                    <p style={{ color: 'red' }}>{error}</p>
                  ) : (
                    <p>Loading...</p>
                  )}
                </div>
              );
            })}
            <h3>Western Conference</h3>
            {[['west-1', 'west-8'], ['west-4', 'west-5'], ['west-3', 'west-6'], ['west-2', 'west-7']].map(([higher, lower]) => {
              const team1 = teams.find(t => t.includes(higher.split('-')[1])) || '';
              const team2 = teams.find(t => t.includes(lower.split('-')[1])) || '';
              useEffect(() => {
                fetchNbaStats(team1, team2);
              }, [team1, team2]);
              return (
                <div key={higher}>
                  <p>{team1} vs {team2}</p>
                  {nbaStats.team1?.stats ? (
                    <div>
                      <p>{team1} - Avg Score: {nbaStats.team1.stats.avgScore}, Avg Allowed: {nbaStats.team1.stats.avgAllowed}, Record: {nbaStats.team1.stats.record}</p>
                      <p>{team2} - Avg Score: {nbaStats.team2.stats.avgScore}, Avg Allowed: {nbaStats.team2.stats.avgAllowed}, Record: {nbaStats.team2.stats.record}</p>
                      {nbaStats.regularSeasonResults.length > 0 && (
                        <p>Regular Season Results: {nbaStats.regularSeasonResults.map(result => `${result.date}: ${result.team1Score}-${result.team2Score} (${result.location})`).join(', ')}</p>
                      )}
                    </div>
                  ) : error ? (
                    <p style={{ color: 'red' }}>{error}</p>
                  ) : (
                    <p>Loading...</p>
                  )}
                </div>
              );
            })}
            <button onClick={() => setStep(4)}>Next</button>
          </div>
        );
      case 4:
        return (
          <div>
            <h2>Step 4 of 7: Semifinals</h2>
            <h3>Eastern Conference</h3>
            {[['east-1-8', 'east-4-5'], ['east-3-6', 'east-2-7']].map(([higher, lower]) => (
              <div key={higher}>
                <select value={predictions.semifinals[higher]?.winner || ''} onChange={(e) => handlePredictionChange('semifinals', higher, 'winner', e.target.value)}>
                  <option value="">Select Winner</option>
                  {[teams.find(t => t.includes(higher.split('-')[0])), teams.find(t => t.includes(lower.split('-')[0]))].filter(Boolean).map(team => <option key={team} value={team}>{team}</option>)}
                </select>
                <select value={predictions.semifinals[higher]?.games || ''} onChange={(e) => handlePredictionChange('semifinals', higher, 'games', e.target.value)}>
                  <option value="">Games</option>
                  {[4, 5, 6, 7].map(games => <option key={games} value={games}>{games}</option>)}
                </select>
              </div>
            ))}
            <h3>Western Conference</h3>
            {[['west-1-8', 'west-4-5'], ['west-3-6', 'west-2-7']].map(([higher, lower]) => (
              <div key={higher}>
                <select value={predictions.semifinals[higher]?.winner || ''} onChange={(e) => handlePredictionChange('semifinals', higher, 'winner', e.target.value)}>
                  <option value="">Select Winner</option>
                  {[teams.find(t => t.includes(higher.split('-')[0])), teams.find(t => t.includes(lower.split('-')[0]))].filter(Boolean).map(team => <option key={team} value={team}>{team}</option>)}
                </select>
                <select value={predictions.semifinals[higher]?.games || ''} onChange={(e) => handlePredictionChange('semifinals', higher, 'games', e.target.value)}>
                  <option value="">Games</option>
                  {[4, 5, 6, 7].map(games => <option key={games} value={files}>Mar06_2025_2000</files>)}
                </select>
              </div>
            ))}
            <button onClick={() => setStep(5)}>Next</button>
          </div>
        );
      case 5:
        return (
          <div>
            <h2>Step 5 of 7: Conference Finals</h2>
            <h3>Eastern Conference</h3>
            <select value={predictions.conferenceFinals['east-final']?.winner || ''} onChange={(e) => handlePredictionChange('conferenceFinals', 'east-final', 'winner', e.target.value)}>
              <option value="">Select Eastern Conference Champion</option>
              {easternConference.map(team => <option key={team} value={team}>{team}</option>)}
            </select>
            <select value={predictions.conferenceFinals['east-final']?.games || ''} onChange={(e) => handlePredictionChange('conferenceFinals', 'east-final', 'games', e.target.value)}>
              <option value="">Games</option>
              {[4, 5, 6, 7].map(games => <option key={games} value={games}>{games}</option>)}
            </select>
            <h3>Western Conference</h3>
            <select value={predictions.conferenceFinals['west-final']?.winner || ''} onChange={(e) => handlePredictionChange('conferenceFinals', 'west-final', 'winner', e.target.value)}>
              <option value="">Select Western Conference Champion</option>
              {westernConference.map(team => <option key={team} value={team}>{team}</option>)}
            </select>
            <select value={predictions.conferenceFinals['west-final']?.games || ''} onChange={(e) => handlePredictionChange('conferenceFinals', 'west-final', 'games', e.target.value)}>
              <option value="">Games</option>
              {[4, 5, 6, 7].map(games => <option key={games} value={games}>{games}</option>)}
            </select>
            <button onClick={() => setStep(6)}>Next</button>
          </div>
        );
      case 6:
        return (
          <div>
            <h2>Step 6 of 7: Finals</h2>
            <select value={predictions.finals.finals.winner || ''} onChange={(e) => handlePredictionChange('finals', 'finals', 'winner', e.target.value)}>
              <option value="">Select NBA Champion</option>
              {[...easternConference, ...westernConference].map(team => <option key={team} value={team}>{team}</option>)}
            </select>
            <select value={predictions.finals.finals.games || ''} onChange={(e) => handlePredictionChange('finals', 'finals', 'games', e.target.value)}>
              <option value="">Games</option>
              {[4, 5, 6, 7].map(games => <option key={games} value={games}>{games}</option>)}
            </select>
            <select value={predictions.finals.finals.mvp || ''} onChange={(e) => handlePredictionChange('finals', 'finals', 'mvp', e.target.value)}>
              <option value="">Select Finals MVP</option>
              {[...easternConference, ...westernConference].map(team => <option key={team} value={team}>{team}</option>)}
            </select>
            <input
              type="text"
              placeholder="Last Game Score (e.g., 100-95)"
              value={predictions.finals.finals.lastGameScore || ''}
              onChange={(e) => {
                const [team1, team2] = e.target.value.split('-').map(score => score.trim());
                handlePredictionChange('finals', 'finals', 'lastGameScore', { team1, team2 });
              }}
            />
            <button onClick={() => setStep(7)}>Next</button>
          </div>
        );
      case 7:
        return (
          <div>
            <h2>Step 7 of 7: User Information</h2>
            <input type="text" placeholder="Name" value={userData.name} onChange={(e) => handleUserDataChange('name', e.target.value)} />
            <input type="email" placeholder="Email" value={userData.email} onChange={(e) => handleUserDataChange('email', e.target.value)} />
            <input type="tel" placeholder="Phone" value={userData.phone} onChange={(e) => handleUserDataChange('phone', e.target.value)} />
            <textarea placeholder="Comments" value={userData.comments} onChange={(e) => handleUserDataChange('comments', e.target.value)} />
            <select value={userData.paymentMethod} onChange={(e) => handleUserDataChange('paymentMethod', e.target.value)}>
              <option value="">Select Payment Method</option>
              <option value="ATH-Movil">ATH-Movil</option>
              <option value="PayPal">PayPal</option>
            </select>
            <button onClick={handleSubmit}>Submit</button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="App">
      {renderStep()}
      {step > 1 && <button onClick={() => setStep(step - 1)}>Previous</button>}
    </div>
  );
}

export default App;