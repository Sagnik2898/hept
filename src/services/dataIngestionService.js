import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import { CONFIG } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { geneMappingService } from './geneMappingService.js';

// Curated clinical synonyms for common hepatic oncology and metabolic drivers
const CLINICAL_SYNONYMS = {
  'P53': 'TP53BP1',
  'TP53': 'TP53BP1',
  'TP53I': 'TP53I3',
  'GPC-3': 'GPC3',
  'GLYPICAN-3': 'GPC3',
  'GLYPICAN3': 'GPC3',
  'GLYPICAN': 'GPC3',
  'PEPCK': 'PCK1',
  'PEPCK-C': 'PCK1',
  'PEPCKC': 'PCK1',
  'TATI': 'SPINK1',
  'SCCA-1': 'SERPINB3',
  'SCCA1': 'SERPINB3',
  'SCCA': 'SERPINB3',
  'NTCP': 'SLC10A1',
  'VEGF': 'VEGFC',
  'VEGFA': 'VEGFC',
  'BETA-CATENIN': 'CTNNA1',
  'BETACATENIN': 'CTNNA1',
  'CTNNB1': 'CTNNA1',
  'CTNN': 'CTNNA1',
  'IL-6': 'IL6ST',
  'IL6': 'IL6ST',
  'ALBUMIN': 'ALB',
  'ALPHA-FETOPROTEIN': 'AFP',
  'ALPHAFETOPROTEIN': 'AFP',
  'CYTOCHROME': 'CYP2E1',
  'CYTOCHROME P450': 'CYP2E1',
  'CYP': 'CYP2E1',
  'SPINK': 'SPINK1',
  'PCK': 'PCK1',
  'GPC': 'GPC3',
  'GNMT': 'GNMT',
  'SERPIN': 'SERPINB3',
  'AKR': 'AKR1B10',
  'TREH': 'TREH',
  'OPN': 'SPP1',
  'OSTEOPONTIN': 'SPP1',
  'SMA': 'ACTA2',
  'ALDO': 'ALDOA',
  'E2F': 'E2F3'
};

const TOP_DIAGNOSTIC_BIOMARKERS = [
  'SPINK1', 'GPC3', 'PCK1', 'CYP2E1', 'GNMT',
  'SERPINB3', 'AKR1B10', 'AFP', 'TREH', 'SPP1',
  'ACTA2', 'ALDOA', 'E2F3', 'ROBO1', 'MGMT'
];

class DataIngestionService {
  constructor() {
    this.datasets = new Map();
    this.degDatabase = [];
    this.geneSummary = new Map(); // symbol -> { datasets: Set, appearances: [], minLog2FC, maxLog2FC, ... }
    this.probeToGene = new Map(); // probeId (uppercase & raw) -> resolved primary symbol
    this.aliasToGene = new Map(); // composite part / alias -> resolved primary symbol
    this.isLoaded = false;
  }

  async loadAllDatasets() {
    if (this.isLoaded) return;
    logger.info('Starting ingestion of all liver biopsy DEG datasets...');
    const startTime = Date.now();

    for (const [filename, meta] of Object.entries(CONFIG.DATASET_METADATA)) {
      const filePath = path.join(CONFIG.DATA_DIR, filename);
      if (!fs.existsSync(filePath)) {
        logger.warn(`Dataset file not found: ${filePath}, skipping.`);
        continue;
      }

      try {
        const datasetData = this.processWorkbook(filePath, filename, meta);
        this.datasets.set(meta.accession, datasetData);
        logger.success(`Ingested ${meta.accession} (${filename}) - ${datasetData.totalRecords} total entries across ${datasetData.sheets.length} comparisons.`);
      } catch (err) {
        logger.error(`Failed to ingest ${filename}: ${err.message}`, err);
      }
    }

    this.isLoaded = true;
    logger.success(`Data ingestion complete in ${Date.now() - startTime}ms. Total DEG entries: ${this.degDatabase.length}, Unique Genes: ${this.geneSummary.size}.`);
  }

  processWorkbook(filePath, filename, meta) {
    const workbook = XLSX.readFile(filePath);
    const datasetInfo = {
      filename,
      accession: meta.accession,
      title: meta.title,
      tissue: meta.tissue,
      platform: meta.platform,
      diseaseStage: meta.diseaseStage,
      description: meta.description,
      sheets: [],
      totalRecords: 0
    };

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!rows || rows.length < 2) continue;

      const header = rows[0].map(h => String(h).trim());
      const colIndices = this.detectColumnIndices(header, filename);

      const stageCategory = this.classifyComparisonStage(sheetName, filename, meta);
      const sheetRecords = [];

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        const rawId = String(row[colIndices.idIdx] || '').trim();
        if (!rawId) continue;

        let rawSymbol = colIndices.symbolIdx >= 0 ? String(row[colIndices.symbolIdx] || '').trim() : '';
        let rawTitle = colIndices.titleIdx >= 0 ? String(row[colIndices.titleIdx] || '').trim() : '';
        
        let rawLog2FC = colIndices.log2fcIdx >= 0 ? parseFloat(row[colIndices.log2fcIdx]) : NaN;
        let rawPValCol = colIndices.pvalIdx >= 0 ? parseFloat(row[colIndices.pvalIdx]) : NaN;

        // Fallback detection for displaced columns (e.g. in 48452 or GSE46300)
        if (isNaN(rawLog2FC) && row.length > 2) {
          for (let c = 1; c < row.length; c++) {
            const num = parseFloat(row[c]);
            if (!isNaN(num)) {
              rawLog2FC = num;
              if (c + 1 < row.length && !isNaN(parseFloat(row[c + 1]))) {
                rawPValCol = parseFloat(row[c + 1]);
              }
              break;
            }
          }
        }

        if (isNaN(rawLog2FC)) continue;

        // Determine if rawPValCol is -log10(p-value) or raw p-value
        let pValue = 1.0;
        let minusLog10P = 0.0;
        if (!isNaN(rawPValCol)) {
          if (rawPValCol >= 0 && rawPValCol < 1.0) {
            // raw p-value
            pValue = rawPValCol;
            minusLog10P = pValue > 0 ? -Math.log10(pValue) : 300;
          } else {
            // value is -log10(P-value)
            minusLog10P = rawPValCol;
            pValue = Math.pow(10, -minusLog10P);
          }
        }

        // Register with GeneMappingService if symbol is provided
        if (rawSymbol && rawSymbol.length > 1 && !rawSymbol.startsWith('0.') && isNaN(Number(rawSymbol))) {
          geneMappingService.registerMapping(rawId, rawSymbol, rawTitle);
        }

        // Resolve mapped gene symbol
        const mapping = geneMappingService.mapProbe(rawId);
        const resolvedSymbol = (rawSymbol && !rawSymbol.startsWith('0.') && isNaN(Number(rawSymbol))) 
          ? rawSymbol.toUpperCase() 
          : mapping.symbol;
        const resolvedTitle = rawTitle || mapping.title || '';

        const regulation = rawLog2FC > 0 ? 'UPREGULATED' : (rawLog2FC < 0 ? 'DOWNREGULATED' : 'UNCHANGED');
        const isSignificant = Math.abs(rawLog2FC) >= CONFIG.DEFAULT_LOG2FC_THRESHOLD && pValue <= CONFIG.DEFAULT_PVAL_THRESHOLD;

        const record = {
          dataset: meta.accession,
          filename,
          sheet: sheetName,
          stage: stageCategory,
          probeId: rawId,
          geneSymbol: resolvedSymbol,
          geneTitle: resolvedTitle,
          log2FoldChange: Math.round(rawLog2FC * 1000) / 1000,
          pValue: pValue,
          minusLog10P: Math.round(minusLog10P * 100) / 100,
          regulation,
          isSignificant
        };

        sheetRecords.push(record);
        this.degDatabase.push(record);

        // Update Gene Summary index & lookup maps
        if (resolvedSymbol && !resolvedSymbol.startsWith('PROBE_')) {
          // 1. Probe to Gene Symbol Mapping
          if (rawId) {
            const rawClean = String(rawId).trim();
            this.probeToGene.set(rawClean.toUpperCase(), resolvedSymbol);
            this.probeToGene.set(rawClean, resolvedSymbol);
          }

          // 2. Composite Gene Symbol Tokenization (e.g., TMX2-CTNND1///CTNND1)
          const cleanResolved = resolvedSymbol.toUpperCase().trim();
          if (cleanResolved.includes('///') || cleanResolved.includes('/') || cleanResolved.includes(';')) {
            const parts = cleanResolved.split(/[\/\/,;]+/).map(p => p.trim()).filter(Boolean);
            for (const part of parts) {
              if (part && !this.aliasToGene.has(part)) {
                this.aliasToGene.set(part, resolvedSymbol);
              }
            }
          }

          // 3. Primary Gene Summary Index
          if (!this.geneSummary.has(resolvedSymbol)) {
            this.geneSummary.set(resolvedSymbol, {
              symbol: resolvedSymbol,
              title: resolvedTitle,
              probes: new Set([rawId]),
              datasets: new Set([meta.accession]),
              stages: new Set([stageCategory]),
              records: [record],
              maxAbsLog2FC: Math.abs(rawLog2FC)
            });
          } else {
            const entry = this.geneSummary.get(resolvedSymbol);
            entry.probes.add(rawId);
            entry.datasets.add(meta.accession);
            entry.stages.add(stageCategory);
            entry.records.push(record);
            if (Math.abs(rawLog2FC) > entry.maxAbsLog2FC) {
              entry.maxAbsLog2FC = Math.abs(rawLog2FC);
            }
            if (!entry.title && resolvedTitle) {
              entry.title = resolvedTitle;
            }
          }
        }
      }

      datasetInfo.sheets.push({
        name: sheetName,
        stage: stageCategory,
        recordCount: sheetRecords.length,
        upregulatedCount: sheetRecords.filter(r => r.regulation === 'UPREGULATED').length,
        downregulatedCount: sheetRecords.filter(r => r.regulation === 'DOWNREGULATED').length,
        significantCount: sheetRecords.filter(r => r.isSignificant).length
      });
      datasetInfo.totalRecords += sheetRecords.length;
    }

    return datasetInfo;
  }

  detectColumnIndices(header, filename) {
    let idIdx = 0;
    let symbolIdx = -1;
    let titleIdx = -1;
    let log2fcIdx = -1;
    let pvalIdx = -1;

    header.forEach((h, idx) => {
      const lower = h.toLowerCase();
      if (lower === 'id' || lower === 'probe' || lower === 'probe_id') idIdx = idx;
      else if (lower.includes('symbol')) symbolIdx = idx;
      else if (lower.includes('title') || lower.includes('description')) titleIdx = idx;
      else if (lower.includes('log2') || lower.includes('fold') || lower.includes('fc')) log2fcIdx = idx;
      else if (lower.includes('p-value') || lower.includes('pval') || lower.includes('#name?')) pvalIdx = idx;
    });

    // Special cases based on file layout
    if (filename === '89632_deg_list.xlsx') {
      idIdx = 0;
      log2fcIdx = 1;
      pvalIdx = 2;
    }

    return { idIdx, symbolIdx, titleIdx, log2fcIdx, pvalIdx };
  }

  classifyComparisonStage(sheetName, filename, meta) {
    const s = sheetName.toLowerCase();
    if (s.includes('hcc') || s.includes('tumor')) return 'HCC_MALIGNANCY';
    if (s.includes('mash') && (s.includes('con') || s.includes('healthy') || s.includes('control'))) return 'MASH_VS_CONTROL';
    if (s.includes('ss') && (s.includes('con') || s.includes('healthy') || s.includes('control'))) return 'STEATOSIS_VS_CONTROL';
    if (s.includes('mash') && s.includes('ss')) return 'MASH_VS_STEATOSIS';
    if (s.includes('lowss') || s.includes('highss')) return 'STEATOSIS_SEVERITY';
    if (s.includes('advanced') || s.includes('mild')) return 'FIBROSIS_PROGRESSION';
    if (meta.accession === 'GSE5093') return 'CIRRHOSIS_TRANSITION';
    return 'PRE_MALIGNANT_PROGRESSION';
  }

  getDatasetList() {
    return Array.from(this.datasets.values()).map(d => ({
      accession: d.accession,
      filename: d.filename,
      title: d.title,
      tissue: d.tissue,
      platform: d.platform,
      diseaseStage: d.diseaseStage,
      description: d.description,
      totalRecords: d.totalRecords,
      comparisons: d.sheets
    }));
  }

  getDatasetByAccession(accession) {
    return this.datasets.get(accession.toUpperCase()) || null;
  }

  queryGenes({ symbol, dataset, stage, regulation, minLog2FC, maxPVal, limit = 100, page = 1 }) {
    let results = this.degDatabase;

    if (symbol) {
      const sym = symbol.toUpperCase().trim();
      results = results.filter(r => r.geneSymbol.includes(sym));
    }
    if (dataset) {
      const ds = dataset.toUpperCase().trim();
      results = results.filter(r => r.dataset === ds);
    }
    if (stage) {
      results = results.filter(r => r.stage === stage);
    }
    if (regulation) {
      results = results.filter(r => r.regulation === regulation.toUpperCase());
    }
    if (minLog2FC !== undefined && !isNaN(minLog2FC)) {
      results = results.filter(r => Math.abs(r.log2FoldChange) >= parseFloat(minLog2FC));
    }
    if (maxPVal !== undefined && !isNaN(maxPVal)) {
      results = results.filter(r => r.pValue <= parseFloat(maxPVal));
    }

    const total = results.length;
    const startIndex = (page - 1) * limit;
    const paginated = results.slice(startIndex, startIndex + limit);

    return {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit),
      data: paginated
    };
  }

  getGeneProfile(symbol) {
    if (!symbol) return null;
    const rawClean = String(symbol).trim();
    if (!rawClean) return null;
    const clean = rawClean.toUpperCase();
    const stripped = clean.replace(/[-\s_]/g, '');

    let targetSymbol = null;
    let matchType = 'EXACT_SYMBOL';

    // 1. Direct match in geneSummary
    if (this.geneSummary.has(clean)) {
      targetSymbol = clean;
      matchType = 'EXACT_SYMBOL';
    } else if (this.geneSummary.has(stripped)) {
      targetSymbol = stripped;
      matchType = 'NORMALIZED_SYMBOL';
    }

    // 2. Probe ID lookup
    if (!targetSymbol) {
      if (this.probeToGene.has(clean)) {
        targetSymbol = this.probeToGene.get(clean);
        matchType = `PROBE_ID (${rawClean})`;
      } else if (this.probeToGene.has(rawClean)) {
        targetSymbol = this.probeToGene.get(rawClean);
        matchType = `PROBE_ID (${rawClean})`;
      }
    }

    // 3. Alias / multi-symbol composite lookup (e.g., CTNND1 in TMX2-CTNND1///CTNND1)
    if (!targetSymbol) {
      if (this.aliasToGene.has(clean)) {
        targetSymbol = this.aliasToGene.get(clean);
        matchType = `COMPOSITE_GENE (${clean})`;
      } else if (this.aliasToGene.has(stripped)) {
        targetSymbol = this.aliasToGene.get(stripped);
        matchType = `COMPOSITE_GENE (${clean})`;
      }
    }

    // 4. Clinical synonym lookup (e.g., P53, TP53, PEPCK, GPC-3, VEGF, SCCA-1, etc.)
    if (!targetSymbol) {
      if (CLINICAL_SYNONYMS[clean]) {
        targetSymbol = CLINICAL_SYNONYMS[clean];
        matchType = `CLINICAL_SYNONYM (${clean} → ${targetSymbol})`;
      } else if (CLINICAL_SYNONYMS[stripped]) {
        targetSymbol = CLINICAL_SYNONYMS[stripped];
        matchType = `CLINICAL_SYNONYM (${clean} → ${targetSymbol})`;
      }
    }

    // 5. Prefix / Substring / Title search
    let matchingVariants = [];
    if (!targetSymbol) {
      const candidates = [];

      for (const [sym, entry] of this.geneSummary.entries()) {
        let score = 0;
        const symUpper = sym.toUpperCase();
        const titleUpper = (entry.title || '').toUpperCase();

        if (symUpper === clean) score += 200;
        else if (symUpper.startsWith(clean)) score += 100 + (10 / (symUpper.length - clean.length + 1));
        else if (symUpper.includes(clean)) score += 50;
        else if (titleUpper.includes(clean)) score += 30;

        if (score > 0) {
          score += (entry.datasets.size * 10) + (entry.records.length * 2) + entry.maxAbsLog2FC;
          candidates.push({ symbol: sym, entry, score });
        }
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        targetSymbol = candidates[0].symbol;
        matchType = candidates[0].symbol.startsWith(clean) ? `PREFIX_MATCH (${clean})` : `SUBSTRING_MATCH (${clean})`;

        matchingVariants = candidates.slice(1, 9).map(c => {
          const isUp = c.entry.records.filter(r => r.regulation === 'UPREGULATED').length >=
                       c.entry.records.filter(r => r.regulation === 'DOWNREGULATED').length;
          return {
            symbol: c.symbol,
            title: c.entry.title || '',
            datasetCount: c.entry.datasets.size,
            recordCount: c.entry.records.length,
            maxAbsLog2FC: Math.round(c.entry.maxAbsLog2FC * 100) / 100,
            primaryDir: isUp ? 'UPREGULATED' : 'DOWNREGULATED'
          };
        });
      }
    }

    if (!targetSymbol || !this.geneSummary.has(targetSymbol)) {
      return null;
    }

    const entry = this.geneSummary.get(targetSymbol);
    return {
      symbol: entry.symbol,
      title: entry.title,
      uniqueProbes: Array.from(entry.probes),
      datasetsDetectedIn: Array.from(entry.datasets),
      stagesDetectedIn: Array.from(entry.stages),
      maxAbsLog2FC: entry.maxAbsLog2FC,
      occurrences: entry.records,
      matchedBy: matchType,
      searchQuery: rawClean,
      matchingVariants
    };
  }

  getSuggestedGenes(query = '', limit = 10) {
    const list = [];
    const seen = new Set();

    // Partial matches
    if (query && query.trim()) {
      const q = query.trim().toUpperCase();
      for (const [sym, entry] of this.geneSummary.entries()) {
        if (sym.includes(q) || (entry.title && entry.title.toUpperCase().includes(q))) {
          const isUp = entry.records.filter(r => r.regulation === 'UPREGULATED').length >=
                       entry.records.filter(r => r.regulation === 'DOWNREGULATED').length;
          list.push({
            symbol: sym,
            title: entry.title || '',
            datasetCount: entry.datasets.size,
            maxAbsLog2FC: Math.round(entry.maxAbsLog2FC * 100) / 100,
            primaryDir: isUp ? 'UP' : 'DOWN'
          });
          seen.add(sym);
        }
        if (list.length >= limit) break;
      }
    }

    // Top diagnostic biomarkers
    if (list.length < limit) {
      for (const sym of TOP_DIAGNOSTIC_BIOMARKERS) {
        if (!seen.has(sym) && this.geneSummary.has(sym)) {
          const entry = this.geneSummary.get(sym);
          const isUp = entry.records.filter(r => r.regulation === 'UPREGULATED').length >=
                       entry.records.filter(r => r.regulation === 'DOWNREGULATED').length;
          list.push({
            symbol: sym,
            title: entry.title || '',
            datasetCount: entry.datasets.size,
            maxAbsLog2FC: Math.round(entry.maxAbsLog2FC * 100) / 100,
            primaryDir: isUp ? 'UP' : 'DOWN'
          });
          seen.add(sym);
        }
        if (list.length >= limit) break;
      }
    }

    return list;
  }

  autocompleteGenes(query, limit = 8) {
    if (!query || !query.trim()) return [];
    const q = query.trim().toUpperCase();
    const results = [];
    const seen = new Set();

    // 1. Prefix matches on symbols
    for (const [sym, entry] of this.geneSummary.entries()) {
      if (sym.startsWith(q)) {
        const isUp = entry.records.filter(r => r.regulation === 'UPREGULATED').length >=
                     entry.records.filter(r => r.regulation === 'DOWNREGULATED').length;
        results.push({
          symbol: sym,
          title: entry.title || '',
          datasetCount: entry.datasets.size,
          maxAbsLog2FC: Math.round(entry.maxAbsLog2FC * 100) / 100,
          primaryDir: isUp ? 'UP' : 'DOWN',
          score: 100 + entry.datasets.size
        });
        seen.add(sym);
      }
    }

    // 2. Substring matches on symbols & titles
    if (results.length < limit) {
      for (const [sym, entry] of this.geneSummary.entries()) {
        if (!seen.has(sym) && (sym.includes(q) || (entry.title && entry.title.toUpperCase().includes(q)))) {
          const isUp = entry.records.filter(r => r.regulation === 'UPREGULATED').length >=
                       entry.records.filter(r => r.regulation === 'DOWNREGULATED').length;
          results.push({
            symbol: sym,
            title: entry.title || '',
            datasetCount: entry.datasets.size,
            maxAbsLog2FC: Math.round(entry.maxAbsLog2FC * 100) / 100,
            primaryDir: isUp ? 'UP' : 'DOWN',
            score: 50 + entry.datasets.size
          });
          seen.add(sym);
        }
        if (results.length >= limit * 2) break;
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  getGeneSummaryList(limit = 100, sortBy = 'recurrence') {
    const list = Array.from(this.geneSummary.values()).map(e => ({
      symbol: e.symbol,
      title: e.title,
      datasetCount: e.datasets.size,
      datasets: Array.from(e.datasets),
      stages: Array.from(e.stages),
      recordCount: e.records.length,
      maxAbsLog2FC: Math.round(e.maxAbsLog2FC * 1000) / 1000
    }));

    if (sortBy === 'foldchange') {
      list.sort((a, b) => b.maxAbsLog2FC - a.maxAbsLog2FC);
    } else {
      // default: recurrence across datasets & records
      list.sort((a, b) => b.datasetCount - a.datasetCount || b.recordCount - a.recordCount);
    }

    return list.slice(0, limit);
  }
}

export const dataIngestionService = new DataIngestionService();
