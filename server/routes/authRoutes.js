import express from 'express';
import verifyJWT, { optionalAuth } from '../middlewares/authMiddleware.js';
import * as authController from '../controllers/authController.js';
import { rateLimit } from '../middlewares/rateLimit.js';

const router = express.Router();

// Rate limit: auth + signup - 10 requests / 15 minutes by IP
router.post('/signup', rateLimit.authSignup, authController.signup);
router.post('/login', rateLimit.authSignup, authController.login);
router.get('/verify', verifyJWT, (req, res) => {
  res.status(200).json({ success: true, message: 'Token is valid', user: req.user });
});
router.post('/addlike', optionalAuth, authController.addLike);
router.post('/removelike', optionalAuth, authController.removeLike);
router.post('/logout', authController.logout);
router.post('/likelist', optionalAuth, authController.likeList);
router.get('/getuser', verifyJWT, authController.getUserId);

export default router;
