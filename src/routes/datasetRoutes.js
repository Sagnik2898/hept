import { Router } from 'express';
import { getAllDatasets, getDatasetByAccession } from '../controllers/datasetController.js';

const router = Router();

router.get('/', getAllDatasets);
router.get('/:accession', getDatasetByAccession);

export default router;
