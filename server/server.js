// ... (rest of the file unchanged up to /api/scores)

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

      // ... (rest of the scoring logic for semifinals, conferenceFinals, finals unchanged)

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

// ... (rest of the file unchanged)