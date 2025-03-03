const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const predictionSchema = new mongoose.Schema({
  userData: { name: String, email: String, phone: String },
  predictions: Object,
  timestamp: { type: Date, default: Date.now },
});
const Prediction = mongoose.model('Prediction', predictionSchema);

const resultSchema = new mongoose.Schema({
  firstRound: Object,        // { east-0: { winner: "Team", games: "4-2" }, ... }
  semifinals: Object,
  conferenceFinals: Object,
  finals: Object,
  timestamp: { type: Date, default: Date.now },
});
const Result = mongoose.model('Result', resultSchema, 'results');

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

app.get('/api/scores', async (req, res) => {
  try {
    const predictions = await Prediction.find(); // All user predictions
    const results = await Result.findOne().sort({ timestamp: -1 }); // Latest result
    if (!results) return res.status(404).json({ error: 'No results found' });

    const scores = predictions.map(prediction => {
      let score = 0;
      // First Round: 1 point each
      for (const key in prediction.firstRound) {
        if (results.firstRound[key] && 
            prediction.firstRound[key].winner === results.firstRound[key].winner && 
            prediction.firstRound[key].games === results.firstRound[key].games) {
          score += 1;
        }
      }
      // Semifinals: 2 points each
      for (const key in prediction.semifinals) {
        if (results.semifinals[key] && 
            prediction.semifinals[key].winner === results.semifinals[key].winner && 
            prediction.semifinals[key].games === results.semifinals[key].games) {
          score += 2;
        }
      }
      // Conference Finals: 3 points each
      for (const key in prediction.conferenceFinals) {
        if (results.conferenceFinals[key] && 
            prediction.conferenceFinals[key].winner === results.conferenceFinals[key].winner && 
            prediction.conferenceFinals[key].games === results.conferenceFinals[key].games) {
          score += 3;
        }
      }
      // Finals: 4 points for winner/games, 1 extra for MVP
      if (prediction.finals.finals && results.finals.finals) {
        if (prediction.finals.finals.winner === results.finals.finals.winner &&
            prediction.finals.finals.games === results.finals.finals.games) {
          score += 4;
        }
        if (prediction.finals.finals.mvp === results.finals.finals.mvp) {
          score += 1; // Bonus point for correct MVP
        }
      }
      return { user: prediction.userData.name, score };
    });
    res.json(scores);
  } catch (error) {
    console.error('Error calculating scores:', error);
    res.status(500).json({ error: 'Failed to calculate scores' });
  }
});      

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
