import { mlService } from '../services/mlService.js';

export const predictProfile = (req, res) => {
  try {
    const input = req.body.expressionProfile || req.body.genes || req.body;
    if (!input || typeof input !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Please provide `expressionProfile` object (e.g. { SPINK1: 4.5, GPC3: 3.2 }) or an array of genes.'
      });
    }

    const prediction = mlService.predict(input);
    if (prediction.error) {
      return res.status(400).json({ success: false, error: prediction.error });
    }

    res.json({ success: true, ...prediction });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getModelInfo = (req, res) => {
  try {
    const info = mlService.getModelInfo();
    res.json({ success: true, model: info });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const trainModel = (req, res) => {
  try {
    const { epochs, learningRate, lambda } = req.body || {};
    const metrics = mlService.trainModel({ epochs, learningRate, lambda });
    res.json({
      success: true,
      message: 'Machine Learning Model trained successfully on multi-cohort biopsy datasets.',
      metrics
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
