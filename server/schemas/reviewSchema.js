const zod = require('zod');

exports.reviewCreationSchema = zod.object({
  promptId: zod
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, { message: 'Invalid prompt ID format' }),
  rating: zod
    .number()
    .int({ message: 'Rating must be an integer' })
    .min(1, { message: 'Rating must be at least 1' })
    .max(5, { message: 'Rating must be at most 5' }),
  content: zod
    .string()
    .min(10, { message: 'Review content must be at least 10 characters' })
    .max(1000, { message: 'Review content must be at most 1000 characters' }),
});

// Partial update schema (for patch requests)
exports.ratingUpdateSchema = zod.object({
  rating: zod
    .number()
    .int()
    .min(1)
    .max(5),
});