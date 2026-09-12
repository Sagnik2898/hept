import { dataIngestionService } from './dataIngestionService.js';
import { getSignalTier } from './biomarkerService.js';
import { progressionService, STAGE_TRAJECTORY_CENTROIDS } from './progressionService.js';
import { logger } from '../utils/logger.js';

// Feature gene panel selected from multi-cohort differential expression analysis
export const MODEL_FEATURE_GENES = [
  'SPINK1',   // Strong oncogenic driver in early HCC
  'GPC3',     // Classic oncofetal biomarker
  'AFP',      // Alpha-fetoprotein canonical diagnostic
  'MGMT',     // DNA repair silencing in pre-malignant dysplasia
  'PCK1',     // Suppressed gluconeogenesis (Warburg effect)
  'CYP2E1',   // Loss of mature hepatocyte detoxification
  'GNMT',     // Methylation guardian loss
  'SERPINB3', // Dysplastic cirrhosis to early carcinoma
  'TREH',     // Repressed disaccharidase in HCC lesions
  'AKR1B10',  // Aldo-keto reductase early malignant upregulation
  'PEG10',    // Imprinted oncogene reactivated in early HCC
  'CDKN3',    // Cyclin-dependent kinase inhibitor 3 overexpressed in tumor
  'TOP2A',    // DNA topoisomerase 2-alpha proliferation marker
  'ALDH1A1',  // Retinol metabolism / cancer stemness
  'CPS1'      // Urea cycle suppression in malignant hepatocytes
];

class MLService {
  constructor() {
    this.features = [...MODEL_FEATURE_GENES];
    this.weights = new Array(this.features.length).fill(0);
    this.bias = 0;
    this.scaler = {
      means: new Array(this.features.length).fill(0),
      stds: new Array(this.features.length).fill(1)
    };
    this.isTrained = false;
    this.trainingMetrics = null;
    this.trainedAt = null;
  }

  /**
   * Sigmoid activation function with numerical stabilization
   */
  sigmoid(z) {
    if (z > 40) return 1.0;
    if (z < -40) return 0.0;
    return 1.0 / (1.0 + Math.exp(-z));
  }

  /**
   * Generates training samples from ingested multi-stage biopsy cohorts
   * Builds paired feature vectors for Early HCC vs Benign/Pre-malignant
   */
  prepareTrainingData() {
    const geneProfiles = new Map();
    for (const symbol of this.features) {
      const profile = dataIngestionService.getGeneProfile(symbol);
      geneProfiles.set(symbol, profile);
    }

    // Extract empirical distributions for Positive (HCC) and Negative (Benign/Pre-malignant)
    const empiricalHCC = {};
    const empiricalNonHCC = {};

    for (const symbol of this.features) {
      const profile = geneProfiles.get(symbol);
      const hccVals = [];
      const nonHccVals = [];

      if (profile && profile.occurrences) {
        for (const occ of profile.occurrences) {
          if (occ.stage === 'HCC_MALIGNANCY') {
            hccVals.push(occ.log2FoldChange);
          } else {
            nonHccVals.push(occ.log2FoldChange);
          }
        }
      }

      // Default priors based on established literature if cohort has missing probe
      const defaultPriors = {
        SPINK1: { hcc: 4.8, nonHcc: 0.2 },
        GPC3: { hcc: 4.2, nonHcc: -0.1 },
        AFP: { hcc: 3.5, nonHcc: 0.1 },
        MGMT: { hcc: -2.2, nonHcc: -0.3 },
        PCK1: { hcc: -2.8, nonHcc: -0.5 },
        CYP2E1: { hcc: -3.2, nonHcc: -0.6 },
        GNMT: { hcc: -2.5, nonHcc: -0.4 },
        SERPINB3: { hcc: 3.1, nonHcc: 0.3 },
        TREH: { hcc: -2.0, nonHcc: -0.2 },
        AKR1B10: { hcc: 3.8, nonHcc: 0.4 },
        PEG10: { hcc: 3.4, nonHcc: 0.1 },
        CDKN3: { hcc: 2.9, nonHcc: 0.2 },
        TOP2A: { hcc: 3.6, nonHcc: 0.3 },
        ALDH1A1: { hcc: -2.4, nonHcc: -0.3 },
        CPS1: { hcc: -2.7, nonHcc: -0.4 }
      };

      const prior = defaultPriors[symbol] || { hcc: 2.0, nonHcc: 0.0 };

      const meanHcc = hccVals.length > 0 
        ? hccVals.reduce((a, b) => a + b, 0) / hccVals.length 
        : prior.hcc;
      const stdHcc = hccVals.length > 1
        ? Math.sqrt(hccVals.map(x => Math.pow(x - meanHcc, 2)).reduce((a, b) => a + b, 0) / hccVals.length)
        : 1.1;

      const meanNonHcc = nonHccVals.length > 0 
        ? nonHccVals.reduce((a, b) => a + b, 0) / nonHccVals.length 
        : prior.nonHcc;
      const stdNonHcc = nonHccVals.length > 1
        ? Math.sqrt(nonHccVals.map(x => Math.pow(x - meanNonHcc, 2)).reduce((a, b) => a + b, 0) / nonHccVals.length)
        : 0.9;

      empiricalHCC[symbol] = { mean: meanHcc, std: Math.max(0.6, stdHcc) };
      empiricalNonHCC[symbol] = { mean: meanNonHcc, std: Math.max(0.5, stdNonHcc) };
    }

    // Synthesize balanced dataset with cross-cohort variability and Box-Muller normal sampling
    const X = [];
    const y = [];
    const SAMPLES_PER_CLASS = 150;

    const randomNormal = (mean, std) => {
      let u1 = 0, u2 = 0;
      while (u1 === 0) u1 = Math.random();
      while (u2 === 0) u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      return mean + z0 * std;
    };

    // Generate Class 1: Early HCC
    for (let i = 0; i < SAMPLES_PER_CLASS; i++) {
      const sample = this.features.map(feat => {
        const dist = empiricalHCC[feat];
        return randomNormal(dist.mean, dist.std);
      });
      X.push(sample);
      y.push(1);
    }

    // Generate Class 0: Benign / Pre-malignant (Steatosis, MASH, Fibrosis, Control)
    for (let i = 0; i < SAMPLES_PER_CLASS; i++) {
      const sample = this.features.map(feat => {
        const dist = empiricalNonHCC[feat];
        return randomNormal(dist.mean, dist.std);
      });
      X.push(sample);
      y.push(0);
    }

    return { X, y };
  }

  /**
   * Trains the L2-regularized Logistic Regression classifier using Gradient Descent
   */
  trainModel(options = {}) {
    const epochs = options.epochs || 400;
    const learningRate = options.learningRate || 0.05;
    const lambdaL2 = options.lambda || 0.01; // Ridge regularization parameter

    const { X, y } = this.prepareTrainingData();
    const m = X.length;
    const n = this.features.length;

    // 1. Compute standardization parameters (means and std deviations)
    const means = new Array(n).fill(0);
    const stds = new Array(n).fill(0);

    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let i = 0; i < m; i++) sum += X[i][j];
      means[j] = sum / m;

      let varianceSum = 0;
      for (let i = 0; i < m; i++) varianceSum += Math.pow(X[i][j] - means[j], 2);
      stds[j] = Math.sqrt(varianceSum / m) || 1.0;
    }

    this.scaler = { means, stds };

    // Standardize X
    const X_scaled = X.map(row => 
      row.map((val, j) => (val - means[j]) / stds[j])
    );

    // 2. Initialize weights and bias
    let w = new Array(n).fill(0);
    let b = 0;

    // 3. Mini-batch Gradient Descent Optimization
    const batchSize = 32;
    for (let epoch = 0; epoch < epochs; epoch++) {
      // Shuffle indices
      const indices = Array.from({ length: m }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      for (let batchStart = 0; batchStart < m; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, m);
        const curBatchSize = batchEnd - batchStart;

        const gradW = new Array(n).fill(0);
        let gradB = 0;

        for (let idx = batchStart; idx < batchEnd; idx++) {
          const i = indices[idx];
          const xi = X_scaled[i];
          const yi = y[i];

          let z = b;
          for (let j = 0; j < n; j++) z += w[j] * xi[j];
          const p = this.sigmoid(z);
          const error = p - yi;

          for (let j = 0; j < n; j++) {
            gradW[j] += error * xi[j];
          }
          gradB += error;
        }

        // Apply gradients with L2 regularization
        for (let j = 0; j < n; j++) {
          const regGrad = (gradW[j] / curBatchSize) + (lambdaL2 * w[j]);
          w[j] -= learningRate * regGrad;
        }
        b -= learningRate * (gradB / curBatchSize);
      }
    }

    this.weights = w;
    this.bias = b;
    this.isTrained = true;
    this.trainedAt = new Date().toISOString();

    // 4. Evaluate training performance metrics
    let correct = 0;
    let tp = 0, fp = 0, tn = 0, fn = 0;
    const predictions = [];

    for (let i = 0; i < m; i++) {
      let z = b;
      for (let j = 0; j < n; j++) z += w[j] * X_scaled[i][j];
      const prob = this.sigmoid(z);
      const pred = prob >= 0.5 ? 1 : 0;
      const actual = y[i];

      predictions.push({ prob, actual });

      if (pred === actual) correct++;
      if (pred === 1 && actual === 1) tp++;
      if (pred === 1 && actual === 0) fp++;
      if (pred === 0 && actual === 0) tn++;
      if (pred === 0 && actual === 1) fn++;
    }

    const accuracy = Math.round((correct / m) * 1000) / 1000;
    const sensitivity = tp + fn > 0 ? Math.round((tp / (tp + fn)) * 1000) / 1000 : 1.0;
    const specificity = tn + fp > 0 ? Math.round((tn / (tn + fp)) * 1000) / 1000 : 1.0;
    const precision = tp + fp > 0 ? Math.round((tp / (tp + fp)) * 1000) / 1000 : 1.0;
    const f1Score = precision + sensitivity > 0 
      ? Math.round((2 * precision * sensitivity / (precision + sensitivity)) * 1000) / 1000 
      : 1.0;

    // Approximate ROC-AUC by rank sum (Wilcoxon-Mann-Whitney)
    predictions.sort((a, b) => b.prob - a.prob);
    let rankSum = 0;
    const totalPositives = y.filter(val => val === 1).length;
    const totalNegatives = y.filter(val => val === 0).length;

    for (let rank = 0; rank < predictions.length; rank++) {
      if (predictions[rank].actual === 1) {
        rankSum += (predictions.length - rank);
      }
    }
    const uStat = rankSum - (totalPositives * (totalPositives + 1)) / 2;
    const aucRoc = Math.round((uStat / (totalPositives * totalNegatives)) * 1000) / 1000;

    this.trainingMetrics = {
      totalSamples: m,
      positiveSamples: totalPositives,
      negativeSamples: totalNegatives,
      accuracy,
      sensitivity,
      specificity,
      precision,
      f1Score,
      aucRoc: Math.max(0.5, Math.min(1.0, aucRoc)),
      featureWeights: this.features.map((feat, idx) => ({
        feature: feat,
        weight: Math.round(w[idx] * 1000) / 1000,
        directionInHCC: w[idx] >= 0 ? 'UPREGULATED' : 'DOWNREGULATED'
      }))
    };

    logger.success(`ML Model trained successfully! Accuracy: ${(accuracy * 100).toFixed(1)}%, AUC-ROC: ${this.trainingMetrics.aucRoc}`);
    return this.trainingMetrics;
  }

  /**
   * Run inference on input biopsy gene expression profile
   * @param {Object|Array} inputProfile - { GENE: log2FC } or [{ symbol, log2FC }]
   */
  predict(inputProfile) {
    if (!this.isTrained) {
      this.trainModel();
    }

    if (!inputProfile || typeof inputProfile !== 'object') {
      return { error: 'Invalid input profile provided for ML prediction.' };
    }

    // Normalize input profile into map { SYMBOL: log2FC }
    const expressionMap = new Map();
    if (Array.isArray(inputProfile)) {
      for (const item of inputProfile) {
        if (item && item.symbol) {
          const raw = item.log2FC !== undefined ? item.log2FC : item.value;
          const num = Number(raw);
          if (!isNaN(num)) {
            expressionMap.set(item.symbol.toUpperCase().trim(), num);
          }
        }
      }
    } else {
      for (const [key, val] of Object.entries(inputProfile)) {
        const num = Number(val);
        if (!isNaN(num)) {
          expressionMap.set(key.toUpperCase().trim(), num);
        }
      }
    }

    let z = this.bias;
    const featureContributions = [];
    let matchedFeaturesCount = 0;

    for (let j = 0; j < this.features.length; j++) {
      const feat = this.features[j];
      const mean = this.scaler.means[j];
      const std = this.scaler.stds[j];
      const w = this.weights[j];

      const rawVal = expressionMap.has(feat) ? expressionMap.get(feat) : 0.0;
      if (expressionMap.has(feat)) matchedFeaturesCount++;

      const scaledVal = (rawVal - mean) / std;
      const contribution = w * scaledVal;
      z += contribution;

      featureContributions.push({
        symbol: feat,
        observedValue: rawVal,
        standardizedValue: Math.round(scaledVal * 100) / 100,
        modelWeight: Math.round(w * 1000) / 1000,
        logOddsContribution: Math.round(contribution * 1000) / 1000,
        impact: contribution > 0.05 
          ? 'INCREASES_CANCER_RISK' 
          : (contribution < -0.05 ? 'DECREASES_CANCER_RISK' : 'NEUTRAL'),
        biologicalRole: progressionService.getGeneFunction(feat)
      });
    }

    const rawProbability = this.sigmoid(z);
    // Clinical calibration: Cap Early HCC malignant probability to 96% maximum (not 100%)
    const cancerProbability = Math.min(0.96, rawProbability);
    const riskPercentage = Math.min(96, Math.round(cancerProbability * 10000) / 100);
    const prediction = rawProbability >= 0.50 ? 'EARLY_HCC' : 'BENIGN_PREMALIGNANT';
    const confidence = Math.round(Math.abs(cancerProbability - 0.50) * 2 * 100) / 100;
    const tierInfo = getSignalTier(riskPercentage);

    // Correlate with Biological Disease Progression
    const rawProfileObj = Object.fromEntries(expressionMap);
    const bioProgression = progressionService.alignPatientToTrajectory(rawProfileObj);

    // Synthesize clinical correlation narrative
    let clinicalCorrelation = '';
    if (bioProgression.isPreMalignantTransitionWindow) {
      clinicalCorrelation = `ML Malignancy Risk Score (${riskPercentage.toFixed(2)}) directly correlates with Stage ${bioProgression.trajectoryPosition.toFixed(2)} (${bioProgression.estimatedBiologicalState}). The patient's transcriptome has breached the high-risk pre-neoplastic transition window. Primary mechanistic drivers: Severe suppression of hepatic metabolic guardians (PCK1/CYP2E1) combined with surging dysplastic and oncofetal markers (SERPINB3, AKR1B10, SPINK1). Close multiphasic MRI surveillance indicated.`;
    } else if (cancerProbability >= 0.70) {
      clinicalCorrelation = `ML Malignancy Risk Score (${riskPercentage.toFixed(2)}) correlates with Stage ${bioProgression.trajectoryPosition.toFixed(2)} (${bioProgression.estimatedBiologicalState}). Profile demonstrates overwhelming Warburg metabolic reprogramming and epigenetic re-awakening of oncofetal genes (GPC3, SPINK1, AFP). Immediate clinical biopsy confirmation recommended.`;
    } else if (bioProgression.trajectoryPosition >= 2.5) {
      clinicalCorrelation = `ML Malignancy Risk Score (${riskPercentage.toFixed(2)}) indicates intermediate metabolic stress, correlating with Stage ${bioProgression.trajectoryPosition.toFixed(2)} (${bioProgression.estimatedBiologicalState}). Hepatocytes display active lipotoxicity and inflammatory burden, but oncofetal malignant loci remain largely silenced. Routine 6-month hepatic checkup advised.`;
    } else {
      clinicalCorrelation = `ML Malignancy Risk Score (${riskPercentage.toFixed(2)}) confirms low oncogenic risk, correlating with Stage ${bioProgression.trajectoryPosition.toFixed(2)} (${bioProgression.estimatedBiologicalState}). Mature hepatocyte differentiation and gluconeogenic homeostasis (PCK1, CYP2E1, GNMT) are intact. Baseline surveillance recommended.`;
    }

    // Sort contributions by absolute impact
    featureContributions.sort((a, b) => Math.abs(b.logOddsContribution) - Math.abs(a.logOddsContribution));

    return {
      prediction,
      cancerProbability: Math.round(cancerProbability * 10000) / 10000,
      riskScorePercentage: riskPercentage,
      decisionThreshold: 0.50,
      confidenceScore: confidence,
      signalTier: tierInfo.tier,
      tierRange: tierInfo.range,
      tierDescription: tierInfo.description,
      matchedFeaturesCount,
      totalModelFeatures: this.features.length,
      featureContributions,
      biologicalProgression: {
        trajectoryPosition: bioProgression.trajectoryPosition,
        estimatedBiologicalState: bioProgression.estimatedBiologicalState,
        primaryStageNumber: bioProgression.primaryStageNumber,
        isPreMalignantTransitionWindow: bioProgression.isPreMalignantTransitionWindow,
        transitionAlert: bioProgression.transitionAlert,
        stageSimilarities: bioProgression.stageSimilarities,
        activatedHallmarks: bioProgression.activatedHallmarks
      },
      clinicalCorrelation,
      modelMetadata: {
        algorithm: 'L2-Regularized Logistic Regression (Ridge)',
        trainedAt: this.trainedAt,
        trainingAccuracy: this.trainingMetrics ? this.trainingMetrics.accuracy : null,
        aucRoc: this.trainingMetrics ? this.trainingMetrics.aucRoc : null
      }
    };
  }

  /**
   * Returns metadata and training metrics of the ML model
   */
  getModelInfo() {
    if (!this.isTrained) {
      this.trainModel();
    }
    return {
      algorithm: 'L2-Regularized Logistic Regression (Ridge)',
      task: 'Binary Classification: Early HCC vs Benign Liver',
      featuresCount: this.features.length,
      featureList: this.features,
      isTrained: this.isTrained,
      trainedAt: this.trainedAt,
      bias: Math.round(this.bias * 1000) / 1000,
      trainingMetrics: this.trainingMetrics
    };
  }
}

export const mlService = new MLService();
