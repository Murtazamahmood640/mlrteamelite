import { expect } from 'chai';
import sinon from 'sinon';
import { register, login, me, updateProfile } from '../controllers/auth.controller.js';
import User from '../models/user.models.js';
import * as expressValidator from 'express-validator';
import * as jwtUtils from '../utils/jwt.js';

describe('Auth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      user: { _id: 'userId', role: 'participant' }
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    next = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('register', () => {
    it('should return 400 if validation errors exist', async () => {
      sinon.replace(expressValidator, 'validationResult', sinon.stub().returns({ isEmpty: () => false, array: () => ['error'] }));

      await register(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ errors: ['error'] })).to.be.true;
    });

    it('should return 409 if user already exists', async () => {
      sinon.replace(expressValidator, 'validationResult', sinon.stub().returns({ isEmpty: () => true }));

      const findOneStub = sinon.stub(User, 'findOne').resolves({});

      req.body = { username: 'test', email: 'test@example.com', password: 'pass', fullName: 'Test User' };

      await register(req, res);

      expect(res.status.calledWith(409)).to.be.true;
      expect(res.json.calledWith({ message: 'User already exists' })).to.be.true;
    });

    it('should create user and return 201 on successful registration', async () => {
      sinon.replace(expressValidator, 'validationResult', sinon.stub().returns({ isEmpty: () => true }));

      const findOneStub = sinon.stub(User, 'findOne').resolves(null);
      const createStub = sinon.stub(User, 'create').resolves({
        toObject: () => ({ username: 'test', email: 'test@example.com' })
      });

      req.body = { username: 'test', email: 'test@example.com', password: 'pass', fullName: 'Test User' };

      await register(req, res);

      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
    });
  });

  describe('login', () => {
    it('should return 401 if user not found', async () => {
      const findOneStub = sinon.stub(User, 'findOne').resolves(null);

      req.body = { email: 'test@example.com', password: 'pass' };

      await login(req, res);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({ message: 'Invalid credentials' })).to.be.true;
    });

    it('should return 401 if password does not match', async () => {
      const userStub = { comparePassword: sinon.stub().resolves(false) };
      const findOneStub = sinon.stub(User, 'findOne').resolves(userStub);

      req.body = { email: 'test@example.com', password: 'pass' };

      await login(req, res);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({ message: 'Invalid credentials' })).to.be.true;
    });

    it('should return 403 if email not verified', async () => {
      const userStub = {
        comparePassword: sinon.stub().resolves(true),
        emailVerified: false
      };
      const findOneStub = sinon.stub(User, 'findOne').resolves(userStub);

      req.body = { email: 'test@example.com', password: 'pass' };

      await login(req, res);

      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledWithMatch({ message: 'Please verify your email before logging in' })).to.be.true;
    });

    it('should return token on successful login', async () => {
      const userStub = {
        comparePassword: sinon.stub().resolves(true),
        emailVerified: true,
        _id: 'userId',
        role: 'participant',
        toObject: () => ({})
      };
      const findOneStub = sinon.stub(User, 'findOne').resolves(userStub);
      sinon.replace(jwtUtils, 'signToken', sinon.stub().returns('token'));

      req.body = { email: 'test@example.com', password: 'pass' };

      await login(req, res);

      expect(res.json.calledWithMatch({ token: 'token' })).to.be.true;
    });
  });

  describe('me', () => {
    it('should return user data', () => {
      req.user = { _id: 'userId', username: 'test' };

      me(req, res);

      expect(res.json.calledWith({ user: req.user })).to.be.true;
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const findByIdAndUpdateStub = sinon.stub(User, 'findByIdAndUpdate').resolves({});

      req.body = { fullName: 'Updated Name' };

      await updateProfile(req, res);

      expect(findByIdAndUpdateStub.calledWith('userId', { fullName: 'Updated Name' }, { new: true, select: '-password' })).to.be.true;
      expect(res.json.calledWithMatch({ user: {} })).to.be.true;
    });
  });
});