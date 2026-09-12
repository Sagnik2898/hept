import { logger } from '../utils/logger.js';

// Curated canonical hepatic & oncogenic probe-to-gene annotations
const CANONICAL_MAPPINGS = {
  // Key HCC Biomarkers and Metabolic Genes
  '204880_at': { symbol: 'MGMT', title: 'O-6-methylguanine-DNA methyltransferase', entrezId: 4255, ensemblId: 'ENSG00000170430', chr: '10q26.3' },
  '206239_s_at': { symbol: 'SPINK1', title: 'serine peptidase inhibitor, Kazal type 1 (Tumor-associated trypsin inhibitor)', entrezId: 6690, ensemblId: 'ENSG00000124260', chr: '5q32' },
  '207378_at': { symbol: 'TREH', title: 'trehalase (brush-border membrane glycoprotein)', entrezId: 11181, ensemblId: 'ENSG00000130653', chr: '11q23.3' },
  '208470_s_at': { symbol: 'GPC3', title: 'glypican 3 (Early HCC Oncofetal Biomarker)', entrezId: 2719, ensemblId: 'ENSG00000147257', chr: 'Xq26.2' },
  '204731_at': { symbol: 'AFP', title: 'alpha-fetoprotein', entrezId: 174, ensemblId: 'ENSG00000081051', chr: '4q13.3' },
  '202499_s_at': { symbol: 'CYP2E1', title: 'cytochrome P450 family 2 subfamily E member 1', entrezId: 1565, ensemblId: 'ENSG00000130649', chr: '10q26.3' },
  '208949_s_at': { symbol: 'PCK1', title: 'phosphoenolpyruvate carboxykinase 1 (Gluconeogenesis gatekeeper)', entrezId: 5105, ensemblId: 'ENSG00000124253', chr: '20q13.31' },
  '205417_at': { symbol: 'G6PC', title: 'glucose-6-phosphatase catalytic subunit 1', entrezId: 2538, ensemblId: 'ENSG00000131482', chr: '17q21.31' },
  '205739_at': { symbol: 'GNMT', title: 'glycine N-methyltransferase (Hepatic methylome regulator)', entrezId: 27232, ensemblId: 'ENSG00000118544', chr: '6p21.1' },
  '205436_s_at': { symbol: 'MAT1A', title: 'methionine adenosyltransferase 1A (Adult hepatocyte marker)', entrezId: 4143, ensemblId: 'ENSG00000151224', chr: '10q22' },
  '208630_at': { symbol: 'MAT2A', title: 'methionine adenosyltransferase 2A (Fetal/Tumor switch)', entrezId: 4144, ensemblId: 'ENSG00000128910', chr: '2p11.2' },
  '202353_s_at': { symbol: 'SLC10A1', title: 'solute carrier family 10 member 1 (NTCP bile acid receptor)', entrezId: 6554, ensemblId: 'ENSG00000100652', chr: '14q24.1' },
  '205422_s_at': { symbol: 'CYP7A1', title: 'cytochrome P450 family 7 subfamily A member 1 (Rate-limiting bile acid)', entrezId: 1581, ensemblId: 'ENSG00000167910', chr: '8q12.1' },
  '1487_at': { symbol: 'ESRRA', title: 'estrogen related receptor alpha', entrezId: 2101, ensemblId: 'ENSG00000173153', chr: '11q13.1' },
  '1552307_a_at': { symbol: 'TTC39C', title: 'tetratricopeptide repeat domain 39C', entrezId: 125488, ensemblId: 'ENSG00000138670', chr: '18q11.2' },
  '1552281_at': { symbol: 'SLC39A5', title: 'solute carrier family 39 member 5', entrezId: 283375, ensemblId: 'ENSG00000171680', chr: '12q13.3' },
  '1552309_a_at': { symbol: 'NEXN', title: 'nexilin F-actin binding protein', entrezId: 91624, ensemblId: 'ENSG00000150907', chr: '1p31.1' },
  '159762_1': { symbol: 'GRB14', title: 'growth factor receptor bound protein 14', entrezId: 2888, ensemblId: 'ENSG00000144445', chr: '2q24.1' },
  '159763_1': { symbol: 'NET1', title: 'neuroepithelial cell transforming 1', entrezId: 10272, ensemblId: 'ENSG00000173848', chr: '10p15.1' },
  '159789_1': { symbol: 'SERPINB3', title: 'serpin family B member 3 (SCCA-1 liver oncogenic serpin)', entrezId: 6317, ensemblId: 'ENSG00000057149', chr: '18q21.33' },

  // Illumina HumanHT-12 probes in GSE89632 & GSE46300
  'ILMN_1651209': { symbol: 'CYP2C9', title: 'cytochrome P450 family 2 subfamily C member 9', entrezId: 1559, ensemblId: 'ENSG00000138109', chr: '10q23.33' },
  'ILMN_1651221': { symbol: 'FABP1', title: 'fatty acid binding protein 1 (Liver FABP)', entrezId: 2168, ensemblId: 'ENSG00000163586', chr: '2p11.2' },
  'ILMN_1651236': { symbol: 'ALDH1A1', title: 'aldehyde dehydrogenase 1 family member A1', entrezId: 216, ensemblId: 'ENSG00000165092', chr: '9q21.13' },
  'ILMN_1651237': { symbol: 'ACSL1', title: 'acyl-CoA synthetase long chain family member 1', entrezId: 2180, ensemblId: 'ENSG00000068366', chr: '4q35.1' },
  'ILMN_1651364': { symbol: 'PCBD2', title: 'pterin-4 alpha-carbinolamine dehydratase 2', entrezId: 130355, ensemblId: 'ENSG00000164687', chr: '5q31.1' },
  'ILMN_1651477': { symbol: 'CPT1A', title: 'carnitine palmitoyltransferase 1A', entrezId: 1374, ensemblId: 'ENSG00000110090', chr: '11q13.3' },
  'ILMN_1703622': { symbol: 'FASN', title: 'fatty acid synthase', entrezId: 2194, ensemblId: 'ENSG00000169710', chr: '17q25.1' },
  'ILMN_1752940': { symbol: 'SCD', title: 'stearoyl-CoA desaturase', entrezId: 6319, ensemblId: 'ENSG00000099194', chr: '10q24.31' },

  // Affymetrix Human Gene 1.0 ST probes in GSE48452
  '7893001': { symbol: 'PPARA', title: 'peroxisome proliferator activated receptor alpha', entrezId: 5465, ensemblId: 'ENSG00000186951', chr: '22q13.31' },
  '7893298': { symbol: 'CD36', title: 'CD36 molecule (Fatty acid translocase)', entrezId: 948, ensemblId: 'ENSG00000135218', chr: '7q21.11' },
  '7893573': { symbol: 'SREBF1', title: 'sterol regulatory element binding transcription factor 1', entrezId: 6720, ensemblId: 'ENSG00000072310', chr: '17p11.2' }
};

class GeneMappingService {
  constructor() {
    this.probeToGene = new Map();
    this.geneIndex = new Map();
    this.initCanonical();
  }

  initCanonical() {
    for (const [probeId, data] of Object.entries(CANONICAL_MAPPINGS)) {
      this.registerMapping(probeId, data.symbol, data.title, data);
    }
    logger.info(`Initialized GeneMappingService with ${this.probeToGene.size} canonical annotations.`);
  }

  registerMapping(probeId, symbol, title = '', extra = {}) {
    if (!probeId) return;
    const cleanProbe = String(probeId).trim();
    const cleanSymbol = symbol ? String(symbol).trim().toUpperCase() : null;
    const cleanTitle = title ? String(title).trim() : '';

    if (!this.probeToGene.has(cleanProbe)) {
      this.probeToGene.set(cleanProbe, {
        probeId: cleanProbe,
        symbol: cleanSymbol || `PROBE_${cleanProbe}`,
        title: cleanTitle,
        hasOfficialSymbol: !!cleanSymbol,
        ...extra
      });
    } else {
      const existing = this.probeToGene.get(cleanProbe);
      if (!existing.hasOfficialSymbol && cleanSymbol) {
        existing.symbol = cleanSymbol;
        existing.title = cleanTitle || existing.title;
        existing.hasOfficialSymbol = true;
      }
    }

    if (cleanSymbol) {
      if (!this.geneIndex.has(cleanSymbol)) {
        this.geneIndex.set(cleanSymbol, {
          symbol: cleanSymbol,
          title: cleanTitle,
          probes: [cleanProbe],
          ...extra
        });
      } else {
        const entry = this.geneIndex.get(cleanSymbol);
        if (!entry.probes.includes(cleanProbe)) {
          entry.probes.push(cleanProbe);
        }
        if (!entry.title && cleanTitle) {
          entry.title = cleanTitle;
        }
      }
    }
  }

  mapProbe(probeId) {
    if (!probeId) return null;
    const clean = String(probeId).trim();
    return this.probeToGene.get(clean) || {
      probeId: clean,
      symbol: `PROBE_${clean}`,
      title: 'Unannotated Microarray Probe',
      hasOfficialSymbol: false
    };
  }

  lookupGene(symbol) {
    if (!symbol) return null;
    const clean = String(symbol).trim().toUpperCase();
    return this.geneIndex.get(clean) || null;
  }

  searchGenes(query, limit = 50) {
    if (!query) return [];
    const q = String(query).trim().toUpperCase();
    const matches = [];

    for (const [symbol, data] of this.geneIndex.entries()) {
      if (symbol.includes(q) || (data.title && data.title.toUpperCase().includes(q))) {
        matches.push(data);
        if (matches.length >= limit) break;
      }
    }
    return matches;
  }

  getStats() {
    return {
      totalProbesMapped: this.probeToGene.size,
      totalUniqueGenes: this.geneIndex.size
    };
  }
}

export const geneMappingService = new GeneMappingService();
