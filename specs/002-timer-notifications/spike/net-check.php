<?php
// Spike S0, check 2: can this host reach the push services over HTTPS? Run:  php net-check.php
// Any HTTP status (even 404 or 405) counts as reachable. It only asks for the front page of each host.
$hosts = [
    'Google (Android Chrome)' => 'https://fcm.googleapis.com/',
    'Mozilla (Firefox)'       => 'https://updates.push.services.mozilla.com/',
    'Apple (iPhone Home Screen app)' => 'https://web.push.apple.com/',
];
$bad = 0;
foreach ($hosts as $name => $url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_NOBODY => true]);
    curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    if ($status > 0) echo "OK    $name: HTTP $status\n";
    else { echo "FAIL  $name: $error\n"; $bad++; }
}
echo $bad === 0 ? "All reachable.\n" : "$bad unreachable: the service cannot send from this host.\n";
exit($bad === 0 ? 0 : 1);
