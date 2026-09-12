import { progressionService } from '../services/progressionService.js';

export const getTrajectory = (req, res) => {
  try {
    const data = progressionService.getTrajectoryMatrix();
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const alignProfile = (req, res) => {
  try {
    const profile = req.body.expressionProfile || req.body.genes || req.body;
    if (!profile || typeof profile !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Please provide `expressionProfile` object with gene symbols as keys and log2FC as values.'
      });
    }

    const alignment = progressionService.alignPatientToTrajectory(profile);
    if (alignment.error) {
      return res.status(400).json({ success: false, error: alignment.error });
    }

    res.json({ success: true, ...alignment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
