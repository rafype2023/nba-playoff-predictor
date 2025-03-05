 import React, { useState, useEffect } from 'react';

const NBAPlayoffPredictor = () => {
  // ... (existing state, functions, and constants remain unchanged)

  const Matchup = ({ teams, round, matchupId }) => {
    const [nbaStats, setNbaStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [errorStats, setErrorStats] = useState('');

    useEffect(() => {
      const fetchNbaStats = async () => {
        try {
          const response = await fetch(`https://nba-playoff-predictor.onrender.com/api/nba-stats?team1=${teams[0]}&team2=${teams[1]}`);
          if (!response.ok) throw new Error('Failed to fetch NBA stats');
          const data = await response.json();
          setNbaStats(data);
        } catch (err) {
          setErrorStats(err.message);
        } finally {
          setLoadingStats(false);
        }
      };
      fetchNbaStats();
    }, [teams]);

    return (
      <div className="bg-white p-4 rounded-lg shadow-md mb-4">
        {loadingStats ? (
          <p className="text-center">Loading NBA stats...</p>
        ) : errorStats ? (
          <p className="text-red-500 text-center">{errorStats}</p>
        ) : (
          <>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex flex-col items-center gap-2">
                <img 
                  src={`/${teams[0].toLowerCase()}.png`} 
                  alt={`${teams[0]} logo`} 
                  className="w-12 h-12" 
                  onError={(e) => (e.target.src = '/placeholder-logo.png')}
                />
                <span className="text-2xl font-bold text-gray-800">{teams[0]} ({nbaStats.team1.stats.record})</span>
              </div>
              <span className="text-lg font-bold text-gray-500">vs</span>
              <div className="flex flex-col items-center gap-2">
                <img 
                  src={`/${teams[1].toLowerCase()}.png`} 
                  alt={`${teams[1]} logo`} 
                  className="w-12 h-12" 
                  onError={(e) => (e.target.src = '/placeholder-logo.png')}
                />
                <span className="text-2xl font-bold text-gray-800">{teams[1]} ({nbaStats.team2.stats.record})</span>
              </div>
            </div>

            {/* NBA Stats */}
            <div className="space-y-4 mb-4">
              <h4 className="text-xl font-semibold text-gray-700">Team Statistics (2024-2025 Season)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-100 rounded-lg">
                  <h5 className="text-lg font-medium text-gray-800">{nbaStats.team1.name} ({nbaStats.team1.stats.record})</h5>
                  <p>Average Score per Game: {nbaStats.team1.stats.avgScore}</p>
                  <p>Average Score Allowed: {nbaStats.team1.stats.avgAllowed}</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <h5 className="text-lg font-medium text-gray-800">{nbaStats.team2.name} ({nbaStats.team2.stats.record})</h5>
                  <p>Average Score per Game: {nbaStats.team2.stats.avgScore}</p>
                  <p>Average Score Allowed: {nbaStats.team2.stats.avgAllowed}</p>
                </div>
              </div>

              {/* Regular Season Results */}
              <h4 className="text-xl font-semibold text-gray-700">Regular Season Results (2024-2025)</h4>
              {nbaStats.regularSeasonResults.length > 0 ? (
                <ul className="list-disc pl-5 text-gray-600">
                  {nbaStats.regularSeasonResults.map((game, index) => (
                    <li key={index}>
                      {game.date}: {nbaStats.team1.name} {game.team1Score} - {nbaStats.team2.name} {game.team2Score} 
                      ({game.location})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No regular-season games between these teams.</p>
              )}
            </div>

            {/* Prediction Dropdowns */}
            <div className="space-y-2">
              <select 
                className="w-full p-2 rounded border focus:ring-2 focus:ring-blue-500"
                value={predictions[round][matchupId]?.winner || ''}
                onChange={(e) => handlePrediction(round, matchupId, 'winner', e.target.value)}
              >
                <option value="">Select Winner</option>
                {teams.map(team => (
                  <option key={team} value={team} disabled={team === 'TBD'}>{team}</option>
                ))}
              </select>
              <select 
                className="w-full p-2 rounded border focus:ring-2 focus:ring-blue-500"
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
            </div>
            <div className="border-b-2 border-[#1E90FF] my-4"></div>
          </>
        )}
      </div>
    );
  };

  // ... (rest of NBAPlayoffPredictor remains unchanged, including version and other steps)

  return (
    // ... (existing return structure for steps 1-7, unchanged except for Step 3 using the updated Matchup)
  );
};

export default NBAPlayoffPredictor;