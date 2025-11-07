require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    
    const existing = await User.findOne({ email: 'admin@example.com' });
    if (existing) {
      console.log('Employee already exists!');
      process.exit(0);
    }

    const employee = new User({
      fullName: 'Admin Employee',
      email: 'admin@example.com',
      idNumber: 'EMP001',
      accountNumber: 'EMP001',
      password: 'Password123',
      role: 'employee',
      mfaSecret: null,
    });

    await employee.save();

    console.log('Employee seeded successfully!');
    console.log('Email: admin@example.com');
    console.log('Password: Password123');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seed();
