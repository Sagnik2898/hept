import { Router } from 'express';
import { mapProbe, searchGeneMappings, getMappingStats } from '../controllers/mappingController.js';

const router = Router();

router.get('/probe/:probeId', mapProbe);
router.get('/search', searchGeneMappings);
router.get('/stats', getMappingStats);

export default router;
