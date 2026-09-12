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
    console.log('\n[TEST 5] Testing HTTP REST API Endpoints...');
    
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

    console.log('✓ All REST Endpoints verified successfully!');

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
