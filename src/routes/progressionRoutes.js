import { Router } from 'express';
import { getTrajectory, alignProfile } from '../controllers/progressionController.js';

const router = Router();

router.get('/trajectory', getTrajectory);
router.post('/align', alignProfile);

export default router;
