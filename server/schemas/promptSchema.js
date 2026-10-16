const zod = require('zod');

exports.promptCreationSchema = zod.object({
  title: zod
    .string()
    .min(5, { message: 'Title must be at least 5 characters' })
    .max(200, { message: 'Title must be at most 200 characters' }),
  description: zod.string().min(10, { message: 'Description must be at least 10 characters' }).max(2000),
  pricePaise: zod
    .number()
    .int({ message: 'Price must be an integer' })
    .min(100, { message: 'Price must be at least 100 paise (₹1)' })
    .max(1000000, { message: 'Price must be at most 1000000 paise (₹10000)' }),
  aiModel: zod
    .enum(['Midjourney v6', 'DALL-E 3', 'Stable Diffusion XL', 'Flux', 'Ideogram'])
    .optional()
    .default('Midjourney v6'),
  category: zod
    .enum(['Digital Art', 'Photography', 'Concept Art', '3D Render', 'Anime', 'Vector Illustration'])
    .optional(),
  tags: zod
    .array(zod.string())
    .max(5, { message: 'Maximum 5 tags allowed' })
    .optional(),
});

exports.promptUpdateSchema = zod.object({
  title: zod
    .string()
    .min(5, { message: 'Title must be at least 5 characters' })
    .max(200, { message: 'Title must be at most 200 characters' })
    .optional(),
  description: zod.string().min(10).max(2000).optional(),
  pricePaise: zod
    .number()
    .int()
    .min(100)
    .max(1000000)
    .optional(),
  aiModel: zod
    .enum(['Midjourney v6', 'DALL-E 3', 'Stable Diffusion XL', 'Flux', 'Ideogram'])
    .optional(),
  category: zod
    .enum(['Digital Art', 'Photography', 'Concept Art', '3D Render', 'Anime', 'Vector Illustration'])
    .optional(),
  tags: zod.array(zod.string()).max(5).optional(),
});