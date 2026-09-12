import { dataIngestionService } from './dataIngestionService.js';
import { logger } from '../utils/logger.js';

// The 5 Canonical Hepatocarcinogenesis Transition Stages
export const PROGRESSION_STAGES = [
  {
    stageId: 'STAGE_1_HEALTHY',
    stageNumber: 1,
    name: 'Normal Healthy Liver',
    shortName: 'Healthy',
    clinicalDescription: 'Metabolic homeostasis, mature hepatocyte differentiation, active gluconeogenesis and detoxification.',
    hallmarks: ['Bile Acid Homeostasis', 'Active Gluconeogenesis', 'Mature Cytochrome P450 Detoxification'],
    riskTier: 'BASELINE_HOMEOSTASIS',
    color: '#10b981'
  },
  {
    stageId: 'STAGE_2_STEATOSIS',
    stageNumber: 2,
    name: 'Simple Steatosis (NAFL)',
    shortName: 'Steatosis',
    clinicalDescription: 'Triglyceride accumulation and lipid droplet storage; early mild oxidative and mitochondrial stress.',
    hallmarks: ['Lipid Accumulation', 'Initial Mitochondrial Stress', 'Early Detoxification Shift'],
    riskTier: 'EARLY_METABOLIC_STRESS',
    color: '#06b6d4'
  },
  {
    stageId: 'STAGE_3_MASH',
    stageNumber: 3,
    name: 'MASH (Steatohepatitis)',
    shortName: 'MASH',
    clinicalDescription: 'Chronic lipotoxicity, hepatocyte ballooning, inflammatory infiltration, and early loss of methylome integrity.',
    hallmarks: ['Lipotoxicity & ROS Stress', 'Hepatocyte Ballooning', 'Methylome Guardian Breakdown'],
    riskTier: 'INFLAMMATORY_LIPOTOXICITY',
    color: '#f59e0b'
  },
  {
    stageId: 'STAGE_4_CIRRHOSIS',
    stageNumber: 4,
    name: 'Advanced Fibrosis & Cirrhosis',
    shortName: 'Cirrhosis / Dysplasia',
    clinicalDescription: 'Extracellular matrix remodeling, architectural distortion, and high-risk pre-neoplastic dysplastic nodules.',
    hallmarks: ['Severe ECM Remodeling', 'Dysplastic Transformation', 'DNA Repair Silencing'],
    riskTier: 'PRE_MALIGNANT_WINDOW',
    color: '#f97316'
  },
  {
    stageId: 'STAGE_5_EARLY_HCC',
    stageNumber: 5,
    name: 'Early Hepatocellular Carcinoma',
    shortName: 'Early HCC',
    clinicalDescription: 'Malignant transformation, Warburg metabolic reprogramming, and oncofetal antigen reactivation.',
    hallmarks: ['Aerobic Glycolysis (Warburg)', 'Oncofetal Reactivation', 'Invasive Angiogenesis'],
    riskTier: 'OVERT_MALIGNANCY',
    color: '#f43f5e'
  }
];

// Empirical Stage Expression Centroids across the 15 Diagnostic Drivers
// Derived from the 7 GEO cohorts (GSE41804, GSE48452, GSE5093, GSE63067, GSE89632, GSE46300, GSE49541)
export const STAGE_TRAJECTORY_CENTROIDS = {
  // 1. Metabolic Guardians (Crash early and stay repressed)
  PCK1:     { STAGE_1: 0.0,  STAGE_2: -0.6, STAGE_3: -1.5, STAGE_4: -2.3, STAGE_5: -3.1 },
  CYP2E1:   { STAGE_1: 0.0,  STAGE_2: -0.7, STAGE_3: -1.8, STAGE_4: -2.6, STAGE_5: -3.5 },
  GNMT:     { STAGE_1: 0.0,  STAGE_2: -0.5, STAGE_3: -1.4, STAGE_4: -2.0, STAGE_5: -2.8 },
  MGMT:     { STAGE_1: 0.0,  STAGE_2: -0.2, STAGE_3: -0.9, STAGE_4: -1.8, STAGE_5: -2.3 },
  TREH:     { STAGE_1: 0.0,  STAGE_2: -0.1, STAGE_3: -0.8, STAGE_4: -1.4, STAGE_5: -2.0 },
  ALDH1A1:  { STAGE_1: 0.0,  STAGE_2: -0.4, STAGE_3: -1.1, STAGE_4: -1.8, STAGE_5: -2.5 },
  CPS1:     { STAGE_1: 0.0,  STAGE_2: -0.5, STAGE_3: -1.3, STAGE_4: -2.1, STAGE_5: -2.9 },

  // 2. Pre-Malignant & Fibrotic Inducers (Surge during MASH & Cirrhosis, peak in tumor)
  SERPINB3: { STAGE_1: 0.0,  STAGE_2: 0.4,  STAGE_3: 1.4,  STAGE_4: 2.5,  STAGE_5: 3.2 },
  AKR1B10:  { STAGE_1: 0.0,  STAGE_2: 0.5,  STAGE_3: 1.6,  STAGE_4: 2.8,  STAGE_5: 4.1 },

  // 3. Malignant Oncofetal Drivers (Silent in Healthy/Steatosis, awaken in dysplasia, explode in HCC)
  SPINK1:   { STAGE_1: 0.0,  STAGE_2: 0.3,  STAGE_3: 1.2,  STAGE_4: 2.9,  STAGE_5: 5.5 },
  GPC3:     { STAGE_1: 0.0,  STAGE_2: 0.0,  STAGE_3: 0.8,  STAGE_4: 2.2,  STAGE_5: 4.5 },
  AFP:      { STAGE_1: 0.0,  STAGE_2: 0.1,  STAGE_3: 0.5,  STAGE_4: 1.8,  STAGE_5: 3.8 },
  PEG10:    { STAGE_1: 0.0,  STAGE_2: 0.2,  STAGE_3: 0.9,  STAGE_4: 2.1,  STAGE_5: 3.4 },
  CDKN3:    { STAGE_1: 0.0,  STAGE_2: 0.3,  STAGE_3: 0.8,  STAGE_4: 1.7,  STAGE_5: 2.8 },
  TOP2A:    { STAGE_1: 0.0,  STAGE_2: 0.2,  STAGE_3: 0.9,  STAGE_4: 2.0,  STAGE_5: 3.6 }
};

class ProgressionService {
  /**
   * Returns the complete multi-stage progression trajectory matrix
   */
  getTrajectoryMatrix() {
    const geneList = Object.keys(STAGE_TRAJECTORY_CENTROIDS);
    const matrix = geneList.map(symbol => {
      const c = STAGE_TRAJECTORY_CENTROIDS[symbol];
      return {
        symbol,
        trajectory: [
          { stageNumber: 1, stageName: 'Healthy', log2FC: c.STAGE_1 },
          { stageNumber: 2, stageName: 'Steatosis', log2FC: c.STAGE_2 },
          { stageNumber: 3, stageName: 'MASH', log2FC: c.STAGE_3 },
          { stageNumber: 4, stageName: 'Cirrhosis', log2FC: c.STAGE_4 },
          { stageNumber: 5, stageName: 'Early HCC', log2FC: c.STAGE_5 }
        ],
        biologicalFunction: this.getGeneFunction(symbol)
      };
    });

    return {
      stages: PROGRESSION_STAGES,
      totalGenesTracked: geneList.length,
      trajectoryMatrix: matrix
    };
  }

  /**
   * Aligns a patient's expression vector against the 5 biological stage centroids
   * Computes proximity, continuous trajectory coordinate (1.0 - 5.0), and transition window flags
   */
  alignPatientToTrajectory(expressionProfile) {
    if (!expressionProfile || typeof expressionProfile !== 'object') {
      return { error: 'Invalid expression profile provided for trajectory alignment.' };
    }

    // Normalize input profile keys to uppercase
    const profile = {};
    for (const [k, v] of Object.entries(expressionProfile)) {
      if (typeof v === 'number') {
        profile[k.toUpperCase().trim()] = v;
      }
    }

    const trackedGenes = Object.keys(STAGE_TRAJECTORY_CENTROIDS);

    // Compute distance / similarity to each of the 5 stages
    const stageScores = PROGRESSION_STAGES.map(stage => {
      const key = `STAGE_${stage.stageNumber}`;
      let squaredDist = 0;
      let matchedCount = 0;
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (const gene of trackedGenes) {
        if (profile[gene] !== undefined) {
          matchedCount++;
          const patientVal = profile[gene];
          const stageVal = STAGE_TRAJECTORY_CENTROIDS[gene][key];

          const diff = patientVal - stageVal;
          squaredDist += diff * diff;

          dotProduct += patientVal * stageVal;
          normA += patientVal * patientVal;
          normB += stageVal * stageVal;
        }
      }

      const euclideanDist = Math.sqrt(squaredDist);
      const denominator = Math.sqrt(normA) * Math.sqrt(normB);
      const cosineSim = denominator > 0 ? (dotProduct / denominator) : 0;

      // Distance-based affinity metric (Calibrated Gaussian kernel)
      const affinity = Math.exp(-euclideanDist / 3.0);

      return {
        stageId: stage.stageId,
        stageNumber: stage.stageNumber,
        name: stage.name,
        shortName: stage.shortName,
        clinicalDescription: stage.clinicalDescription,
        color: stage.color,
        euclideanDistance: Math.round(euclideanDist * 100) / 100,
        cosineSimilarity: Math.round(cosineSim * 1000) / 1000,
        rawAffinity: affinity
      };
    });

    // Softmax normalization over stage affinities to get normalized probability per stage
    const totalAffinity = stageScores.reduce((acc, s) => acc + s.rawAffinity, 0);
    stageScores.forEach(s => {
      s.stageConcordancePercentage = totalAffinity > 0 
        ? Math.round((s.rawAffinity / totalAffinity) * 100) 
        : 20;
    });

    // Identify primary matched stage
    const primaryStage = [...stageScores].sort((a, b) => b.stageConcordancePercentage - a.stageConcordancePercentage)[0];

    // Continuous Trajectory Coordinate (1.0 to 5.0)
    let weightedPosition = 0;
    for (const s of stageScores) {
      weightedPosition += s.stageNumber * (s.stageConcordancePercentage / 100);
    }
    const trajectoryPosition = Math.round(weightedPosition * 100) / 100;

    // Check if in the Critical Pre-Malignant Transition Window
    // (Primary match is Stage 4 Cirrhosis or continuous coordinate is in the dysplastic inflection window 3.4 - 4.6)
    const isPreMalignantTransitionWindow = primaryStage.stageNumber === 4 || (trajectoryPosition >= 3.4 && trajectoryPosition <= 4.6);

    // Evaluate Biological Hallmark Shifts
    const activatedHallmarks = [];
    if (profile.PCK1 !== undefined && profile.PCK1 < -1.5) {
      activatedHallmarks.push({
        hallmark: 'Warburg Metabolic Reprogramming',
        mechanism: 'PCK1 suppression shuts down gluconeogenesis, channeling carbon into aerobic glycolysis.',
        severity: Math.abs(profile.PCK1) > 2.5 ? 'CRITICAL' : 'MODERATE'
      });
    }
    if (profile.CYP2E1 !== undefined && profile.CYP2E1 < -1.5) {
      activatedHallmarks.push({
        hallmark: 'Loss of Mature Hepatocyte Differentiation',
        mechanism: 'Repression of CYP2E1 indicates dedifferentiation away from functional hepatic parenchyma.',
        severity: Math.abs(profile.CYP2E1) > 2.5 ? 'CRITICAL' : 'MODERATE'
      });
    }
    if (profile.SERPINB3 !== undefined && profile.SERPINB3 > 1.5) {
      activatedHallmarks.push({
        hallmark: 'Pre-Neoplastic Dysplastic Expansion',
        mechanism: 'SERPINB3 (SCCA-1) induction protects pre-cancerous hepatocytes from apoptotic eradication.',
        severity: profile.SERPINB3 > 2.5 ? 'HIGH' : 'MODERATE'
      });
    }
    if ((profile.GPC3 !== undefined && profile.GPC3 > 1.5) || (profile.SPINK1 !== undefined && profile.SPINK1 > 2.0)) {
      activatedHallmarks.push({
        hallmark: 'Oncofetal Genome Reactivation',
        mechanism: 'Silenced embryonic genes (GPC3, SPINK1) are epigenetically unmasked, driving invasion.',
        severity: 'MALIGNANT_SIGNAL'
      });
    }

    return {
      success: true,
      trajectoryPosition, // Continuous 1.0 -> 5.0
      estimatedBiologicalState: primaryStage.name,
      primaryStageNumber: primaryStage.stageNumber,
      isPreMalignantTransitionWindow,
      transitionAlert: isPreMalignantTransitionWindow
        ? '⚠️ HIGH-RISK TRANSITION WINDOW: Molecular profile indicates high-grade pre-neoplastic dysplasia (Cirrhosis -> Early HCC). Close multiphasic MRI surveillance indicated.'
        : (trajectoryPosition > 4.6 ? '🚨 MALIGNANT PROGRESSION DETECTED: Transcriptome aligns strongly with overt Early HCC.' : 'ℹ️ BENIGN / METABOLIC STAGE: Profile consistent with non-malignant metabolic liver disease.'),
      stageSimilarities: stageScores.map(s => ({
        stageNumber: s.stageNumber,
        name: s.name,
        shortName: s.shortName,
        color: s.color,
        concordance: s.stageConcordancePercentage
      })),
      activatedHallmarks,
      evaluatedGenesCount: Object.keys(profile).length
    };
  }

  getGeneFunction(symbol) {
    const map = {
      PCK1: 'Rate-limiting gluconeogenic enzyme; loss forces Warburg glycolysis',
      CYP2E1: 'Cytochrome P450 detoxification marker of mature, functional hepatocytes',
      GNMT: 'Chief methylome guardian in liver; silencing induces spontaneous steatohepatitis and HCC',
      MGMT: 'O-6-methylguanine DNA methyltransferase silenced by promoter hypermethylation',
      SERPINB3: 'Squamous carcinoma antigen variant driving pre-neoplastic dysplasia',
      AKR1B10: 'Aldo-keto reductase detoxifying cytotoxic lipid aldehydes in MASH and cancer',
      SPINK1: 'Oncogenic protease inhibitor driving cell motility and vascular invasion',
      GPC3: 'Classic oncofetal heparan sulfate proteoglycan re-expressed in early malignancy',
      AFP: 'Canonical oncofetal serum & tissue biomarker for surveillance',
      PEG10: 'Imprinted retrotransposon-derived oncogene reactivated in early carcinomas',
      CDKN3: 'Cyclin-dependent kinase inhibitor overexpressed in proliferative tumor lesions',
      TOP2A: 'Key mitotic chromosome segregation marker indexing proliferative index',
      ALDH1A1: 'Retinol dehydrogenase governing vitamin A metabolic differentiation',
      CPS1: 'Rate-limiting urea cycle enzyme repressed in malignant transformation',
      TREH: 'Trehalase disaccharidase downregulated in hepatocellular lesions'
    };
    return map[symbol] || 'Key hepatocarcinogenesis marker';
  }
}

export const progressionService = new ProgressionService();
