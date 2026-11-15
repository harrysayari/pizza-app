<?php
// Prints a new VAPID key pair. Put both in config.php; put the public key in the app's build
// (VITE_VAPID_PUBLIC_KEY). The private key must never be committed or shared.
require __DIR__ . '/../vendor/autoload.php';
$keys = Minishlink\WebPush\VAPID::createVapidKeys();
echo "public:  {$keys['publicKey']}\nprivate: {$keys['privateKey']}\n";
