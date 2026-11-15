<?php
// A stand-in for a push service: records each request and answers 201 Created.
$dir = getenv('MOCK_PUSH_DIR');
file_put_contents($dir . '/requests.log', json_encode([
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI'],
    'headers' => array_change_key_case(getallheaders(), CASE_LOWER),
    'body' => base64_encode(file_get_contents('php://input')),
]) . "\n", FILE_APPEND);
http_response_code(201);
