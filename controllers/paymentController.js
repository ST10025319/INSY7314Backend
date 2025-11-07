const Payment = require('../models/Payment');


exports.addPayment = async (req, res) => {
  try {
    const { amount, description } = req.body;

    if (!amount || !description) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a valid positive number' });
    }
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized access' });
    }

    const sanitize = (str) => str.replace(/[<>]/g, '');
    const safeDescription = sanitize(description);

    const payment = new Payment({
      customerId: req.user.id,
      amount,
      description: safeDescription,
      date: new Date(),
    });

    await payment.save();
    console.log(`[${new Date().toISOString()}] Payment added by ${req.user.email}: ${amount}`);
    res.status(201).json({ message: 'Payment added successfully', payment });
  } catch (err) {
    console.error('Error adding payment:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


exports.viewTransactions = async (req, res) => {
  try {
    let payments;
    if (req.user.role === 'employee') {
      payments = await Payment.find()
        .populate('customerId', 'fullName email accountNumber -_id')
        .sort({ date: -1 });
    } else {
      payments = await Payment.find({ customerId: req.user.id }).sort({ date: -1 });
    }

    res.json({ transactions: payments });
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
