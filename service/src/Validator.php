<?php
declare(strict_types=1);

namespace Pdp;

/**
 * Everything the service accepts (specs/002 contracts/reminders-api.md). Anything else is refused,
 * so the service cannot be used to send any message but the fixed timer-end one (FR-024).
 */
final class Validator
{
    public const MAX_BODY_BYTES = 2048;
    public const MAX_REMINDERS = 4;
    public const MAX_AHEAD_SECONDS = 48 * 3600;
    public const MAX_PAST_SECONDS = 60;

    /** A push address must be https on one of these hosts or a sub-host of one (exact suffix match). */
    public const PUSH_DOMAINS = [
        'fcm.googleapis.com',
        'push.services.mozilla.com',
        'push.apple.com',
        'notify.windows.com',
    ];

    public function __construct(private Steps $steps)
    {
    }

    public function endpoint(mixed $value): string
    {
        if (!is_string($value) || $value === '' || strlen($value) > 512) {
            throw new ValidationError(400, 'endpoint');
        }
        if (preg_match('/[\x00-\x20\x7f\\\\]/', $value) === 1) {
            throw new ValidationError(400, 'endpoint');
        }
        $parts = parse_url($value);
        if ($parts === false || ($parts['scheme'] ?? '') !== 'https' || !isset($parts['host'])
            || isset($parts['user']) || isset($parts['pass']) || (isset($parts['port']) && $parts['port'] !== 443)
            || isset($parts['fragment'])) {
            throw new ValidationError(400, 'endpoint');
        }
        $host = strtolower($parts['host']);
        foreach (self::PUSH_DOMAINS as $domain) {
            if ($host === $domain || str_ends_with($host, '.' . $domain)) {
                return $value;
            }
        }
        throw new ValidationError(400, 'endpoint');
    }

    private static function b64url(mixed $value, int $bytes): string
    {
        if (!is_string($value) || preg_match('/^[A-Za-z0-9_-]+$/', $value) !== 1) {
            throw new ValidationError(400, 'keys');
        }
        $raw = base64_decode(strtr($value, '-_', '+/') . str_repeat('=', (4 - strlen($value) % 4) % 4), true);
        if ($raw === false || strlen($raw) !== $bytes) {
            throw new ValidationError(400, 'keys');
        }
        return $value;
    }

    /**
     * @return array{endpoint:string,p256dh:string,auth:string,reminders:list<array{stepId:string,endAt:int,silent:bool}>}
     */
    public function put(mixed $body, int $now): array
    {
        if (!is_array($body) || array_is_list($body) || array_diff(array_keys($body), ['subscription', 'reminders']) !== []) {
            throw new ValidationError(400, 'body');
        }
        $sub = $body['subscription'] ?? null;
        if (!is_array($sub) || array_diff(array_keys($sub), ['endpoint', 'keys', 'expirationTime']) !== []) {
            throw new ValidationError(400, 'subscription');
        }
        $endpoint = $this->endpoint($sub['endpoint'] ?? null);
        $keys = $sub['keys'] ?? null;
        if (!is_array($keys) || array_diff(array_keys($keys), ['p256dh', 'auth']) !== []) {
            throw new ValidationError(400, 'keys');
        }
        $p256dh = self::b64url($keys['p256dh'] ?? null, 65);
        $auth = self::b64url($keys['auth'] ?? null, 16);

        $list = $body['reminders'] ?? null;
        if (!is_array($list) || !array_is_list($list) || count($list) > self::MAX_REMINDERS) {
            throw new ValidationError(400, 'reminders');
        }
        $out = [];
        $seen = [];
        foreach ($list as $r) {
            if (!is_array($r) || array_diff(array_keys($r), ['stepId', 'endAt', 'silent']) !== []) {
                throw new ValidationError(400, 'reminder');
            }
            $id = $r['stepId'] ?? null;
            if (!is_string($id) || !$this->steps->has($id) || isset($seen[$id])) {
                throw new ValidationError(400, 'stepId');
            }
            $endAt = $r['endAt'] ?? null;
            if (!is_int($endAt) || $endAt < $now - self::MAX_PAST_SECONDS || $endAt > $now + self::MAX_AHEAD_SECONDS) {
                throw new ValidationError(400, 'endAt');
            }
            if (!is_bool($r['silent'] ?? null)) {
                throw new ValidationError(400, 'silent');
            }
            $seen[$id] = true;
            $out[] = ['stepId' => $id, 'endAt' => $endAt, 'silent' => $r['silent']];
        }
        return ['endpoint' => $endpoint, 'p256dh' => $p256dh, 'auth' => $auth, 'reminders' => $out];
    }

    public function delete(mixed $body): string
    {
        if (!is_array($body) || array_keys($body) !== ['endpoint']) {
            throw new ValidationError(400, 'body');
        }
        return $this->endpoint($body['endpoint']);
    }
}
