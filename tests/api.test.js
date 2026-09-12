import assert from 'assert';
import { startServer } from '../src/server.js';
import { geneMappingService } from '../src/services/geneMappingService.js';
import { pathwayService } from '../src/services/pathwayService.js';
import { biomarkerService } from '../src/services/biomarkerService.js';
import { dataIngestionService } from '../src/services/dataIngestionService.js';

async function runTests() {
  console.log('\n--- STARTING COMPREHENSIVE BACKEND VERIFICATION TESTS ---');
  const TEST_PORT = 5099;
  const { server } = await startServer(TEST_PORT);
  const BASE_URL = `http://localhost:${TEST_PORT}`;

  try {
    // 1. Verify Data Ingestion
    console.log('\n[TEST 1] Verifying Data Ingestion across all 7 biopsy datasets...');
    assert.strictEqual(dataIngestionService.isLoaded, true, 'Data ingestion flag should be true');
    assert.strictEqual(dataIngestionService.datasets.size, 7, 'All 7 datasets must be successfully ingested');
    assert.ok(dataIngestionService.degDatabase.length > 5000, `Total DEG records (${dataIngestionService.degDatabase.length}) should be > 5000`);
    assert.ok(dataIngestionService.geneSummary.size > 1000, `Total cataloged genes (${dataIngestionService.geneSummary.size}) should be > 1000`);
    console.log(`✓ Data Ingestion Passed: ${dataIngestionService.degDatabase.length} records parsed from 7 datasets.`);

    // 2. Verify Gene Mapping Service
    console.log('\n[TEST 2] Verifying Gene Mapping Engine...');
    const mappedSPINK1 = geneMappingService.mapProbe('206239_s_at');
    assert.strictEqual(mappedSPINK1.symbol, 'SPINK1', 'Probe 206239_s_at should map to SPINK1');
    const mappedGPC3 = geneMappingService.mapProbe('208470_s_at');
    assert.strictEqual(mappedGPC3.symbol, 'GPC3', 'Probe 208470_s_at should map to GPC3');
    const searchRes = geneMappingService.searchGenes('MGMT');
    assert.ok(searchRes.length > 0, 'Should find MGMT gene in search');
    console.log(`✓ Gene Mapping Engine Passed: Probes mapped successfully with HGNC symbols.`);

    // 3. Verify Metabolic Pathway Enrichment
    console.log('\n[TEST 3] Verifying Metabolic Pathway Over-Representation Analysis (ORA)...');
    const testDegs = [
      { symbol: 'HK2', log2FC: 2.5 },
      { symbol: 'PKM', log2FC: 3.1 },
      { symbol: 'LDHA', log2FC: 2.8 },
      { symbol: 'ENO1', log2FC: 1.9 },
      { symbol: 'GAPDH', log2FC: 2.2 },
      { symbol: 'PCK1', log2FC: -2.7 },
      { symbol: 'G6PC', log2FC: -3.0 }
    ];
    const enrichment = pathwayService.runEnrichment(testDegs);
    assert.ok(enrichment.enrichedPathways.length > 0, 'Should enrich metabolic pathways');
    const topPathway = enrichment.enrichedPathways[0];
    assert.strictEqual(topPathway.pathwayId, 'hsa00010', 'Top pathway should be Glycolysis / Gluconeogenesis');
    assert.ok(topPathway.pValue < 0.001, `P-value (${topPathway.pValue}) should be highly significant (< 0.001)`);
    assert.ok(topPathway.foldEnrichment > 5, 'Fold enrichment should be > 5x');
    console.log(`✓ Pathway Enrichment Passed: Detected '${topPathway.pathwayName}' with p-value ${topPathway.pValue.toExponential(3)}, Fold Enrichment: ${topPathway.foldEnrichment}x.`);

    // 4. Verify Biomarker Risk Scorer
    console.log('\n[TEST 4] Verifying Early Cancer Biomarker Classifier & Risk Scorer...');
    const patientMalignantProfile = {
      SPINK1: 5.8,
      GPC3: 4.2,
      MGMT: -2.1,
      CYP2E1: -3.5,
      PCK1: -2.4,
      GNMT: -1.9
    };
    const riskResult = biomarkerService.calculateEarlyCancerRisk(patientMalignantProfile);
    assert.ok(riskResult.riskScorePercentage >= 81, `High signal score expected >= 81% (got ${riskResult.riskScorePercentage}%)`);
    assert.strictEqual(riskResult.signalTier, 'HIGH SIGNAL', 'Signal tier should be HIGH SIGNAL');
    assert.strictEqual(riskResult.tierDescription, 'Strong molecular similarity to the learned progression-associated signature');
    console.log(`✓ Biomarker Risk Scorer Passed: Computed Score ${riskResult.riskScorePercentage}%, Tier: ${riskResult.signalTier} (${riskResult.tierRange}).`);

    // 5. Test Live HTTP REST Endpoints
    console.log('\n[TEST 5] Testing HTTP REST API Endpoints & Frontend Static Delivery...');
    
    // GET / (Frontend Dashboard)
    const frontendRes = await fetch(`${BASE_URL}/`);
    assert.strictEqual(frontendRes.status, 200, 'Frontend root index.html must return 200 OK');
    const frontendHtml = await frontendRes.text();
    assert.ok(frontendHtml.includes('HEPATOGUARD'), 'Frontend must serve the HepatoGuard application HTML');
    console.log('✓ Frontend Static Delivery Passed: index.html served at root URL.');

    // /api/health
    const healthRes = await fetch(`${BASE_URL}/api/health`).then(r => r.json());
    assert.strictEqual(healthRes.status, 'HEALTHY', 'Health check must be HEALTHY');
    
    // /api/datasets
    const datasetsRes = await fetch(`${BASE_URL}/api/datasets`).then(r => r.json());
    assert.strictEqual(datasetsRes.success, true);
    assert.strictEqual(datasetsRes.totalDatasets, 7);

    // /api/genes query
    const genesRes = await fetch(`${BASE_URL}/api/genes?symbol=SPINK1`).then(r => r.json());
    assert.strictEqual(genesRes.success, true);
    assert.ok(genesRes.total > 0, 'Should find SPINK1 DEG records');

    // /api/pathways
    const pathwaysRes = await fetch(`${BASE_URL}/api/pathways`).then(r => r.json());
    assert.strictEqual(pathwaysRes.success, true);
    assert.ok(pathwaysRes.count >= 10, 'Should return at least 10 liver metabolic pathways');

    // /api/biomarkers/tiers
    const tiersRes = await fetch(`${BASE_URL}/api/biomarkers/tiers`).then(r => r.json());
    assert.strictEqual(tiersRes.success, true);
    assert.strictEqual(tiersRes.count, 5, 'Should return exactly 5 progression tiers');
    assert.strictEqual(tiersRes.tiers[0].tier, 'LOWER SIGNAL');
    assert.strictEqual(tiersRes.tiers[4].tier, 'HIGH SIGNAL');

    // /api/biomarkers/early-detection
    const biomarkersRes = await fetch(`${BASE_URL}/api/biomarkers/early-detection`).then(r => r.json());
    assert.strictEqual(biomarkersRes.success, true);
    assert.ok(biomarkersRes.canonicalPanel.length >= 7, 'Canonical panel should have key markers');

    // POST /api/biomarkers/score
    const scoreHttpRes = await fetch(`${BASE_URL}/api/biomarkers/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expressionProfile: patientMalignantProfile })
    }).then(r => r.json());
    assert.strictEqual(scoreHttpRes.success, true);
    assert.strictEqual(scoreHttpRes.evaluation.signalTier, 'HIGH SIGNAL');
    assert.strictEqual(scoreHttpRes.evaluation.tierRange, '81–100');

    // POST /api/biomarkers/actionable-targets
    const targetHttpRes = await fetch(`${BASE_URL}/api/biomarkers/actionable-targets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expressionProfile: patientMalignantProfile,
        trajectoryPosition: 4.8,
        isMalignant: true,
        riskScore: 92.5
      })
    }).then(r => r.json());
    assert.strictEqual(targetHttpRes.success, true);
    assert.strictEqual(targetHttpRes.curativeWindow.status, 'CURATIVE_INTENT_INTERVENTION');
    assert.ok(targetHttpRes.actionableTargets.length >= 3, 'Should identify actionable targets');
    console.log(`✓ Actionable Targets Verified: Identified ${targetHttpRes.totalActionableTargets} precision targets, Curative Window: ${targetHttpRes.curativeWindow.headline}`);

    // 6. Verify Machine Learning Classifier Service & REST Endpoints
    console.log('\n[TEST 6] Verifying Machine Learning Classifier Engine & REST Endpoints...');
    const modelInfo = await fetch(`${BASE_URL}/api/ml/model-info`).then(r => r.json());
    assert.strictEqual(modelInfo.success, true);
    assert.strictEqual(modelInfo.model.isTrained, true, 'Model must be trained on server startup');
    assert.ok(modelInfo.model.featuresCount >= 10, 'Model should have at least 10 key features');
    assert.ok(modelInfo.model.trainingMetrics.accuracy >= 0.80, `Model accuracy should be >= 80% (got ${modelInfo.model.trainingMetrics.accuracy})`);
    assert.ok(modelInfo.model.trainingMetrics.aucRoc >= 0.80, `AUC-ROC should be >= 0.80 (got ${modelInfo.model.trainingMetrics.aucRoc})`);
    console.log(`✓ ML Model Info Verified: ${modelInfo.model.algorithm}, Accuracy: ${(modelInfo.model.trainingMetrics.accuracy * 100).toFixed(1)}%, AUC-ROC: ${modelInfo.model.trainingMetrics.aucRoc}`);

    // Test Malignant Biopsy Prediction via ML
    const mlMalignantRes = await fetch(`${BASE_URL}/api/ml/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expressionProfile: {
          SPINK1: 5.5,
          GPC3: 4.5,
          AFP: 3.8,
          MGMT: -2.3,
          PCK1: -3.1,
          CYP2E1: -3.5,
          GNMT: -2.8,
          SERPINB3: 3.2,
          AKR1B10: 4.1
        }
      })
    }).then(r => r.json());
    assert.strictEqual(mlMalignantRes.success, true);
    assert.strictEqual(mlMalignantRes.prediction, 'EARLY_HCC', 'Malignant biopsy profile must be predicted as EARLY_HCC');
    assert.ok(mlMalignantRes.cancerProbability >= 0.80, `Malignant probability should be >= 0.80 (got ${mlMalignantRes.cancerProbability})`);
    assert.ok(mlMalignantRes.featureContributions.length > 0, 'Should return explainable feature contributions');
    console.log(`✓ ML Malignant Prediction Passed: ${mlMalignantRes.prediction} (Probability: ${(mlMalignantRes.cancerProbability * 100).toFixed(1)}%, Signal: ${mlMalignantRes.signalTier})`);

    // Test Benign/Control Biopsy Prediction via ML
    const mlBenignRes = await fetch(`${BASE_URL}/api/ml/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expressionProfile: {
          SPINK1: 0.1,
          GPC3: -0.2,
          AFP: 0.0,
          MGMT: 0.2,
          PCK1: 0.4,
          CYP2E1: 0.6,
          GNMT: 0.3,
          SERPINB3: 0.1
        }
      })
    }).then(r => r.json());
    assert.strictEqual(mlBenignRes.success, true);
    assert.strictEqual(mlBenignRes.prediction, 'BENIGN_PREMALIGNANT', 'Normal/control biopsy must be predicted as BENIGN_PREMALIGNANT');
    assert.ok(mlBenignRes.cancerProbability < 0.35, `Benign probability should be < 0.35 (got ${mlBenignRes.cancerProbability})`);
    console.log(`✓ ML Benign Prediction Passed: ${mlBenignRes.prediction} (Probability: ${(mlBenignRes.cancerProbability * 100).toFixed(1)}%, Signal: ${mlBenignRes.signalTier})`);

    // Test On-Demand Retraining Endpoint
    const trainRes = await fetch(`${BASE_URL}/api/ml/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ epochs: 100, learningRate: 0.05, lambda: 0.01 })
    }).then(r => r.json());
    assert.strictEqual(trainRes.success, true);
    assert.ok(trainRes.metrics.accuracy >= 0.80);
    console.log(`✓ ML Retraining Endpoint Passed: Retrained model with Accuracy: ${(trainRes.metrics.accuracy * 100).toFixed(1)}%`);

    // 7. Verify Biological Disease Progression & Trajectory Engine
    console.log('\n[TEST 7] Verifying Biological Progression & State Trajectory Engine...');
    const trajRes = await fetch(`${BASE_URL}/api/progression/trajectory`).then(r => r.json());
    assert.strictEqual(trajRes.success, true);
    assert.strictEqual(trajRes.stages.length, 5, 'Should have exactly 5 progression stages');
    assert.strictEqual(trajRes.stages[0].shortName, 'Healthy');
    assert.strictEqual(trajRes.stages[4].shortName, 'Early HCC');
    assert.ok(trajRes.trajectoryMatrix.length >= 10, 'Trajectory matrix should track key diagnostic genes');
    console.log(`✓ Progression Trajectory Verified: 5 stages mapped across ${trajRes.trajectoryMatrix.length} diagnostic drivers.`);

    // Test Alignment for Pre-Malignant Cirrhotic Transition Profile
    const cirrhoticProfile = {
      SPINK1: 2.9, GPC3: 2.2, AFP: 1.8, MGMT: -1.8, PCK1: -2.3,
      CYP2E1: -2.6, GNMT: -2.0, SERPINB3: 2.5, AKR1B10: 2.8
    };
    const alignCirrhosis = await fetch(`${BASE_URL}/api/progression/align`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expressionProfile: cirrhoticProfile })
    }).then(r => r.json());
    assert.strictEqual(alignCirrhosis.success, true);
    assert.strictEqual(alignCirrhosis.isPreMalignantTransitionWindow, true, 'Cirrhosis profile must trigger Pre-Malignant Transition Window flag');
    assert.ok(alignCirrhosis.trajectoryPosition >= 3.5 && alignCirrhosis.trajectoryPosition <= 4.6, `Coordinate should be between 3.5 and 4.6 (got ${alignCirrhosis.trajectoryPosition})`);
    assert.ok(alignCirrhosis.activatedHallmarks.length > 0, 'Should identify activated biological hallmarks');
    console.log(`✓ Pre-Malignant Cirrhosis Alignment Passed: Position ${alignCirrhosis.trajectoryPosition}, Transition Window: ${alignCirrhosis.isPreMalignantTransitionWindow}`);

    // Test Alignment for Early HCC Malignant Profile
    const alignHCC = await fetch(`${BASE_URL}/api/progression/align`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expressionProfile: patientMalignantProfile })
    }).then(r => r.json());
    assert.strictEqual(alignHCC.success, true);
    assert.strictEqual(alignHCC.estimatedBiologicalState, 'Early Hepatocellular Carcinoma');
    assert.ok(alignHCC.trajectoryPosition >= 4.0, `Early HCC position should be >= 4.0 (got ${alignHCC.trajectoryPosition})`);
    console.log(`✓ Early HCC Malignant Alignment Passed: Position ${alignHCC.trajectoryPosition} (${alignHCC.estimatedBiologicalState})`);

    // [TEST 8] Verifying Clinical Biopsy PDF Report Generation & Download...
    console.log('\n[TEST 8] Verifying Clinical Biopsy PDF Report Generation & Download...');
    const pdfRes = await fetch(`${BASE_URL}/api/reports/download-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'HEP-TEST-7788',
        expressionProfile: patientMalignantProfile
      })
    });
    assert.strictEqual(pdfRes.status, 200);
    assert.strictEqual(pdfRes.headers.get('content-type'), 'application/pdf');
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    assert.ok(pdfBuffer.length > 2000, `PDF size should be > 2KB (got ${pdfBuffer.length} bytes)`);
    assert.strictEqual(pdfBuffer.slice(0, 5).toString(), '%PDF-', 'Buffer must begin with standard PDF magic bytes (%PDF-)');
    console.log(`✓ Clinical Biopsy PDF Download Verified: Generated ${pdfBuffer.length} bytes valid vector PDF document.`);

    // [TEST 9] Verifying Gemini AI Clinical Reasoning & Oncology Copilot
    console.log('\n[TEST 9] Verifying Gemini AI Clinical Reasoning & Oncology Copilot...');
    const geminiRes = await fetch(`${BASE_URL}/api/gemini/interpret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expressionProfile: patientMalignantProfile,
        mlResult: { riskScorePercentage: 90.84, prediction: 'EARLY_HCC' },
        progression: { trajectoryPosition: 4.60, estimatedBiologicalState: 'Early Hepatocellular Carcinoma' }
      })
    }).then(r => r.json());
    assert.strictEqual(geminiRes.success, true);
    assert.ok(geminiRes.interpretation && geminiRes.interpretation.length > 50, 'Gemini should return clinical interpretation');
    console.log(`✓ Gemini AI Reasoning Passed: Generated ${geminiRes.interpretation.length} chars of oncology-grade narrative via ${geminiRes.modelUsed}.`);

    console.log('\n✓ All REST Endpoints, ML Engines, Biological Progression Trajectories, and PDF Reports verified successfully!');

    console.log('\n=======================================================');
    console.log(' ALL TESTS PASSED SUCCESSFULLY! BACKEND READY.        ');
    console.log('=======================================================\n');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
