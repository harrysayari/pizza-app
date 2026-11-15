<?php
declare(strict_types=1);

namespace Pdp;

/** The two endpoints of contracts/reminders-api.md, with no HTTP in it so it can be tested directly. */
final class Api
{
    public function __construct(private Store $store, private Validator $validator)
    {
    }

    /** @return int the HTTP status to answer with (the reply never carries user data) */
    public function handle(string $method, string $rawBody, int $now): int
    {
        if ($method !== 'PUT' && $method !== 'DELETE') {
            return 405;
        }
        if (strlen($rawBody) > Validator::MAX_BODY_BYTES) {
            return 413;
        }
        try {
            $body = json_decode($rawBody, true, 8, JSON_THROW_ON_ERROR);
            if ($method === 'DELETE') {
                $this->store->deleteEndpoint($this->validator->delete($body));
                return 204; // the same whether or not anything was stored
            }
            $put = $this->validator->put($body, $now);
            return $this->store->replace($put['endpoint'], $put['p256dh'], $put['auth'], $put['reminders']) ? 204 : 429;
        } catch (ValidationError $e) {
            return $e->status;
        } catch (\JsonException) {
            return 400;
        }
    }
}
