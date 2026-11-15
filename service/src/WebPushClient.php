<?php
declare(strict_types=1);

namespace Pdp;

use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

/** Sends one standard Web Push (VAPID-signed, aes128gcm-encrypted) message. */
final class WebPushClient implements PushClient
{
    public const TTL_SECONDS = 600;

    private WebPush $push;

    /** @param array{subject:string,publicKey:string,privateKey:string} $vapid */
    public function __construct(array $vapid, ?\Psr\Http\Client\ClientInterface $http = null)
    {
        $this->push = new WebPush(
            ['VAPID' => $vapid],
            ['TTL' => self::TTL_SECONDS, 'urgency' => 'high'],
            $http,
        );
    }

    public function send(array $subscription, string $payload): PushResult
    {
        $report = $this->push->sendOneNotification(
            Subscription::create([
                'endpoint' => $subscription['endpoint'],
                'keys' => ['p256dh' => $subscription['p256dh'], 'auth' => $subscription['auth']],
                'contentEncoding' => 'aes128gcm',
            ]),
            $payload,
        );
        return new PushResult($report->isSuccess(), $report->isSubscriptionExpired(), $report->getResponse()?->getStatusCode() ?? 0);
    }
}
