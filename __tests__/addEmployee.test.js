/**
 * @file Unit tests for addEmployee controller
 * Author: Lungelo Duma
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../models/User');
const { addEmployee } = require('../controllers/employeeController'); 

const app = express();
app.use(express.json());


app.post('/addEmployee', addEmployee);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('addEmployee Controller Tests', () => {

  test('Adds a new employee successfully', async () => {
    const res = await request(app)
      .post('/addEmployee')
      .send({
        fullName: 'John Doe',
        email: 'john@example.com',
        idNumber: '1234567890123',
        accountNumber: 'ACC001',
        password: 'securepass123'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Employee added successfully');

    const user = await User.findOne({ email: 'john@example.com' });
    expect(user).not.toBeNull();
    expect(user.role).toBe('employee');

   
    const match = await bcrypt.compare('securepass123', user.password);
    expect(match).toBe(true);
  });

  test('Fails when fields are missing', async () => {
    const res = await request(app)
      .post('/addEmployee')
      .send({
        fullName: '',
        email: '',
        idNumber: '',
        accountNumber: '',
        password: ''
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('All fields required');
  });

  test('Fails when email already exists', async () => {
    await User.create({
      fullName: 'Existing User',
      email: 'exists@example.com',
      idNumber: '1112223334445',
      accountNumber: 'ACC002',
      password: 'hashed',
      role: 'employee'
    });

    const res = await request(app)
      .post('/addEmployee')
      .send({
        fullName: 'New User',
        email: 'exists@example.com',
        idNumber: '9998887776661',
        accountNumber: 'ACC003',
        password: 'newpass123'
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('Email exists');
  });

  test('Fails when account number already exists', async () => {
    await User.create({
      fullName: 'Existing User',
      email: 'unique@example.com',
      idNumber: '9998887776661',
      accountNumber: 'ACC100',
      password: 'hashed',
      role: 'employee'
    });

    const res = await request(app)
      .post('/addEmployee')
      .send({
        fullName: 'Another User',
        email: 'another@example.com',
        idNumber: '2223334445556',
        accountNumber: 'ACC100',
        password: 'anotherpass'
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('Account exists');
  });

  test('Handles server errors gracefully', async () => {
   
    jest.spyOn(User, 'findOne').mockImplementationOnce(() => { throw new Error('DB failure'); });

    const res = await request(app)
      .post('/addEmployee')
      .send({
        fullName: 'Crash Test',
        email: 'crash@example.com',
        idNumber: '1231231231234',
        accountNumber: 'ACC999',
        password: 'pass123'
      });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Server error');
  });

});
