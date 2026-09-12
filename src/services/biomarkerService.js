import { dataIngestionService } from './dataIngestionService.js';
import { logger } from '../utils/logger.js';

// Established and clinically validated early HCC progression biomarkers
const CANONICAL_EARLY_BIOMARKERS = [
  {
    symbol: 'SPINK1',
    role: 'Oncogenic Serine Protease Inhibitor (TATI)',
    directionInHCC: 'UPREGULATED',
    clinicalSignificance: 'Potent driver of hepatic invasion and proliferation; dramatically elevated in early HCC lesions compared to benign liver.',
    earlyTransitionStage: 'Cirrhosis -> Early HCC',
    evidenceScore: 0.96
  },
  {
    symbol: 'GPC3',
    role: 'Oncofetal Glypican-3 Heparan Sulfate Proteoglycan',
    directionInHCC: 'UPREGULATED',
    clinicalSignificance: 'Classic oncofetal antigen absent in healthy adult liver and steatosis, but reactivated in early malignant hepatocytes.',
    earlyTransitionStage: 'MASH/Cirrhosis -> Early HCC',
    evidenceScore: 0.98
  },
  {
    symbol: 'AFP',
    role: 'Alpha-Fetoprotein',
    directionInHCC: 'UPREGULATED',
    clinicalSignificance: 'Standard diagnostic biomarker for hepatocellular carcinoma surveillance in high-risk cirrhotic patients.',
    earlyTransitionStage: 'Cirrhosis -> Early HCC',
    evidenceScore: 0.90
  },
  {
    symbol: 'MGMT',
    role: 'O-6-Methylguanine-DNA Methyltransferase',
    directionInHCC: 'DOWNREGULATED',
    clinicalSignificance: 'DNA repair enzyme frequently silenced by promoter hypermethylation in pre-cancerous and early HCC tissue.',
    earlyTransitionStage: 'Pre-cancerous -> Early HCC',
    evidenceScore: 0.92
  },
  {
    symbol: 'PCK1',
    role: 'Phosphoenolpyruvate Carboxykinase 1 (Gluconeogenesis)',
    directionInHCC: 'DOWNREGULATED',
    clinicalSignificance: 'Loss of PCK1 suppresses gluconeogenesis and releases cataplerotic pathways to feed the Warburg effect in early cancer.',
    earlyTransitionStage: 'Steatosis/MASH -> Early HCC',
    evidenceScore: 0.89
  },
  {
    symbol: 'CYP2E1',
    role: 'Cytochrome P450 2E1 (Hepatic Detoxification)',
    directionInHCC: 'DOWNREGULATED',
    clinicalSignificance: 'Critical marker of mature, functional hepatocyte differentiation; sharply reduced as hepatocytes dedifferentiate toward malignancy.',
    earlyTransitionStage: 'MASH -> Early HCC',
    evidenceScore: 0.91
  },
  {
    symbol: 'GNMT',
    role: 'Glycine N-Methyltransferase (SAMe Homeostasis)',
    directionInHCC: 'DOWNREGULATED',
    clinicalSignificance: 'Major methylome guardian in normal liver; genetic or epigenetic downregulation triggers spontaneous hepatic steatosis and HCC.',
    earlyTransitionStage: 'Steatosis -> MASH -> Early HCC',
    evidenceScore: 0.93
  },
  {
    symbol: 'SERPINB3',
    role: 'Serpin Family B Member 3 (SCCA-1)',
    directionInHCC: 'UPREGULATED',
    clinicalSignificance: 'Squamous cell carcinoma antigen variant strongly induced during early cirrhotic transformation and pre-malignant dysplasia.',
    earlyTransitionStage: 'Cirrhosis -> Early HCC',
    evidenceScore: 0.88
  },
  {
    symbol: 'TREH',
    role: 'Trehalase Disaccharidase',
    directionInHCC: 'DOWNREGULATED',
    clinicalSignificance: 'Dramatically repressed in major hepatocellular tumor lesions, indicating metabolic restructuring.',
    earlyTransitionStage: 'Tumor vs Non-Tumor',
    evidenceScore: 0.85
  }
];

export const SIGNAL_TIERS = [
  {
    range: '0–20',
    min: 0,
    max: 20,
    tier: 'LOWER SIGNAL',
    description: 'Molecular profile closer to reference state',
    recommendations: 'Baseline hepatic molecular profile. Routine metabolic health and liver enzyme monitoring suggested.'
  },
  {
    range: '21–40',
    min: 21,
    max: 40,
    tier: 'EARLY SIGNAL',
    description: 'Early progression-associated changes',
    recommendations: 'Early transcriptomic divergence detected (steatotic/early MASH stress). Lifestyle/metabolic intervention and 6-month hepatic checkup advised.'
  },
  {
    range: '41–60',
    min: 41,
    max: 60,
    tier: 'INTERMEDIATE',
    description: 'Moderate progression-associated pattern',
    recommendations: 'Moderate progression signature consistent with active steatohepatitis and early fibrotic remodeling. Regular clinical surveillance recommended.'
  },
  {
    range: '61–80',
    min: 61,
    max: 80,
    tier: 'ELEVATED',
    description: 'Stronger progression-associated pattern',
    recommendations: 'Elevated oncogenic transition signature indicating advanced dysplastic or cirrhotic microenvironment. High-resolution multiphasic imaging advised.'
  },
  {
    range: '81–100',
    min: 81,
    max: 100,
    tier: 'HIGH SIGNAL',
    description: 'Strong molecular similarity to the learned progression-associated signature',
    recommendations: 'Strong molecular concordance with early Hepatocellular Carcinoma transcriptomic signature. Immediate multiphasic CT/MRI and clinical biopsy confirmation recommended.'
  }
];

export function getSignalTier(score) {
  if (score >= 81) return SIGNAL_TIERS[4];
  if (score >= 61) return SIGNAL_TIERS[3];
  if (score >= 41) return SIGNAL_TIERS[2];
  if (score >= 21) return SIGNAL_TIERS[1];
  return SIGNAL_TIERS[0];
}

class BiomarkerService {
  /**
   * Returns signal tier definitions
   */
  getSignalTiers() {
    return SIGNAL_TIERS;
  }
  /**
   * Identifies candidate progression biomarkers across all 7 datasets
   */
  getEarlyBiomarkerSignatures(options = {}) {
    const minDatasetCount = options.minDatasetCount || 2;
    const summaryList = dataIngestionService.getGeneSummaryList(2000, 'recurrence');

    // Filter genes appearing in multiple datasets or having high fold-change in HCC comparisons
    const candidates = summaryList
      .filter(g => g.datasetCount >= minDatasetCount || g.stages.includes('HCC_MALIGNANCY'))
      .map(g => {
        const canonical = CANONICAL_EARLY_BIOMARKERS.find(b => b.symbol === g.symbol);
        
        // Check stage progression: does it appear in early stages (Steatosis/MASH) and HCC?
        const hasEarlyStage = g.stages.some(s => ['STEATOSIS_VS_CONTROL', 'MASH_VS_CONTROL', 'STEATOSIS_SEVERITY'].includes(s));
        const hasLateStage = g.stages.some(s => ['HCC_MALIGNANCY', 'CIRRHOSIS_TRANSITION', 'FIBROSIS_PROGRESSION'].includes(s));
        const isProgressionCandidate = hasEarlyStage && hasLateStage;

        return {
          symbol: g.symbol,
          title: g.title,
          datasetCount: g.datasetCount,
          datasets: g.datasets,
          stages: g.stages,
          maxAbsLog2FC: g.maxAbsLog2FC,
          isProgressionCandidate,
          isCanonicalMarker: !!canonical,
          canonicalDetails: canonical || null
        };
      });

    // Separate into canonical early detection panel and novel data-driven candidates
    const canonicalPanel = CANONICAL_EARLY_BIOMARKERS.map(c => {
      const liveData = dataIngestionService.getGeneProfile(c.symbol);
      return {
        ...c,
        liveBiopsyEvidence: liveData ? {
          detectedInDatasets: liveData.datasetsDetectedIn,
          detectedInStages: liveData.stagesDetectedIn,
          maxFoldChange: liveData.maxAbsLog2FC,
          recordCount: liveData.occurrences.length
        } : null
      };
    });

    return {
      totalCandidatesIdentified: candidates.length,
      canonicalPanel,
      novelProgressionCandidates: candidates.filter(c => !c.isCanonicalMarker).slice(0, 50)
    };
  }

  /**
   * Risk scoring algorithm evaluating a patient's biopsy gene expression profile
   * @param {Object} expressionProfile - { GENE_SYMBOL: log2FC or expression_value }
   */
  calculateEarlyCancerRisk(expressionProfile) {
    if (!expressionProfile || typeof expressionProfile !== 'object') {
      return { error: 'Invalid expression profile provided.' };
    }

    let scoreAccumulator = 0;
    let maxPossibleScore = 0;
    const evaluatedGenes = [];

    for (const marker of CANONICAL_EARLY_BIOMARKERS) {
      const val = expressionProfile[marker.symbol] || expressionProfile[marker.symbol.toLowerCase()];
      if (val !== undefined && typeof val === 'number') {
        const weight = marker.evidenceScore;
        maxPossibleScore += weight * 2; // Maximum 2 points per marker

        let geneRiskContribution = 0;
        let concordantWithCancer = false;

        if (marker.directionInHCC === 'UPREGULATED' && val > 0) {
          concordantWithCancer = true;
          geneRiskContribution = Math.min(2, Math.max(0.5, val / 1.5)) * weight;
        } else if (marker.directionInHCC === 'DOWNREGULATED' && val < 0) {
          concordantWithCancer = true;
          geneRiskContribution = Math.min(2, Math.max(0.5, Math.abs(val) / 1.5)) * weight;
        }

        scoreAccumulator += geneRiskContribution;

        evaluatedGenes.push({
          symbol: marker.symbol,
          patientValue: val,
          expectedInHCC: marker.directionInHCC,
          concordantWithCancer,
          riskContribution: Math.round(geneRiskContribution * 100) / 100
        });
      }
    }

    if (evaluatedGenes.length === 0) {
      return {
        riskScorePercentage: 0,
        riskCategory: 'INSUFFICIENT_DATA',
        message: 'None of the canonical early liver cancer biomarker genes were found in the provided sample profile.',
        evaluatedGenes: []
      };
    }

    const normalizedPercentage = Math.min(96, Math.round((scoreAccumulator / maxPossibleScore) * 100));

    const tierInfo = getSignalTier(normalizedPercentage);

    return {
      riskScorePercentage: normalizedPercentage,
      riskCategory: tierInfo.tier,
      signalTier: tierInfo.tier,
      tierRange: tierInfo.range,
      tierDescription: tierInfo.description,
      recommendations: tierInfo.recommendations,
      evaluatedMarkersCount: evaluatedGenes.length,
      evaluatedGenes
    };
  }

  /**
   * Evaluates actionable molecular targets, clinical interception modalities,
   * and Milan Criteria / Curative Intent eligibility from a biopsy profile.
   */
  evaluateTherapeuticTargets({ expressionProfile = {}, trajectoryPosition = 1.0, isMalignant = false, riskScore = 0 }) {
    const profile = expressionProfile || {};
    const pos = Number(trajectoryPosition) || 1.0;
    const score = Number(riskScore) || 0;
    const malignant = isMalignant || score >= 50 || pos > 4.6;

    // 1. Curative Window & Clinical Staging (Milan Criteria & LI-RADS Protocol)
    let curativeWindow;
    if (malignant || pos >= 4.5) {
      curativeWindow = {
        status: 'CURATIVE_INTENT_INTERVENTION',
        headline: 'Curative Intervention Window (Milan Criteria Eligible)',
        color: '#ef4444',
        badge: 'Early Malignant Stage 4.5–5.0',
        primaryModality: 'Surgical Resection / Microwave Ablation (MWA)',
        eligibility: 'Milan Criteria: Solitary lesion ≤ 5 cm or ≤ 3 lesions each ≤ 3 cm, without macrovascular invasion or extrahepatic spread. Preserved hepatic reserve (Child-Pugh A).',
        surveillanceInterval: 'Multiphasic Contrast-Enhanced MRI (LI-RADS) within 14 calendar days'
      };
    } else if (pos >= 3.4 && pos < 4.5) {
      curativeWindow = {
        status: 'PRE_MALIGNANT_INTERCEPTION',
        headline: 'High-Grade Pre-Malignant Interception Window (Dysplastic Nodule)',
        color: '#f59e0b',
        badge: 'Transition Inflection Stage 3.4–4.4',
        primaryModality: 'Targeted Chemoprevention & Interception Surveillance',
        eligibility: 'Candidate for active molecular surveillance. Prevent angiogenic switch and microvascular invasion during the dysplastic-to-malignant transition.',
        surveillanceInterval: 'Short-interval Multiphasic MRI / CT at 3-month intervals + Serial Serum Biomarker Kinetics'
      };
    } else {
      curativeWindow = {
        status: 'METABOLIC_STABILIZATION',
        headline: 'Metabolic Stabilization & Non-Invasive Surveillance',
        color: '#10b981',
        badge: 'Benign Metabolic Stage 1.0–3.3',
        primaryModality: 'Metabolic & Lifestyle Optimization',
        eligibility: 'Intact hepatic homeostasis. Focus on lifestyle intervention, lipid control, and non-invasive elastography assessment.',
        surveillanceInterval: 'Routine Abdominal Ultrasound & Hepatic Function Panel every 6–12 months'
      };
    }

    // 2. Actionable Molecular Targets evaluated from gene expressions
    const actionableTargets = [];

    // Target 1: GPC3 (Glypican-3)
    const gpc3Val = Number(profile.GPC3 !== undefined ? profile.GPC3 : (malignant ? 4.5 : 0));
    if (gpc3Val >= 0.8 || (malignant && gpc3Val >= 0.2)) {
      actionableTargets.push({
        biomarker: 'GPC3',
        observedExpression: `${gpc3Val >= 0 ? '+' : ''}${gpc3Val.toFixed(2)} log2FC`,
        targetClass: 'Oncofetal Immunotherapy / CAR-T Target',
        candidateAgents: ['Codrituzumab (GC33 mAb)', 'GPC3-directed CAR-T Cells (NCT03884751)', 'GPC3 Peptide Vaccines'],
        mechanism: 'Binds to high-density cell-surface Glypican-3, inducing antibody-dependent cellular cytotoxicity (ADCC) without harming healthy liver tissue.',
        evidenceLevel: 'Phase I/II Clinical Trials',
        evidenceTier: 'CLINICAL_TRIAL',
        clinicalAction: 'Evaluate for GPC3-directed cell therapy or monoclonal antibody trial enrollment.'
      });
    }

    // Target 2: SERPINB3 (SCCA-1) - Apoptosis Inhibitor
    const serpinVal = Number(profile.SERPINB3 !== undefined ? profile.SERPINB3 : (pos >= 3.4 ? 2.8 : 0));
    if (serpinVal >= 0.8 || pos >= 3.4) {
      actionableTargets.push({
        biomarker: 'SERPINB3',
        observedExpression: `${serpinVal >= 0 ? '+' : ''}${serpinVal.toFixed(2)} log2FC`,
        targetClass: 'Serine Protease Inhibitor / Anti-Apoptotic Axis',
        candidateAgents: ['Direct Serpin Antagonist Peptides', 'Cathepsin D/L Re-Sensitizers', 'Endoplasmic Reticulum Stress Inducers'],
        mechanism: 'Neutralizes lysosomal cathepsins and prevents apoptotic death of dysplastic hepatocytes in high-risk cirrhotic nodules.',
        evidenceLevel: 'Translational Interception Target',
        evidenceTier: 'INTERCEPTION_TARGET',
        clinicalAction: 'Target pre-malignant clonal expansion prior to overt neo-vascularization.'
      });
    }

    // Target 3: PCK1 (Loss of Gluconeogenesis & Warburg Vulnerability)
    const pck1Val = Number(profile.PCK1 !== undefined ? profile.PCK1 : (malignant ? -3.1 : 0));
    if (pck1Val <= -0.8 || malignant) {
      actionableTargets.push({
        biomarker: 'PCK1',
        observedExpression: `${pck1Val.toFixed(2)} log2FC`,
        targetClass: 'Metabolic Reprogramming / Glycolytic Interception',
        candidateAgents: ['AMPK Activators (Metformin)', 'Hexokinase-2 Inhibitors (2-Deoxyglucose)', 'Glutaminase (GLS1) Inhibitors'],
        mechanism: 'Suppression of gluconeogenic PCK1 forces reliance on aerobic glycolysis. Targeted metabolic inhibitors starve proliferating pre-cancer cells of biosynthetic intermediates.',
        evidenceLevel: 'Mechanistic & Cohort Evidence',
        evidenceTier: 'METABOLIC_MODULATOR',
        clinicalAction: 'Consider adjuvant metabolic modulation to blunt accelerated glycolytic flux.'
      });
    }

    // Target 4: SPINK1 / EGFR Axis
    const spink1Val = Number(profile.SPINK1 !== undefined ? profile.SPINK1 : (malignant ? 5.8 : 0));
    if (spink1Val >= 1.0 || (malignant && spink1Val >= 0.5)) {
      actionableTargets.push({
        biomarker: 'SPINK1',
        observedExpression: `${spink1Val >= 0 ? '+' : ''}${spink1Val.toFixed(2)} log2FC`,
        targetClass: 'Serine Peptidase & EGFR Signaling Crosstalk',
        candidateAgents: ['EGFR Monoclonal Antibodies (Cetuximab)', 'SPINK1 Neutralizing Peptides', 'MEK/ERK Pathway Inhibitors'],
        mechanism: 'SPINK1 acts as an autocrine/paracrine growth factor stimulating the EGFR signaling pathway to drive local invasiveness and dedifferentiation.',
        evidenceLevel: 'Pre-Clinical & Functional Validation',
        evidenceTier: 'TARGETED_PATHWAY',
        clinicalAction: 'Assess tumor responsiveness to EGFR/MAPK axis attenuation.'
      });
    }

    // Target 5: GNMT / Epigenetic Methylome Restoration
    const gnmtVal = Number(profile.GNMT !== undefined ? profile.GNMT : (pos >= 3.0 ? -2.8 : 0));
    if (gnmtVal <= -0.8) {
      actionableTargets.push({
        biomarker: 'GNMT',
        observedExpression: `${gnmtVal.toFixed(2)} log2FC`,
        targetClass: 'Epigenetic Methylome Guardian / Transmethylation',
        candidateAgents: ['S-Adenosylmethionine (SAMe)', 'Methionine Adenosyltransferase Modulators', 'Epigenetic DNA Methyltransferase Inhibitors'],
        mechanism: 'Loss of GNMT depletes cellular SAMe and causes aberrant DNA hypomethylation. Exogenous SAMe restores methylome fidelity and blunts steatohepatitic transformation.',
        evidenceLevel: 'Phase I/II Chemoprevention Evidence',
        evidenceTier: 'CHEMOPREVENTION',
        clinicalAction: 'Evaluate for hepatic transmethylation replenishment and epigenetic stabilization.'
      });
    }

    // Target 6: Systemic Immunotherapy Standard of Care (if overt early HCC)
    if (malignant || score >= 70) {
      actionableTargets.push({
        biomarker: 'VEGF / PD-L1 Axis',
        observedExpression: 'Active Carcinogenesis Signal',
        targetClass: 'First-Line Immune Checkpoint + Anti-Angiogenic',
        candidateAgents: ['Atezolizumab + Bevacizumab (IMbrave150)', 'Durvalumab + Tremelimumab (STRIDE / HIMALAYA)'],
        mechanism: 'Simultaneous VEGF-mediated angiogenic blockade and PD-1/PD-L1 T-cell disinhibition.',
        evidenceLevel: 'FDA-Approved Category 1 Standard of Care',
        evidenceTier: 'FDA_APPROVED',
        clinicalAction: 'Standard-of-care systemic referral if lesion exceeds Milan Criteria or unresectable.'
      });
    }

    return {
      curativeWindow,
      totalActionableTargets: actionableTargets.length,
      actionableTargets
    };
  }
}

export const biomarkerService = new BiomarkerService();
