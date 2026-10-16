import express from 'express';
import * as prompts from '../controllers/promptController.js';
import verifyJWT, { optionalAuth } from '../middlewares/authMiddleware.js';
import { cacheMiddleware } from '../middlewares/cacheMiddleware.js';
import multer from 'multer';
import { rateLimit } from '../middlewares/rateLimit.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Rate limit: prompt creation - 20 requests / hour by authenticated user
router.post('/create', rateLimit.promptCreation, upload.single('image'), prompts.createPrompt);
router.post('/', rateLimit.promptCreation, upload.single('image'), prompts.createPrompt);

// Rate limit: public prompt catalog - 120 requests / minute by IP
router.get('/all', rateLimit.publicCatalog, optionalAuth, cacheMiddleware(60, 'catalog'), prompts.getAllPrompts);
router.get('/', rateLimit.publicCatalog, optionalAuth, cacheMiddleware(60, 'catalog'), prompts.getAllPrompts);

// Cache trending prompts for 300 seconds
router.get('/trending', cacheMiddleware(300, 'trending'), prompts.getTrendingPrompts);
router.get('/getProfilePrompts', verifyJWT, prompts.getProfilePrompts);
router.get('/:id', optionalAuth, prompts.getPromptById);

export default router;
