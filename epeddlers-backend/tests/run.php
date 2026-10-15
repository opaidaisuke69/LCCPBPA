<?php
declare(strict_types=1);

/**
 * ePeddlers API test suite.
 *
 * Usage:  php tests/run.php [base_url]
 * Default base: http://127.0.0.1:8099/api/v1
 *
 * Requires: the API server running and the DB seeded with the dev accounts.
 * Tests are additive and clean up where practical; run against a dev database.
 */

require __DIR__ . '/TestClient.php';

$base = $argv[1] ?? 'http://127.0.0.1:8099/api/v1';
$anon = new TestClient($base);

echo "ePeddlers API tests against $base\n\n";

// --- Health ---------------------------------------------------------------
echo "[health]\n";
Assert::status($anon->request('GET', '/health'), 200, 'health endpoint responds');

// --- Authentication --------------------------------------------------------
echo "\n[auth]\n";
$bad = $anon->request('POST', '/auth/login', ['username' => 'admin', 'password' => 'nope']);
Assert::status($bad, 401, 'invalid credentials rejected');

$noAuth = $anon->request('GET', '/auth/me');
Assert::status($noAuth, 401, 'unauthenticated /me rejected');

$admin = $anon->login('admin', 'Admin@123');
$inspector = $anon->login('inspector', 'Inspect@123');
$sanitary = $anon->login('sanitary', 'Sanitary@123');
$treasury = $anon->login('treasury', 'Treasury@123');
Assert::ok(true, 'all dev roles can log in');

$me = $admin->request('GET', '/auth/me');
Assert::ok(($me['body']['data']['roles'][0]['code'] ?? '') === 'admin', 'admin /me returns admin role');

// --- Permissions / RBAC ----------------------------------------------------
echo "\n[permissions]\n";
Assert::status($inspector->request('POST', '/users', [
    'full_name' => 'x', 'username' => 'x', 'email' => 'x@y.z', 'roles' => ['admin'],
]), 403, 'inspector cannot create users');

Assert::status($treasury->request('POST', '/users', [
    'full_name' => 'x', 'username' => 'x', 'email' => 'x@y.z', 'roles' => ['admin'],
]), 403, 'treasury cannot create users');

Assert::status($sanitary->request('POST', '/inspections', [
    'application_id' => 1, 'recommendation' => 'approve',
]), 403, 'sanitary officer cannot conduct inspection');

Assert::status($inspector->request('GET', '/activity-logs'), 403, 'inspector cannot read activity logs');

// --- API validation --------------------------------------------------------
echo "\n[validation]\n";
Assert::status($anon->request('POST', '/applications', ['type' => 'invalid']), 422, 'invalid application type rejected');
Assert::status($anon->request('POST', '/applications', ['applicant_name' => 'No Type']), 422, 'missing required type rejected');

// --- Workflow transitions (full lifecycle) ---------------------------------
echo "\n[workflow]\n";
$create = $anon->request('POST', '/applications', [
    'type' => 'new', 'applicant_name' => 'Test Suite Applicant', 'contact_number' => '09170000000',
]);
Assert::status($create, 201, 'public can create application');
$code = $create['body']['data']['application_code'];
$pin = $create['body']['data']['track_pin'];
Assert::ok(!empty($code) && !empty($pin), 'application returns code + PIN');

// Tracking with wrong PIN
Assert::status($anon->request('GET', '/track?code=' . $code . '&pin=000000'), 404, 'wrong tracking PIN rejected');
Assert::status($anon->request('GET', '/track?code=' . $code . '&pin=' . $pin), 200, 'correct tracking PIN accepted');

// Submit
Assert::status($anon->request('POST', "/applications/$code/submit", ['track_pin' => $pin]), 200, 'application submitted');

// Approve-too-early guard
Assert::status($admin->request('POST', "/applications/$code/approve"), 422, 'cannot approve before ready');

// Review -> pending_inspection
Assert::status($admin->request('POST', "/applications/$code/review"), 200, 'admin review forwards to inspection');
$appId = $admin->request('GET', "/applications/$code")['body']['data']['id'];

// Inspection approve -> pending_sanitary_review
$insp = $inspector->request('POST', '/inspections', [
    'application_id' => $appId, 'compliance' => 'compliant', 'recommendation' => 'approve',
]);
Assert::status($insp, 201, 'inspector creates inspection');
Assert::status($inspector->request('POST', "/inspections/{$insp['body']['data']['id']}/submit"), 200, 'inspection submitted');
$afterInsp = $admin->request('GET', "/applications/$code")['body']['data']['status'];
Assert::ok($afterInsp === 'pending_sanitary_review', "status is pending_sanitary_review (got $afterInsp)");

// Sanitary approve -> awaiting_payment
$san = $sanitary->request('POST', '/sanitary-inspections', [
    'application_id' => $appId, 'compliance' => 'compliant', 'decision' => 'approve',
]);
Assert::status($san, 201, 'sanitary creates review');
Assert::status($sanitary->request('POST', "/sanitary-inspections/{$san['body']['data']['id']}/submit"), 200, 'sanitary submitted');
$afterSan = $admin->request('GET', "/applications/$code")['body']['data']['status'];
Assert::ok($afterSan === 'awaiting_payment', "status is awaiting_payment (got $afterSan)");

// Treasury verify -> ready_for_final_approval (payment clearance separate from approval)
Assert::status($treasury->request('POST', "/treasury/payments/$code/verify", [
    'result' => 'verified', 'amount' => 100.00, 'remarks' => 'OR#TEST',
]), 200, 'treasury verifies payment');
$afterPay = $admin->request('GET', "/applications/$code")['body']['data']['status'];
Assert::ok($afterPay === 'ready_for_final_approval', "payment clearance != approval (got $afterPay)");

// Final approval issues permit
$approve = $admin->request('POST', "/applications/$code/approve");
Assert::status($approve, 200, 'admin issues permit');
Assert::ok(!empty($approve['body']['data']['permit']['permit_code']), 'permit code returned');

// --- Financial transactions (collection idempotency) -----------------------
echo "\n[financial]\n";
// Ensure arkabala fee has an amount for this test.
$peddlerCode = null;
$qr = null;
$permit = $approve['body']['data']['permit'];
$peddlerId = $permit['peddler_id'];

$catList = $inspector->request('GET', '/collections/fee-categories')['body']['data'];
$arkabala = null;
foreach ($catList as $c) {
    if (($c['kind'] ?? '') === 'arkabala') { $arkabala = $c; break; }
}
if ($arkabala && (float)($arkabala['amount'] ?? 0) > 0) {
    $idem = 'test-' . bin2hex(random_bytes(6));
    $c1 = $inspector->request('POST', '/collections', [
        'peddler_id' => $peddlerId, 'fee_category_id' => (int)$arkabala['id'],
    ], ['X-Idempotency-Key' => $idem]);
    Assert::status($c1, 201, 'collection recorded');
    $amount = $c1['body']['data']['amount'];
    Assert::ok((float)$amount === (float)$arkabala['amount'], 'collection amount is server-authoritative');

    $c2 = $inspector->request('POST', '/collections', [
        'peddler_id' => $peddlerId, 'fee_category_id' => (int)$arkabala['id'],
    ], ['X-Idempotency-Key' => $idem]);
    Assert::ok(($c2['body']['data']['duplicate'] ?? false) === true, 'idempotency prevents double collection');
} else {
    Assert::ok(true, 'SKIP collection (no arkabala fee amount configured) — not a failure');
}

// --- Saturday-only report restriction --------------------------------------
echo "\n[saturday-report]\n";
$weekly = $treasury->request('GET', '/treasury/reports/weekly');
Assert::status($weekly, 200, 'weekly report viewable any day');
$isSat = (bool)($weekly['body']['data']['is_saturday_today'] ?? false);
$gen = $treasury->request('POST', '/treasury/reports/weekly/generate');
if ($isSat) {
    Assert::status($gen, 200, 'generation allowed on Saturday');
} else {
    Assert::status($gen, 422, 'generation blocked on non-Saturday');
}

// --- Reports ----------------------------------------------------------------
echo "\n[reports]\n";
Assert::status($admin->request('GET', '/reports/applications'), 200, 'applications report');
Assert::status($admin->request('GET', '/reports/collections'), 200, 'collections report');
Assert::status($admin->request('GET', '/reports/violations'), 200, 'violations report');
Assert::status($treasury->request('GET', '/reports/applications'), 200, 'treasury can view reports');

// --- Notifications ----------------------------------------------------------
echo "\n[notifications]\n";
$notif = $admin->request('GET', '/notifications');
Assert::status($notif, 200, 'notifications list');
Assert::ok(isset($notif['body']['meta']['unread']), 'notifications report unread count');

exit(Assert::summary());
