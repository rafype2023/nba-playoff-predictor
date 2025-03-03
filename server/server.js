const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser'); // If you're using body-parser as per your package.json

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json()); // Using body-parser instead of express.json() if listed in package.json
// Alternatively, if not using body-parser, use:
// app.use(express.json());

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
  predictions: Object, // Original schema might differ; adjust if needed
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

// Existing Endpoint: Save Predictions
app.post('/api/predictions', async (req, res) => {
  try {
    const { userData, predictions } = req.body;
    const newPrediction = new Prediction({ userData, predictions });
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

// New Endpoint: Calculate Scores
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
      let score = 0;
      console.log(`Processing prediction for ${prediction.userData?.name || 'Unknown'}:`, JSON.stringify(prediction, null, 2));

      // First Round (1 point for winner, 1 for games)
      if (prediction.firstRound && results.firstRound) {
        for (const key in prediction.firstRound) {
          if (results.firstRound[key]) {
            if (prediction.firstRound[key].winner === results.firstRound[key].winner) {
              score += 1;
              console.log(`First Round winner match for ${key}: +1 point`);
            }
            if (prediction.firstRound[key].games === results.firstRound[key].games) {
              score += 1;
              console.log(`First Round games match for ${key}: +1 point`);
            }
          }
        }
      }

      // Semifinals (2 points for winner, 1 for games)
      if (prediction.semifinals && results.semifinals) {
        for (const key in prediction.semifinals) {
          if (results.semifinals[key]) {
            if (prediction.semifinals[key].winner === results.semifinals[key].winner) {
              score += 2;
              console.log(`Semifinals winner match for ${key}: +2 points`);
            }
            if (prediction.semifinals[key].games === results.semifinals[key].games) {
              score += 1;
              console.log(`Semifinals games match for ${key}: +1 point`);
            }
          }
        }
      }

      // Conference Finals (3 points for winner, 1 for games)
      if (prediction.conferenceFinals && results.conferenceFinals) {
        for (const key in prediction.conferenceFinals) {
          if (results.conferenceFinals[key]) {
            if (prediction.conferenceFinals[key].winner === results.conferenceFinals[key].winner) {
              score += 3;
              console.log(`Conference Finals winner match for ${key}: +3 points`);
            }
            if (prediction.conferenceFinals[key].games === results.conferenceFinals[key].games) {
              score += 1;
              console.log(`Conference Finals games match for ${key}: +1 point`);
            }
          }
        }
      }

      // Finals (4 points for winner, 1 for games, 1 for MVP)
      const predFinals = prediction.finals || {};
      const resFinals = results.finals || {};
      const predFinalsData = predFinals.finals || {};
      const resFinalsData = resFinals.finals || {};

      if (predFinalsData.winner && resFinalsData.winner && 
          predFinalsData.winner === resFinalsData.winner) {
        score += 4;
        console.log('Finals winner match: +4 points');
      }
      if (predFinalsData.games && resFinalsData.games && 
          predFinalsData.games === resFinalsData.games) {
        score += 1;
        console.log('Finals games match: +1 point');
      }
      if (predFinalsData.mvp && resFinalsData.mvp && 
          predFinalsData.mvp === resFinalsData.mvp) {
        score += 1;
        console.log('Finals MVP match: +1 point');
      }

      return { user: prediction.userData?.name || 'Unknown', score };
    });

    res.json(scores);
  } catch (error) {
    console.error('Error calculating scores:', error.stack);
    res.status(500).json({ error: 'Failed to calculate scores', details: error.message });
  }
});

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
