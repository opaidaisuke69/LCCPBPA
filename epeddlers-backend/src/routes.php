<?php
declare(strict_types=1);

/**
 * API v1 route definitions.
 * Controllers for later phases are referenced as they are implemented.
 */

use ePeddlers\Controllers\ActivityLogController;
use ePeddlers\Controllers\ApplicationController;
use ePeddlers\Controllers\AuthController;
use ePeddlers\Controllers\CollectionController;
use ePeddlers\Controllers\DashboardController;
use ePeddlers\Controllers\DocumentController;
use ePeddlers\Controllers\InspectionController;
use ePeddlers\Controllers\NotificationController;
use ePeddlers\Controllers\PeddlerController;
use ePeddlers\Controllers\ReportController;
use ePeddlers\Controllers\QrController;
use ePeddlers\Controllers\SanitaryController;
use ePeddlers\Controllers\TreasuryController;
use ePeddlers\Controllers\UserController;
use ePeddlers\Controllers\ViolationController;
use ePeddlers\Router;

/** @var Router $router */

// --- Health ---------------------------------------------------------------
$router->get('/api/v1/health', function (): void {
    \ePeddlers\Response::ok(['status' => 'ok', 'time' => gmdate('c')]);
});

// --- Authentication --------------------------------------------------------
$router->post('/api/v1/auth/login',           fn() => (new AuthController())->login());
$router->post('/api/v1/auth/logout',          fn() => (new AuthController())->logout());
$router->get('/api/v1/auth/me',               fn() => (new AuthController())->me());
$router->post('/api/v1/auth/change-password', fn() => (new AuthController())->changePassword());

// --- Users (admin) ---------------------------------------------------------
$router->get('/api/v1/users',                   fn() => (new UserController())->index());
$router->post('/api/v1/users',                  fn() => (new UserController())->store());
$router->get('/api/v1/users/roles',             fn() => (new UserController())->roles());
$router->get('/api/v1/users/{id}',              fn($p) => (new UserController())->show($p));
$router->put('/api/v1/users/{id}',              fn($p) => (new UserController())->update($p));
$router->patch('/api/v1/users/{id}/status',     fn($p) => (new UserController())->setStatus($p));
$router->post('/api/v1/users/{id}/reset-password', fn($p) => (new UserController())->resetPassword($p));

// --- Applications: PUBLIC --------------------------------------------------
$router->post('/api/v1/applications',           fn() => (new ApplicationController())->store());
$router->post('/api/v1/applications/{code}/submit', fn($p) => (new ApplicationController())->submit($p));
$router->post('/api/v1/applications/{code}/documents', fn($p) => (new DocumentController())->upload($p));
$router->get('/api/v1/track',                    fn() => (new ApplicationController())->track());

// --- Applications: AUTH ----------------------------------------------------
$router->get('/api/v1/applications',             fn() => (new ApplicationController())->index());
$router->get('/api/v1/applications/{id}',        fn($p) => (new ApplicationController())->show($p));
$router->get('/api/v1/applications/{id}/timeline', fn($p) => (new ApplicationController())->timeline($p));
$router->post('/api/v1/applications/{id}/review', fn($p) => (new ApplicationController())->review($p));
$router->post('/api/v1/applications/{id}/approve', fn($p) => (new ApplicationController())->approve($p));
$router->post('/api/v1/applications/{id}/reject', fn($p) => (new ApplicationController())->reject($p));
$router->post('/api/v1/applications/{id}/return-for-correction', fn($p) => (new ApplicationController())->returnForCorrection($p));

// --- Documents (auth download) ---------------------------------------------
$router->get('/api/v1/documents/{id}/download',  fn($p) => (new DocumentController())->download($p));

// --- Dashboard & activity (admin) ------------------------------------------
$router->get('/api/v1/dashboard/admin',          fn() => (new DashboardController())->admin());
$router->get('/api/v1/activity-logs',             fn() => (new ActivityLogController())->index());
$router->get('/api/v1/reports/activity-logs',     fn() => (new ActivityLogController())->index());

// --- Inspections -----------------------------------------------------------
$router->get('/api/v1/inspections',               fn() => (new InspectionController())->index());
$router->post('/api/v1/inspections',              fn() => (new InspectionController())->store());
$router->get('/api/v1/inspections/{id}',          fn($p) => (new InspectionController())->show($p));
$router->post('/api/v1/inspections/{id}/submit',  fn($p) => (new InspectionController())->submit($p));

// --- Sanitary reviews ------------------------------------------------------
$router->get('/api/v1/sanitary-inspections',             fn() => (new SanitaryController())->index());
$router->post('/api/v1/sanitary-inspections',            fn() => (new SanitaryController())->store());
$router->post('/api/v1/sanitary-inspections/{id}/submit', fn($p) => (new SanitaryController())->submit($p));

// --- QR --------------------------------------------------------------------
$router->post('/api/v1/qr/resolve',               fn() => (new QrController())->resolve());

// --- Peddlers --------------------------------------------------------------
$router->get('/api/v1/peddlers',                  fn() => (new PeddlerController())->index());
$router->get('/api/v1/peddlers/{id}',             fn($p) => (new PeddlerController())->show($p));
$router->get('/api/v1/peddlers/{id}/permits',     fn($p) => (new PeddlerController())->permits($p));
$router->get('/api/v1/peddlers/{id}/violations',  fn($p) => (new PeddlerController())->violations($p));

// --- Violations ------------------------------------------------------------
$router->get('/api/v1/violations',                fn() => (new ViolationController())->index());
$router->get('/api/v1/violations/categories',     fn() => (new ViolationController())->categories());
$router->post('/api/v1/violations',               fn() => (new ViolationController())->store());
$router->get('/api/v1/violations/{id}',           fn($p) => (new ViolationController())->show($p));
$router->patch('/api/v1/violations/{id}',         fn($p) => (new ViolationController())->update($p));

// --- Collections (mobile arkabala) -----------------------------------------
$router->get('/api/v1/collections',               fn() => (new CollectionController())->history());
$router->post('/api/v1/collections',              fn() => (new CollectionController())->store());
$router->get('/api/v1/collections/fee-categories', fn() => (new CollectionController())->feeCategories());

// --- Treasury --------------------------------------------------------------
$router->get('/api/v1/treasury/dashboard',            fn() => (new TreasuryController())->dashboard());
$router->get('/api/v1/treasury/applicants',           fn() => (new TreasuryController())->applicants());
$router->get('/api/v1/treasury/payments/{id}',        fn($p) => (new TreasuryController())->paymentDetail($p));
$router->post('/api/v1/treasury/payments/{id}/verify', fn($p) => (new TreasuryController())->verify($p));
$router->get('/api/v1/treasury/collections',          fn() => (new TreasuryController())->collections());
$router->post('/api/v1/treasury/collections/{id}/reverse', fn($p) => (new TreasuryController())->reverseCollection($p));
$router->get('/api/v1/treasury/reports/weekly',       fn() => (new TreasuryController())->weeklyReport());
$router->post('/api/v1/treasury/reports/weekly/generate', fn() => (new TreasuryController())->generateWeekly());

// --- Reports ---------------------------------------------------------------
$router->get('/api/v1/reports/applications', fn() => (new ReportController())->applications());
$router->get('/api/v1/reports/collections',  fn() => (new ReportController())->collections());
$router->get('/api/v1/reports/inspections',  fn() => (new ReportController())->inspections());
$router->get('/api/v1/reports/violations',   fn() => (new ReportController())->violations());

// --- Notifications ---------------------------------------------------------
$router->get('/api/v1/notifications',             fn() => (new NotificationController())->index());
$router->post('/api/v1/notifications/read-all',   fn() => (new NotificationController())->markAllRead());
$router->post('/api/v1/notifications/{id}/read',  fn($p) => (new NotificationController())->markRead($p));
