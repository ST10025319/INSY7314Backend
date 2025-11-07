const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const request = require('supertest');
const Payment = require('../models/Payment');
const { addPayment, viewTransactions } = require('../controllers/paymentController');


const UserSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  accountNumber: String,
});
mongoose.model('User', UserSchema);


const ObjectId = mongoose.Types.ObjectId;


const mockAuth = (user) => (req, res, next) => {
  req.user = user;
  next();
};

let app;
let mongoServer;
let customerId;
let employeeId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { dbName: 'testdb' });

  
  customerId = new ObjectId();
  employeeId = new ObjectId();

  app = express();
  app.use(express.json());
  app.post('/addPayment', mockAuth({ id: customerId, email: 'test@example.com', role: 'customer' }), addPayment);
  app.get('/viewTransactions', mockAuth({ id: customerId, email: 'test@example.com', role: 'customer' }), viewTransactions);
  app.get('/employeeTransactions', mockAuth({ id: employeeId, email: 'emp@example.com', role: 'employee' }), viewTransactions);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await Payment.deleteMany();
});

describe('Payment Controller', () => {
  it('should add a payment successfully', async () => {
    const res = await request(app)
      .post('/addPayment')
      .send({ amount: 200, description: 'Electric bill' });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Payment added successfully');
    expect(res.body.payment).toHaveProperty('amount', 200);
  });

  it('should return error if required fields missing', async () => {
    const res = await request(app).post('/addPayment').send({ amount: '' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('All fields required');
  });

  it('should return error if amount is invalid', async () => {
    const res = await request(app)
      .post('/addPayment')
      .send({ amount: -10, description: 'Bad amount' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Amount must be a valid positive number');
  });

  it('should reject if req.user not present', async () => {
    const tempApp = express();
    tempApp.use(express.json());
    tempApp.post('/addPayment', addPayment);
    const res = await request(tempApp)
      .post('/addPayment')
      .send({ amount: 100, description: 'No user' });
    expect(res.statusCode).toBe(401);
  });

  it('should show only current customer transactions', async () => {
    await Payment.create([
      { customerId, amount: 100, description: 'Customer A', date: new Date() },
      { customerId: new ObjectId(), amount: 300, description: 'Other user', date: new Date() },
    ]);
    const res = await request(app).get('/viewTransactions');
    expect(res.statusCode).toBe(200);
    expect(res.body.transactions.length).toBe(1);
    expect(res.body.transactions[0].description).toBe('Customer A');
  });

  it('should allow employee to see all payments', async () => {
    await Payment.create([
      { customerId: new ObjectId(), amount: 500, description: 'Rent', date: new Date() },
      { customerId: new ObjectId(), amount: 250, description: 'Internet', date: new Date() },
    ]);
    const res = await request(app).get('/employeeTransactions');
    expect(res.statusCode).toBe(200);
    expect(res.body.transactions.length).toBe(2);
  });
});
