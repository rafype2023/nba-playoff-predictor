import React, { useState, useEffect } from 'react';

const NBAPlayoffPredictor = () => {
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState({ name: '', email: '', phone: '', comments: '', paymentMethod: '' });
  const [predictions, setPredictions] = useState({
    firstRound: {},
    semifinals: {},
    conferenceFinals: {},
    finals: {}
  });
  const [playInSelections, setPlayInSelections] = useState({
    east: { seven: '', eight: '' },
    west: { seven: '', eight: '' }
  });
  const [error, setError] = useState('');
  const [semiFinalTeams, setSemiFinalTeams] = useState({ east: [], west: [] });
  const [confFinalTeams, setConfFinalTeams] = useState({ east: [], west: [] });
  const [isLoading, setIsLoading] = useState(false);

  const eastSeeds = ['Celtics', 'Bucks', 'Pacers', 'Heat', 'Knicks', 'Cavaliers'];
  const westSeeds = ['Nuggets', 'Suns', 'Warriors', 'Lakers', 'Clippers', 'Grizzlies'];
  const eastPlayInTeams = ['Magic', 'Pistons', 'Hawks', 'Wizards'];
  const westPlayInTeams = ['Rockets', 'Pelicans', 'Spurs', 'Timberwolves'];
  const mvpOptions = [
    'De Andre Hunter', 'Ty Jerome', 'Jaylen Brown', 'Jayson Tatum', 'Jalen Brunson',
    'Karl-Anthony Towns', 'Giannis Antetokounmpo', 'Damian Lillard', 'Tyrese Haliburton',
    'Bennedict Mathurin', 'Cade Cunningham', 'Jaden Ivey', 'Jimmy Butler', 'Bam Adebayo',
    'Paolo Banchero', 'Franz Wagner', 'Shai Gilgeous-Alexander', 'Josh Giddey',
    'LeBron James', 'Luka Dončić', 'Nikola Jokić', 'Jamal Murray', 'Ja Morant',
    'Jaren Jackson Jr.', 'Jalen Green', 'Jabari Smith Jr.', 'Kawhi Leonard',
    'Paul George', 'Stephen Curry', 'Jimmy Butler'
  ];
  const paymentMethods = ['Credit Card', 'PayPal', 'Cash']; // New payment options

  const eastTeams = [...eastSeeds, playInSelections.east.seven, playInSelections.east.eight];
  const westTeams = [...westSeeds, playInSelections.west.seven, playInSelections.west.eight];

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateRound = (round) => {
    const roundData = predictions[round];
    const matchups = Object.keys(roundData);
    return matchups.length > 0 && matchups.every(matchup => 
      roundData[matchup].winner && roundData[matchup].games
    );
  };

  const validatePlayIn = () => {
    return (
      playInSelections.east.seven && playInSelections.east.eight && 
      playInSelections.west.seven && playInSelections.west.eight &&
      playInSelections.east.seven !== playInSelections.east.eight &&
      playInSelections.west.seven !== playInSelections.west.eight
    );
  };

  const handlePrediction = (round, matchupId, field, value) => {
    setPredictions(prev => ({
      ...prev,
      [round]: {
        ...prev[round],
        [matchupId]: {
          ...(prev[round][matchupId] || {}),
          [field]: value
        }
      }
    }));
    setError('');
  };

  const handlePlayInSelection = (conference, seed, value) => {
    setPlayInSelections(prev => ({
      ...prev,
      [conference]: {
        ...prev[conference],
        [seed]: value
      }
    }));
    setError('');
  };

  useEffect(() => {
    if (step >= 4) {
      const eastWinners = Object.entries(predictions.firstRound)
        .filter(([key, value]) => key.startsWith('east') && value.winner)
        .map(([, value]) => value.winner);
      const westWinners = Object.entries(predictions.firstRound)
        .filter(([key, value]) => key.startsWith('west') && value.winner)
        .map(([, value]) => value.winner);
      setSemiFinalTeams({
        east: eastWinners.length === 4 ? eastWinners : eastWinners.concat(Array(4 - eastWinners.length).fill('TBD')),
        west: westWinners.length === 4 ? westWinners : westWinners.concat(Array(4 - westWinners.length).fill('TBD'))
      });
    }
    if (step >= 5) {
      const eastConfWinners = Object.entries(predictions.semifinals)
        .filter(([key, value]) => key.startsWith('east') && value.winner)
        .map(([, value]) => value.winner);
      const westConfWinners = Object.entries(predictions.semifinals)
        .filter(([key, value]) => key.startsWith('west') && value.winner)
        .map(([, value]) => value.winner);
      setConfFinalTeams({
        east: eastConfWinners.length === 2 ? eastConfWinners : eastConfWinners.concat(Array(2 - eastConfWinners.length).fill('TBD')),
        west: westConfWinners.length === 2 ? westConfWinners : westConfWinners.concat(Array(2 - westConfWinners.length).fill('TBD'))
      });
    }
  }, [predictions, step]);

  const saveResultsToDatabase = async () => {
    setIsLoading(true);
    try {
      const saveResponse = await fetch('https://nba-playoff-predictor.onrender.com/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userData, predictions, playInSelections }),
      });
      if (!saveResponse.ok) throw new Error(`Server responded with ${saveResponse.status}`);

      const emailResponse = await fetch('https://nba-playoff-predictor.onrender.com/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userData, predictions, playInSelections }),
      });
      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error(`Email sending failed: ${errorText}`);
        setError('Predictions saved, but email failed. Check your email address.');
      } else {
        console.log('Email sent successfully');
      }
    } catch (err) {
      console.error('Error:', err.message);
      setError(`Failed to save or send email: ${err.message}`);
    } finally {
      setIsLoading(false);
      if (!error) setStep(7);
    }
  };

  const Matchup = ({ teams, round, matchupId, tooltip }) => (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6 relative group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img 
            src={`/${teams[0].toLowerCase()}.png`} 
            alt={`${teams[0]} logo`} 
            className="w-8 h-8" 
            onError={(e) => (e.target.src = '/placeholder-logo.png')}
          />
          <span className="font-medium">{teams[0]}</span>
        </div>
        <span className="text-gray-500">vs</span>
        <div className="flex items-center gap-2">
          <span className="font-medium">{teams[1]}</span>
          <img 
            src={`/${teams[1].toLowerCase()}.png`} 
            alt={`${teams[1]} logo`} 
            className="w-8 h-8" 
            onError={(e) => (e.target.src = '/placeholder-logo.png')}
          />
        </div>
      </div>
      <select 
        className="mt-4 p-2 rounded w-full border focus:ring-2 focus:ring-blue-500"
        value={predictions[round][matchupId]?.winner || ''}
        onChange={(e) => handlePrediction(round, matchupId, 'winner', e.target.value)}
      >
        <option value="">Select Winner</option>
        {teams.map(team => (
          <option key={team} value={team} disabled={team === 'TBD'}>{team}</option>
        ))}
      </select>
      <select 
        className="mt-6 p-2 rounded w-full border focus:ring-2 focus:ring-blue-500"
        value={predictions[round][matchupId]?.games || ''}
        onChange={(e) => handlePrediction(round, matchupId, 'games', e.target.value)}
        disabled={!predictions[round][matchupId]?.winner || teams.includes('TBD')}
      >
        <option value="">Select Games</option>
        <option value="4-0">4-0</option>
        <option value="4-1">4-1</option>
        <option value="4-2">4-2</option>
        <option value="4-3">4-3</option>
      </select>
      <div className="absolute hidden group-hover:block bg-gray-800 text-white text-sm p-2 rounded -top-10 left-1/2 transform -translate-x-1/2">
        {tooltip}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
              style={{ width: `${(step / 7) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-1">Step {step} of 7</p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="bg-gray-200 w-48 h-16 mx-auto rounded flex items-center justify-center text-gray-600 font-bold">
                NBA POOL 2025 Logo
              </div>
              <h1 className="text-3xl font-bold text-gray-800">Welcome to the NBA Playoff Pool 2025!</h1>
              <div className="text-left max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Scoring Rules:</h3>
                <ul className="list-disc pl-5 text-gray-600 space-y-1">
                  <li>First Round: 1 pt for winner, 1 pt for games (max 2 per matchup)</li>
                  <li>Semifinals: 2 pts for winner, 1 pt for games (max 3 per matchup)</li>
                  <li>Conference Finals: 3 pts for winner, 1 pt for games (max 4 per matchup)</li>
                  <li>Finals: 4 pts for winner, 1 pt for games, 1 pt for MVP (max 6)</li>
                </ul>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!validateEmail(userData.email)) {
                setError('Invalid email format');
                return;
              }
              if (!userData.name || !userData.phone || !userData.paymentMethod) {
                setError('Name, email, phone, and payment method are required');
                return;
              }
              setError('');
              setStep(2);
            }} className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Registration</h2>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <input
                type="text"
                placeholder="Name"
                value={userData.name}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={userData.email}
                onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={userData.phone}
                onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Comments (optional)"
                value={userData.comments}
                onChange={(e) => setUserData({ ...userData, comments: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={userData.paymentMethod}
                onChange={(e) => setUserData({ ...userData, paymentMethod: e.target.value })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Payment Method</option>
                {paymentMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
              <button type="submit" className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Next
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Play-In Tournament Selection</h2>
            {/* Play-In Selection Code (unchanged) */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Eastern Conference Play-In:</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-600 mb-1">Select No. 7 Seed:</label>
                  <select
                    className="w-full p-2 rounded border focus:ring-2 focus:ring-blue-500"
                    value={playInSelections.east.seven}
                    onChange={(e) => handlePlayInSelection('east', 'seven', e.target.value)}
                  >
                    <option value="">Choose Team</option>
                    {eastPlayInTeams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">Select No. 8 Seed:</label>
                  <select
                    className="w-full p-2 rounded border focus:ring-2 focus:ring-blue-500"
                    value={playInSelections.east.eight}
                    onChange={(e) => handlePlayInSelection('east', 'eight', e.target.value)}
                  >
                    <option value="">Choose Team</option>
                    {eastPlayInTeams.filter(team => team !== playInSelections.east.seven).map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Western Conference Play-In:</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-600 mb-1">Select No. 7 Seed:</label>
                  <select
                    className="w-full p-2 rounded border focus:ring-2 focus:ring-blue-500"
                    value={playInSelections.west.seven}
                    onChange={(e) => handlePlayInSelection('west', 'seven', e.target.value)}
                  >
                    <option value="">Choose Team</option>
                    {westPlayInTeams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">Select No. 8 Seed:</label>
                  <select
                    className="w-full p-2 rounded border focus:ring-2 focus:ring-blue-500"
                    value={playInSelections.west.eight}
                    onChange={(e) => handlePlayInSelection('west', 'eight', e.target.value)}
                  >
                    <option value="">Choose Team</option>
                    {westPlayInTeams.filter(team => team !== playInSelections.west.seven).map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setStep(1)} className="flex-1 p-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors">
                Previous
              </button>
              <button onClick={() => {
                if (validatePlayIn()) setStep(3);
                else setError('Please select unique No. 7 and No. 8 seeds');
              }} className="flex-1 p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">First Round</h2>
            <h3 className="font-semibold text-gray-700 mb-2">Eastern Conference</h3>
            {Array(4).fill().map((_, i) => (
              <Matchup 
                key={`east-${i}`} 
                teams={[eastTeams[i], eastTeams[7-i]]} 
                round="firstRound" 
                matchupId={`east-${i}`}
                tooltip="Select the team you think will win and the series length"
              />
            ))}
            <h3 className="font-semibold text-gray-700 mb-2 mt-4">Western Conference</h3>
            {Array(4).fill().map((_, i) => (
              <Matchup 
                key={`west-${i}`} 
                teams={[westTeams[i], westTeams[7-i]]} 
                round="firstRound" 
                matchupId={`west-${i}`}
                tooltip="Select the team you think will win and the series length"
              />
            ))}
            <div className="flex gap-4 mt-6">
              <button onClick={() => setStep(2)} className="flex-1 p-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors">
                Previous
              </button>
              <button onClick={() => {
                if (validateRound('firstRound')) setStep(4);
                else setError('Please complete all First Round predictions');
              }} className="flex-1 p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Conference Semifinals</h2>
            <h3 className="font-semibold text-gray-700 mb-2">Eastern Conference</h3>
            {semiFinalTeams.east.length >= 4 ? (
              Array(2).fill().map((_, i) => (
                <Matchup 
                  key={`east-semi-${i}`} 
                  teams={[semiFinalTeams.east[i*2] || 'TBD', semiFinalTeams.east[i*2+1] || 'TBD']} 
                  round="semifinals" 
                  matchupId={`east-semi-${i}`}
                  tooltip="Predict the semifinal winners"
                />
              ))
            ) : (
              <p className="text-red-500">Error: Insufficient Eastern Conference winners</p>
            )}
            <h3 className="font-semibold text-gray-700 mb-2 mt-4">Western Conference</h3>
            {semiFinalTeams.west.length >= 4 ? (
              Array(2).fill().map((_, i) => (
                <Matchup 
                  key={`west-semi-${i}`} 
                  teams={[semiFinalTeams.west[i*2] || 'TBD', semiFinalTeams.west[i*2+1] || 'TBD']} 
                  round="semifinals" 
                  matchupId={`west-semi-${i}`}
                  tooltip="Predict the semifinal winners"
                />
              ))
            ) : (
              <p className="text-red-500">Error: Insufficient Western Conference winners</p>
            )}
            <div className="flex gap-4 mt-6">
              <button onClick={() => setStep(3)} className="flex-1 p-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors">
                Previous
              </button>
              <button onClick={() => {
                if (validateRound('semifinals')) setStep(5);
                else setError('Please complete all Semifinals predictions');
              }} className="flex-1 p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Conference Finals</h2>
            <h3 className="font-semibold text-gray-700 mb-2">Eastern Conference</h3>
            <Matchup 
              teams={[confFinalTeams.east[0] || 'TBD', confFinalTeams.east[1] || 'TBD']} 
              round="conferenceFinals" 
              matchupId="east-final"
              tooltip="Predict the Eastern Conference champion"
            />
            <h3 className="font-semibold text-gray-700 mb-2 mt-4">Western Conference</h3>
            <Matchup 
              teams={[confFinalTeams.west[0] || 'TBD', confFinalTeams.west[1] || 'TBD']} 
              round="conferenceFinals" 
              matchupId="west-final"
              tooltip="Predict the Western Conference champion"
            />
            <div className="flex gap-4 mt-6">
              <button onClick={() => setStep(4)} className="flex-1 p-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors">
                Previous
              </button>
              <button onClick={() => {
                if (validateRound('conferenceFinals')) setStep(6);
                else setError('Please complete all Conference Finals predictions');
              }} className="flex-1 p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">NBA Finals</h2>
            <Matchup 
              teams={[
                predictions.conferenceFinals['east-final']?.winner || 'East TBD',
                predictions.conferenceFinals['west-final']?.winner || 'West TBD'
              ]} 
              round="finals" 
              matchupId="finals"
              tooltip="Predict the NBA Champion"
            />
            <select
              className="w-full p-2 rounded mt-2 border focus:ring-2 focus:ring-blue-500"
              value={predictions.finals.finals?.mvp || ''}
              onChange={(e) => handlePrediction('finals', 'finals', 'mvp', e.target.value)}
            >
              <option value="">Select Finals MVP</option>
              {mvpOptions.map(player => (
                <option key={player} value={player}>{player}</option>
              ))}
            </select>
            <div className="mt-4 space-y-2">
              <label className="block text-gray-600">Last Game Score (Team 1 - Team 2):</label>
              <div className="flex gap-4">
                <input
                  type="number"
                  min="80"
                  max="180"
                  placeholder="Team 1 Score (80-180)"
                  value={predictions.finals.finals?.lastGameScore?.team1 || ''}
                  onChange={(e) => {
                    const value = e.target.value ? Math.min(Math.max(parseInt(e.target.value), 80), 180) : '';
                    handlePrediction('finals', 'finals', 'lastGameScore', { ...predictions.finals.finals?.lastGameScore, team1: value });
                  }}
                  className="w-1/2 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  min="80"
                  max="180"
                  placeholder="Team 2 Score (80-180)"
                  value={predictions.finals.finals?.lastGameScore?.team2 || ''}
                  onChange={(e) => {
                    const value = e.target.value ? Math.min(Math.max(parseInt(e.target.value), 80), 180) : '';
                    handlePrediction('finals', 'finals', 'lastGameScore', { ...predictions.finals.finals?.lastGameScore, team2: value });
                  }}
                  className="w-1/2 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setStep(5)} className="flex-1 p-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors">
                Previous
              </button>
              <button onClick={async () => {
                if (predictions.finals.finals?.winner && 
                    predictions.finals.finals?.games && 
                    predictions.finals.finals?.mvp &&
                    predictions.finals.finals?.lastGameScore?.team1 &&
                    predictions.finals.finals?.lastGameScore?.team2) {
                  await saveResultsToDatabase();
                  if (!error) setStep(7);
                } else {
                  setError('Please complete all Finals predictions, including last game score');
                }
              }} className="flex-1 p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-blue-300" disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit Predictions'}
              </button>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Prediction Summary - {userData.name}</h2>
            <div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">User Details:</h3>
              <p>Email: {userData.email}</p>
              <p>Phone: {userData.phone}</p>
              <p>Comments: {userData.comments || 'None'}</p>
              <p>Payment Method: {userData.paymentMethod}</p>
            </div>
            {/* Eastern Conference */}
            <div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Eastern Conference:</h3>
              <div className="space-y-2">
                <div>
                  <span className="font-bold">First Round:</span>
                  <div className="pl-4 space-y-1">
                    <div>{predictions.firstRound['east-0']?.winner} ({predictions.firstRound['east-0']?.games})</div>
                    <div>{predictions.firstRound['east-1']?.winner} ({predictions.firstRound['east-1']?.games})</div>
                    <div>{predictions.firstRound['east-2']?.winner} ({predictions.firstRound['east-2']?.games})</div>
                    <div>{predictions.firstRound['east-3']?.winner} ({predictions.firstRound['east-3']?.games})</div>
                  </div>
                </div>
                <div>
                  <span className="font-bold">Semifinals:</span>
                  <div className="pl-8 space-y-1">
                    <div>{predictions.semifinals['east-semi-0']?.winner} ({predictions.semifinals['east-semi-0']?.games})</div>
                    <div>{predictions.semifinals['east-semi-1']?.winner} ({predictions.semifinals['east-semi-1']?.games})</div>
                  </div>
                </div>
                <div>
                  <span className="font-bold">Conference Final:</span>
                  <div className="pl-12 space-y-1">
                    <div>{predictions.conferenceFinals['east-final']?.winner} ({predictions.conferenceFinals['east-final']?.games})</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Western Conference */}
            <div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Western Conference:</h3>
              <div className="space-y-2">
                <div>
                  <span className="font-bold">First Round:</span>
                  <div className="pl-4 space-y-1">
                    <div>{predictions.firstRound['west-0']?.winner} ({predictions.firstRound['west-0']?.games})</div>
                    <div>{predictions.firstRound['west-1']?.winner} ({predictions.firstRound['west-1']?.games})</div>
                    <div>{predictions.firstRound['west-2']?.winner} ({predictions.firstRound['west-2']?.games})</div>
                    <div>{predictions.firstRound['west-3']?.winner} ({predictions.firstRound['west-3']?.games})</div>
                  </div>
                </div>
                <div>
                  <span className="font-bold">Semifinals:</span>
                  <div className="pl-8 space-y-1">
                    <div>{predictions.semifinals['west-semi-0']?.winner} ({predictions.semifinals['west-semi-0']?.games})</div>
                    <div>{predictions.semifinals['west-semi-1']?.winner} ({predictions.semifinals['west-semi-1']?.games})</div>
                  </div>
                </div>
                <div>
                  <span className="font-bold">Conference Final:</span>
                  <div className="pl-12 space-y-1">
                    <div>{predictions.conferenceFinals['west-final']?.winner} ({predictions.conferenceFinals['west-final']?.games})</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Finals */}
            <div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Finals:</h3>
              <div className="space-y-1">
                <div>{predictions.conferenceFinals['east-final']?.winner} vs {predictions.conferenceFinals['west-final']?.winner}</div>
                <div className="pl-8 space-y-1">
                  <div>{predictions.finals.finals?.winner} ({predictions.finals.finals?.games})</div>
                  <div>MVP: {predictions.finals.finals?.mvp}</div>
                  <div>Last Game Score: {predictions.finals.finals?.lastGameScore?.team1} - {predictions.finals.finals?.lastGameScore?.team2}</div>
                </div>
              </div>
            </div>
            <button onClick={() => setStep(1)} className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors mt-6">
              Thanks
            </button>
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm mt-4 animate-pulse">{error}</p>
        )}
      </div>
    </div>
  );
};

export default NBAPlayoffPredictor;