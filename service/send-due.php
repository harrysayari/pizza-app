<?php
// Run by cron every minute:  * * * * * php /path/to/send-due.php
// Sends the reminders that are due and deletes what is finished, cancelled, gone or too old.
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}
require __DIR__ . '/vendor/autoload.php';

use Pdp\{Config, Sender, Steps, Store, WebPushClient};

$config = Config::load(getenv('PDP_CONFIG') ?: __DIR__ . '/config.php');
$store = new Store($config->values['db_path']);
$counts = (new Sender($store, new Steps(), new WebPushClient($config->vapid())))->run(time());
// Counts only: no address, step or time is ever written to a log.
echo gmdate('c') . ' ' . json_encode($counts) . "\n";
