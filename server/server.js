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

    const scores = predictions.map(prediction => {
      let score = 0;

      // First Round
      if (prediction.firstRound && results.firstRound) {
        for (const key in prediction.firstRound) {
          if (results.firstRound[key] && 
              prediction.firstRound[key].winner === results.firstRound[key].winner && 
              prediction.firstRound[key].games === results.firstRound[key].games) {
            score += 1;
          }
        }
      }

      // Semifinals
      if (prediction.semifinals && results.semifinals) {
        for (const key in prediction.semifinals) {
          if (results.semifinals[key] && 
              prediction.semifinals[key].winner === results.semifinals[key].winner && 
              prediction.semifinals[key].games === results.semifinals[key].games) {
            score += 2;
          }
        }
      }

      // Conference Finals
      if (prediction.conferenceFinals && results.conferenceFinals) {
        for (const key in prediction.conferenceFinals) {
          if (results.conferenceFinals[key] && 
              prediction.conferenceFinals[key].winner === results.conferenceFinals[key].winner && 
              prediction.conferenceFinals[key].games === results.conferenceFinals[key].games) {
            score += 3;
          }
        }
      }

      // Finals
      const predFinals = prediction.finals || {};
      const resFinals = results.finals || {};
      const predFinalsData = predFinals.finals || {};
      const resFinalsData = resFinals.finals || {};

      if (predFinalsData.winner && resFinalsData.winner && 
          predFinalsData.winner === resFinalsData.winner && 
          predFinalsData.games === resFinalsData.games) {
        score += 4;
      }
      if (predFinalsData.mvp && resFinalsData.mvp && 
          predFinalsData.mvp === resFinalsData.mvp) {
        score += 1;
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
