import { pathwayService } from '../services/pathwayService.js';

export const getPathways = (req, res) => {
  try {
    const { category } = req.query;
    const pathways = pathwayService.getAllPathways(category);
    res.json({
      success: true,
      count: pathways.length,
      pathways
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getPathwayById = (req, res) => {
  try {
    const { id } = req.params;
    const pathway = pathwayService.getPathwayById(id);
    if (!pathway) {
      return res.status(404).json({ success: false, error: `Pathway ${id} not found.` });
    }
    res.json({ success: true, pathway });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const runEnrichmentAnalysis = (req, res) => {
  try {
    const { genes, backgroundSize } = req.body;
    if (!genes || !Array.isArray(genes) || genes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request. Provide an array of gene symbols or gene objects in `genes`.'
      });
    }

    const result = pathwayService.runEnrichment(genes, { backgroundSize });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getStageMetabolicProfile = (req, res) => {
  try {
    const { stage } = req.params;
    const validStages = [
      'HCC_MALIGNANCY',
      'MASH_VS_CONTROL',
      'STEATOSIS_VS_CONTROL',
      'MASH_VS_STEATOSIS',
      'STEATOSIS_SEVERITY',
      'FIBROSIS_PROGRESSION',
      'CIRRHOSIS_TRANSITION'
    ];

    if (!validStages.includes(stage)) {
      return res.status(400).json({
        success: false,
        error: `Invalid stage. Valid stages: ${validStages.join(', ')}`
      });
    }

    const profile = pathwayService.getStageMetabolicProfile(stage);
    res.json({ success: true, ...profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
