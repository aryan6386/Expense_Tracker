import express from 'express';
import Transaction from '../models/Transaction.js';
import verifyToken from '../middlewares/auth.js';

const router = express.Router();

// @route   POST /api/transactions
// @desc    Add new transaction
// @access  Private
router.post('/', verifyToken, async (req, res) => {
  try {
    const { type, category, amount, date, description } = req.body;

    const newTransaction = new Transaction({
      userId: req.user.id,
      type,
      category,
      amount,
      date,
      description,
    });

    const transaction = await newTransaction.save();
    res.json(transaction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/transactions
// @desc    Get all user transactions with filtering and balance calculation
// @access  Private
router.get('/', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, period } = req.query;
    let query = { userId: req.user.id };

    // Apply date filtering
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (period) {
      const now = new Date();
      let start = new Date();
      let end = new Date();
      
      // Always set end to the very end of today to include all of today's transactions
      end.setHours(23, 59, 59, 999);
      
      switch (period) {
        case 'daily':
          start.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          start.setDate(now.getDate() - 7);
          start.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          start.setMonth(now.getMonth() - 1);
          start.setHours(0, 0, 0, 0);
          break;
      }
      query.date = { $gte: start, $lte: end };
    }

    console.log(`[DEBUG] Period: ${period}, Query: ${JSON.stringify(query)}`);
    const transactions = await Transaction.find(query).sort({ date: -1 });

    // Calculate totals
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach((t) => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else if (t.type === 'expense') {
        totalExpenses += t.amount;
      }
    });

    const balance = totalIncome - totalExpenses;

    res.json({
      transactions,
      totals: {
        totalIncome,
        totalExpenses,
        balance,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/transactions/:id
// @desc    Update a transaction
// @access  Private
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { type, category, amount, date, description } = req.body;

    let transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Ensure user owns transaction
    if (transaction.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { $set: { type, category, amount, date, description } },
      { new: true }
    );

    res.json(transaction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/transactions/:id
// @desc    Delete a transaction
// @access  Private
router.delete('/:id', verifyToken, async (req, res) => {
    try {
      console.log(`Attempting to delete transaction: ${req.params.id} for user: ${req.user.id}`);
      let transaction = await Transaction.findById(req.params.id);
  
      if (!transaction) {
        console.warn(`Transaction not found: ${req.params.id}`);
        return res.status(404).json({ message: 'Transaction not found' });
      }
  
      // Ensure user owns transaction
      if (transaction.userId.toString() !== req.user.id) {
        console.warn(`Unauthorized delete attempt: User ${req.user.id} tried to delete transaction ${req.params.id} owned by ${transaction.userId}`);
        return res.status(401).json({ message: 'Not authorized' });
      }
  
      await Transaction.findByIdAndDelete(req.params.id);
      console.log(`Successfully deleted transaction: ${req.params.id}`);
  
      res.json({ message: 'Transaction removed' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

export default router;
