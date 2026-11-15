<?php
// Spike S0, check 3: can this host run the reminder service? Run:  php env-check.php
$need = ['openssl', 'curl', 'mbstring', 'pdo_sqlite', 'json'];
$either = ['gmp', 'bcmath'];
echo 'PHP ' . PHP_VERSION . ' (' . PHP_SAPI . ")\n";
foreach ($need as $ext) echo str_pad($ext, 12) . (extension_loaded($ext) ? 'ok' : 'MISSING') . "\n";
$hasMath = array_filter($either, 'extension_loaded');
echo str_pad('gmp/bcmath', 12) . ($hasMath ? 'ok (' . implode(', ', $hasMath) . ')' : 'MISSING (need one)') . "\n";
echo str_pad('curl https', 12) . (extension_loaded('curl') && in_array('https', curl_version()['protocols'] ?? [], true) ? 'ok' : 'MISSING') . "\n";
echo 'memory_limit ' . ini_get('memory_limit') . ', max_execution_time ' . ini_get('max_execution_time') . "\n";
