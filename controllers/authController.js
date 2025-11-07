const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');


exports.register = async (req, res) => {
  try {
    const { fullName, email, idNumber, accountNumber, password } = req.body;
    if (!fullName || !email || !idNumber || !accountNumber || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (await User.findOne({ email })) return res.status(409).json({ error: 'Email exists' });
    if (await User.findOne({ accountNumber })) return res.status(409).json({ error: 'Account exists' });

    const user = new User({ fullName, email, idNumber, accountNumber, password, role: 'customer' });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('--- LOGIN ATTEMPT ---');
    console.log('Email entered:', email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    
    if (user.mfaSecret && user.role === 'customer') {
      console.log('MFA required for this user');
      return res.json({ success: true, mfaRequired: true, userId: user._id });
    }

    
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    user.refreshToken = refreshToken;
    await user.save();

    console.log('Login successful, tokens issued');

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      role: user.role,
      fullName: user.fullName,
      mfaRequired: false,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Server error during login' });
  }
};




exports.setupMFA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const secret = user.mfaSecret || speakeasy.generateSecret({ name: `PaymentsPortal (${user.email})` }).base32;
    if (!user.mfaSecret) {
      user.mfaSecret = secret;
      await user.save();
    }

    const otpauthUrl = speakeasy.otpauthURL({ secret, label: `PaymentsPortal (${user.email})`, encoding: 'base32' });
    res.json({ otpauthUrl, alreadyEnabled: !!user.mfaSecret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};


exports.verifyMFA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);
    if (!user || !user.mfaSecret) return res.status(400).json({ error: 'MFA not set up' });

    const verified = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token });
    res.json({ verified });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};


exports.mfaLogin = async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findById(userId);
    if (!user || !user.mfaSecret) return res.status(400).json({ error: 'MFA not set up' });

    const verified = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token });
    if (!verified) return res.status(401).json({ error: 'Invalid MFA token' });

    const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    user.refreshToken = refreshToken;
    await user.save();

    res.json({ token: accessToken, refreshToken, role: user.role, fullName: user.fullName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};


//code attribution
//The following method was taken from Microsoft Learn
//Article:Microsoft Learn:
//Link:https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-native-authentication-single-page-app-react-sign-in
//export interface TokenResponseType {
        //token_type: string;
        //scope: string;
        //expires_in: number;
        //access_token: string;
        //refresh_token: string;
        //id_token: string;
    //}

    