# Early Liver Cancer Detection - Bioinformatic Backend

> High-performance non-Python backend (Node.js / Express ES Modules) for **Early Liver Cancer Detection** utilizing 7 multi-stage human liver biopsy transcriptomic datasets, probe-to-gene mapping, metabolic pathway reprogramming analysis (KEGG/Reactome ORA), and early transition biomarker risk scoring.

---

## 🔬 Biological Background & Progression Cascade

Hepatocellular Carcinoma (HCC) is one of the deadliest human cancers worldwide. Early detection dramatically increases 5-year survival rates from under 12% to over 70%. Hepatocarcinogenesis progresses along a characteristic clinical and metabolic trajectory:

```
[ Normal / Healthy Liver ]
           │
           ▼
[ Simple Steatosis (SS) ] ── (Lipid accumulation, initial metabolic stress)
           │
           ▼
[ MASH / NASH ] ─────────── (Steatohepatitis, lipotoxicity, chronic inflammation)
           │
           ▼
[ Fibrosis & Cirrhosis ] ─── (Extracellular matrix remodeling, loss of hepatocyte function)
           │
           ▼
[ Early HCC / Tumor ] ───── (Aerobic glycolysis Warburg effect, oncofetal gene re-activation)
```

This backend unifies **7 clinically validated liver biopsy cohorts** spanning each transition stage:

| Dataset File | GEO Accession | Platform | Stage / Biological Comparisons | Records |
|---|---|---|---|---|
| `41804_Deg_List.xlsx` | **GSE41804** | Affymetrix HG-U133 Plus 2.0 | HCC Major & Minor Lesions vs Non-Tumor Liver | 7,912 |
| `48452_Deg_list.xlsx` | **GSE48452** | Affymetrix Human Gene 1.0 ST | Control, Simple Steatosis (SS), MASH, Obese | 1,202 |
| `5093_Deg_List.xlsx` | **GSE5093** | Affymetrix Human U95Av2 | Cirrhosis & Pre-neoplastic Liver Biopsies | 1,519 |
| `63067_Deg_List.xlsx` | **GSE63067** | Affymetrix HG-U133 Plus 2.0 | Healthy Liver vs Simple Steatosis vs MASH | 2,283 |
| `89632_deg_list.xlsx` | **GSE89632** | Illumina HumanHT-12 V4.0 | Control vs Simple Steatosis vs MASH | 19,270 |
| `GSE46300_deg_list.xlsx` | **GSE46300** | Illumina HumanHT-12 V4.0 | Simple Steatosis Severity Gradients (Low vs High) | 2,871 |
| `GSE49541_deg_list.xlsx` | **GSE49541** | Affymetrix HG-U133 Plus 2.0 | Mild (F0-F1) vs Advanced (F3-F4) Liver Fibrosis | 1,433 |
| **Total** | **7 Datasets** | **Multi-Platform** | **All Critical Liver Carcinogenesis Stages** | **36,490** |

---

## ⚡ Architecture & Bioinformatic Engines

The system is built purely without Python using modern **Node.js (ES Modules)** and **Express.js**, offering fast data throughput, in-memory indexing, and immediate compatibility with future frontend interfaces (React, Next.js, Vue, Tailwind, etc.).

### 1. Multi-Stage Ingestion & Normalizer
- Dynamically parses all `.xlsx` workbooks and multi-comparison sheets using CommonJS Excel streaming.
- Standardizes inconsistent headers (`ID`, `Gene.symbol`, `log2(fold change)`, `-LOG10(P-value)`, displaced columns).
- Computes FDR, regulation status (`UPREGULATED`, `DOWNREGULATED`, `UNCHANGED`), and indexes 7,949 unique genes.

### 2. Gene & Probe Mapping Engine
- Maps microarray probe identifiers (Affymetrix `..._at`, Illumina `ILMN_...`, Affy ST Transcript IDs) to official HGNC Gene Symbols, Ensembl IDs, and Entrez Gene IDs.
- Dynamically learns probe-gene associations across overlapping datasets.

### 3. Metabolic Pathway Reprogramming Engine
- Focuses on hallmark metabolic axes in liver cancer:
  - **Glycolysis / Gluconeogenesis** (*HK2, PKM, LDHA, PCK1, G6PC, FBP1*)
  - **Fatty Acid Degradation & Beta-Oxidation** (*CPT1A, ACADVL, ACOX1*)
  - **Primary Bile Acid Biosynthesis** (*CYP7A1, CYP27A1, SLC10A1, ABCB11*)
  - **Retinol / Vitamin A Metabolism** (*ADH1A, ALDH1A1, CYP26A1, LRAT*)
  - **Citrate Cycle (TCA Cycle)** (*CS, IDH1/2, SDHA*)
  - **PPAR Signaling Pathway** (*PPARA, PPARG, CD36, FABP1*)
  - **Xenobiotic Cytochrome P450 Metabolism** (*CYP2E1, CYP1A2, CYP3A4*)
  - **One-Carbon & Methionine Metabolism** (*MAT1A, MAT2A, GNMT, CBS*)
  - **Arginine & Urea Cycle** (*CPS1, OTC, ARG1*)
  - **Pentose Phosphate Pathway** (*G6PD, PGLS, TKT*)
- Performs **Over-Representation Analysis (ORA)** utilizing the exact **Hypergeometric Distribution (Fisher's Exact Test)** and **Benjamini-Hochberg FDR correction** to calculate fold enrichment and statistical significance ($p < 0.05, q < 0.05$).

### 4. Early Liver Cancer Biomarker Classifier & Scorer
- Tracks canonical and data-driven early transition drivers (*SPINK1, GPC3, AFP, MGMT, CYP2E1, PCK1, GNMT, SERPINB3, TREH*).
- Evaluates sample biopsy expression vectors and calculates an **Early Malignancy Risk Score (0 - 100%)** with diagnostic risk classification.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20+ (v24.19 LTS installed)
- **Git**: Installed

### Installation
```bash
# Clone the repository (or navigate to directory)
cd hept

# Install dependencies
npm install
```

### Running the Backend Server
```bash
# Start production server (runs on http://localhost:5000)
npm start

# Or start in watch mode for development
npm run dev
```

### Running Automated Test Suite
```bash
npm test
```

---

## 📡 REST API Documentation

### 1. Health & Status
- **`GET /api/health`**: Returns system uptime, ingestion readiness, total datasets, records, and cataloged genes.

### 2. Biopsy Datasets
- **`GET /api/datasets`**: List all 7 liver biopsy datasets with clinical metadata, platforms, comparison sheets, and record counts.
- **`GET /api/datasets/:accession`**: Retrieve details and comparisons for a specific accession (e.g. `GSE41804`, `GSE89632`).

### 3. Gene Query & Expression Profiles
- **`GET /api/genes`**: Search and filter differentially expressed genes across biopsy datasets.
  - **Query Params**: `symbol`, `dataset`, `stage`, `regulation` (`UPREGULATED`/`DOWNREGULATED`), `minLog2FC`, `maxPVal`, `page`, `limit`.
- **`GET /api/genes/profile/:symbol`**: Retrieve the complete cross-stage profile of a gene (e.g. `/api/genes/profile/SPINK1`).
- **`GET /api/genes/summary`**: List top recurring DEGs across all biopsy datasets.

### 4. Probe & Gene Mapping
- **`GET /api/mapping/probe/:probeId`**: Resolves a microarray probe ID (e.g. `206239_s_at` or `ILMN_1651236`) to its official HGNC symbol and gene metadata.
- **`GET /api/mapping/search?q=GLYPICAN`**: Keyword search across all mapped genes and descriptions.
- **`GET /api/mapping/stats`**: Total mapped probes and unique genes in the registry.

### 5. Metabolic Pathway Analysis
- **`GET /api/pathways`**: List all curated liver metabolic pathways.
- **`GET /api/pathways/:id`**: View pathway details, description, and participating gene members.
- **`POST /api/pathways/enrichment`**: Run Hypergeometric Over-Representation Analysis (ORA) on an arbitrary list of genes.
  - **Body**:
    ```json
    {
      "genes": [
        { "symbol": "HK2", "log2FC": 2.5 },
        { "symbol": "PKM", "log2FC": 3.1 },
        { "symbol": "LDHA", "log2FC": 2.8 },
        { "symbol": "PCK1", "log2FC": -2.7 },
        { "symbol": "G6PC", "log2FC": -3.0 }
      ],
      "backgroundSize": 20000
    }
    ```
- **`GET /api/pathways/stage/:stage`**: Automated metabolic pathway perturbation profile for a specific disease stage (`HCC_MALIGNANCY`, `MASH_VS_CONTROL`, `STEATOSIS_VS_CONTROL`, `FIBROSIS_PROGRESSION`).

### 6. Early Biomarker Signatures & Risk Scoring
- **`GET /api/biomarkers/early-detection`**: Canonical early detection panel, novel progression candidates, and signal tiers.
- **`GET /api/biomarkers/tiers`**: Reference classification table for the 5 progression signal tiers:

| Score Range | Signal Tier | Description |
|---|---|---|
| **0–20** | `LOWER SIGNAL` | Molecular profile closer to reference state |
| **21–40** | `EARLY SIGNAL` | Early progression-associated changes |
| **41–60** | `INTERMEDIATE` | Moderate progression-associated pattern |
| **61–80** | `ELEVATED` | Stronger progression-associated pattern |
| **81–100** | `HIGH SIGNAL` | Strong molecular similarity to the learned progression-associated signature |

- **`POST /api/biomarkers/score`**: Evaluates a biopsy gene expression profile and outputs the score and signal tier.
  - **Body**:
    ```json
    {
      "expressionProfile": {
        "SPINK1": 5.8,
        "GPC3": 4.2,
        "MGMT": -2.1,
        "CYP2E1": -3.5,
        "PCK1": -2.4,
        "GNMT": -1.9
      }
    }
    ```
  - **Response**:
    ```json
    {
      "success": true,
      "evaluation": {
        "riskScorePercentage": 86,
        "riskCategory": "HIGH SIGNAL",
        "signalTier": "HIGH SIGNAL",
        "tierRange": "81–100",
        "tierDescription": "Strong molecular similarity to the learned progression-associated signature",
        "recommendations": "Strong molecular concordance with early Hepatocellular Carcinoma transcriptomic signature. Immediate multiphasic CT/MRI and clinical biopsy confirmation recommended.",
        "evaluatedMarkersCount": 6,
        "evaluatedGenes": [...]
      }
    }
    ```

---

## 🐙 How to Add this Project to your GitHub Repository

Follow these simple steps in your terminal (PowerShell or Command Prompt) to publish this project to GitHub:

### Step 1: Create a New Repository on GitHub
1. Go to [GitHub](https://github.com/) and sign in.
2. Click the **+** (New repository) button at the top right.
3. Name your repository (e.g., `early-liver-cancer-backend` or `hept`).
4. Keep it **Public** (or **Private** depending on your preference).
5. **Do NOT** check "Initialize with README", ".gitignore", or "License" (we have already created all of these for you).
6. Click **Create repository**.
7. Copy the repository URL (e.g., `https://github.com/<your-username>/early-liver-cancer-backend.git`).

### Step 2: Initialize Git and Push from your Terminal
Run the following commands in your project folder (`c:\Users\sagni\Desktop\hept`):

```powershell
# 1. Check git status
git status

# 2. Configure your Git identity (if you haven't done so yet)
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"

# 3. Add all files to staging
git add .

# 4. Create your initial commit
git commit -m "feat: Initial commit of Early Liver Cancer Detection backend with 7 biopsy datasets, gene mapping, and metabolic pathway engines"

# 5. Set default branch to main
git branch -M main

# 6. Add your GitHub repository as remote origin (replace with your actual URL from Step 1)
git remote add origin https://github.com/<your-username>/early-liver-cancer-backend.git

# 7. Push your code to GitHub
git push -u origin main
```

*(If prompted, enter your GitHub credentials or Personal Access Token).*

---

## 🔮 Next Step: Frontend Integration

This backend is structured to seamlessly serve data via CORS to any modern frontend framework (React + Vite, Next.js, or HTML5/CSS/JS). Once you are ready, we will build the interactive user interface!
