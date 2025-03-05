const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const axios = require('axios'); // Ensure "axios": "^1.7.2" is in server/package.json

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: 'https://nba-playoff-predictor-1.onrender.com,https://score-details.onrender.com'
}));
app.use(bodyParser.json());

// MongoDB and other existing setups (unchanged, see your server.js)

// New endpoint for NBA stats with team records
app.get('/api/nba-stats', async (req, res) => {
  try {
    const { team1, team2 } = req.query; // Team names (e.g., "Celtics", "Pistons")
    const teamIds = {
      Celtics: 2, Bucks: 4, Pacers: 9, Heat: 14, Knicks: 18, Cavaliers: 5,
      Magic: 19, Pistons: 8, Hawks: 1, Wizards: 27,
      Nuggets: 7, Suns: 22, Warriors: 9, Lakers: 13, Clippers: 12, Grizzlies: 15,
      Rockets: 10, Pelicans: 3, Spurs: 24, Timberwolves: 25
    };

    // Fetch team stats and record (wins, losses)
    const fetchTeamStats = async (team) => {
      const teamId = teamIds[team];
      const statsResponse = await axios.get(`https://www.balldontlie.io/api/v1/stats?team_ids[]=${teamId}&season=2024`);
      const gamesResponse = await axios.get(`https://www.balldontlie.io/api/v1/games?team_ids[]=${teamId}&seasons[]=2024`);

      const stats = statsResponse.data.data.reduce((acc, game) => {
        acc.points += game.pts || 0;
        acc.oppPoints += game.opp_pts || 0;
        acc.games += 1;
        return acc;
      }, { points: 0, oppPoints: 0, games: 0 });

      const games = gamesResponse.data.data;
      const wins = games.filter(game => 
        (game.home_team_id === teamId && game.home_team_score > game.visitor_team_score) ||
        (game.visitor_team_id === teamId && game.visitor_team_score > game.home_team_score)
      ).length;
      const losses = games.length - wins;

      return {
        avgScore: stats.games ? (stats.points / stats.games).toFixed(1) : 0,
        avgAllowed: stats.games ? (stats.oppPoints / stats.games).toFixed(1) : 0,
        record: `${wins}-${losses}`
      };
    };

    // Fetch regular-season games between teams
    const fetchRegularSeasonResults = async (team1Id, team2Id) => {
      const response = await axios.get(`https://www.balldontlie.io/api/v1/games?team_ids[]=${team1Id}&team_ids[]=${team2Id}&seasons[]=2024`);
      return response.data.data.map(game => ({
        date: game.date,
        team1Score: game.home_team_id === team1Id ? game.home_team_score : game.visitor_team_score,
        team2Score: game.home_team_id === team2Id ? game.home_team_score : game.visitor_team_score,
        location: game.home_team_id === team1Id ? 'Home' : 'Away'
      }));
    };

    const team1Stats = await fetchTeamStats(team1);
    const team2Stats = await fetchTeamStats(team2);
    const regularSeasonResults = await fetchRegularSeasonResults(teamIds[team1], teamIds[team2]);

    res.json({
      team1: { name: team1, stats: team1Stats },
      team2: { name: team2, stats: team2Stats },
      regularSeasonResults
    });
  } catch (err) {
    console.error('Error fetching NBA stats:', err);
    res.status(500).json({ error: 'Failed to fetch NBA stats', details: err.message });
  }
});

// Existing endpoints (predictions, results, scores, send-email, prediction-distribution) remain unchanged

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));