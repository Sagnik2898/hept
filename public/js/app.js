/**
 * Early Liver Cancer Detection - Interactive Clinical Dashboard & ML Client
 * Features:
 * - 15-Gene Diagnostic Panel & Presets
 * - L2-Regularized Logistic Regression Risk Predictor with Circular SVG Gauge
 * - Explainable Log-Odds Feature Attribution Waterfall
 * - Multi-Stage Hepatocarcinogenesis Biological Continuum (Stages 1 to 5)
 * - Interactive Multi-Gene Trajectory SVG Chart
 * - Real-time Biological State Alignment & Pre-Malignant Transition Alerts
 * - 7 GEO Biopsy Cohort Explorer
 * - Cross-Stage Gene Profiler & Metabolic Reprogramming (ORA)
 */

// 15-Gene Diagnostic Panel Definition
const GENE_PANEL = [
  { symbol: 'SPINK1', dir: 'UP', desc: 'Oncogenic Serine Protease Inhibitor (TATI)' },
  { symbol: 'GPC3', dir: 'UP', desc: 'Oncofetal Glypican-3 Proteoglycan' },
  { symbol: 'AFP', dir: 'UP', desc: 'Canonical Alpha-Fetoprotein' },
  { symbol: 'MGMT', dir: 'DOWN', desc: 'DNA Repair Methyltransferase Silencing' },
  { symbol: 'PCK1', dir: 'DOWN', desc: 'Gluconeogenesis Loss (Warburg Effect)' },
  { symbol: 'CYP2E1', dir: 'DOWN', desc: 'Mature Hepatocyte Detoxification Marker' },
  { symbol: 'GNMT', dir: 'DOWN', desc: 'Methylome Guardian Repression' },
  { symbol: 'SERPINB3', dir: 'UP', desc: 'Squamous Cell Carcinoma Antigen Variant' },
  { symbol: 'TREH', dir: 'DOWN', desc: 'Disaccharidase Metabolic Suppression' },
  { symbol: 'AKR1B10', dir: 'UP', desc: 'Aldo-Keto Reductase Early Upregulation' },
  { symbol: 'PEG10', dir: 'UP', desc: 'Paternally Expressed Imprinted Oncogene' },
  { symbol: 'CDKN3', dir: 'UP', desc: 'Cyclin-Dependent Kinase Overactivation' },
  { symbol: 'TOP2A', dir: 'UP', desc: 'DNA Topoisomerase 2A Proliferation' },
  { symbol: 'ALDH1A1', dir: 'DOWN', desc: 'Retinol / Vitamin A Metabolic Axis' },
  { symbol: 'CPS1', dir: 'DOWN', desc: 'Urea Cycle Metabolic Reprogramming' }
];

// Preset Biopsy Expression Profiles across Stages
const PRESETS = {
  malignant: {
    SPINK1: 5.5, GPC3: 4.5, AFP: 3.8, MGMT: -2.3, PCK1: -3.1,
    CYP2E1: -3.5, GNMT: -2.8, SERPINB3: 3.2, TREH: -2.0, AKR1B10: 4.1,
    PEG10: 3.4, CDKN3: 2.8, TOP2A: 3.6, ALDH1A1: -2.5, CPS1: -2.9
  },
  cirrhosis: {
    SPINK1: 2.9, GPC3: 2.2, AFP: 1.8, MGMT: -1.8, PCK1: -2.3,
    CYP2E1: -2.6, GNMT: -2.0, SERPINB3: 2.5, TREH: -1.4, AKR1B10: 2.8,
    PEG10: 2.1, CDKN3: 1.7, TOP2A: 2.0, ALDH1A1: -1.8, CPS1: -2.1
  },
  mash: {
    SPINK1: 1.2, GPC3: 0.8, AFP: 0.5, MGMT: -0.9, PCK1: -1.5,
    CYP2E1: -1.8, GNMT: -1.4, SERPINB3: 1.4, TREH: -0.8, AKR1B10: 1.6,
    PEG10: 0.9, CDKN3: 0.8, TOP2A: 0.9, ALDH1A1: -1.1, CPS1: -1.3
  },
  steatosis: {
    SPINK1: 0.3, GPC3: 0.0, AFP: 0.1, MGMT: -0.2, PCK1: -0.6,
    CYP2E1: -0.7, GNMT: -0.5, SERPINB3: 0.4, TREH: -0.1, AKR1B10: 0.5,
    PEG10: 0.2, CDKN3: 0.3, TOP2A: 0.2, ALDH1A1: -0.4, CPS1: -0.5
  },
  benign: {
    SPINK1: 0.1, GPC3: -0.2, AFP: 0.0, MGMT: 0.2, PCK1: 0.5,
    CYP2E1: 0.8, GNMT: 0.4, SERPINB3: 0.1, TREH: 0.2, AKR1B10: 0.2,
    PEG10: 0.0, CDKN3: 0.1, TOP2A: 0.2, ALDH1A1: 0.4, CPS1: 0.5
  },
  reset: {
    SPINK1: 0, GPC3: 0, AFP: 0, MGMT: 0, PCK1: 0,
    CYP2E1: 0, GNMT: 0, SERPINB3: 0, TREH: 0, AKR1B10: 0,
    PEG10: 0, CDKN3: 0, TOP2A: 0, ALDH1A1: 0, CPS1: 0
  }
};

let cachedTrajectoryData = null;
let currentClonedFilter = 'all';
let lastMLResult = null;
let lastPatientProfile = null;
let lastProgResult = null;
let debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSystemHealth();
  initGeneInputs();
  initPresets();
  initPredictor();
  initClonedTrajectoryFilter();
  initProgressionView();
  initDatasetsView();
  initGeneSearch();
  initPathwaysView();
  initMLConsole();
  initGeminiCopilot();

  // Run initial prediction with malignant preset to showcase the UI
  applyPreset('malignant');
  runMLPrediction();
});

/* ==========================================================================
   Tab Navigation
   ========================================================================== */
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      panels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const activePanel = document.getElementById(`panel-${targetTab}`);
      if (activePanel) {
        activePanel.classList.add('active');
      }
    });
  });
}

/* ==========================================================================
   System Health & Metrics Fetcher
   ========================================================================== */
async function initSystemHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.status === 'HEALTHY') {
      document.getElementById('systemStatusText').textContent = 'Backend & ML Online';
      document.getElementById('statDatasets').textContent = data.totalDatasets || 7;
      document.getElementById('statRecords').textContent = (data.totalDEGRecords || 36490).toLocaleString();
      document.getElementById('statGenes').textContent = (data.totalCatalogedGenes || 7949).toLocaleString();
    }
  } catch (err) {
    console.error('Failed to fetch health status:', err);
    document.getElementById('systemStatusText').textContent = 'Connecting...';
  }
}

/* ==========================================================================
   Gene Inputs Initialization
   ========================================================================== */
function initGeneInputs() {
  const container = document.getElementById('geneInputsContainer');
  if (!container) return;

  container.innerHTML = GENE_PANEL.map(g => `
    <div class="gene-input-card">
      <div class="gene-input-header">
        <div class="gene-tag">
          ${g.symbol}
          <span class="expected-dir ${g.dir.toLowerCase()}">${g.dir} in HCC</span>
        </div>
        <input 
          type="number" 
          class="gene-val-input" 
          id="valInput_${g.symbol}" 
          data-symbol="${g.symbol}" 
          min="-6" 
          max="6" 
          step="0.01" 
          value="0.00" 
          title="Direct minute decimal entry (log2FC)"
        >
      </div>
      <div class="slider-container">
        <input 
          type="range" 
          id="slider_${g.symbol}" 
          data-symbol="${g.symbol}" 
          min="-6" 
          max="6" 
          step="0.01" 
          value="0"
        >
      </div>
      <div class="gene-desc">${g.desc}</div>
    </div>
  `).join('');

  // Add event listeners to sliders and number inputs for live synchronized decimal updates
  GENE_PANEL.forEach(g => {
    const slider = document.getElementById(`slider_${g.symbol}`);
    const valInput = document.getElementById(`valInput_${g.symbol}`);
    if (slider && valInput) {
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valInput.value = val.toFixed(2);
        debounceRunPrediction();
      });

      valInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
          slider.value = Math.max(-6, Math.min(6, val));
          debounceRunPrediction();
        }
      });
    }
  });
}

function debounceRunPrediction() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    runMLPrediction();
  }, 250);
}

/* ==========================================================================
   Presets Management
   ========================================================================== */
function initPresets() {
  document.getElementById('presetMalignantBtn')?.addEventListener('click', () => { applyPreset('malignant'); runMLPrediction(); });
  document.getElementById('presetCirrhosisBtn')?.addEventListener('click', () => { applyPreset('cirrhosis'); runMLPrediction(); });
  document.getElementById('presetBenignBtn')?.addEventListener('click', () => { applyPreset('benign'); runMLPrediction(); });
  document.getElementById('presetSteatosisBtn')?.addEventListener('click', () => { applyPreset('steatosis'); runMLPrediction(); });
  document.getElementById('presetMashBtn')?.addEventListener('click', () => { applyPreset('mash'); runMLPrediction(); });
  document.getElementById('presetResetBtn')?.addEventListener('click', () => { applyPreset('reset'); runMLPrediction(); });

  // Stage Simulation buttons in Progression Tab
  document.getElementById('simStage1')?.addEventListener('click', () => { applyPreset('benign'); runMLPrediction(); });
  document.getElementById('simStage2')?.addEventListener('click', () => { applyPreset('steatosis'); runMLPrediction(); });
  document.getElementById('simStage3')?.addEventListener('click', () => { applyPreset('mash'); runMLPrediction(); });
  document.getElementById('simStage4')?.addEventListener('click', () => { applyPreset('cirrhosis'); runMLPrediction(); });
  document.getElementById('simStage5')?.addEventListener('click', () => { applyPreset('malignant'); runMLPrediction(); });
}

function applyPreset(presetKey) {
  const values = PRESETS[presetKey];
  if (!values) return;

  for (const [sym, val] of Object.entries(values)) {
    const slider = document.getElementById(`slider_${sym}`);
    const valInput = document.getElementById(`valInput_${sym}`);
    if (slider) slider.value = val;
    if (valInput) valInput.value = parseFloat(val).toFixed(2);
  }
}

/* ==========================================================================
   Live Machine Learning Predictor & Clinical PDF Report Downloader
   ========================================================================== */
function initPredictor() {
  const predictBtn = document.getElementById('runMlPredictBtn');
  if (predictBtn) {
    predictBtn.addEventListener('click', runMLPrediction);
  }

  const jumpBtn = document.getElementById('btnJumpToTrajectory');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      const progTabBtn = document.querySelector('.tab-btn[data-tab="progression"]');
      if (progTabBtn) {
        progTabBtn.click();
        const continuumCard = document.querySelector('.continuum-card');
        if (continuumCard) {
          continuumCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  }

  // Bind PDF Download Buttons
  const downloadPdfBtn = document.getElementById('btnDownloadReportPdf');
  const headerPdfBtn = document.getElementById('btnHeaderDownloadPdf');
  if (downloadPdfBtn) downloadPdfBtn.addEventListener('click', downloadClinicalBiopsyPdf);
  if (headerPdfBtn) headerPdfBtn.addEventListener('click', downloadClinicalBiopsyPdf);
}

async function downloadClinicalBiopsyPdf() {
  const downloadBtns = [
    document.getElementById('btnDownloadReportPdf'),
    document.getElementById('btnHeaderDownloadPdf')
  ].filter(Boolean);

  const setBtnLoading = (loading) => {
    downloadBtns.forEach(btn => {
      btn.disabled = loading;
      if (loading) {
        btn.dataset.origHtml = btn.innerHTML;
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <span>Generating PDF...</span>
        `;
      } else if (btn.dataset.origHtml) {
        btn.innerHTML = btn.dataset.origHtml;
      }
    });
  };

  try {
    setBtnLoading(true);

    const payload = {
      patientId: `HEP-${Math.floor(100000 + Math.random() * 900000)}`,
      expressionProfile: lastPatientProfile || PRESETS.malignant,
      mlResult: lastMLResult,
      progression: lastMLResult?.biologicalProgression || cachedTrajectoryData
    };

    const res = await fetch('/api/reports/download-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = `HepatoGuard_Biopsy_Report_${payload.patientId}.pdf`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('Error generating biopsy PDF report:', err);
    alert('Failed to generate clinical PDF report: ' + err.message);
  } finally {
    setBtnLoading(false);
  }
}

async function runMLPrediction() {
  const expressionProfile = {};
  GENE_PANEL.forEach(g => {
    const valInput = document.getElementById(`valInput_${g.symbol}`);
    const slider = document.getElementById(`slider_${g.symbol}`);
    if (valInput && !isNaN(parseFloat(valInput.value))) {
      expressionProfile[g.symbol] = parseFloat(valInput.value);
    } else if (slider) {
      expressionProfile[g.symbol] = parseFloat(slider.value);
    }
  });
  lastPatientProfile = expressionProfile;

  const predictBtn = document.getElementById('runMlPredictBtn');
  if (predictBtn) predictBtn.textContent = 'Evaluating Biopsy...';

  try {
    // Run both ML prediction and Biological Progression Alignment in parallel
    const [mlRes, progRes] = await Promise.all([
      fetch('/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expressionProfile })
      }).then(r => r.json()),
      fetch('/api/progression/align', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expressionProfile })
      }).then(r => r.json())
    ]);

    if (!mlRes.success) {
      alert('Prediction Error: ' + mlRes.error);
      return;
    }

    renderPredictionResults(mlRes);

    if (progRes.success) {
      lastProgResult = progRes;
      renderProgressionResults(progRes);
    }

    // Trigger Gemini clinical reasoning synthesis
    fetchGeminiInterpretation(expressionProfile, mlRes, progRes);
  } catch (err) {
    console.error('Error running ML prediction:', err);
  } finally {
    if (predictBtn) {
      predictBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Run ML Cancer Risk Analysis
      `;
    }
  }
}

function renderPredictionResults(res) {
  const percent = Math.min(96, typeof res.riskScorePercentage === 'number' ? res.riskScorePercentage : 0);
  const isMalignant = res.prediction === 'EARLY_HCC';
  lastMLResult = res;

  // 1. Update Gauge Meter with 2-decimal precision
  const scoreVal = document.getElementById('gaugeScoreVal');
  if (scoreVal) scoreVal.textContent = percent.toFixed(2);

  const gaugePath = document.getElementById('gaugePath');
  if (gaugePath) {
    const totalLength = 251.2;
    const offset = totalLength - (totalLength * (percent / 100));
    gaugePath.style.strokeDashoffset = offset;
  }

  // 2. Update Prediction Badge & Tier Description (Only BENIGN for non-malignant)
  const pill = document.getElementById('predictionPill');
  if (pill) {
    pill.textContent = res.prediction === 'EARLY_HCC' ? 'EARLY HCC (MALIGNANT)' : 'BENIGN';
    pill.className = `pred-pill ${isMalignant ? 'malignant' : 'benign'}`;
  }

  const descBox = document.getElementById('tierDescriptionBox');
  if (descBox) {
    descBox.textContent = `${res.signalTier} (${res.tierRange}): ${res.tierDescription || ''}`;
  }

  // 3. Update Biological Progression Alignment Component in ML Card
  if (res.biologicalProgression) {
    const bio = res.biologicalProgression;

    // Coordinate Pill with 2-decimal precision
    const coordPill = document.getElementById('mlCoordPill');
    if (coordPill) {
      coordPill.textContent = `Stage ${bio.trajectoryPosition.toFixed(2)} / 5.0 (${bio.estimatedBiologicalState})`;
    }

    const stateVal = document.getElementById('mlStateVal');
    if (stateVal) {
      stateVal.textContent = `Stage ${bio.trajectoryPosition.toFixed(2)} (${bio.estimatedBiologicalState})`;
    }

    // Mini 5-Stage Stepper Ribbon
    for (let st = 1; st <= 5; st++) {
      const miniStep = document.getElementById(`miniStep_${st}`);
      const miniConcord = document.getElementById(`miniConcord_${st}`);

      if (miniStep) {
        if (st === bio.primaryStageNumber) {
          miniStep.classList.add('active');
        } else {
          miniStep.classList.remove('active');
        }
      }

      if (miniConcord && bio.stageSimilarities) {
        const sim = bio.stageSimilarities.find(s => s.stageNumber === st);
        if (sim) {
          miniConcord.textContent = `${sim.concordance}%`;
        }
      }
    }

    // Clinical Correlation Narrative Callout
    const correlationBox = document.getElementById('mlCorrelationCallout');
    const correlationTitle = document.getElementById('mlCorrelationTitle');
    const correlationText = document.getElementById('mlCorrelationText');

    if (correlationBox && correlationText) {
      correlationText.textContent = res.clinicalCorrelation || bio.transitionAlert;

      if (bio.isPreMalignantTransitionWindow) {
        correlationBox.className = 'ml-correlation-box warning-window';
        if (correlationTitle) {
          correlationTitle.textContent = 'CRITICAL PRE-MALIGNANT TRANSITION WINDOW DETECTED';
        }
      } else if (isMalignant) {
        correlationBox.className = 'ml-correlation-box danger-window';
        if (correlationTitle) {
          correlationTitle.textContent = 'Malignant Carcinoma Transcriptomic Signature';
        }
      } else {
        correlationBox.className = 'ml-correlation-box';
        if (correlationTitle) {
          correlationTitle.textContent = 'Biological-Clinical Correlation Synthesis';
        }
      }
    }

    // Activated Hallmarks Tags
    const hallmarksTags = document.getElementById('mlHallmarksTags');
    if (hallmarksTags) {
      if (bio.activatedHallmarks && bio.activatedHallmarks.length > 0) {
        hallmarksTags.innerHTML = bio.activatedHallmarks.map(h => `
          <span class="ml-hallmark-pill active" title="${h.mechanism}">
            ${h.hallmark}
          </span>
        `).join('');
      } else {
        hallmarksTags.innerHTML = `
          <span class="ml-hallmark-pill">Baseline Hepatic Homeostasis</span>
        `;
      }
    }
  }

  // 4. Render Explainability Attribution Chart with Biological Role & Observed Values
  const attrList = document.getElementById('attributionList');
  if (attrList && res.featureContributions) {
    const maxContribution = Math.max(...res.featureContributions.map(c => Math.abs(c.logOddsContribution)), 1.0);

    attrList.innerHTML = res.featureContributions.slice(0, 10).map(item => {
      const isUp = item.impact === 'INCREASES_CANCER_RISK';
      const widthPct = Math.min(100, Math.max(8, (Math.abs(item.logOddsContribution) / maxContribution) * 100));
      const obsVal = typeof item.observedValue === 'number' 
        ? `${item.observedValue > 0 ? '+' : ''}${item.observedValue.toFixed(2)}` 
        : '0.00';

      return `
        <div class="attr-item">
          <div class="attr-left">
            <div class="attr-left-row">
              <span class="sym">${item.symbol}</span>
              <span class="attr-raw-val">Δ ${obsVal}</span>
            </div>
            <span class="attr-role" title="${item.biologicalRole || ''}">${item.biologicalRole || ''}</span>
          </div>
          <div class="attr-bar-wrapper">
            <div class="attr-bar ${isUp ? 'risk-up' : 'risk-down'}" style="width: ${widthPct}%;"></div>
          </div>
          <span class="attr-val ${isUp ? 'risk-up' : 'risk-down'}">
            ${item.logOddsContribution > 0 ? '+' : ''}${item.logOddsContribution.toFixed(2)}
          </span>
        </div>
      `;
    }).join('');
  }

  // 5. Update Cloned Molecular Trajectory Graph in ML Predictor View
  if (cachedTrajectoryData && cachedTrajectoryData.trajectoryMatrix) {
    renderClonedTrajectorySvg(cachedTrajectoryData.trajectoryMatrix, lastPatientProfile, res, currentClonedFilter);
  }
}

/* ==========================================================================
   Biological Progression & Molecular Trajectory Engine
   ========================================================================== */
async function initProgressionView() {
  try {
    const res = await fetch('/api/progression/trajectory');
    const data = await res.json();
    if (!data.success) return;

    cachedTrajectoryData = data;
    renderTrajectoryStepper(data.stages);
    renderTrajectorySvg(data.trajectoryMatrix);
    updateProgressionStatsBars(lastPatientProfile, lastMLResult, data.trajectoryMatrix);
    if (lastPatientProfile && lastMLResult) {
      renderClonedTrajectorySvg(data.trajectoryMatrix, lastPatientProfile, lastMLResult, currentClonedFilter);
    }
  } catch (err) {
    console.error('Error loading trajectory data:', err);
  }
}

function renderTrajectoryStepper(stages) {
  const container = document.getElementById('progressionStepper');
  if (!container || !stages) return;

  container.innerHTML = stages.map(st => `
    <div class="step-card ${st.stageNumber === 4 ? 'stage-warning' : (st.stageNumber === 5 ? 'stage-danger' : '')}" id="stepCard_${st.stageNumber}">
      <div class="step-header">
        <span class="step-num">${st.stageNumber}</span>
        <span class="step-title">${st.shortName}</span>
      </div>
      <p class="step-desc">${st.clinicalDescription}</p>
      <div class="step-concordance-pill" id="stepPill_${st.stageNumber}">Concordance: --%</div>
    </div>
  `).join('');
}

function renderTrajectorySvg(matrix) {
  const svg = document.getElementById('trajectorySvg');
  if (!svg || !matrix) return;

  // Visual layout bounds (viewBox: 0 0 800 280)
  const xCoords = [80, 225, 370, 515, 660]; // X positions for Stages 1 to 5
  const minY = 30;  // Log2FC +6.0
  const maxY = 230; // Log2FC -4.0
  const zeroY = 150; // Log2FC 0.0

  const scaleY = (fc) => {
    const clamped = Math.max(-4.0, Math.min(6.0, fc));
    const normalized = (6.0 - clamped) / 10.0;
    return minY + normalized * (maxY - minY);
  };

  // Build grid lines, stage dividers, and baseline
  let svgContent = `
    <!-- Grid Level Lines across +6.0, +4.0, +2.0, 0.0, -2.0, -4.0 -->
    <line x1="45" y1="${scaleY(6.0)}" x2="670" y2="${scaleY(6.0)}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3" />
    <line x1="45" y1="${scaleY(4.0)}" x2="670" y2="${scaleY(4.0)}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3" />
    <line x1="45" y1="${scaleY(2.0)}" x2="670" y2="${scaleY(2.0)}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3" />
    <line x1="45" y1="${zeroY}" x2="670" y2="${zeroY}" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" stroke-dasharray="6" />
    <line x1="45" y1="${scaleY(-2.0)}" x2="670" y2="${scaleY(-2.0)}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3" />
    <line x1="45" y1="${scaleY(-4.0)}" x2="670" y2="${scaleY(-4.0)}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3" />

    <!-- Y-Axis Numerical Value Labels -->
    <text x="38" y="${scaleY(6.0) + 3.5}" fill="#fda4af" font-size="9" font-family="JetBrains Mono" text-anchor="end">+6.0</text>
    <text x="38" y="${scaleY(4.0) + 3.5}" fill="#fda4af" font-size="9" font-family="JetBrains Mono" text-anchor="end">+4.0</text>
    <text x="38" y="${scaleY(2.0) + 3.5}" fill="#fcd34d" font-size="9" font-family="JetBrains Mono" text-anchor="end">+2.0</text>
    <text x="38" y="${zeroY + 3.5}" fill="#94a3b8" font-size="9" font-weight="700" font-family="JetBrains Mono" text-anchor="end">0.0</text>
    <text x="38" y="${scaleY(-2.0) + 3.5}" fill="#6ee7b7" font-size="9" font-family="JetBrains Mono" text-anchor="end">-2.0</text>
    <text x="38" y="${scaleY(-4.0) + 3.5}" fill="#6ee7b7" font-size="9" font-family="JetBrains Mono" text-anchor="end">-4.0</text>
  `;

  // Stage vertical divider guidelines and labels
  const stageLabels = ['Stage 1: Healthy', 'Stage 2: Steatosis', 'Stage 3: MASH', 'Stage 4: Cirrhosis', 'Stage 5: Early HCC'];
  xCoords.forEach((x, idx) => {
    svgContent += `
      <line x1="${x}" y1="20" x2="${x}" y2="235" stroke="rgba(255,255,255,0.08)" />
      <text x="${x}" y="255" fill="#94a3b8" font-size="10" font-weight="700" text-anchor="middle" font-family="Plus Jakarta Sans">
        ${stageLabels[idx]}
      </text>
    `;
  });

  // Selected representative curves for visual elegance
  const representativeCurves = [
    { symbol: 'PCK1', type: 'repressed', color: '#10b981', name: 'PCK1 (Gluconeogenesis)' },
    { symbol: 'CYP2E1', type: 'repressed', color: '#10b981', name: 'CYP2E1 (Detoxification)' },
    { symbol: 'GNMT', type: 'repressed', color: '#10b981', name: 'GNMT (Methylome)' },
    { symbol: 'SERPINB3', type: 'induced', color: '#f59e0b', name: 'SERPINB3 (Dysplasia)' },
    { symbol: 'AKR1B10', type: 'induced', color: '#f59e0b', name: 'AKR1B10 (Aldehyde detox)' },
    { symbol: 'SPINK1', type: 'oncofetal', color: '#f43f5e', name: 'SPINK1 (Malignant invasion)' },
    { symbol: 'GPC3', type: 'oncofetal', color: '#f43f5e', name: 'GPC3 (Oncofetal antigen)' },
    { symbol: 'AFP', type: 'oncofetal', color: '#f43f5e', name: 'AFP (Carcinoma marker)' }
  ];

  const endpointItems = [];

  for (const rep of representativeCurves) {
    const item = matrix.find(m => m.symbol === rep.symbol);
    if (!item) continue;

    const pts = item.trajectory.map((pt, i) => ({
      x: xCoords[i],
      y: scaleY(pt.log2FC)
    }));

    // Generate smooth Bézier spline path string
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) * 0.5;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) * 0.5;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }

    svgContent += `
      <path d="${d}" stroke="${rep.color}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.85" />
    `;

    // Nodes at each stage point
    pts.forEach((pt, i) => {
      svgContent += `
        <circle cx="${pt.x}" cy="${pt.y}" r="3.5" fill="#ffffff" stroke="${rep.color}" stroke-width="1.5">
          <title>${rep.symbol} @ Stage ${i + 1}: ${item.trajectory[i].log2FC > 0 ? '+' : ''}${item.trajectory[i].log2FC.toFixed(2)} log2FC</title>
        </circle>
      `;
    });

    endpointItems.push({
      rep,
      lastPt: pts[4],
      lastVal: item.trajectory[4].log2FC,
      yLabel: pts[4].y
    });
  }

  // Relax end labels on right margin
  endpointItems.sort((a, b) => a.lastPt.y - b.lastPt.y);
  for (let i = 1; i < endpointItems.length; i++) {
    if (endpointItems[i].yLabel - endpointItems[i - 1].yLabel < 17) {
      endpointItems[i].yLabel = endpointItems[i - 1].yLabel + 17;
    }
  }
  for (let i = endpointItems.length - 2; i >= 0; i--) {
    if (endpointItems[i + 1].yLabel - endpointItems[i].yLabel < 17) {
      endpointItems[i].yLabel = endpointItems[i + 1].yLabel - 17;
    }
  }

  endpointItems.forEach(ep => {
    svgContent += `
      <line x1="${ep.lastPt.x + 3}" y1="${ep.lastPt.y}" x2="${ep.lastPt.x + 12}" y2="${ep.yLabel}" stroke="${ep.rep.color}" stroke-width="0.8" stroke-opacity="0.5" />
      <text x="${ep.lastPt.x + 16}" y="${ep.yLabel + 3.5}" fill="${ep.rep.color}" font-size="9" font-weight="700" font-family="JetBrains Mono">
        ${ep.rep.symbol} ${ep.lastVal > 0 ? '↗' : '↘'} ${ep.lastVal > 0 ? '+' : ''}${ep.lastVal.toFixed(1)}
      </text>
    `;
  });

  svg.innerHTML = svgContent;
}

/* ==========================================================================
   Cloned Responsive Molecular Trajectory Graph in ML Predictor View
   ========================================================================== */
function initClonedTrajectoryFilter() {
  const filterBtns = document.querySelectorAll('#cloneGraphFilters .filter-pill');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentClonedFilter = btn.getAttribute('data-filter') || 'all';
      if (cachedTrajectoryData && lastPatientProfile && lastMLResult) {
        renderClonedTrajectorySvg(cachedTrajectoryData.trajectoryMatrix, lastPatientProfile, lastMLResult, currentClonedFilter);
      }
    });
  });
}

let inspectedGene = 'PCK1';

window.selectInspectorGene = function(symbol) {
  if (!symbol) return;
  inspectedGene = symbol;
  updateBiomarkerInspector(symbol, cachedTrajectoryData?.trajectoryMatrix, lastPatientProfile, lastMLResult);
  if (cachedTrajectoryData && lastPatientProfile && lastMLResult) {
    renderClonedTrajectorySvg(cachedTrajectoryData.trajectoryMatrix, lastPatientProfile, lastMLResult, currentClonedFilter);
  }
};

function updateBiomarkerInspector(symbol, matrix, patientProfile, mlResult) {
  if (!symbol) return;
  inspectedGene = symbol;

  const geneData = GENE_PANEL.find(g => g.symbol === symbol);
  const matrixItem = matrix?.find(m => m.symbol === symbol);
  const bio = mlResult?.biologicalProgression;
  const patientPos = bio?.trajectoryPosition || 1.0;

  // DOM elements
  const badge = document.getElementById('inspGeneSymbol');
  const title = document.getElementById('inspGeneTitle');
  const catBadge = document.getElementById('inspCategoryBadge');
  const role = document.getElementById('inspGeneRole');
  const pVal = document.getElementById('inspPatientVal');
  const sVal = document.getElementById('inspStageVal');
  const sSub = document.getElementById('inspStageSub');
  const gapVal = document.getElementById('inspGapVal');
  const gapSub = document.getElementById('inspGapSub');
  const impVal = document.getElementById('inspImpactVal');
  const impSub = document.getElementById('inspImpactSub');
  const takeawayText = document.getElementById('inspTakeawayText');

  if (badge) badge.textContent = symbol;
  if (title) title.textContent = geneData?.desc || symbol;

  // Category & Visual Class
  let categoryName = 'Diagnostic Biomarker';
  let categoryClass = '';
  if (['PCK1', 'CYP2E1', 'GNMT', 'MGMT', 'TREH', 'ALDH1A1', 'CPS1'].includes(symbol)) {
    categoryName = 'Metabolic Guardian (Suppressed)';
    categoryClass = '';
  } else if (['SERPINB3', 'AKR1B10'].includes(symbol)) {
    categoryName = 'Pre-Neoplastic Dysplasia Inducer';
    categoryClass = 'pre-neoplastic';
  } else if (['SPINK1', 'GPC3', 'AFP', 'PEG10', 'CDKN3', 'TOP2A'].includes(symbol)) {
    categoryName = 'Oncofetal Re-awakening Driver';
    categoryClass = 'risk';
  }

  if (catBadge) {
    catBadge.textContent = categoryName;
    catBadge.className = `inspector-cat-badge ${categoryClass}`;
  }

  // Find feature contribution
  const feat = mlResult?.featureContributions?.find(f => f.symbol === symbol);
  if (role) {
    role.textContent = feat?.biologicalRole || geneData?.desc || 'Diagnostic transition biomarker.';
  }

  const patientVal = patientProfile ? patientProfile[symbol] : 0;
  const isUp = feat ? feat.impact === 'INCREASES_CANCER_RISK' : patientVal > 0;
  if (pVal) {
    pVal.textContent = `${patientVal > 0 ? '+' : ''}${parseFloat(patientVal || 0).toFixed(2)} log2FC`;
    pVal.className = `inspector-metric-val ${isUp ? 'risk-up' : 'risk-down'}`;
  }

  // Calculate expected stage baseline
  let expectedVal = 0;
  if (matrixItem && matrixItem.trajectory) {
    const clampedPos = Math.max(1.0, Math.min(5.0, patientPos));
    const lowerIdx = Math.min(3, Math.floor(clampedPos - 1));
    const upperIdx = lowerIdx + 1;
    const frac = (clampedPos - 1) - lowerIdx;
    expectedVal = matrixItem.trajectory[lowerIdx].log2FC + frac * (matrixItem.trajectory[upperIdx].log2FC - matrixItem.trajectory[lowerIdx].log2FC);
  }

  if (sVal) {
    sVal.textContent = `${expectedVal > 0 ? '+' : ''}${expectedVal.toFixed(2)} log2FC`;
  }
  if (sSub) {
    sSub.textContent = patientPos.toFixed(1);
  }

  const diff = (patientVal || 0) - expectedVal;
  if (gapVal) {
    gapVal.textContent = `${diff > 0 ? '+' : ''}${diff.toFixed(2)} Δ`;
    gapVal.className = `inspector-metric-val ${Math.abs(diff) > 1.0 ? (diff > 0 ? 'risk-up' : 'risk-down') : 'neutral'}`;
  }
  if (gapSub) {
    if (Math.abs(diff) < 0.25) {
      gapSub.textContent = `In sync with cohort Stage ${patientPos.toFixed(1)} average`;
    } else if (diff > 0) {
      gapSub.textContent = `${Math.abs(diff).toFixed(2)} log2FC higher than stage cohort norm`;
    } else {
      gapSub.textContent = `${Math.abs(diff).toFixed(2)} log2FC lower than stage cohort norm`;
    }
  }

  if (impVal && feat) {
    impVal.textContent = `${feat.logOddsContribution > 0 ? '+' : ''}${feat.logOddsContribution.toFixed(2)}`;
    impVal.className = `inspector-metric-val ${feat.impact === 'INCREASES_CANCER_RISK' ? 'risk-up' : 'risk-down'}`;
  }
  if (impSub && feat) {
    if (feat.impact === 'INCREASES_CANCER_RISK') {
      impSub.textContent = `Pushes model toward Early HCC (+${Math.abs(feat.logOddsContribution).toFixed(2)} log-odds)`;
    } else {
      impSub.textContent = `Protective signal: Suppresses cancer risk (-${Math.abs(feat.logOddsContribution).toFixed(2)} log-odds)`;
    }
  }

  // Synthesize clinical takeaway note
  if (takeawayText) {
    const formattedVal = `${patientVal > 0 ? '+' : ''}${parseFloat(patientVal || 0).toFixed(2)} log2FC`;
    const formattedExp = `${expectedVal > 0 ? '+' : ''}${expectedVal.toFixed(2)} log2FC`;
    
    if (isUp) {
      takeawayText.innerHTML = `<strong>${symbol} Activation:</strong> Patient biopsy is ${formattedVal} (vs cohort stage baseline ${formattedExp}). This elevated expression actively drives dysplastic cell transformation and contributes +${Math.abs(feat?.logOddsContribution || 0).toFixed(2)} log-odds to the malignant prediction.`;
    } else {
      takeawayText.innerHTML = `<strong>${symbol} Metabolic Shutdown:</strong> Patient biopsy is suppressed to ${formattedVal} (vs normal healthy 0.0). Loss of this critical metabolic guardian indicates Warburg glycolytic reprogramming and removes tumor suppression.`;
    }
  }

  // Highlight active gene chip
  const chips = document.querySelectorAll('#cloneGeneSelectStrip .gene-chip');
  chips.forEach(c => {
    if (c.getAttribute('data-gene') === symbol) {
      c.classList.add('active');
    } else {
      c.classList.remove('active');
    }
  });
}

function renderGeneSelectStrip(matrix, patientProfile, mlResult) {
  const container = document.getElementById('cloneGeneSelectStrip');
  if (!container) return;

  const genes = [
    { symbol: 'PCK1', color: '#10b981' },
    { symbol: 'CYP2E1', color: '#10b981' },
    { symbol: 'GNMT', color: '#10b981' },
    { symbol: 'SERPINB3', color: '#f59e0b' },
    { symbol: 'AKR1B10', color: '#f59e0b' },
    { symbol: 'SPINK1', color: '#f43f5e' },
    { symbol: 'GPC3', color: '#f43f5e' },
    { symbol: 'AFP', color: '#f43f5e' }
  ];

  container.innerHTML = `
    <span style="font-size: 0.6875rem; font-weight: 700; color: var(--text-muted); align-self: center; margin-right: 0.5rem; text-transform: uppercase;">
      Click Biomarker to Inspect:
    </span>
    ${genes.map(g => `
      <button class="gene-chip ${inspectedGene === g.symbol ? 'active' : ''}" data-gene="${g.symbol}" type="button">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${g.color}; display: inline-block;"></span>
        ${g.symbol}
      </button>
    `).join('')}
  `;

  container.querySelectorAll('.gene-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const sym = btn.getAttribute('data-gene');
      if (sym) {
        window.selectInspectorGene(sym);
      }
    });
  });
}

/* ==========================================================================
   Progressive Molecular Gene Expression Significance Stats Bar Engine
   ========================================================================== */
function updateProgressionStatsBars(patientProfile, mlResult, matrix) {
  if (!patientProfile) {
    patientProfile = PRESETS.malignant || {};
  }

  // 1. Max Oncogenic Surge (SPINK1 by default, or highest positive log2FC)
  let surgeGene = 'SPINK1';
  let surgeVal = patientProfile[surgeGene] !== undefined ? patientProfile[surgeGene] : 5.80;
  const oncogenes = ['SPINK1', 'GPC3', 'AFP', 'PEG10', 'TOP2A', 'CDKN3'];
  oncogenes.forEach(sym => {
    if (patientProfile[sym] !== undefined && patientProfile[sym] > surgeVal) {
      surgeGene = sym;
      surgeVal = patientProfile[sym];
    }
  });

  const surgeValStr = `${surgeVal >= 0 ? '+' : ''}${surgeVal.toFixed(2)} log2FC`;
  const surgeSubStr = surgeVal >= 2.5 
    ? `Tumor Induction (+${Math.pow(2, surgeVal).toFixed(0)}x fold)`
    : (surgeVal >= 1.0 ? `Dysplastic Induction (+${Math.pow(2, surgeVal).toFixed(1)}x)` : `Quiescent Normal Baseline`);

  // 2. Pre-Malignant Tipping Marker (SERPINB3 or AKR1B10)
  let tippingGene = 'SERPINB3';
  let tippingVal = patientProfile[tippingGene] !== undefined ? patientProfile[tippingGene] : 2.80;
  if (patientProfile.AKR1B10 !== undefined && Math.abs(patientProfile.AKR1B10) > Math.abs(tippingVal)) {
    tippingGene = 'AKR1B10';
    tippingVal = patientProfile.AKR1B10;
  }
  const tippingValStr = `${tippingVal >= 0 ? '+' : ''}${tippingVal.toFixed(2)} log2FC`;
  const bio = mlResult?.biologicalProgression;
  const isPreMalignant = bio?.isPreMalignantTransitionWindow || (bio?.trajectoryPosition >= 3.4 && bio?.trajectoryPosition <= 4.6);
  const tippingSubStr = isPreMalignant 
    ? `Active Window (Stage 3.4–4.6)`
    : (tippingVal >= 1.5 ? `Pre-Neoplastic Surge @ MASH` : `Pre-Transition Baseline`);

  // 3. Metabolic Shutdown / Collapse (PCK1 or lowest metabolic guardian)
  let collapseGene = 'PCK1';
  let collapseVal = patientProfile[collapseGene] !== undefined ? patientProfile[collapseGene] : -3.10;
  const guardians = ['PCK1', 'CYP2E1', 'GNMT', 'CPS1', 'ALDH1A1'];
  guardians.forEach(sym => {
    if (patientProfile[sym] !== undefined && patientProfile[sym] < collapseVal) {
      collapseGene = sym;
      collapseVal = patientProfile[sym];
    }
  });
  const collapseValStr = `${collapseVal >= 0 ? '+' : ''}${collapseVal.toFixed(2)} log2FC`;
  const lossPct = collapseVal < 0 ? Math.min(99, Math.round((1 - Math.pow(2, collapseVal)) * 100)) : 0;
  const collapseSubStr = lossPct > 0 ? `Gluconeogenesis Loss (-${lossPct}%)` : `Intact Metabolic Guardians`;

  // 4. Significant Drivers Perturbed (|log2FC| >= 1.5)
  const profileKeys = Object.keys(patientProfile);
  const totalCount = profileKeys.length || 8;
  const sigCount = profileKeys.filter(k => Math.abs(patientProfile[k]) >= 1.5).length;
  const sigPct = Math.round((sigCount / totalCount) * 100);

  // Safely update DOM elements
  const updatePair = (idPrefix) => {
    const el = id => document.getElementById(id);
    if (el(`${idPrefix}StatSurgeGene`)) el(`${idPrefix}StatSurgeGene`).textContent = surgeGene;
    if (el(`${idPrefix}StatSurgeVal`)) el(`${idPrefix}StatSurgeVal`).textContent = surgeValStr;
    if (el(`${idPrefix}StatSurgeSub`)) el(`${idPrefix}StatSurgeSub`).textContent = surgeSubStr;

    if (el(`${idPrefix}StatTippingGene`)) el(`${idPrefix}StatTippingGene`).textContent = tippingGene;
    if (el(`${idPrefix}StatTippingVal`)) el(`${idPrefix}StatTippingVal`).textContent = tippingValStr;
    if (el(`${idPrefix}StatTippingSub`)) el(`${idPrefix}StatTippingSub`).textContent = tippingSubStr;

    if (el(`${idPrefix}StatCollapseGene`)) el(`${idPrefix}StatCollapseGene`).textContent = collapseGene;
    if (el(`${idPrefix}StatCollapseVal`)) el(`${idPrefix}StatCollapseVal`).textContent = collapseValStr;
    if (el(`${idPrefix}StatCollapseSub`)) el(`${idPrefix}StatCollapseSub`).textContent = collapseSubStr;

    if (el(`${idPrefix}StatPerturbedCount`)) el(`${idPrefix}StatPerturbedCount`).textContent = `${sigCount} / ${totalCount}`;
    if (el(`${idPrefix}StatPerturbedPct`)) el(`${idPrefix}StatPerturbedPct`).textContent = `${sigPct}% Active`;
    if (el(`${idPrefix}StatPerturbedSub`)) el(`${idPrefix}StatPerturbedSub`).textContent = `Threshold: |log2FC| ≥ 1.5`;
  };

  // Update both ML and Progression panels
  updatePair('ml');
  updatePair('prog');
}

function renderClonedTrajectorySvg(matrix, patientProfile, mlResult, filterType = 'all') {
  const svg = document.getElementById('mlTrajectoryCloneSvg');
  if (!svg || !matrix) return;

  // Render stats bar, gene selector chips, and inspector card
  updateProgressionStatsBars(patientProfile, mlResult, matrix);
  renderGeneSelectStrip(matrix, patientProfile, mlResult);
  updateBiomarkerInspector(inspectedGene, matrix, patientProfile, mlResult);

  // Geometry bounds (viewBox: 0 0 880 390)
  const xCoords = [110, 270, 430, 590, 750]; // Stages 1 to 5
  const minY = 38;  // Log2FC +6.0
  const maxY = 288; // Log2FC -4.0
  const zeroY = 188; // Log2FC 0.0

  const scaleY = (fc) => {
    const clamped = Math.max(-4.0, Math.min(6.0, fc));
    const normalized = (6.0 - clamped) / 10.0;
    return minY + normalized * (maxY - minY);
  };

  const scaleX = (pos) => {
    const clamped = Math.max(1.0, Math.min(5.0, pos));
    return xCoords[0] + ((clamped - 1.0) / 4.0) * (xCoords[4] - xCoords[0]);
  };

  // Trajectory state
  const bio = mlResult?.biologicalProgression;
  const patientPos = bio?.trajectoryPosition || 1.0;
  const xPatient = scaleX(patientPos);
  const isPreMalignant = bio?.isPreMalignantTransitionWindow || false;
  const isMalignant = mlResult?.prediction === 'EARLY_HCC';
  const needleColor = isPreMalignant ? '#f59e0b' : (isMalignant ? '#f43f5e' : '#10b981');
  const needleClass = isPreMalignant ? 'warning' : (isMalignant ? 'danger' : '');

  // Pre-Malignant Transition Window Rect Bounds (Stages 3.4 - 4.6)
  const xPreStart = scaleX(3.4);
  const xPreEnd = scaleX(4.6);
  const preWidth = xPreEnd - xPreStart;

  // Determine top ML driver symbol for filter
  const topMLGene = mlResult?.featureContributions?.[0]?.symbol || null;

  // Update Status Pill
  const statusPillText = document.getElementById('cloneLiveStatusText');
  const statusPulseDot = document.getElementById('cloneLivePulseDot');
  if (statusPillText && bio) {
    const displayRisk = Math.min(96, mlResult.riskScorePercentage || 0);
    statusPillText.textContent = `Stage ${patientPos.toFixed(2)} / 5.0 (${bio.estimatedBiologicalState}) — Malignancy Risk Score: ${Number(displayRisk).toFixed(2)}`;
  }
  if (statusPulseDot) {
    statusPulseDot.className = `live-pulse-dot ${needleClass}`;
  }

  let svgContent = `
    <!-- Defs for Gradients and Glow Filters -->
    <defs>
      <linearGradient id="clonePreMalignantGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#f59e0b" stop-opacity="${isPreMalignant ? '0.28' : '0.10'}" />
        <stop offset="50%" stop-color="#f59e0b" stop-opacity="${isPreMalignant ? '0.45' : '0.18'}" />
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="${isPreMalignant ? '0.28' : '0.10'}" />
      </linearGradient>
      <filter id="clonePatientGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <!-- Subtle Alternating Stage Bands -->
    <rect x="30" y="20" width="160" height="295" fill="rgba(16, 185, 129, 0.03)" />
    <rect x="190" y="20" width="160" height="295" fill="rgba(148, 163, 184, 0.02)" />
    <rect x="350" y="20" width="160" height="295" fill="rgba(245, 158, 11, 0.03)" />
    <rect x="510" y="20" width="160" height="295" fill="rgba(245, 158, 11, 0.06)" />
    <rect x="670" y="20" width="160" height="295" fill="rgba(244, 63, 94, 0.06)" />

    <!-- Stage Boundary Separator Lines -->
    <line x1="190" y1="20" x2="190" y2="315" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3" />
    <line x1="350" y1="20" x2="350" y2="315" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3" />
    <line x1="510" y1="20" x2="510" y2="315" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3" />
    <line x1="670" y1="20" x2="670" y2="315" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3" />

    <!-- Pre-Malignant Transition Window Shading (Stages 3.4 - 4.6) -->
    <rect x="${xPreStart}" y="20" width="${preWidth}" height="295" rx="6" 
          fill="url(#clonePreMalignantGrad)" 
          stroke="#f59e0b" 
          stroke-width="${isPreMalignant ? '2.5' : '1.2'}" 
          stroke-dasharray="${isPreMalignant ? 'none' : '5 4'}" 
          opacity="${isPreMalignant ? '1.0' : '0.8'}" />
    <text x="${xPreStart + preWidth / 2}" y="34" fill="#fcd34d" font-size="9.5" font-weight="800" font-family="Plus Jakarta Sans" text-anchor="middle" letter-spacing="0.04em">
      ${isPreMalignant ? '⚡ ACTIVE PRE-MALIGNANT TRANSITION WINDOW (STAGES 3.4 – 4.6)' : 'PRE-MALIGNANT TRANSITION ZONE (STAGES 3.4 – 4.6)'}
    </text>

    <!-- Complete Grid Level Lines across +6.0, +4.0, +2.0, 0.0, -2.0, -4.0 -->
    <line x1="60" y1="${scaleY(6.0)}" x2="760" y2="${scaleY(6.0)}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3" />
    <line x1="60" y1="${scaleY(4.0)}" x2="760" y2="${scaleY(4.0)}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3" />
    <line x1="60" y1="${scaleY(2.0)}" x2="760" y2="${scaleY(2.0)}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3" />
    <line x1="60" y1="${zeroY}" x2="760" y2="${zeroY}" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" stroke-dasharray="6" />
    <line x1="60" y1="${scaleY(-2.0)}" x2="760" y2="${scaleY(-2.0)}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3" />
    <line x1="60" y1="${scaleY(-4.0)}" x2="760" y2="${scaleY(-4.0)}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3" />

    <!-- Y-Axis Value Labels -->
    <text x="52" y="${scaleY(6.0) + 3.5}" fill="#fda4af" font-size="9" font-family="JetBrains Mono" text-anchor="end">+6.0</text>
    <text x="52" y="${scaleY(4.0) + 3.5}" fill="#fda4af" font-size="9" font-family="JetBrains Mono" text-anchor="end">+4.0</text>
    <text x="52" y="${scaleY(2.0) + 3.5}" fill="#fcd34d" font-size="9" font-family="JetBrains Mono" text-anchor="end">+2.0</text>
    <text x="52" y="${zeroY + 3.5}" fill="#94a3b8" font-size="9" font-weight="700" font-family="JetBrains Mono" text-anchor="end">0.0 (Normal)</text>
    <text x="52" y="${scaleY(-2.0) + 3.5}" fill="#6ee7b7" font-size="9" font-family="JetBrains Mono" text-anchor="end">-2.0</text>
    <text x="52" y="${scaleY(-4.0) + 3.5}" fill="#6ee7b7" font-size="9" font-family="JetBrains Mono" text-anchor="end">-4.0</text>
  `;

  // Stage vertical centers guidelines and bottom stage pills
  const stageInfo = [
    { num: 1, name: 'Healthy Control', fill: 'rgba(16, 185, 129, 0.15)', stroke: '#10b981', color: '#6ee7b7' },
    { num: 2, name: 'Simple Steatosis', fill: 'rgba(148, 163, 184, 0.15)', stroke: '#94a3b8', color: '#e2e8f0' },
    { num: 3, name: 'MASH / Fibrosis', fill: 'rgba(245, 158, 11, 0.15)', stroke: '#f59e0b', color: '#fcd34d' },
    { num: 4, name: 'Cirrhosis / Dysplasia', fill: 'rgba(245, 158, 11, 0.25)', stroke: '#f59e0b', color: '#fbbf24' },
    { num: 5, name: 'Early HCC (Malignant)', fill: 'rgba(244, 63, 94, 0.25)', stroke: '#f43f5e', color: '#fda4af' }
  ];

  xCoords.forEach((x, idx) => {
    const s = stageInfo[idx];
    svgContent += `
      <line x1="${x}" y1="20" x2="${x}" y2="315" class="grid-line" stroke="rgba(255,255,255,0.08)" />
      
      <!-- Stage Pill Capsule -->
      <g transform="translate(${x}, 345)">
        <rect x="-65" y="-14" width="130" height="26" rx="13" 
              fill="${s.fill}" stroke="${s.stroke}" stroke-width="1.2" />
        <text x="0" y="3.5" fill="${s.color}" font-size="10" font-weight="700" text-anchor="middle" font-family="Plus Jakarta Sans">
          Stage ${s.num}: ${s.name}
        </text>
      </g>
    `;
  });

  // 8 Representative Drivers across the cascade
  const representativeCurves = [
    { symbol: 'PCK1', type: 'repressed', cat: 'protective', color: '#10b981', name: 'PCK1 (Gluconeogenesis)' },
    { symbol: 'CYP2E1', type: 'repressed', cat: 'protective', color: '#10b981', name: 'CYP2E1 (Detoxification)' },
    { symbol: 'GNMT', type: 'repressed', cat: 'protective', color: '#10b981', name: 'GNMT (Methylome Guardian)' },
    { symbol: 'SERPINB3', type: 'induced', cat: 'risk', color: '#f59e0b', name: 'SERPINB3 (Dysplasia Inducer)' },
    { symbol: 'AKR1B10', type: 'induced', cat: 'risk', color: '#f59e0b', name: 'AKR1B10 (Aldo-Keto Reductase)' },
    { symbol: 'SPINK1', type: 'oncofetal', cat: 'risk', color: '#f43f5e', name: 'SPINK1 (Malignant Invasion)' },
    { symbol: 'GPC3', type: 'oncofetal', cat: 'risk', color: '#f43f5e', name: 'GPC3 (Glypican-3 Oncofetal)' },
    { symbol: 'AFP', type: 'oncofetal', cat: 'risk', color: '#f43f5e', name: 'AFP (Alpha-Fetoprotein)' }
  ];

  const endpointItems = [];

  // Draw Spline Curves
  for (const rep of representativeCurves) {
    const item = matrix.find(m => m.symbol === rep.symbol);
    if (!item) continue;

    // Filter logic & Inspection highlighting
    let isDimmed = false;
    let isHighlight = (inspectedGene === rep.symbol);

    if (filterType === 'risk' && rep.cat !== 'risk') isDimmed = true;
    if (filterType === 'protective' && rep.cat !== 'protective') isDimmed = true;
    if (filterType === 'top-ml') {
      if (topMLGene && rep.symbol === topMLGene) {
        isHighlight = true;
      } else {
        isDimmed = true;
      }
    }

    const strokeOpacity = isDimmed ? '0.14' : (isHighlight ? '1.0' : '0.65');
    const strokeWidth = isHighlight ? '4.5' : (isDimmed ? '1.5' : '2.6');
    const strokeDash = isDimmed ? '4 3' : 'none';

    const pts = item.trajectory.map((pt, i) => ({
      x: xCoords[i],
      y: scaleY(pt.log2FC)
    }));

    // Smooth Bézier Spline
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) * 0.5;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) * 0.5;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }

    svgContent += `
      <path d="${d}" stroke="${rep.color}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDash}" fill="none" stroke-linecap="round" stroke-opacity="${strokeOpacity}" 
            ${isHighlight ? 'filter="url(#clonePatientGlow)"' : ''} style="cursor: pointer;" onclick="window.selectInspectorGene('${rep.symbol}')" />
    `;

    // Baseline Nodes at each stage point
    pts.forEach((pt, i) => {
      svgContent += `
        <circle cx="${pt.x}" cy="${pt.y}" r="${isHighlight ? '5' : '3.5'}" fill="#ffffff" fill-opacity="${strokeOpacity}" stroke="${rep.color}" stroke-width="1.5" 
                style="cursor: pointer;" onclick="window.selectInspectorGene('${rep.symbol}')">
          <title>${rep.name} @ Stage ${i + 1}: ${item.trajectory[i].log2FC > 0 ? '+' : ''}${item.trajectory[i].log2FC.toFixed(2)} log2FC (Click to Inspect)</title>
        </circle>
      `;
    });

    // Save terminal point for direct right-edge labeling
    endpointItems.push({
      rep,
      isHighlight,
      isDimmed,
      lastPt: pts[4],
      lastVal: item.trajectory[4].log2FC,
      yLabel: pts[4].y
    });
  }

  // Relax right-edge endpoint labels (min 20px vertical separation)
  endpointItems.sort((a, b) => a.lastPt.y - b.lastPt.y);
  for (let i = 1; i < endpointItems.length; i++) {
    if (endpointItems[i].yLabel - endpointItems[i - 1].yLabel < 20) {
      endpointItems[i].yLabel = endpointItems[i - 1].yLabel + 20;
    }
  }
  for (let i = endpointItems.length - 2; i >= 0; i--) {
    if (endpointItems[i + 1].yLabel - endpointItems[i].yLabel < 20) {
      endpointItems[i].yLabel = endpointItems[i + 1].yLabel - 20;
    }
  }

  // Draw direct right-edge curve endpoint capsules
  endpointItems.forEach(ep => {
    const isHigh = ep.isHighlight;
    const pillX = 760;
    const strokeOp = ep.isDimmed ? '0.2' : (isHigh ? '1.0' : '0.8');

    svgContent += `
      <g style="cursor: pointer;" onclick="window.selectInspectorGene('${ep.rep.symbol}')">
        <!-- Connecting leader line from Stage 5 node to label capsule -->
        <line x1="${ep.lastPt.x + 3}" y1="${ep.lastPt.y}" x2="${pillX - 2}" y2="${ep.yLabel}" 
              stroke="${ep.rep.color}" stroke-width="${isHigh ? '1.5' : '0.8'}" stroke-opacity="${strokeOp}" />
        
        <!-- Label Capsule Background -->
        <rect x="${pillX}" y="${ep.yLabel - 9}" width="105" height="18" rx="4" 
              fill="rgba(15, 23, 42, 0.95)" stroke="${ep.rep.color}" stroke-width="${isHigh ? '2' : '1'}" stroke-opacity="${strokeOp}" />
        
        <text x="${pillX + 52}" y="${ep.yLabel + 3.5}" fill="${ep.rep.color}" fill-opacity="${strokeOp}" 
              font-size="9.5" font-weight="${isHigh ? '800' : '700'}" font-family="JetBrains Mono" text-anchor="middle">
          ${ep.rep.symbol} ${ep.lastVal > 0 ? '↗' : '↘'} ${ep.lastVal > 0 ? '+' : ''}${ep.lastVal.toFixed(1)}
        </text>
      </g>
    `;
  });

  // Draw Animated Patient Needle Line
  svgContent += `
    <!-- Patient Trajectory Needle -->
    <line x1="${xPatient}" y1="20" x2="${xPatient}" y2="315" 
          stroke="${needleColor}" stroke-width="2.5" stroke-dasharray="6 3" 
          class="patient-needle-line ${needleClass}" filter="url(#clonePatientGlow)" />

    <!-- Top Beacon Badge with Pointer Arrow -->
    <g transform="translate(${xPatient}, 20)">
      <polygon points="0,0 -6,-7 6,-7" fill="${needleColor}" />
      <rect x="-85" y="-24" width="170" height="22" rx="6" fill="${needleColor}" opacity="0.95" />
      <text x="0" y="-9" text-anchor="middle" font-size="10.5" font-weight="800" font-family="JetBrains Mono" fill="#0f172a">
        PATIENT: STAGE ${patientPos.toFixed(1)} / 5.0
      </text>
    </g>
  `;

  // Draw Patient's Actual Observed Biopsy Gene Points on the Needle with Smart Anti-Collision Relaxation
  if (patientProfile) {
    const isCloseToRightEdge = xPatient > 660;

    // Collect all valid patient points
    const activePoints = [];
    representativeCurves.forEach(rep => {
      if (filterType === 'risk' && rep.cat !== 'risk') return;
      if (filterType === 'protective' && rep.cat !== 'protective') return;
      if (filterType === 'top-ml' && topMLGene && rep.symbol !== topMLGene) return;

      const patientVal = patientProfile[rep.symbol];
      if (typeof patientVal === 'number') {
        const yPatient = scaleY(patientVal);
        const item = matrix.find(m => m.symbol === rep.symbol);
        
        let expectedVal = 0;
        if (item) {
          const lowerIdx = Math.max(0, Math.min(3, Math.floor(patientPos - 1)));
          const upperIdx = Math.min(4, lowerIdx + 1);
          const frac = (patientPos - 1) - lowerIdx;
          expectedVal = item.trajectory[lowerIdx].log2FC + frac * (item.trajectory[upperIdx].log2FC - item.trajectory[lowerIdx].log2FC);
        }
        const yExpected = scaleY(expectedVal);

        activePoints.push({
          rep,
          val: patientVal,
          expectedVal,
          yRaw: yPatient,
          yExpected,
          yLabel: yPatient
        });
      }
    });

    // Smart vertical collision-free relaxation algorithm (min 22px spacing)
    activePoints.sort((a, b) => a.yRaw - b.yRaw);
    const minSpacing = 22;
    for (let i = 1; i < activePoints.length; i++) {
      if (activePoints[i].yLabel - activePoints[i - 1].yLabel < minSpacing) {
        activePoints[i].yLabel = activePoints[i - 1].yLabel + minSpacing;
      }
    }
    // Backward pass to prevent overflow beyond bottom
    for (let i = activePoints.length - 2; i >= 0; i--) {
      if (activePoints[i + 1].yLabel - activePoints[i].yLabel < minSpacing) {
        activePoints[i].yLabel = activePoints[i + 1].yLabel - minSpacing;
      }
    }

    // Render points and anti-collision pill badges
    activePoints.forEach(pt => {
      const isInspected = (inspectedGene === pt.rep.symbol);
      const textX = isCloseToRightEdge ? xPatient - 14 : xPatient + 14;
      const pillX = isCloseToRightEdge ? xPatient - 95 : xPatient + 8;
      const textAnchor = isCloseToRightEdge ? 'end' : 'start';

      // Dashed connector between Patient observed value and trajectory baseline curve
      svgContent += `
        <line x1="${xPatient}" y1="${pt.yRaw}" x2="${xPatient}" y2="${pt.yExpected}" 
              stroke="${pt.rep.color}" stroke-width="1.2" stroke-dasharray="2 2" stroke-opacity="0.65" />
      `;

      // Leader line connecting diamond to relaxed label pill if shifted
      if (Math.abs(pt.yLabel - pt.yRaw) > 2) {
        svgContent += `
          <line x1="${xPatient + (isCloseToRightEdge ? -6 : 6)}" y1="${pt.yRaw}" 
                x2="${isCloseToRightEdge ? pillX + 85 : pillX}" y2="${pt.yLabel}" 
                stroke="${pt.rep.color}" stroke-width="1" stroke-opacity="0.5" />
        `;
      }

      // Glowing Diamond Patient Marker
      svgContent += `
        <g class="patient-obs-marker" style="cursor: pointer;" onclick="window.selectInspectorGene('${pt.rep.symbol}')">
          <polygon points="${xPatient},${pt.yRaw - 6.5} ${xPatient + 6.5},${pt.yRaw} ${xPatient},${pt.yRaw + 6.5} ${xPatient - 6.5},${pt.yRaw}" 
                   fill="${pt.rep.color}" stroke="#ffffff" stroke-width="${isInspected ? '2.5' : '1.8'}" filter="url(#clonePatientGlow)">
            <title>${pt.rep.symbol}: Observed Biopsy = ${pt.val > 0 ? '+' : ''}${pt.val.toFixed(2)} log2FC (Baseline: ${pt.expectedVal > 0 ? '+' : ''}${pt.expectedVal.toFixed(2)} log2FC) — Click to Inspect</title>
          </polygon>

          <!-- Collision-Free Backdrop Capsule Pill for 100% Readability -->
          <rect x="${pillX}" y="${pt.yLabel - 10}" width="92" height="19" rx="4" 
                fill="rgba(15, 23, 42, 0.95)" stroke="${pt.rep.color}" stroke-width="${isInspected ? '2' : '1'}" />

          <text x="${isCloseToRightEdge ? pillX + 84 : pillX + 8}" y="${pt.yLabel + 3.5}" 
                font-size="10" font-weight="700" font-family="JetBrains Mono" fill="#ffffff" text-anchor="${textAnchor}">
            ${pt.rep.symbol}: ${pt.val > 0 ? '+' : ''}${pt.val.toFixed(1)}
          </text>
        </g>
      `;
    });
  }

  svg.innerHTML = svgContent;

  // Tooltip integration for patient markers and trajectory nodes
  const tooltip = document.getElementById('trajectoryTooltip');
  const chartWrapper = svg.parentElement;

  if (tooltip && chartWrapper) {
    const showTooltip = (e, htmlContent) => {
      tooltip.innerHTML = htmlContent;
      tooltip.style.display = 'block';
      const wrapperRect = chartWrapper.getBoundingClientRect();
      let left = e.clientX - wrapperRect.left + 15;
      let top = e.clientY - wrapperRect.top - 10;
      if (left + 260 > wrapperRect.width) {
        left = e.clientX - wrapperRect.left - 270;
      }
      tooltip.style.left = `${Math.max(10, left)}px`;
      tooltip.style.top = `${Math.max(10, top)}px`;
    };

    const hideTooltip = () => {
      tooltip.style.display = 'none';
    };

    svg.querySelectorAll('.patient-obs-marker').forEach(el => {
      el.addEventListener('mouseenter', (e) => {
        const titleEl = el.querySelector('title');
        const text = titleEl ? titleEl.textContent : '';
        showTooltip(e, `<div style="font-weight: 800; color: #38bdf8; margin-bottom: 3px;">Patient Biopsy Diamond</div><div>${text}</div>`);
      });
      el.addEventListener('mousemove', (e) => {
        const wrapperRect = chartWrapper.getBoundingClientRect();
        let left = e.clientX - wrapperRect.left + 15;
        let top = e.clientY - wrapperRect.top - 10;
        if (left + 260 > wrapperRect.width) {
          left = e.clientX - wrapperRect.left - 270;
        }
        tooltip.style.left = `${Math.max(10, left)}px`;
        tooltip.style.top = `${Math.max(10, top)}px`;
      });
      el.addEventListener('mouseleave', hideTooltip);
    });

    svg.querySelectorAll('circle').forEach(circle => {
      circle.addEventListener('mouseenter', (e) => {
        const titleEl = circle.querySelector('title');
        if (!titleEl) return;
        showTooltip(e, `<div style="font-weight: 700; color: #fff; margin-bottom: 2px;">Cohort Trajectory Point</div><div>${titleEl.textContent}</div>`);
      });
      circle.addEventListener('mousemove', (e) => {
        const wrapperRect = chartWrapper.getBoundingClientRect();
        let left = e.clientX - wrapperRect.left + 15;
        let top = e.clientY - wrapperRect.top - 10;
        if (left + 260 > wrapperRect.width) {
          left = e.clientX - wrapperRect.left - 270;
        }
        tooltip.style.left = `${Math.max(10, left)}px`;
        tooltip.style.top = `${Math.max(10, top)}px`;
      });
      circle.addEventListener('mouseleave', hideTooltip);
    });
  }
}

function renderProgressionResults(res) {
  // 1. Continuum Coordinate & State Display
  const posDisplay = document.getElementById('continuumPosDisplay');
  if (posDisplay) posDisplay.textContent = `${res.trajectoryPosition.toFixed(1)} / 5.0`;

  const stateDisplay = document.getElementById('continuumStateDisplay');
  if (stateDisplay) stateDisplay.textContent = `(${res.estimatedBiologicalState})`;

  const mlStatePill = document.getElementById('mlStateVal');
  if (mlStatePill) {
    mlStatePill.textContent = `Stage ${res.trajectoryPosition.toFixed(1)} (${res.estimatedBiologicalState})`;
  }

  // 2. Animate Continuum Track Marker
  const marker = document.getElementById('continuumMarker');
  if (marker) {
    // Map position (1.0 - 5.0) to percentage (4% to 96%)
    const pct = Math.max(4, Math.min(96, ((res.trajectoryPosition - 1.0) / 4.0) * 100));
    marker.style.left = `${pct}%`;
  }

  // 3. Transition Window Alert Callout
  const alertBox = document.getElementById('transitionAlertBox');
  if (alertBox) {
    alertBox.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22" style="flex-shrink:0;">
        ${res.isPreMalignantTransitionWindow 
          ? '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
          : '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'}
      </svg>
      <div>${res.transitionAlert}</div>
    `;
    alertBox.className = `transition-alert-box ${res.isPreMalignantTransitionWindow ? '' : (res.trajectoryPosition > 4.6 ? 'danger' : 'safe')}`;
  }

  // 4. Update Stepper Card Active States & Concordance Pills
  if (res.stageSimilarities) {
    res.stageSimilarities.forEach(s => {
      const card = document.getElementById(`stepCard_${s.stageNumber}`);
      const pill = document.getElementById(`stepPill_${s.stageNumber}`);
      if (pill) pill.textContent = `Concordance: ${s.concordance}%`;
      if (card) {
        if (s.stageNumber === res.primaryStageNumber) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      }
    });
  }

  // 5. Render Active Biological Hallmarks
  const hallmarksContainer = document.getElementById('hallmarksContainer');
  if (hallmarksContainer) {
    if (res.activatedHallmarks && res.activatedHallmarks.length > 0) {
      hallmarksContainer.innerHTML = res.activatedHallmarks.map(h => `
        <div class="hallmark-card">
          <span class="hallmark-badge ${h.severity.toLowerCase().includes('critical') || h.severity.includes('MALIGNANT') ? 'critical' : 'high'}">
            ${h.severity}
          </span>
          <div class="hallmark-name">${h.hallmark}</div>
          <div class="hallmark-mech">${h.mechanism}</div>
        </div>
      `).join('');
    } else {
      hallmarksContainer.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 1rem; color: var(--text-muted); font-size: 0.8125rem;">
          No pathological hallmark thresholds activated in the provided expression vector.
        </div>
      `;
    }
  }

  // 6. Update Progressive Molecular Gene Expression Significance Stats Bar
  updateProgressionStatsBars(lastPatientProfile, lastMLResult, cachedTrajectoryData?.trajectoryMatrix);
}

/* ==========================================================================
   Tab 2: Biopsy Cohorts (7 Datasets) View
   ========================================================================== */
async function initDatasetsView() {
  const container = document.getElementById('datasetsGrid');
  if (!container) return;

  try {
    const res = await fetch('/api/datasets');
    const data = await res.json();
    if (!data.success || !data.datasets) return;

    container.innerHTML = data.datasets.map(d => `
      <div class="dataset-card">
        <div>
          <div class="dataset-header">
            <span class="dataset-accession">${d.accession}</span>
            <span class="platform-badge">${d.platform ? d.platform.split(' ')[0] : 'Microarray'}</span>
          </div>
          <h3 class="dataset-title" style="margin-top: 0.75rem;">${d.title}</h3>
          <p class="dataset-desc" style="margin-top: 0.5rem;">${d.description || ''}</p>
        </div>
        <div>
          <div class="dataset-meta-row">
            <span class="stage-tag">${d.diseaseStage}</span>
            <span style="font-family: var(--font-mono); font-weight: 700; color: #38bdf8;">${(d.totalRecords || 0).toLocaleString()} Records</span>
          </div>
          <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">
            Comparisons: ${d.comparisons ? d.comparisons.map(c => c.name).join(', ') : 'Standard'}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error fetching datasets:', err);
  }
}

/* ==========================================================================
   Tab 3: Gene Expression Profiler
   ========================================================================== */
function initGeneSearch() {
  const searchBtn = document.getElementById('geneSearchBtn');
  const searchInput = document.getElementById('geneSearchInput');

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => searchGene(searchInput.value));
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchGene(searchInput.value);
    });
    // Initial search
    searchGene('SPINK1');
  }
}

async function searchGene(symbol) {
  if (!symbol) return;
  const container = document.getElementById('geneProfileResult');
  if (!container) return;

  container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading profile for ${symbol}...</div>`;

  try {
    const res = await fetch(`/api/genes/profile/${encodeURIComponent(symbol.toUpperCase().trim())}`);
    const data = await res.json();

    if (!data.success || !data.gene) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No differentially expressed records found for gene <strong>${symbol}</strong> in the biopsy database.
        </div>
      `;
      return;
    }

    const g = data.gene;
    container.innerHTML = `
      <div class="gene-summary-card">
        <div class="gene-details">
          <h3>${g.symbol}</h3>
          <p>${g.title || 'Human Protein-Coding Gene'}</p>
        </div>
        <div style="display: flex; gap: 1.5rem;">
          <div class="stat-pill">
            <span class="val" style="color: var(--accent-cyan);">${g.datasetsDetectedIn?.length || 0}</span>
            <span class="lbl">Datasets</span>
          </div>
          <div class="stat-pill">
            <span class="val" style="color: #fb7185;">${(g.maxAbsLog2FC || 0).toFixed(2)}</span>
            <span class="lbl">Max |Log2FC|</span>
          </div>
          <div class="stat-pill">
            <span class="val">${g.occurrences?.length || 0}</span>
            <span class="lbl">Total Occurrences</span>
          </div>
        </div>
      </div>

      <div class="occurrences-table-wrapper" style="margin-top: 1rem;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Dataset</th>
              <th>Comparison / Sheet</th>
              <th>Stage Category</th>
              <th>Probe ID</th>
              <th>Log2FC</th>
              <th>P-Value</th>
              <th>Regulation</th>
            </tr>
          </thead>
          <tbody>
            ${(g.occurrences || []).map(occ => `
              <tr>
                <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan);">${occ.dataset}</td>
                <td>${occ.sheet}</td>
                <td><span style="font-weight: 600; color: #fbbf24;">${occ.stage}</span></td>
                <td style="font-family: var(--font-mono); font-size: 0.75rem;">${occ.probeId}</td>
                <td style="font-family: var(--font-mono); font-weight: 700; color: ${occ.log2FoldChange > 0 ? '#fda4af' : '#6ee7b7'};">
                  ${occ.log2FoldChange > 0 ? '+' : ''}${occ.log2FoldChange.toFixed(2)}
                </td>
                <td style="font-family: var(--font-mono);">${occ.pValue ? occ.pValue.toExponential(2) : 'N/A'}</td>
                <td>
                  <span class="reg-badge ${occ.regulation === 'UPREGULATED' ? 'up' : 'down'}">
                    ${occ.regulation}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error('Error fetching gene profile:', err);
    container.innerHTML = `<div style="color: #f43f5e; padding: 1rem;">Failed to load gene profile.</div>`;
  }
}

/* ==========================================================================
   Tab 4: Metabolic Pathways View
   ========================================================================== */
async function initPathwaysView() {
  const container = document.getElementById('pathwaysGrid');
  if (!container) return;

  try {
    const res = await fetch('/api/pathways');
    const data = await res.json();
    if (!data.success || !data.pathways) return;

    container.innerHTML = data.pathways.map(p => `
      <div class="pathway-card">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 0.6875rem; font-family: var(--font-mono); color: var(--accent-cyan);">${p.id}</span>
          <span style="font-size: 0.6875rem; color: var(--text-muted);">${p.category || 'Metabolism'}</span>
        </div>
        <h4>${p.name}</h4>
        <p style="font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.4;">${p.description || ''}</p>
        <div style="margin-top: 0.5rem;">
          <div style="font-size: 0.6875rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.25rem;">
            Pathway Member Genes (${p.genes ? p.genes.length : 0})
          </div>
          <div class="pathway-genes-preview">
            ${(p.genes || []).slice(0, 8).map(g => `<span class="p-gene">${g}</span>`).join('')}
            ${p.genes && p.genes.length > 8 ? `<span class="p-gene">+${p.genes.length - 8} more</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error fetching pathways:', err);
  }
}

/* ==========================================================================
   Tab 5: ML Console & Retraining
   ========================================================================== */
async function initMLConsole() {
  loadModelInfo();

  const retrainForm = document.getElementById('retrainForm');
  if (retrainForm) {
    retrainForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const epochs = parseInt(document.getElementById('inputEpochs').value, 10);
      const learningRate = parseFloat(document.getElementById('inputLearningRate').value);
      const lambda = parseFloat(document.getElementById('inputLambda').value);

      const retrainBtn = document.getElementById('retrainBtn');
      retrainBtn.textContent = 'Retraining Model...';

      try {
        const res = await fetch('/api/ml/train', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ epochs, learningRate, lambda })
        });

        const data = await res.json();
        if (data.success && data.metrics) {
          const out = document.getElementById('retrainMetricsOutput');
          out.style.display = 'block';
          out.innerHTML = `
            <strong>Retraining Complete!</strong><br>
            Accuracy: ${(data.metrics.accuracy * 100).toFixed(1)}% | 
            Sensitivity: ${(data.metrics.sensitivity * 100).toFixed(1)}% | 
            Specificity: ${(data.metrics.specificity * 100).toFixed(1)}% | 
            AUC-ROC: ${data.metrics.aucRoc}
          `;
          loadModelInfo();
        }
      } catch (err) {
        console.error('Retrain error:', err);
        alert('Retrain failed: ' + err.message);
      } finally {
        retrainBtn.textContent = 'Retrain Model Now';
      }
    });
  }
}

async function loadModelInfo() {
  try {
    const res = await fetch('/api/ml/model-info');
    const data = await res.json();
    if (!data.success || !data.model) return;

    const m = data.model;
    const tbody = document.querySelector('#weightsTable tbody');
    if (tbody && m.trainingMetrics && m.trainingMetrics.featureWeights) {
      tbody.innerHTML = m.trainingMetrics.featureWeights.map(fw => `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--text-primary);">${fw.feature}</td>
          <td>
            <span class="reg-badge ${fw.directionInHCC === 'UPREGULATED' ? 'up' : 'down'}">
              ${fw.directionInHCC}
            </span>
          </td>
          <td style="font-family: var(--font-mono); font-weight: 700; color: ${fw.weight > 0 ? '#fda4af' : '#6ee7b7'};">
            ${fw.weight > 0 ? '+' : ''}${fw.weight.toFixed(3)}
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading model info:', err);
  }
}

/* ==========================================================================
   Google Gemini AI Clinical Reasoning & Copilot Handlers
   ========================================================================== */
function renderMarkdownText(text) {
  if (!text) return '';
  return text
    .replace(/^### (.*?)$/gm, '<h4>$1</h4>')
    .replace(/^## (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^# (.*?)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^(\d+)\.\s+(.*?)$/gm, '<li><strong>$1.</strong> $2</li>')
    .replace(/^-\s+(.*?)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '<br><br>');
}

async function fetchGeminiInterpretation(profile, mlRes, progRes) {
  const shimmer = document.getElementById('geminiLoadingShimmer');
  const bodyText = document.getElementById('geminiBodyText');
  if (!bodyText) return;

  if (shimmer) shimmer.style.display = 'flex';
  bodyText.style.opacity = '0.4';

  try {
    const res = await fetch('/api/gemini/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expressionProfile: profile || lastPatientProfile || {},
        mlResult: mlRes || lastMLResult || {},
        progression: progRes || lastProgResult || {}
      })
    });
    const data = await res.json();
    if (data.success && data.interpretation) {
      bodyText.innerHTML = renderMarkdownText(data.interpretation);
    } else {
      bodyText.textContent = data.error || 'Gemini reasoning currently unavailable.';
    }
  } catch (err) {
    console.error('Gemini interpretation error:', err);
    bodyText.textContent = 'Unable to connect to Gemini API.';
  } finally {
    if (shimmer) shimmer.style.display = 'none';
    bodyText.style.opacity = '1';
  }
}

async function askGeminiQuestion(q) {
  if (!q || !q.trim()) return;
  const shimmer = document.getElementById('geminiLoadingShimmer');
  const bodyText = document.getElementById('geminiBodyText');
  const input = document.getElementById('geminiQuestionInput');

  if (shimmer) shimmer.style.display = 'flex';
  if (bodyText) bodyText.style.opacity = '0.4';

  try {
    const res = await fetch('/api/gemini/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: q,
        expressionProfile: lastPatientProfile || {},
        mlResult: lastMLResult || {},
        progression: lastProgResult || {}
      })
    });
    const data = await res.json();
    if (data.success && data.answer) {
      bodyText.innerHTML = `
        <div style="padding-bottom: 0.4rem; margin-bottom: 0.5rem; border-bottom: 1px solid rgba(168, 85, 247, 0.3); font-weight: 700; color: #d8b4fe;">
          💬 Question: ${q}
        </div>
        ${renderMarkdownText(data.answer)}
      `;
    } else {
      bodyText.textContent = data.error || 'Failed to get response from Gemini.';
    }
  } catch (err) {
    console.error('Gemini Q&A error:', err);
    bodyText.textContent = 'Unable to reach Gemini service.';
  } finally {
    if (shimmer) shimmer.style.display = 'none';
    if (bodyText) bodyText.style.opacity = '1';
    if (input) input.value = '';
  }
}

function initGeminiCopilot() {
  const refreshBtn = document.getElementById('btnRefreshGemini');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (lastPatientProfile && lastMLResult) {
        fetchGeminiInterpretation(lastPatientProfile, lastMLResult, lastProgResult);
      }
    });
  }

  const askBtn = document.getElementById('btnAskGemini');
  const input = document.getElementById('geminiQuestionInput');
  if (askBtn && input) {
    askBtn.addEventListener('click', () => askGeminiQuestion(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') askGeminiQuestion(input.value);
    });
  }

  document.querySelectorAll('.gemini-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-q');
      if (input) input.value = q;
      askGeminiQuestion(q);
    });
  });
}

