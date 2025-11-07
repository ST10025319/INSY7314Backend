/**
 * @file Unit tests for authentication controller
 * Author: Lungelo Duma
 * Attribution: Based on Microsoft Learn reference for token handling
 * Source: https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-native-authentication-single-page-app-react-sign-in
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const bcrypt = require('bcrypt');

const { register, login, setupMFA, verifyMFA, mfaLogin } = require('../controllers/authController');
const User = require('../models/User');

// Create mock Express app
const app = express();
app.use(express.json());

// Routes to test controller directly
app.post('/register', register);
app.post('/login', login);
app.post('/mfa/setup', mockAuth, setupMFA);
app.post('/mfa/verify', mockAuth, verifyMFA);
app.post('/mfa/login', mfaLogin);

// Mock user authentication middleware for MFA routes
function mockAuth(req, res, next) {
  req.user = { id: global.userId }; 
  next();
}

// Mock environment
process.env.JWT_SECRET = 'testsecret';
process.env.JWT_REFRESH_SECRET = 'refreshsecret';

// Mock database
beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoose.connection.close();
});

describe('Authentication Controller Tests', () => {

  let token, refreshToken;

  test('Register new user successfully', async () => {
    const res = await request(app)
      .post('/register')
      .send({
        fullName: 'Lungelo Duma',
        email: 'lungelo@test.com',
        idNumber: '9900990099009',
        accountNumber: 'ACC123',
        password: 'secure123'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('User registered successfully');

    const user = await User.findOne({ email: 'lungelo@test.com' });
    expect(user).not.toBeNull();
  });

  test('Duplicate email registration fails', async () => {
    const res = await request(app)
      .post('/register')
      .send({
        fullName: 'Another User',
        email: 'lungelo@test.com',
        idNumber: '8800880088008',
        accountNumber: 'ACC456',
        password: 'secure123'
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/Email exists/);
  });

  test('Login succeeds and returns tokens', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'lungelo@test.com', password: 'secure123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();

    token = res.body.token;
    refreshToken = res.body.refreshToken;
  });

  test('Login fails with wrong password', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'lungelo@test.com', password: 'wrongpass' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  test('MFA setup generates secret and URL', async () => {
    const user = await User.findOne({ email: 'lungelo@test.com' });
    global.userId = user._id;

    const res = await request(app).post('/mfa/setup');

    expect(res.statusCode).toBe(200);
    expect(res.body.otpauthUrl).toContain('otpauth://');
  });

  test('Verify MFA with valid token', async () => {
    const user = await User.findOne({ email: 'lungelo@test.com' });
    const token = speakeasy.totp({
      secret: user.mfaSecret,
      encoding: 'base32'
    });

    const res = await request(app)
      .post('/mfa/verify')
      .send({ token });

    expect(res.statusCode).toBe(200);
    expect(res.body.verified).toBe(true);
  });

  test('Verify MFA fails with invalid token', async () => {
    const res = await request(app)
      .post('/mfa/verify')
      .send({ token: '000000' });

    expect(res.statusCode).toBe(200);
    expect(res.body.verified).toBe(false);
  });

  test('MFA login succeeds with valid token', async () => {
    const user = await User.findOne({ email: 'lungelo@test.com' });
    const token = speakeasy.totp({ secret: user.mfaSecret, encoding: 'base32' });

    const res = await request(app)
      .post('/mfa/login')
      .send({ userId: user._id, token });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  test('MFA login fails with invalid token', async () => {
    const user = await User.findOne({ email: 'lungelo@test.com' });

    const res = await request(app)
      .post('/mfa/login')
      .send({ userId: user._id, token: '999999' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid MFA token');
  });

});
