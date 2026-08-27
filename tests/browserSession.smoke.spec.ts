import { expect, test } from '@playwright/test';

const webOrigin = 'https://web.relisten.localhost:5173';

test('signs in through a development persona and clears the session on logout', async ({
  page,
}) => {
  await page.goto('/auth/session/start?return_to=%2Fbrowser-session-development');
  await expect(page).toHaveURL(/^https:\/\/auth\.relisten\.localhost:5443\/development\/sign-in/);

  await page.getByRole('button', { name: /Alice · ordinary Google email/ }).click();
  await expect(page).toHaveURL(`${webOrigin}/browser-session-development`);
  await expect(page.getByTestId('browser-session-development-page')).toBeVisible();

  const resources = await page.evaluate(async () => {
    const [meResponse, snapshotResponse] = await Promise.all([
      fetch('/v1/me', { credentials: 'include', cache: 'no-store' }),
      fetch('/v1/library/snapshot', { credentials: 'include', cache: 'no-store' }),
    ]);
    const me = (await meResponse.json()) as Record<string, unknown>;
    const snapshot = (await snapshotResponse.json()) as Record<string, unknown>;
    return {
      meStatus: meResponse.status,
      meContractVersion: me.contract_version,
      hasUserUuid: typeof me.user_uuid === 'string',
      hasNativeSessionUuid: Object.hasOwn(me, 'native_session_uuid'),
      snapshotStatus: snapshotResponse.status,
      snapshotContractVersion: snapshot.contract_version,
    };
  });
  expect(resources).toEqual({
    meStatus: 200,
    meContractVersion: 1,
    hasUserUuid: true,
    hasNativeSessionUuid: false,
    snapshotStatus: 200,
    snapshotContractVersion: 1,
  });

  const logout = await page.evaluate(async () => {
    const csrfResponse = await fetch('/api/user/v1/csrf', {
      credentials: 'include',
      cache: 'no-store',
    });
    const csrf = (await csrfResponse.json()) as { request_token: string };
    const response = await fetch('/auth/session/logout', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'X-Relisten-CSRF': csrf.request_token },
    });
    const body = (await response.json()) as { navigation_url: string };
    return { status: response.status, navigationUrl: body.navigation_url };
  });
  expect(logout.status).toBe(200);

  await page.goto(logout.navigationUrl);
  await expect(page).toHaveURL(`${webOrigin}/`);
  expect(
    await page.evaluate(async () =>
      fetch('/v1/me', { credentials: 'include', cache: 'no-store' }).then(
        (response) => response.status
      )
    )
  ).toBe(401);
});
