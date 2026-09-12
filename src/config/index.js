import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
  PORT: process.env.PORT || 5000,
  DATA_DIR: path.resolve(__dirname, '../../'),
  DEFAULT_LOG2FC_THRESHOLD: 1.0,
  DEFAULT_PVAL_THRESHOLD: 0.05,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  DATASET_METADATA: {
    '41804_Deg_List.xlsx': {
      accession: 'GSE41804',
      title: 'Hepatocellular Carcinoma (HCC) Biopsy Microarray',
      tissue: 'Liver Biopsy (Tumor vs Non-Tumor)',
      organism: 'Homo sapiens',
      platform: 'Affymetrix Human Genome U133 Plus 2.0',
      diseaseStage: 'HCC (Early / Advanced Hepatocellular Carcinoma)',
      description: 'Expression profiles comparing HCC major/minor lesions against adjacent non-tumor liver parenchyma.'
    },
    '48452_Deg_list.xlsx': {
      accession: 'GSE48452',
      title: 'Progression from Normal Liver to Steatosis, MASH & Obesity',
      tissue: 'Human Percutaneous Liver Biopsy',
      organism: 'Homo sapiens',
      platform: 'Affymetrix Human Gene 1.0 ST Array',
      diseaseStage: 'MASH / Steatosis / Pre-malignant',
      description: 'Human liver biopsies categorized into Control (healthy), Simple Steatosis (SS), MASH (NASH), and Obese controls.'
    },
    '5093_Deg_List.xlsx': {
      accession: 'GSE5093',
      title: 'Liver Cirrhosis & Pre-neoplastic Liver Biopsy',
      tissue: 'Liver Cirrhosis Biopsies',
      organism: 'Homo sapiens',
      platform: 'Affymetrix Human U95Av2 Array',
      diseaseStage: 'Cirrhosis / Pre-neoplasia',
      description: 'Biopsy samples from cirrhotic livers showing high-risk transition signatures towards early liver malignancy.'
    },
    '63067_Deg_List.xlsx': {
      accession: 'GSE63067',
      title: 'Human Liver Biopsy Cohort: Healthy vs SS vs MASH',
      tissue: 'Liver Biopsy',
      organism: 'Homo sapiens',
      platform: 'Affymetrix Human Genome U133 Plus 2.0',
      diseaseStage: 'Steatosis & MASH',
      description: 'Comprehensive profiling across clinical progression: Healthy normal liver, Simple Steatosis, and MASH.'
    },
    '89632_deg_list.xlsx': {
      accession: 'GSE89632',
      title: 'Metabolic Dysfunction-Associated Steatohepatitis Biopsy Cohort',
      tissue: 'Liver Wedge / Needle Biopsy',
      organism: 'Homo sapiens',
      platform: 'Illumina HumanHT-12 V4.0 expression beadchip',
      diseaseStage: 'Control vs SS vs MASH',
      description: 'Illumina beadchip profiling characterizing metabolic dysregulation across Control, SS, and MASH biopsies.'
    },
    'GSE46300_deg_list.xlsx': {
      accession: 'GSE46300',
      title: 'Simple Steatosis Severity Gradients in Liver Biopsy',
      tissue: 'Liver Biopsy',
      organism: 'Homo sapiens',
      platform: 'Illumina HumanHT-12 V4.0 expression beadchip',
      diseaseStage: 'Steatosis Severity (Low vs High)',
      description: 'Stratification of simple steatosis grades to identify early lipotoxic metabolic shifts before overt malignancy.'
    },
    'GSE49541_deg_list.xlsx': {
      accession: 'GSE49541',
      title: 'Mild vs Advanced Fibrosis in MASH Biopsies',
      tissue: 'Liver Biopsies (Fibrosis Stages F0-F1 vs F3-F4)',
      organism: 'Homo sapiens',
      platform: 'Affymetrix Human Genome U133 Plus 2.0',
      diseaseStage: 'Liver Fibrogenesis / Pre-cancerous Stroma',
      description: 'Comparison of early/mild versus advanced fibrosis in NAFLD/MASH, pinpointing matrix remodeling and malignant transition.'
    }
  }
};
