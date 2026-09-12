import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hypergeometricCumulativePValue, calculateFDR } from '../utils/stats.js';
import { logger } from '../utils/logger.js';
import { dataIngestionService } from './dataIngestionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PathwayService {
  constructor() {
    this.pathways = [];
    this.pathwayMap = new Map();
    this.TOTAL_GENOME_BACKGROUND = 20000; // Standard human protein-coding genome size
    this.init();
  }

  init() {
    try {
      const pPath = path.resolve(__dirname, '../data/metabolicPathways.json');
      const raw = fs.readFileSync(pPath, 'utf8');
      this.pathways = JSON.parse(raw);
      for (const p of this.pathways) {
        this.pathwayMap.set(p.id, p);
      }
      logger.info(`Loaded ${this.pathways.length} liver metabolic pathways from catalog.`);
    } catch (err) {
      logger.error('Failed to load metabolic pathways:', err);
    }
  }

  getAllPathways(category = null) {
    if (category) {
      return this.pathways.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
    }
    return this.pathways;
  }

  getPathwayById(id) {
    return this.pathwayMap.get(id) || null;
  }

  /**
   * Run Over-Representation Analysis (ORA) on input gene list
   * @param {Array<string|Object>} genes - array of gene symbols or { symbol, log2FC }
   * @param {Object} options - { backgroundSize }
   */
  runEnrichment(genes, options = {}) {
    if (!genes || genes.length === 0) {
      return { totalQueryGenes: 0, enrichedPathways: [] };
    }

    const N = options.backgroundSize || this.TOTAL_GENOME_BACKGROUND;
    
    // Normalize gene symbols and build direction map if log2FC available
    const queryMap = new Map(); // symbol -> log2FC (or 0)
    for (const item of genes) {
      if (typeof item === 'string') {
        queryMap.set(item.toUpperCase().trim(), 0);
      } else if (item && item.symbol) {
        queryMap.set(item.symbol.toUpperCase().trim(), item.log2FC || 0);
      } else if (item && item.geneSymbol) {
        queryMap.set(item.geneSymbol.toUpperCase().trim(), item.log2FoldChange || 0);
      }
    }

    const queryGeneSet = new Set(queryMap.keys());
    const n = queryGeneSet.size;

    const rawEnrichment = [];

    for (const pathway of this.pathways) {
      const pathwayGeneSet = new Set(pathway.genes.map(g => g.toUpperCase()));
      const K = pathwayGeneSet.size;

      // Find overlap genes
      const overlapGenes = [];
      let upCount = 0;
      let downCount = 0;

      for (const qGene of queryGeneSet) {
        if (pathwayGeneSet.has(qGene)) {
          const fc = queryMap.get(qGene);
          overlapGenes.push({
            symbol: qGene,
            log2FoldChange: fc,
            regulation: fc > 0 ? 'UPREGULATED' : (fc < 0 ? 'DOWNREGULATED' : 'ALTERED')
          });
          if (fc > 0) upCount++;
          if (fc < 0) downCount++;
        }
      }

      const k = overlapGenes.length;
      if (k === 0) continue;

      const pValue = hypergeometricCumulativePValue(k, N, K, n);
      const expected = (n * K) / N;
      const foldEnrichment = expected > 0 ? Math.round((k / expected) * 100) / 100 : 0;

      // Pathway activation status
      let activationStatus = 'MODULATED';
      if (upCount > downCount * 1.5) activationStatus = 'ACTIVATED / UPREGULATED';
      else if (downCount > upCount * 1.5) activationStatus = 'SUPPRESSED / DOWNREGULATED';

      rawEnrichment.push({
        pathwayId: pathway.id,
        pathwayName: pathway.name,
        source: pathway.source,
        category: pathway.category,
        description: pathway.description,
        pathwaySize: K,
        overlapCount: k,
        expectedOverlap: Math.round(expected * 100) / 100,
        foldEnrichment,
        pValue: pValue,
        activationStatus,
        upregulatedGenesCount: upCount,
        downregulatedGenesCount: downCount,
        overlapGenes
      });
    }

    // Compute Benjamini-Hochberg FDR
    const withFDR = calculateFDR(rawEnrichment);

    // Sort by significance (pValue ascending)
    withFDR.sort((a, b) => a.pValue - b.pValue);

    return {
      totalQueryGenes: n,
      referenceBackgroundSize: N,
      totalPathwaysTested: this.pathways.length,
      enrichedCount: withFDR.filter(p => p.pValue <= 0.05).length,
      enrichedPathways: withFDR
    };
  }

  /**
   * Run metabolic enrichment across clinical biopsy progression stages
   * @param {string} stage - 'HCC_MALIGNANCY' | 'MASH_VS_CONTROL' | 'STEATOSIS_VS_CONTROL' | 'FIBROSIS_PROGRESSION'
   */
  getStageMetabolicProfile(stage) {
    const degs = dataIngestionService.degDatabase.filter(r => 
      r.stage === stage && r.isSignificant && !r.geneSymbol.startsWith('PROBE_')
    );

    const geneMap = new Map();
    for (const d of degs) {
      if (!geneMap.has(d.geneSymbol)) {
        geneMap.set(d.geneSymbol, { symbol: d.geneSymbol, log2FC: d.log2FoldChange });
      }
    }

    const uniqueDEGs = Array.from(geneMap.values());
    const enrichment = this.runEnrichment(uniqueDEGs);

    return {
      stage,
      totalSignificantDEGs: uniqueDEGs.length,
      topPerturbedPathways: enrichment.enrichedPathways.slice(0, 10),
      fullEnrichment: enrichment
    };
  }
}

export const pathwayService = new PathwayService();
