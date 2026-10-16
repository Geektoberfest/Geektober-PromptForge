const mongoose = require('mongoose');

// Ledger schema for immutable financial movement tracking
// All monetary values in integer paise to avoid floating-point issues
const ledgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Orders',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['CREDIT_SALE', 'PLATFORM_FEE', 'PAYOUT'],
      required: true,
    },
    grossAmountPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFeePaise: {
      type: Number,
      required: true,
      min: 0,
    },
    netAmountPaise: {
      type: Number,
      required: true,
      // Sign conventions:
      // - CREDIT_SALE: positive (creator receives net amount)
      // - PLATFORM_FEE: negative from creator perspective (fee deducted)
      // - PAYOUT: could be positive or negative depending on direction
    },
    balanceAfterPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index: prevent duplicate ledger entries for same order + movement type
// This ensures one fulfillment per order per type (e.g., one CREDIT_SALE + one PLATFORM_FEE per order)
ledgerSchema.index({ orderId: 1, type: 1 }, { unique: true });

// Index on userId for quick balance queries
ledgerSchema.index({ userId: 1, type: 1 });

// Static method to create a CREDIT_SALE entry and update creator balance
ledgerSchema.statics.createCREDITSale = async function (
  orderId,
  creatorId,
  grossAmountPaise,
  session
) {
  const platformFeePaise = Math.floor(grossAmountPaise * 10 / 100); // 10% platform fee
  const netAmountPaise = Math.floor(grossAmountPaise * 90 / 100); // 90% creator net

  // Get current creator balance
  const User = this.users || mongoose.model('Users');
  const creator = await User.findById(creatorId).session(session);
  if (!creator) {
    throw new Error('Creator user not found');
  }
  const currentBalance = creator.creatorBalancePaise || 0;
  const newBalance = currentBalance + netAmountPaise;

  // Create ledger entry
  const ledgerEntry = await this.create(
    {
      userId: creatorId,
      orderId,
      type: 'CREDIT_SALE',
      grossAmountPaise,
      platformFeePaise,
      netAmountPaise,
      balanceAfterPaise: newBalance,
    },
    { session }
  );

  // Update creator balance
  await User.findByIdAndUpdate(creatorId, { creatorBalancePaise: newBalance }, { session });

  return ledgerEntry;
};

// Static method to create a PLATFORM_FEE entry
ledgerSchema.statics.createPLATFORMFee = async function (
  orderId,
  creatorId,
  grossAmountPaise,
  session
) {
  const platformFeePaise = Math.floor(grossAmountPaise * 10 / 100); // 10% platform fee
  const netAmountPaise = -platformFeePaise; // Negative from creator perspective

  // Get current creator balance
  const User = this.users || mongoose.model('Users');
  const creator = await User.findById(creatorId).session(session);
  if (!creator) {
    throw new Error('Creator user not found');
  }
  const currentBalance = creator.creatorBalancePaise || 0;
  const newBalance = currentBalance + netAmountPaise; // net decreases by fee amount

  // Create ledger entry
  const ledgerEntry = await this.create(
    {
      userId: creatorId,
      orderId,
      type: 'PLATFORM_FEE',
      grossAmountPaise: 0,
      platformFeePaise,
      netAmountPaise,
      balanceAfterPaise: newBalance,
    },
    { session }
  );

  // Update creator balance
  await User.findByIdAndUpdate(creatorId, { creatorBalancePaise: newBalance }, { session });

  return ledgerEntry;
};

// Static method to create a PAYOUT entry
ledgerSchema.statics.createPAYOUT = async function (
  orderId,
  creatorId,
  amountPaise,
  session
) {
  const platformFeePaise = 0;
  const grossAmountPaise = 0;
  const netAmountPaise = amountPaise; // Full payout amount

  // Get current creator balance
  const User = this.users || mongoose.model('Users');
  const creator = await User.findById(creatorId).session(session);
  if (!creator) {
    throw new Error('Creator user not found');
  }
  const currentBalance = creator.creatorBalancePaise || 0;
  const newBalance = currentBalance + netAmountPaise;

  // Create ledger entry
  const ledgerEntry = await this.create(
    {
      userId: creatorId,
      orderId,
      type: 'PAYOUT',
      grossAmountPaise,
      platformFeePaise,
      netAmountPaise,
      balanceAfterPaise: newBalance,
    },
    { session }
  );

  // Update creator balance
  await User.findByIdAndUpdate(creatorId, { creatorBalancePaise: newBalance }, { session });

  return ledgerEntry;
};

const Ledger = mongoose.model('Ledger', ledgerSchema);

// Export also the User model reference for static methods
Ledger.users = 'Users';

module.exports = Ledger;