<?php
declare(strict_types=1);

namespace Pdp\Tests;

/** Test helpers: a phone's subscription keys, and the phone's side of Web Push decryption (RFC 8291). */
final class Keys
{
    public const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc123';

    public static function b64(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }

    public static function unb64(string $s): string
    {
        return (string) base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4), true);
    }

    /** @return array{private:\OpenSSLAsymmetricKey,p256dh:string,auth:string,authRaw:string,pubRaw:string} */
    public static function subscriber(): array
    {
        $key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
        $d = openssl_pkey_get_details($key)['ec'];
        $pub = "\x04" . str_pad($d['x'], 32, "\0", STR_PAD_LEFT) . str_pad($d['y'], 32, "\0", STR_PAD_LEFT);
        $auth = random_bytes(16);
        return ['private' => $key, 'p256dh' => self::b64($pub), 'auth' => self::b64($auth), 'authRaw' => $auth, 'pubRaw' => $pub];
    }

    /** Decrypts an aes128gcm Web Push body for the subscriber, returning the plain text. */
    public static function decrypt(string $body, array $sub): string
    {
        $salt = substr($body, 0, 16);
        $idLen = ord($body[20]);
        $serverPub = substr($body, 21, $idLen);
        $cipher = substr($body, 21 + $idLen);

        $spki = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . $serverPub;
        $pem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n";
        $shared = openssl_pkey_derive(openssl_pkey_get_public($pem), $sub['private'], 32);

        $ikm = hash_hkdf('sha256', $shared, 32, "WebPush: info\0" . $sub['pubRaw'] . $serverPub, $sub['authRaw']);
        $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\0", $salt);
        $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\0", $salt);
        $plain = openssl_decrypt(substr($cipher, 0, -16), 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, substr($cipher, -16));
        if ($plain === false) {
            throw new \RuntimeException('could not decrypt');
        }
        return rtrim($plain, "\0\x01\x02"); // drop the padding delimiter
    }
}
