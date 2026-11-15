<?php
// Copy to config.php on the server and fill it in. config.php is git-ignored: never commit it.
// Create the keys with:  php bin/generate-vapid.php
return [
    // Where the SQLite file lives. Keep it in a folder the web server refuses to serve (see data/.htaccess).
    'db_path' => __DIR__ . '/data/reminders.sqlite',
    // Sent to the push services as the sender's contact. Use the site address, never an email address.
    'vapid_subject' => 'https://designandinspire.com.au/pizza/',
    'vapid_public' => '',
    'vapid_private' => '',
];
