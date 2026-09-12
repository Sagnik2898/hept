import { Router } from 'express';
import { reportController } from '../controllers/reportController.js';

const router = Router();

router.post('/download-pdf', (req, res) => reportController.downloadPdf(req, res));
router.get('/sample-pdf', (req, res) => reportController.getSamplePdf(req, res));

export default router;
