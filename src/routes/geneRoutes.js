import { Router } from 'express';
import { queryGenes, getGeneProfile, getGeneSummary, autocompleteGenes } from '../controllers/geneController.js';

const router = Router();

router.get('/', queryGenes);
router.get('/autocomplete', autocompleteGenes);
router.get('/summary', getGeneSummary);
router.get('/profile/:symbol', getGeneProfile);

export default router;
