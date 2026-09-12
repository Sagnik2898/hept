import { Router } from 'express';
import {
  getPathways,
  getPathwayById,
  runEnrichmentAnalysis,
  getStageMetabolicProfile
} from '../controllers/pathwayController.js';

const router = Router();

router.get('/', getPathways);
router.get('/:id', getPathwayById);
router.post('/enrichment', runEnrichmentAnalysis);
router.get('/stage/:stage', getStageMetabolicProfile);

export default router;
