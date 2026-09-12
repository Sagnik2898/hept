import { Router } from 'express';
import { queryGenes, getGeneProfile, getGeneSummary } from '../controllers/geneController.js';

const router = Router();

router.get('/', queryGenes);
router.get('/summary', getGeneSummary);
router.get('/profile/:symbol', getGeneProfile);

export default router;
