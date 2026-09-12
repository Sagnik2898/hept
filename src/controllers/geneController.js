import { dataIngestionService } from '../services/dataIngestionService.js';

export const queryGenes = (req, res) => {
  try {
    const { symbol, dataset, stage, regulation, minLog2FC, maxPVal, limit, page } = req.query;
    const result = dataIngestionService.queryGenes({
      symbol,
      dataset,
      stage,
      regulation,
      minLog2FC,
      maxPVal,
      limit: limit ? parseInt(limit, 10) : 50,
      page: page ? parseInt(page, 10) : 1
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getGeneProfile = (req, res) => {
  try {
    const { symbol } = req.params;
    const profile = dataIngestionService.getGeneProfile(symbol);
    if (!profile) {
      return res.status(404).json({ success: false, error: `Gene '${symbol}' not found in biopsy DEG database.` });
    }
    res.json({ success: true, gene: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getGeneSummary = (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
    const sortBy = req.query.sortBy || 'recurrence';
    const summary = dataIngestionService.getGeneSummaryList(limit, sortBy);

    res.json({
      success: true,
      totalGenesCataloged: dataIngestionService.geneSummary.size,
      returnedCount: summary.length,
      genes: summary
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
