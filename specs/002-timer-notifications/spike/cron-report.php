<?php
// Read ticks.log and say whether cron really ran once a minute. Run:  php cron-report.php
$file = __DIR__ . '/ticks.log';
$lines = is_file($file) ? file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) : [];
$times = array_map(fn($l) => (int) explode(' ', $l)[0], $lines);
echo count($times) . " ticks\n";
if (count($times) < 2) { echo "Not enough ticks yet. Wait a few minutes and run this again.\n"; exit(1); }
$gaps = [];
for ($i = 1; $i < count($times); $i++) $gaps[] = $times[$i] - $times[$i - 1];
sort($gaps);
$median = $gaps[intdiv(count($gaps), 2)];
echo "gap between ticks: min {$gaps[0]} s, median $median s, max " . end($gaps) . " s\n";
echo $median <= 90 ? "PASS: cron runs about once a minute.\n" : "FAIL: cron runs about every " . round($median / 60) . " minutes.\n";
exit($median <= 90 ? 0 : 1);
