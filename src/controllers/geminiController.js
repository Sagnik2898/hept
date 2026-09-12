import { geminiService } from '../services/geminiService.js';
import { logger } from '../utils/logger.js';

class GeminiController {
  async interpret(req, res) {
    try {
      const { expressionProfile, mlResult, progression } = req.body;
      const result = await geminiService.generateClinicalInterpretation({
        expressionProfile: expressionProfile || {},
        mlResult: mlResult || {},
        progression: progression || {}
      });

      return res.status(200).json({
        success: true,
        interpretation: result.text,
        modelUsed: result.model,
        usage: result.usage
      });
    } catch (err) {
      logger.error(`Gemini interpretation error: ${err.message}`);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to generate clinical reasoning from Gemini'
      });
    }
  }

  async ask(req, res) {
    try {
      const { question, expressionProfile, mlResult, progression } = req.body;

      if (!question || typeof question !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'A question string is required.'
        });
      }

      const result = await geminiService.answerClinicalQuestion({
        question,
        expressionProfile: expressionProfile || {},
        mlResult: mlResult || {},
        progression: progression || {}
      });

      return res.status(200).json({
        success: true,
        answer: result.text,
        modelUsed: result.model,
        usage: result.usage
      });
    } catch (err) {
      logger.error(`Gemini Q&A error: ${err.message}`);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to answer question with Gemini'
      });
    }
  }
}

export const geminiController = new GeminiController();
