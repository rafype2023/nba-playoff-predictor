const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Prediction Schema and Model
const predictionSchema = new mongoose.Schema({
  userData: {
    name: String,
    email: String,
    phone: String,
  },
  predictions: Object,
  playInSelections: Object,
  firstRound: Object,
  semifinals: Object,
  conferenceFinals: Object,
  finals: Object,
  timestamp: { type: Date, default: Date.now },
});
const Prediction = mongoose.model('Prediction', predictionSchema, 'predictions');

// Result Schema and Model
const resultSchema = new mongoose.Schema({
  firstRound: Object,
  semifinals: Object,
  conferenceFinals: Object,
  finals: Object,
  timestamp: { type: Date, default: Date.now },
});
const Result = mongoose.model('Result', resultSchema, 'results');

// Email Configuration with Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'Poolnba00@gmail.com',
    pass: 'wdtvkhmlfjguyrsb' // Replace with the 16-character code after generating
  }
});

// Format predictions for email
const formatPredictionsForEmail = (userData, predictions, playInSelections) => {
  return `
    <h2>NBA Playoff Pool 2025 Predictions for ${userData.name}</h2>
    <p>Email: ${userData.email}</p>
    <p>Phone: ${userData.phone}</p>
    
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
    </ul>

    <p>Thanks for participating in the NBA Playoff Pool 2025!</p>
  `;
};

// Existing Endpoint: Save Predictions
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

// Existing Endpoint: Save Results
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

// Existing Endpoint: Calculate Scores
app.get('/api/scores', async (req, res) => {
  try {
    const predictions = await Prediction.find();
    if (!predictions || predictions.length === 0) {
      console.log('No predictions found in database');
      return res.json([]);
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

    res.json(scores);
  } catch (error) {
    console.error('Error calculating scores:', error.stack);
    res.status(500).json({ error: 'Failed to calculate scores', details: error.message });
  }
});

// New Endpoint: Send Email
app.post('/api/send-email', async (req, res) => {
  const { userData, predictions, playInSelections } = req.body;

  const mailOptions = {
    from: 'Poolnba00@gmail.com',
    to: userData.email,
    subject: 'Your NBA Playoff Pool 2025 Predictions',
    html: formatPredictionsForEmail(userData, predictions, playInSelections)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${userData.email}`);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));