import { Router } from 'express';
import { geminiController } from '../controllers/geminiController.js';

const router = Router();

router.post('/interpret', geminiController.interpret);
router.post('/ask', geminiController.ask);

export default router;
