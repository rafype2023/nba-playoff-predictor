const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = 5001; // Updated to 5001

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection (assuming MongoDB runs on default port 27017)
mongoose.connect('mongodb://localhost:27017/nba-playoff-predictor', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schema and Model
const predictionSchema = new mongoose.Schema({
  userData: {
    name: String,
    email: String,
    phone: String,
  },
  predictions: Object,
  timestamp: { type: Date, default: Date.now },
});

const Prediction = mongoose.model('Prediction', predictionSchema);

// API Endpoint
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

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
