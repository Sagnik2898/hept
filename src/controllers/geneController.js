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
      const suggestions = dataIngestionService.getSuggestedGenes(symbol, 10);
      return res.status(200).json({
        success: false,
        notFound: true,
        query: symbol,
        error: `No differential expression records found for '${symbol}' in the 7 human liver biopsy datasets.`,
        suggestions
      });
    }
    res.json({ success: true, gene: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const autocompleteGenes = (req, res) => {
  try {
    const q = req.query.q || req.query.query || '';
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 8;
    const suggestions = dataIngestionService.autocompleteGenes(q, limit);
    res.json({ success: true, suggestions });
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
