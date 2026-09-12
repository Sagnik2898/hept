import { geneMappingService } from '../services/geneMappingService.js';

export const mapProbe = (req, res) => {
  try {
    const { probeId } = req.params;
    const mapping = geneMappingService.mapProbe(probeId);
    res.json({ success: true, mapping });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const searchGeneMappings = (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter `q` is required.' });
    }
    const results = geneMappingService.searchGenes(q, limit ? parseInt(limit, 10) : 50);
    res.json({ success: true, query: q, count: results.length, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getMappingStats = (req, res) => {
  try {
    const stats = geneMappingService.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
