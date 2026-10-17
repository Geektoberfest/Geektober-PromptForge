import mongoose from 'mongoose';

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
      ref: 'Order',
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
  }
);

// Compound unique index prevents duplicate ledger entries for the same order and transaction type
ledgerSchema.index({ orderId: 1, type: 1 }, { unique: true });
ledgerSchema.index({ userId: 1, createdAt: -1 });

const Ledger = mongoose.models.Ledger || mongoose.model('Ledger', ledgerSchema);

export default Ledger;
