import express from 'express';
import verifyJWT from '../middlewares/authMiddleware.js';
import * as orderController from '../controllers/orderController.js';
import { handleRazorpayWebhook } from '../controllers/webhookController.js';
import { rateLimit } from '../middlewares/rateLimit.js';

const router = express.Router();

// Rate limit: order creation - 15 requests / 10 minutes by authenticated user ID (with IP fallback)
router.post('/create', rateLimit.orderCreation, verifyJWT, orderController.createOrder);
router.post('/verify', verifyJWT, orderController.verifyPayment);
router.get('/my-orders', verifyJWT, orderController.getUserOrders);
router.post('/webhook', handleRazorpayWebhook);

export default router;
