import { biomarkerService } from '../services/biomarkerService.js';

export const getEarlyBiomarkers = (req, res) => {
  try {
    const minDatasetCount = req.query.minDatasets ? parseInt(req.query.minDatasets, 10) : 2;
    const signatures = biomarkerService.getEarlyBiomarkerSignatures({ minDatasetCount });
    res.json({ success: true, ...signatures });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const scorePatientProfile = (req, res) => {
  try {
    const { expressionProfile } = req.body;
    if (!expressionProfile || typeof expressionProfile !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Please provide a JSON object `expressionProfile` with gene symbols as keys and expression/log2FC values as numbers.'
      });
    }

    const evaluation = biomarkerService.calculateEarlyCancerRisk(expressionProfile);
    res.json({ success: true, evaluation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
