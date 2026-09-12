import { reportService } from '../services/reportService.js';
import { mlService } from '../services/mlService.js';
import { progressionService } from '../services/progressionService.js';
import { logger } from '../utils/logger.js';

class ReportController {
  /**
   * Generates and downloads a custom clinical biopsy PDF report
   * POST /api/reports/download-pdf
   */
  async downloadPdf(req, res) {
    try {
      const { patientId, expressionProfile, mlResult, progression } = req.body || {};

      let profile = expressionProfile;
      let ml = mlResult;
      let prog = progression;

      // If missing, auto-compute using services
      if (!ml && profile) {
        ml = mlService.predict(profile);
      }
      if (!prog && profile) {
        prog = progressionService.alignPatientToTrajectory(profile);
      }

      const pdfBuffer = await reportService.generateBiopsyPdf({
        patientId: patientId || `HEP-${Date.now().toString().slice(-6)}`,
        expressionProfile: profile || {},
        mlResult: ml || {},
        progression: prog || {},
        timestamp: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      });

      const filename = `HepatoGuard_Biopsy_Report_${patientId || 'Patient'}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (err) {
      logger.error('Error generating biopsy PDF report:', err);
      return res.status(500).json({ success: false, error: 'Failed to generate PDF report: ' + err.message });
    }
  }

  /**
   * Sample demonstration PDF download
   * GET /api/reports/sample-pdf
   */
  async getSamplePdf(req, res) {
    try {
      const sampleProfile = {
        SPINK1: 5.8,
        GPC3: 4.5,
        AFP: 3.8,
        SERPINB3: 2.8,
        AKR1B10: 4.1,
        PCK1: -3.1,
        CYP2E1: -3.5,
        GNMT: -2.8
      };

      const ml = mlService.predict(sampleProfile);
      const prog = progressionService.alignPatientToTrajectory(sampleProfile);

      const pdfBuffer = await reportService.generateBiopsyPdf({
        patientId: 'HEP-SAMPLE-DEMO',
        expressionProfile: sampleProfile,
        mlResult: ml,
        progression: prog
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="HepatoGuard_Sample_Clinical_Report.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (err) {
      logger.error('Error generating sample PDF report:', err);
      return res.status(500).json({ success: false, error: 'Failed to generate sample PDF: ' + err.message });
    }
  }
}

export const reportController = new ReportController();
