const zod = require('zod');

exports.orderCreationSchema = zod.object({
  promptId: zod
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, { message: 'Invalid prompt ID format' }),
  amountPaise: zod
    .number()
    .int({ message: 'Amount must be an integer in paise' })
    .min(100, { message: 'Amount must be at least 100 paise' })
    .max(1000000, { message: 'Amount must be at most 1000000 paise' }),
  currency: zod.string().default('INR'),
  paymentId: zod.string().optional(),
  razorpayOrderId: zod.string().optional(),
  razorpaySignature: zod.string().optional(),
});

exports.paymentVerificationSchema = zod.object({
  orderId: zod.string().regex(/^[0-9a-fA-F]{24}$/),
  razorpayPaymentId: zod.string(),
  razorpaySignature: zod.string(),
});