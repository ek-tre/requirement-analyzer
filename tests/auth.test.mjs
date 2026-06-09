import test from 'node:test';
import assert from 'node:assert/strict';
import authHandler from '../api/auth.js';

const createRes = () => {
  const headers = {};
  return {
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
    getHeader(name) {
      return headers[name];
    },
  };
};

test('auth fails closed when env is missing', () => {
  const prevPassword = process.env.SITE_PASSWORD;
  const prevSecret = process.env.AUTH_SECRET;

  delete process.env.SITE_PASSWORD;
  delete process.env.AUTH_SECRET;

  const req = { method: 'POST', body: { password: 'anything' }, headers: {} };
  const res = createRes();

  authHandler(req, res);

  assert.equal(res.statusCode, 500);
  assert.match(res.body.error, /not configured/i);

  if (prevPassword === undefined) {
    delete process.env.SITE_PASSWORD;
  } else {
    process.env.SITE_PASSWORD = prevPassword;
  }

  if (prevSecret === undefined) {
    delete process.env.AUTH_SECRET;
  } else {
    process.env.AUTH_SECRET = prevSecret;
  }
});

test('auth sets cookie when password is valid', () => {
  const prevPassword = process.env.SITE_PASSWORD;
  const prevSecret = process.env.AUTH_SECRET;

  process.env.SITE_PASSWORD = 'strong-pass';
  process.env.AUTH_SECRET = 'strong-secret';

  const req = {
    method: 'POST',
    body: { password: 'strong-pass' },
    headers: { 'x-forwarded-proto': 'https' },
  };
  const res = createRes();

  authHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.match(res.getHeader('Set-Cookie'), /auth-token=strong-secret/);

  if (prevPassword === undefined) {
    delete process.env.SITE_PASSWORD;
  } else {
    process.env.SITE_PASSWORD = prevPassword;
  }

  if (prevSecret === undefined) {
    delete process.env.AUTH_SECRET;
  } else {
    process.env.AUTH_SECRET = prevSecret;
  }
});
