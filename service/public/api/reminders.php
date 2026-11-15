<?php
// The one public file: PUT and DELETE api/reminders (specs/002 contracts/reminders-api.md).
// The service's own files live in PDP_SERVICE_DIR, two folders above this one by default.
declare(strict_types=1);

$service = getenv('PDP_SERVICE_DIR') ?: dirname(__DIR__, 2) . '/pdp-reminders';
require $service . '/vendor/autoload.php';

use Pdp\{Api, Config, Steps, Store, Validator};

header('Cache-Control: no-store');
try {
    $config = Config::load(getenv('PDP_CONFIG') ?: $service . '/config.php');
    $api = new Api(new Store($config->values['db_path']), new Validator(new Steps()));
    // Read one byte more than the limit, so an oversize body is noticed.
    $body = (string) file_get_contents('php://input', false, null, 0, Pdp\Validator::MAX_BODY_BYTES + 1);
    $status = $api->handle($_SERVER['REQUEST_METHOD'] ?? '', $body, time());
} catch (Throwable) {
    $status = 503; // the app keeps working without the service (spec FR-026)
}
http_response_code($status);
