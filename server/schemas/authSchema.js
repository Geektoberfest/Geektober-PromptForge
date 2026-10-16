const zod = require('zod');

// Login schema: email, password
exports.loginSchema = zod.object({
  email: zod.string().email({ message: 'Invalid email format' }).trim(),
  password: zod.string().min(6, { message: 'Password must be at least 6 characters' }),
});

// Register schema: username, email, password, role
exports.registerSchema = zod.object({
  username: zod
    .string()
    .min(3, { message: 'Username must be at least 3 characters' })
    .max(30, { message: 'Username must be at most 30 characters' })
    .trim(),
  email: zod.string().email({ message: 'Invalid email format' }).trim(),
  password: zod.string().min(6, { message: 'Password must be at least 6 characters' }),
  role: zod.enum(['buyer', 'creator', 'admin']).default('buyer'),
});