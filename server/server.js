require('dotenv').config(); // Load environment variables from .env (for local development)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const axios = require('axios'); // Use axios for HTTP requests

const app = express();
const PORT = process.env.PORT || 5001;

// Use environment variable for Ball Don’t Lie API key
const BALL_DONT_LIE_API_KEY = process.env.BALL_DONT_LIE_API_KEY || '84608476-9876-4573-afdc-9b792c56a768';

// Configure axios instance with Ball Don’t Lie API base URL and auth header
const balldontlieApi = axios.create({
  baseURL: 'https://api.balldontlie.io/v1',
  headers: { 'Authorization': BALL_DONT_LIE_API_KEY }
});

// Configure CORS to allow multiple origins dynamically
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000', // Local development
      'https://nba-playoff-predictor-1.onrender.com', // Production static site
      'https://score-details.onrender.com' // Optional, if needed for score-details
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200 // Some browsers (e.g., older IE) require 200 for OPTIONS
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// MongoDB Connection using environment variable
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Prediction Schema and Model
const predictionSchema = new mongoose.Schema({
  userData: {
    name: String,
    email: String,
    phone: String,
    comments: String,
    paymentMethod: String
  },
  predictions: Object,
  playInSelections: Object,
  timestamp: { type: Date, default: Date.now }
});

const resultSchema = new mongoose.Schema({
  firstRound: Object,
  semifinals: Object,
  conferenceFinals: Object,
  finals: Object,
  timestamp: { type: Date, default: Date.now }
});

const Prediction = mongoose.model('Prediction', predictionSchema, 'predictions');
const Result = mongoose.model('Result', resultSchema, 'results');

// Nodemailer Setup with Gmail using environment variable for password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'rafyperez@gmail.com',
    pass: process.env.GMAIL_PASSWORD || 'wdtvkhmlfjguyrsb' // Use environment variable for security
  }
});

const formatPredictionsForEmail = (userData, predictions, playInSelections) => {
  let paymentInstruction = '';
  if (userData.paymentMethod === 'ATH-Movil') {
    paymentInstruction = 'Envie Pago al 787-918-1644';
  } else if (userData.paymentMethod === 'PayPal') {
    paymentInstruction = 'Envie via PayPal a rafyperez@hotmail.com';
  }

  return `
    <h2>NBA Playoff Pool 2025 Predictions for ${userData.name}</h2>
    <p>Email: ${userData.email}</p>
    <p>Phone: ${userData.phone}</p>
    <p>Comments: ${userData.comments || 'None'}</p>
    <p>Payment Method: ${userData.paymentMethod}${paymentInstruction ? ` - ${paymentInstruction}` : ''}</p>
    
    <h3>Play-In Selections:</h3>
    <p><strong>Eastern Conference:</strong></p>
    <ul>
      <li>No. 7 Seed: ${playInSelections?.east?.seven || 'N/A'}</li>
      <li>No. 8 Seed: ${playInSelections?.east?.eight || 'N/A'}</li>
    </ul>
    <p><strong>Western Conference:</strong></p>
    <ul>
      <li>No. 7 Seed: ${playInSelections?.west?.seven || 'N/A'}</li>
      <li>No. 8 Seed: ${playInSelections?.west?.eight || 'N/A'}</li>
    </ul>

    <h3>Eastern Conference:</h3>
    <p><strong>First Round:</strong></p>
    <ul>
      ${Object.keys(predictions.firstRound || {}).filter(k => k.startsWith('east')).map(k => `<li>${predictions.firstRound[k].winner} (${predictions.firstRound[k].games})</li>`).join('')}
    </ul>
    <p><strong>Semifinals:</strong></p>
    <ul>
      ${Object.keys(predictions.semifinals || {}).filter(k => k.startsWith('east')).map(k => `<li>${predictions.semifinals[k].winner} (${predictions.semifinals[k].games})</li>`).join('')}
    </ul>
    <p><strong>Conference Final:</strong></p>
    <ul>
      <li>${predictions.conferenceFinals?.['east-final']?.winner || 'N/A'} (${predictions.conferenceFinals?.['east-final']?.games || 'N/A'})</li>
    </ul>

    <h3>Western Conference:</h3>
    <p><strong>First Round:</strong></p>
    <ul>
      ${Object.keys(predictions.firstRound || {}).filter(k => k.startsWith('west')).map(k => `<li>${predictions.firstRound[k].winner} (${predictions.firstRound[k].games})</li>`).join('')}
    </ul>
    <p><strong>Semifinals:</strong></p>
    <ul>
      ${Object.keys(predictions.semifinals || {}).filter(k => k.startsWith('west')).map(k => `<li>${predictions.semifinals[k].winner} (${predictions.semifinals[k].games})</li>`).join('')}
    </ul>
    <p><strong>Conference Final:</strong></p>
    <ul>
      <li>${predictions.conferenceFinals?.['west-final']?.winner || 'N/A'} (${predictions.conferenceFinals?.['west-final']?.games || 'N/A'})</li>
    </ul>

    <h3>Finals:</h3>
    <p>${predictions.conferenceFinals?.['east-final']?.winner || 'N/A'} vs ${predictions.conferenceFinals?.['west-final']?.winner || 'N/A'}</p>
    <ul>
      <li>Winner: ${predictions.finals?.finals?.winner || 'N/A'} (${predictions.finals?.finals?.games || 'N/A'})</li>
      <li>MVP: ${predictions.finals?.finals?.mvp || 'N/A'}</li>
      <li>Last Game Score: ${predictions.finals?.finals?.lastGameScore?.team1 || 'N/A'} - ${predictions.finals?.finals?.lastGameScore?.team2 || 'N/A'}</li>
    </ul>

    <p>Thanks for participating in the NBA Playoff Pool 2025!</p>
  `;

// New endpoint for NBA stats using direct API calls with pagination
const fetchAllGames = async (params) => {
  let allGames = [];
  let cursor = null;
  try {
    do {
      const gamesResponse = await balldontlieApi.get('/games', {
        params: { 
          ...params, 
          'per_page': 100, 
          'cursor': cursor 
        }
      });
      allGames = allGames.concat(gamesResponse.data.data);
      cursor = gamesResponse.data.meta.next_cursor;
    } while (cursor);
    return allGames;
  } catch (err) {
    console.error('Error fetching all games:', err);
    throw err;
  }
};

app.get('/api/nba-stats', async (req, res) => {
  try {
    const { team1, team2 } = req.query; // Team names (e.g., "Boston Celtics", "Orlando Magic")

    // Fetch team IDs by name (case-insensitive) from /v1/teams
    const teamsResponse = await balldontlieApi.get('/teams');
    const teamMap = teamsResponse.data.data.reduce((acc, team) => {
      acc[team.full_name.toLowerCase()] = team.id;
      return acc;
    }, {});

    const team1Name = team1.toLowerCase();
    const team2Name = team2.toLowerCase();
    const team1Id = teamMap[team1Name];
    const team2Id = teamMap[team2Name];

    if (!team1Id || !team2Id) {
      throw new Error(`Invalid team names: ${team1}, ${team2}`);
    }

    // Fetch team games for 2024 season to derive stats
    const fetchTeamStats = async (teamId) => {
      const games = await fetchAllGames({ 'team_ids[]': [teamId], 'seasons[]': ['2024'], postseason: false });

      const gameStats = games.reduce((acc, game) => {
        const isHome = game.home_team_id === teamId;
        const teamScore = isHome ? game.home_team_score : game.visitor_team_score;
        const oppScore = isHome ? game.visitor_team_score : game.home_team_score;
        acc.points += teamScore || 0;
        acc.oppPoints += oppScore || 0;
        acc.games += 1;
        return acc;
      }, { points: 0, oppPoints: 0, games: 0 });

      const winLoss = games.reduce((acc, game) => {
        const isWin = (game.home_team_id === teamId && game.home_team_score > game.visitor_team_score) ||
                      (game.visitor_team_id === teamId && game.visitor_team_score > game.home_team_score);
        acc.wins += isWin ? 1 : 0;
        acc.losses += isWin ? 0 : 1;
        return acc;
      }, { wins: 0, losses: 0 });

      return {
        avgScore: gameStats.games ? (gameStats.points / gameStats.games).toFixed(1) : 0,
        avgAllowed: gameStats.games ? (gameStats.oppPoints / gameStats.games).toFixed(1) : 0,
        record: `${winLoss.wins}-${winLoss.losses}`
      };
    };

    // Fetch regular-season games between teams
    const fetchRegularSeasonResults = async (team1Id, team2Id) => {
      const games = await fetchAllGames({ 'team_ids[]': [team1Id, team2Id], 'seasons[]': ['2024'], postseason: false });

      return games.map(game => ({
        date: game.date,
        team1Score: game.home_team_id === team1Id ? game.home_team_score : game.visitor_team_score,
        team2Score: game.home_team_id === team2Id ? game.home_team_score : game.visitor_team_score,
        location: game.home_team_id === team1Id ? 'Home' : 'Away'
      }));
    };

    const team1Stats = await fetchTeamStats(team1Id);
    const team2Stats = await fetchTeamStats(team2Id);
    const regularSeasonResults = await fetchRegularSeasonResults(team1Id, team2Id);

    res.json({
      team1: { name: team1, stats: team1Stats },
      team2: { name: team2, stats: team2Stats },
      regularSeasonResults
    });
  } catch (err) {
    console.error('Error fetching NBA stats:', err);
    if (err.response) {
      res.status(err.response.status).json({ 
        error: 'Failed to fetch NBA stats', 
        details: `${err.response.status} - ${err.response.data.message || err.message}` 
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch NBA stats', details: err.message });
    }
  }
});

// Endpoint: Save Predictions
app.post('/api/predictions', async (req, res) => {
  try {
    const { userData, predictions, playInSelections } = req.body;
    const newPrediction = new Prediction({ userData, predictions, playInSelections });
    await newPrediction.save();
    res.status(201).json({ message: 'Prediction saved', id: newPrediction._id });
  } catch (error) {
    console.error('Error saving prediction:', error);
    res.status(500).json({ error: 'Failed to save prediction' });
  }
});

// Endpoint: Save Results
app.post('/api/results', async (req, res) => {
  try {
    const { firstRound, semifinals, conferenceFinals, finals } = req.body;
    const newResult = new Result({ firstRound, semifinals, conferenceFinals, finals });
    await newResult.save();
    res.status(201).json({ message: 'Results saved', id: newResult._id });
  } catch (error) {
    console.error('Error saving results:', error);
    res.status(500).json({ error: 'Failed to save results' });
  }
});

// Endpoint: Calculate Scores
app.get('/api/scores', async (req, res) => {
  try {
    const predictions = await Prediction.find();
    if (!predictions || predictions.length === 0) {
      console.log('No predictions found in database');
      return res.json({ scores: [], standings: [] });
    }

    const results = await Result.findOne().sort({ timestamp: -1 });
    if (!results) {
      console.log('No results found in database');
      return res.status(404).json({ error: 'No results found' });
    }

    console.log('Results:', JSON.stringify(results, null, 2));

    const scores = predictions.map(prediction => {
      const predRounds = prediction.predictions || prediction || {};
      const user = prediction.userData?.name || 'Unknown';
      console.log(`Processing prediction for ${user}:`, JSON.stringify(predRounds, null, 2));

      let totalScore = 0;
      const details = {
        firstRound: [],
        semifinals: [],
        conferenceFinals: [],
        finals: []
      };

      if (predRounds.firstRound && results.firstRound) {
        for (const key in predRounds.firstRound) {
          const pred = predRounds.firstRound[key] || {};
          const res = results.firstRound[key] || {};
          console.log(`Comparing First Round ${key}: Pred ${JSON.stringify(pred)}, Res ${JSON.stringify(res)}`);
          let score = 0;
          const winnerMatch = pred.winner === res.winner;
          const gamesMatch = pred.games === res.games;
          if (winnerMatch) {
            score += 1;
            console.log(`First Round winner match for ${key}: +1 point`);
          }
          if (gamesMatch) {
            score += 1;
            console.log(`First Round games match for ${key}: +1 point`);
          }
          totalScore += score;
          details.firstRound.push({ key, prediction: pred, result: res, winnerMatch, gamesMatch, points: score });
        }
      }

      if (predRounds.semifinals && results.semifinals) {
        for (const key in predRounds.semifinals) {
          const pred = predRounds.semifinals[key] || {};
          const res = results.semifinals[key] || {};
          console.log(`Comparing Semifinals ${key}: Pred ${JSON.stringify(pred)}, Res ${JSON.stringify(res)}`);
          let score = 0;
          const winnerMatch = pred.winner === res.winner;
          const gamesMatch = pred.games === res.games;
          if (winnerMatch) {
            score += 2;
            console.log(`Semifinals winner match for ${key}: +2 points`);
          }
          if (gamesMatch) {
            score += 1;
            console.log(`Semifinals games match for ${key}: +1 point`);
          }
          totalScore += score;
          details.semifinals.push({ key, prediction: pred, result: res, winnerMatch, gamesMatch, points: score });
        }
      }

      if (predRounds.conferenceFinals && results.conferenceFinals) {
        for (const key in predRounds.conferenceFinals) {
          const pred = predRounds.conferenceFinals[key] || {};
          const res = results.conferenceFinals[key] || {};
          console.log(`Comparing Conference Finals ${key}: Pred ${JSON.stringify(pred)}, Res ${JSON.stringify(res)}`);
          let score = 0;
          const winnerMatch = pred.winner === res.winner;
          const gamesMatch = pred.games === res.games;
          if (winnerMatch) {
            score += 3;
            console.log(`Conference Finals winner match for ${key}: +3 points`);
          }
          if (gamesMatch) {
            score += 1;
            console.log(`Conference Finals games match for ${key}: +1 point`);
          }
          totalScore += score;
          details.conferenceFinals.push({ key, prediction: pred, result: res, winnerMatch, gamesMatch, points: score });
        }
      }

      const predFinals = predRounds.finals || {};
      const resFinals = results.finals || {};
      const predFinalsData = predFinals.finals || {};
      const resFinalsData = resFinals.finals || {};

      console.log(`Comparing Finals: Pred ${JSON.stringify(predFinalsData)}, Res ${JSON.stringify(resFinalsData)}`);
      let finalsScore = 0;
      const winnerMatch = predFinalsData.winner === resFinalsData.winner;
      const gamesMatch = predFinalsData.games === resFinalsData.games;
      const mvpMatch = predFinalsData.mvp === resFinalsData.mvp;
      if (winnerMatch) {
        finalsScore += 4;
        console.log('Finals winner match: +4 points');
      }
      if (gamesMatch) {
        finalsScore += 1;
        console.log('Finals games match: +1 point');
      }
      if (mvpMatch) {
        finalsScore += 1;
        console.log('Finals MVP match: +1 point');
      }
      totalScore += finalsScore;
      details.finals.push({ key: 'finals', prediction: predFinalsData, result: resFinalsData, winnerMatch, gamesMatch, mvpMatch, points: finalsScore });

      return { user, score: totalScore, details };
    });

    const standings = scores.map(({ user, score }) => ({ name: user, points: score }))
      .sort((a, b) => b.points - a.points);

    res.json({ scores, standings });
  } catch (error) {
    console.error('Error calculating scores:', error.stack);
    res.status(500).json({ error: 'Failed to calculate scores', details: error.message });
  }
});

// Endpoint: Send Email
app.post('/api/send-email', async (req, res) => {
  try {
    const { userData, predictions, playInSelections } = req.body;

    const mailOptions = {
      from: 'rafyperez@gmail.com',
      to: userData.email,
      subject: 'Your NBA Playoff Pool 2025 Predictions',
      html: formatPredictionsForEmail(userData, predictions, playInSelections)
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${userData.email}`);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

// Endpoint: Get Prediction Distribution for Finals Winner and MVP
app.get('/api/prediction-distribution', async (req, res) => {
  try {
    // Count finals winner predictions
    const winnerCounts = await Prediction.aggregate([
      { $group: { _id: "$predictions.finals.finals.winner", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Count MVP predictions
    const mvpCounts = await Prediction.aggregate([
      { $group: { _id: "$predictions.finals.finals.mvp", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      winnerDistribution: winnerCounts,
      mvpDistribution: mvpCounts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));