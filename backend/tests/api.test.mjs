// End-to-end API test suite — dependency-free (Node 20+ global fetch).
const API = process.env.API_URL || 'http://localhost:5001/api';
let pass = 0;
let fail = 0;

function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log('✓', name, extra);
  } else {
    fail++;
    console.log('✗', name, extra);
  }
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, data };
}

async function main() {
  // fail fast with a clear message if the server is not running
  const health = await fetch(`${API}/health`).catch(() => null);
  if (!health || !health.ok) {
    console.error(`Backend not reachable at ${API} — start it with "npm run dev" first.`);
    process.exit(1);
  }

  // ---- security hardening ----
  const sec = await fetch(`${API}/health`);
  check('helmet security headers present', sec.headers.get('x-content-type-options') === 'nosniff');
  check('rate-limit header present', !!sec.headers.get('ratelimit'));

  // ---- auth + validation ----
  const admin = await req('POST', '/auth/login', { body: { email: 'admin@foodmaza.com', password: 'Admin@123' } });
  check('admin login + ADMIN role', admin.status === 200 && admin.data?.user?.role === 'ADMIN');
  const adminToken = admin.data?.token;

  const cust = await req('POST', '/auth/login', { body: { email: 'customer@foodmaza.com', password: 'Customer@123' } });
  check('seed customer login', cust.status === 200);
  const custToken = cust.data?.token;

  const badEmail = await req('POST', '/auth/register', { body: { name: 'X', email: 'not-an-email', password: 'pass123' } });
  check('register rejects invalid email -> 400', badEmail.status === 400);
  const weakPw = await req('POST', '/auth/register', { body: { name: 'X', email: 'x@test.com', password: '123' } });
  check('register rejects short password -> 400', weakPw.status === 400);
  const dupEmail = await req('POST', '/auth/register', { body: { name: 'X', email: 'admin@foodmaza.com', password: 'pass123' } });
  check('register rejects duplicate email -> 409', dupEmail.status === 409);
  const wrongPw = await req('POST', '/auth/login', { body: { email: 'admin@foodmaza.com', password: 'wrong' } });
  check('login rejects wrong password -> 401', wrongPw.status === 401);

  const email = `e2e${Date.now()}@test.com`;
  const reg = await req('POST', '/auth/register', { body: { name: 'E2E Tester', email, password: 'pass123' } });
  check('fresh customer registers -> 201 + always CUSTOMER', reg.status === 201 && reg.data?.user?.role === 'CUSTOMER');
  const token = reg.data?.token;

  // ---- menu: public read, admin-only CRUD ----
  check('GET /menu public', (await req('GET', '/menu')).status === 200);
  const forbidden = await req('POST', '/menu', { token, body: { name: 'Hack', price: 1 } });
  check('customer cannot create menu -> 403', forbidden.status === 403);
  const negPrice = await req('POST', '/menu', { token: adminToken, body: { name: 'Bad', price: -5 } });
  check('admin create rejects negative price -> 400', negPrice.status === 400);

  const created = await req('POST', '/menu', {
    token: adminToken,
    body: { name: `E2E Special ${Date.now()}`, category: 'Test', price: 250, description: 'created by test suite' },
  });
  check('admin creates menu item -> 201', created.status === 201);
  const itemId = created.data?.item?.id;
  const updated = await req('PUT', `/menu/${itemId}`, { token: adminToken, body: { price: 275 } });
  check('admin updates price', updated.status === 200 && updated.data?.item?.price === 275);

  // ---- order: server-side bill math ----
  const order = await req('POST', '/orders', { token, body: { items: [{ menuItemId: itemId, quantity: 2 }] } });
  check('place order -> 201, bill = 2 x 275', order.status === 201 && order.data?.order?.total === 550);
  check('order starts PENDING + UNPAID', order.data?.order?.status === 'PENDING' && order.data?.order?.paymentStatus === 'PENDING');
  const badItems = await req('POST', '/orders', { token, body: { items: [] } });
  check('empty order rejected -> 400', badItems.status === 400);

  // ---- fake payment ----
  const oid = order.data.order.id;
  const pay = await req('POST', `/orders/${oid}/pay`, { token });
  check('fake payment -> PAID + paidAt', pay.status === 200 && pay.data?.order?.paymentStatus === 'PAID' && !!pay.data?.order?.paidAt);
  const payAgain = await req('POST', `/orders/${oid}/pay`, { token });
  check('double payment blocked -> 409', payAgain.status === 409);
  const payForeign = await req('POST', `/orders/${oid}/pay`, { token: custToken });
  check("paying someone else's order -> 404", payForeign.status === 409 || payForeign.status === 404);

  // review is only allowed once the order is READY — verify the gate now,
  // while the order is still PENDING
  const early = await req('POST', '/reviews', { token, body: { orderId: oid, text: 'too early' } });
  check('review before READY -> 409', early.status === 409);

  // ---- kitchen status flow ----
  check('GET /orders requires auth -> 401', (await req('GET', '/orders')).status === 401);
  check('GET /orders forbids customers -> 403', (await req('GET', '/orders', { token })).status === 403);
  const skip = await req('PATCH', `/orders/${oid}/status`, { token: adminToken, body: { status: 'READY' } });
  check('PENDING -> READY (skipping) blocked -> 409', skip.status === 409);
  const cook = await req('PATCH', `/orders/${oid}/status`, { token: adminToken, body: { status: 'COOKING' } });
  check('PENDING -> COOKING ok', cook.status === 200 && cook.data?.order?.status === 'COOKING');
  const ready = await req('PATCH', `/orders/${oid}/status`, { token: adminToken, body: { status: 'READY' } });
  check('COOKING -> READY ok', ready.status === 200 && ready.data?.order?.status === 'READY');

  // ---- reviews: order-linked, AI sentiment, update re-analyzes ----
  const review = await req('POST', '/reviews', {
    token,
    body: { orderId: oid, text: 'Awful, cold and soggy. Total waste of money, very disappointed.' },
  });
  check('create review -> 201 with NEGATIVE sentiment', review.status === 201 && review.data?.review?.sentiment === 'NEGATIVE');
  const dupReview = await req('POST', '/reviews', { token, body: { orderId: oid, text: 'again' } });
  check('duplicate order review -> 409', dupReview.status === 409);
  const edited = await req('PUT', `/reviews/${review.data.review.id}`, {
    token,
    body: { text: 'Reheated it and it became crispy and delicious — wonderful, loved every bite!' },
  });
  check('edit review re-analyzes -> POSITIVE', edited.status === 200 && edited.data?.review?.sentiment === 'POSITIVE');
  const mine = await req('GET', '/orders/mine', { token });
  check('orders/mine includes the review', mine.data?.orders?.some((o) => o.id === oid && o.review?.sentiment === 'POSITIVE'));

  // ---- AI recommendations ----
  const rec = await req('GET', '/recommendations', { token });
  check('GET /recommendations auth required', (await req('GET', '/recommendations')).status === 401);
  check('recommendations200 + strategy set', rec.status === 200 && !!rec.data?.strategy, rec.data?.strategy);
  check('excludes already-ordered item', (rec.data?.items ?? []).every((i) => i.id !== itemId));
  check('similarity scores present', (rec.data?.items ?? []).every((i) => typeof i.similarity === 'number'));

  // ---- cleanup test menu item ----
  await req('DELETE', `/menu/${itemId}`, { token: adminToken });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
