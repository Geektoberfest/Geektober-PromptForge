import express from 'express';
import verifyJWT from '../middlewares/authMiddleware.js';
import * as creatorController from '../controllers/creatorController.js';

const router = express.Router();

router.get('/analytics', verifyJWT, creatorController.getCreatorAnalytics);
router.get('/analytics/time-series', verifyJWT, creatorController.getCreatorTimeSeriesAnalytics);
router.get('/analytics/export', verifyJWT, creatorController.exportCreatorStatementCSV);

export default router;
