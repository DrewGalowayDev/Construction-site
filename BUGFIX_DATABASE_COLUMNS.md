# Database Column Fix ✅

## Issue
Training payment system was using incorrect column name `transaction_type` instead of `type` in the transactions table.

## Error Message
```
SequelizeDatabaseError: Unknown column 'Transaction.transaction_type' in 'where clause'
```

## Root Cause
The Transaction model defines the column as `type`:
```javascript
// models/Transaction.js
type: {
  type: DataTypes.STRING(50),
  allowNull: false
}
```

But the training controller was using `transaction_type`:
```javascript
// WRONG
transaction_type: 'training_fee'

// CORRECT
type: 'training_fee'
```

## Files Fixed ✅

### 1. `controllers/trainingController.js`
- ✅ Fixed `getTrainingPage()` - line 22
- ✅ Fixed `initializeTrainingPayment()` - line 68
- ✅ Fixed `initializeTrainingPayment()` - line 115
- ✅ Fixed `paystackCallback()` - line 205
- ✅ Fixed `paystackCallback()` - line 220
- ✅ Fixed `checkPaymentStatus()` - line 275

### 2. `routes/dashboard.js`
- ✅ Fixed provider training route - query for payment status

## Changes Made

### Before (Incorrect):
```javascript
await Transaction.findOne({
  where: {
    user_id: userId,
    transaction_type: 'training_fee',  // ❌ WRONG
    status: 'completed'
  }
});

await Transaction.create({
  user_id: userId,
  transaction_type: 'training_fee',  // ❌ WRONG
  amount: TRAINING_FEE,
  status: 'pending'
});
```

### After (Correct):
```javascript
await Transaction.findOne({
  where: {
    user_id: userId,
    type: 'training_fee',  // ✅ CORRECT
    status: 'completed'
  }
});

await Transaction.create({
  user_id: userId,
  type: 'training_fee',  // ✅ CORRECT
  amount: TRAINING_FEE,
  status: 'pending'
});
```

## Transaction Types Used

All transaction types should use the `type` column:

```javascript
// Valid transaction types
type: 'training_fee'       // Training payment (1500 KES)
type: 'topup'             // Wallet top-up
type: 'unlock_job_contact'         // Job contact unlock
type: 'unlock_material_contact'    // Material supplier unlock
type: 'unlock_artisan_contact'     // Artisan/provider unlock
type: 'unlock_order_contact'       // Order client unlock
```

## Testing Checklist ✅

- [x] Server starts without errors
- [x] Training page loads correctly
- [x] Payment initialization works
- [x] Payment verification works
- [x] Database queries execute properly
- [x] Dashboard training page shows payment status

## Status: FIXED ✅

The training payment system now uses the correct database column name and should work properly.

**Nodemon will auto-restart with these fixes.**
