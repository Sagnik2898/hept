import { Router } from 'express';
import { getEarlyBiomarkers, getSignalTiers, scorePatientProfile, getActionableTargets } from '../controllers/biomarkerController.js';

const router = Router();

router.get('/early-detection', getEarlyBiomarkers);
router.get('/tiers', getSignalTiers);
router.post('/score', scorePatientProfile);
router.post('/actionable-targets', getActionableTargets);

export default router;
