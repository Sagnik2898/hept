import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config/index.js';
import { logger } from './utils/logger.js';
import { dataIngestionService } from './services/dataIngestionService.js';

import datasetRoutes from './routes/datasetRoutes.js';
import geneRoutes from './routes/geneRoutes.js';
import mappingRoutes from './routes/mappingRoutes.js';
import pathwayRoutes from './routes/pathwayRoutes.js';
import biomarkerRoutes from './routes/biomarkerRoutes.js';
import mlRoutes from './routes/mlRoutes.js';
import progressionRoutes from './routes/progressionRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import geminiRoutes from './routes/geminiRoutes.js';
import { mlService } from './services/mlService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors({ origin: CONFIG.CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} -> [${res.statusCode}] in ${Date.now() - start}ms`);
  });
  next();
});

// Root / API Directory
app.get('/api', (req, res) => {
  res.json({
    service: 'Early Liver Cancer Detection Bioinformatic API',
    version: '1.0.0',
    description: 'High-throughput backend service analyzing 7 liver biopsy DEG datasets, metabolic pathway reprogramming, probe mapping, early HCC biomarker identification, and native ML classification.',
    endpoints: {
      health: 'GET /api/health',
      datasets: {
        list: 'GET /api/datasets',
        byAccession: 'GET /api/datasets/:accession'
      },
      genes: {
        query: 'GET /api/genes?symbol=&dataset=&stage=&regulation=&minLog2FC=&maxPVal=&limit=&page=',
        summary: 'GET /api/genes/summary?limit=100&sortBy=recurrence',
        profile: 'GET /api/genes/profile/:symbol'
      },
      mapping: {
        probe: 'GET /api/mapping/probe/:probeId',
        search: 'GET /api/mapping/search?q=GLYPICAN',
        stats: 'GET /api/mapping/stats'
      },
      pathways: {
        list: 'GET /api/pathways?category=',
        byId: 'GET /api/pathways/:id',
        enrichmentAnalysis: 'POST /api/pathways/enrichment (body: { genes: ["SPINK1", "GPC3", ...], backgroundSize: 20000 })',
        stageProfile: 'GET /api/pathways/stage/:stage (e.g. HCC_MALIGNANCY, MASH_VS_CONTROL, STEATOSIS_VS_CONTROL)'
      },
      biomarkers: {
        earlyDetection: 'GET /api/biomarkers/early-detection?minDatasets=2',
        tiers: 'GET /api/biomarkers/tiers',
        scoreProfile: 'POST /api/biomarkers/score (body: { expressionProfile: { SPINK1: 4.5, GPC3: 3.2, PCK1: -2.1 } })'
      },
      machineLearning: {
        predict: 'POST /api/ml/predict (body: { expressionProfile: { SPINK1: 4.5, GPC3: 3.2, PCK1: -2.1 } })',
        modelInfo: 'GET /api/ml/model-info',
        train: 'POST /api/ml/train (body: { epochs: 400, learningRate: 0.05, lambda: 0.01 })'
      },
      biologicalProgression: {
        trajectory: 'GET /api/progression/trajectory',
        align: 'POST /api/progression/align (body: { expressionProfile: { ... } })'
      }
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    ingestionReady: dataIngestionService.isLoaded,
    mlModelReady: mlService.isTrained,
    totalDatasets: dataIngestionService.datasets.size,
    totalDEGRecords: dataIngestionService.degDatabase.length,
    totalCatalogedGenes: dataIngestionService.geneSummary.size
  });
});

// Register Domain Routes
app.use('/api/datasets', datasetRoutes);
app.use('/api/genes', geneRoutes);
app.use('/api/mapping', mappingRoutes);
app.use('/api/pathways', pathwayRoutes);
app.use('/api/biomarkers', biomarkerRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/progression', progressionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/gemini', geminiRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled Error: ${err.message}`, err.stack);
  res.status(500).json({ success: false, error: 'Internal server error', details: err.message });
});

// Server Initialization
export async function startServer(port = CONFIG.PORT) {
  try {
    // Ingest all 7 biopsy Excel files before opening HTTP port
    await dataIngestionService.loadAllDatasets();

    // Train the In-Memory Machine Learning Classifier
    mlService.trainModel();

    const server = app.listen(port, () => {
      logger.success(`=======================================================`);
      logger.success(` Early Liver Cancer Detection Backend API is ONLINE!   `);
      logger.success(` URL: http://localhost:${port}/api                   `);
      logger.success(` Health: http://localhost:${port}/api/health           `);
      logger.success(`=======================================================`);
    });

    return { app, server };
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Automatically start when run directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer();
}

export default app;
