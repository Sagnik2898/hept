import { Router } from 'express';
import { getEarlyBiomarkers, scorePatientProfile } from '../controllers/biomarkerController.js';

const router = Router();

router.get('/early-detection', getEarlyBiomarkers);
router.post('/score', scorePatientProfile);

export default router;
