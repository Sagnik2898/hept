import { Router } from 'express';
import { predictProfile, getModelInfo, trainModel } from '../controllers/mlController.js';

const router = Router();

router.post('/predict', predictProfile);
router.get('/model-info', getModelInfo);
router.post('/train', trainModel);

export default router;
