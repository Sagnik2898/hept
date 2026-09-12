import { Router } from 'express';
import { getEarlyBiomarkers, getSignalTiers, scorePatientProfile } from '../controllers/biomarkerController.js';

const router = Router();

router.get('/early-detection', getEarlyBiomarkers);
router.get('/tiers', getSignalTiers);
router.post('/score', scorePatientProfile);

export default router;
