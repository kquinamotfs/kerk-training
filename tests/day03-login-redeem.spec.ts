import { test, expect } from '@playwright/test';

test('Alice can log in and redeem reward r1', async ({ request }) => {
  const loginResponse = await request.post('/api/auth/login', {
    data: {
      email: 'alice@sandbox.local',
      password: 'Passw0rd!',
    },
  });

  expect(loginResponse.status()).toBe(200);

  const loginBody = await loginResponse.json();

  expect(loginBody.token).toBeTruthy();
  expect(loginBody.points).toEqual(expect.any(Number));

  const startingPoints = loginBody.points;

  const redeemResponse = await request.post('/api/redeem', {
    headers: {
      Authorization: `Bearer ${loginBody.token}`,
    },
    data: {
      rewardId: 'r1',
    },
  });

  expect(redeemResponse.status()).toBe(200);

  const redeemBody = await redeemResponse.json();

  expect(redeemBody.remainingPoints).toBe(startingPoints - 100);
});