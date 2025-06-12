import express from 'express';
import { getAIAnalysis } from '../services/aiAnalysis.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/', authMiddleware, getAIAnalysis);

export default router;