import { dataIngestionService } from '../services/dataIngestionService.js';

export const getAllDatasets = (req, res) => {
  try {
    const list = dataIngestionService.getDatasetList();
    const totalRecords = dataIngestionService.degDatabase.length;
    res.json({
      success: true,
      totalDatasets: list.length,
      totalRecordsIngested: totalRecords,
      datasets: list
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getDatasetByAccession = (req, res) => {
  try {
    const { accession } = req.params;
    const dataset = dataIngestionService.getDatasetByAccession(accession);
    if (!dataset) {
      return res.status(404).json({ success: false, error: `Dataset ${accession} not found.` });
    }
    res.json({ success: true, dataset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
