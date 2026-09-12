import { CONFIG } from '../config/index.js';
import { logger } from '../utils/logger.js';

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.primaryModel = 'gemini-3.6-flash';
    this.fallbackModel = 'gemini-flash-latest';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  async callGemini(systemInstruction, userPrompt) {
    if (!this.isConfigured()) {
      throw new Error('GEMINI_API_KEY is not configured in environment.');
    }

    const modelsToTry = [this.primaryModel, this.fallbackModel];
    let lastError = null;

    for (const model of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

      try {
        const payload = {
          contents: [{
            role: 'user',
            parts: [{ text: userPrompt }]
          }],
          generationConfig: {
            temperature: 0.3,
            topP: 0.85,
            maxOutputTokens: 1024
          }
        };

        if (systemInstruction) {
          payload.systemInstruction = {
            parts: [{ text: systemInstruction }]
          };
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 18000);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errBody = await response.text();
          logger.warn(`Gemini call to ${model} returned ${response.status}: ${errBody.slice(0, 150)}`);
          lastError = new Error(`Gemini API error (${response.status}): ${errBody.slice(0, 120)}`);
          continue;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return {
            text,
            model,
            usage: data.usageMetadata || null
          };
        }
      } catch (err) {
        logger.warn(`Failed calling Gemini model ${model}: ${err.message}`);
        lastError = err;
      }
    }

    throw lastError || new Error('All Gemini models failed to generate content.');
  }

  /**
   * Generates deep molecular oncological reasoning for a given biopsy profile
   */
  async generateClinicalInterpretation({ expressionProfile = {}, mlResult = {}, progression = {} }) {
    const riskScore = mlResult.riskScorePercentage !== undefined ? mlResult.riskScorePercentage : 'N/A';
    const classification = mlResult.prediction || (riskScore >= 50 ? 'EARLY_HCC' : 'BENIGN');
    const stagePos = progression.trajectoryPosition !== undefined ? progression.trajectoryPosition.toFixed(2) : 'N/A';
    const stageName = progression.estimatedBiologicalState || 'Liver Tissue Assessment';
    const isTransition = progression.isPreMalignantTransitionWindow;

    const keyGenesStr = Object.entries(expressionProfile)
      .map(([sym, val]) => `${sym}: ${Number(val) >= 0 ? '+' : ''}${Number(val).toFixed(2)} log2FC`)
      .join(', ');

    const systemInstruction = `You are the Lead Clinical Molecular Oncologist and Hepato-Pathologist at HepatoGuard Precision Oncology.
You provide rigorous, biologically grounded, explainable clinical interpretations of human liver biopsy transcriptomes.
Focus on:
1. Key molecular mechanisms (Warburg glycolytic shift, loss of gluconeogenesis/detoxification guardians like PCK1/CYP2E1, and oncofetal/dysplastic activations like SPINK1, GPC3, SERPINB3, AKR1B10).
2. Biological transition dynamics along the 5-stage cascade (Healthy -> Steatosis -> MASH -> Cirrhosis Phase -> Early HCC).
3. Evidence-based clinical recommendations (e.g. multiphasic contrast-enhanced MRI LI-RADS timing, biopsy confirmation, or routine follow-up).
Keep your tone authoritative, precise, and clinically actionable. Avoid generic disclaimers. Use clear bulleted sections.`;

    const userPrompt = `Please generate an in-depth precision oncology diagnostic evaluation for the following patient biopsy:

PATIENT BIOLOGICAL & ML PROFILE:
- Machine Learning Diagnostic Risk Score: ${riskScore} / 100
- Binary Diagnostic Classification: ${classification === 'EARLY_HCC' ? 'EARLY HCC (MALIGNANT)' : 'BENIGN'}
- Biological Progression Continuum: Stage ${stagePos} / 5.0 (${stageName})
- Pre-Neoplastic Transition Inflection: ${isTransition ? 'ACTIVE (Critical Dysplasia Inflection Window 3.4–4.6)' : 'INACTIVE'}
- Key Transcriptomic Gene Expression Vector (log2FC):
  ${keyGenesStr}

Structure your response with:
1. Executive Oncological Summary (2-3 sentences)
2. Primary Pathophysiological Drivers (Highlighting key activated or suppressed genes and cellular mechanisms)
3. Disease Cascade Progression Risk (Inflection analysis across the Cirrhosis Phase and Malignant transformation)
4. Recommended Clinical Action Plan (Surveillance imaging, biomarker monitoring, or multidisciplinary consult)`;

    return await this.callGemini(systemInstruction, userPrompt);
  }

  /**
   * Answers custom doctor / judge clinical questions with patient context
   */
  async answerClinicalQuestion({ question, expressionProfile = {}, mlResult = {}, progression = {} }) {
    const riskScore = mlResult.riskScorePercentage !== undefined ? mlResult.riskScorePercentage : 'N/A';
    const classification = mlResult.prediction || (riskScore >= 50 ? 'EARLY_HCC' : 'BENIGN');
    const stagePos = progression.trajectoryPosition !== undefined ? progression.trajectoryPosition.toFixed(2) : 'N/A';
    const stageName = progression.estimatedBiologicalState || 'Liver Tissue Assessment';

    const systemInstruction = `You are HepatoGuard AI, a Senior Molecular Oncologist and Hepato-Pathology expert.
Answer the user's specific clinical, biological, or algorithmic question regarding the current patient's transcriptomic biopsy profile and early liver cancer progression.
Ground your answers in molecular hepatocarcinogenesis literature (PCK1, CYP2E1, SPINK1, GPC3, SERPINB3, GNMT). Be concise, evidence-based, and clinically insightful.`;

    const userPrompt = `PATIENT CONTEXT:
- Risk Score: ${riskScore}
- Classification: ${classification}
- Biological State: Stage ${stagePos} / 5.0 (${stageName})
- Biopsy Profile: ${JSON.stringify(expressionProfile)}

USER QUESTION:
${question}`;

    return await this.callGemini(systemInstruction, userPrompt);
  }
}

export const geminiService = new GeminiService();
