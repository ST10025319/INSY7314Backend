const User = require('../models/User');
const bcrypt = require('bcrypt');


exports.addEmployee = async (req, res) => {
  try {
    const { fullName, email, idNumber, accountNumber, password } = req.body;
    if (!fullName || !email || !idNumber || !accountNumber || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (await User.findOne({ email })) return res.status(409).json({ error: 'Email exists' });
    if (await User.findOne({ accountNumber })) return res.status(409).json({ error: 'Account exists' });

    

    const employee = new User({ 
      fullName, 
      email, 
      idNumber, 
      accountNumber, 
      password, 
      role: 'employee' 
    });

    await employee.save();
    console.log('Employee added:', email);
    res.status(201).json({ message: 'Employee added successfully' });
  } catch (err) {
    console.error('Add Employee Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


