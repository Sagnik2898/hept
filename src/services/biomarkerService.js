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

    const normalizedPercentage = Math.min(100, Math.round((scoreAccumulator / maxPossibleScore) * 100));

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
}

export const biomarkerService = new BiomarkerService();
