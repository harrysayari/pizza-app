<?php
declare(strict_types=1);

namespace Pdp\Tests;

use Pdp\{Api, PushClient, PushResult, Sender, Steps, Store, Validator};
use PHPUnit\Framework\TestCase;

/** Records every message instead of sending it. */
final class FakeClient implements PushClient
{
    /** @var list<array{endpoint:string,payload:array<string,mixed>}> */
    public array $sent = [];
    public PushResult $next;

    public function __construct()
    {
        $this->next = new PushResult(true, false, 201);
    }

    public function send(array $subscription, string $payload): PushResult
    {
        $this->sent[] = ['endpoint' => $subscription['endpoint'], 'payload' => json_decode($payload, true)];
        return $this->next;
    }
}

final class SenderTest extends TestCase
{
    private const NOW = 1_800_000_000;
    private const END = self::NOW + 900;

    private Store $store;
    private Api $api;
    private FakeClient $client;
    private Sender $sender;

    protected function setUp(): void
    {
        $this->store = new Store(':memory:');
        $steps = new Steps();
        $this->api = new Api($this->store, new Validator($steps));
        $this->client = new FakeClient();
        $this->sender = new Sender($this->store, $steps, $this->client);
        $this->register([['stepId' => 'poolish-rest-open', 'endAt' => self::END, 'silent' => false]]);
    }

    private function register(array $reminders): void
    {
        $s = Keys::subscriber();
        $this->api->handle('PUT', json_encode(['subscription' => ['endpoint' => Keys::ENDPOINT, 'keys' => ['p256dh' => $s['p256dh'], 'auth' => $s['auth']]], 'reminders' => $reminders]), self::NOW);
    }

    public function testNeverSendsBeforeTheEndTime(): void
    {
        $this->sender->run(self::END - 1);
        $this->assertSame([], $this->client->sent);
    }

    public function testSendsTheFixedMessageAtTheEndTime(): void
    {
        $counts = $this->sender->run(self::END);
        $this->assertSame(1, $counts['sent']);
        $this->assertSame(
            ['v' => 1, 'kind' => 'end', 'stepId' => 'poolish-rest-open', 'title' => 'Rest uncovered', 'silent' => false],
            $this->client->sent[0]['payload'],
        );
        $this->assertSame(Keys::ENDPOINT, $this->client->sent[0]['endpoint']);
    }

    public function testDoesNotSendTheFirstMessageTwice(): void
    {
        $this->sender->run(self::END);
        $this->sender->run(self::END + 60);
        $this->assertCount(1, $this->client->sent);
    }

    public function testSendsOneRepeatFiveMinutesLaterAndNoThird(): void
    {
        $this->sender->run(self::END);
        $this->sender->run(self::END + 299);
        $this->assertCount(1, $this->client->sent);
        $this->sender->run(self::END + 300);
        $this->assertCount(2, $this->client->sent);
        $this->assertSame('repeat', $this->client->sent[1]['payload']['kind']);
        $this->sender->run(self::END + 360);
        $this->sender->run(self::END + 3600);
        $this->assertCount(2, $this->client->sent);
        $this->assertSame([], $this->store->all(), 'the row is gone once the repeat is sent');
    }

    public function testASyncThatDropsTheStepCancelsTheRepeat(): void
    {
        $this->sender->run(self::END);
        $this->register([]); // the user opened the app or acted
        $this->sender->run(self::END + 300);
        $this->assertCount(1, $this->client->sent);
    }

    public function testACancelBeforeTheEndSendsNothing(): void
    {
        $this->register([]);
        $this->sender->run(self::END + 10);
        $this->assertSame([], $this->client->sent);
    }

    public function testTheSilentFlagIsCarried(): void
    {
        $this->register([['stepId' => 'poolish-rest-open', 'endAt' => self::END, 'silent' => true]]);
        $this->sender->run(self::END);
        $this->assertTrue($this->client->sent[0]['payload']['silent']);
    }

    public function testAnAddressThePushServiceCallsGoneIsForgotten(): void
    {
        $this->client->next = new PushResult(false, true, 410);
        $counts = $this->sender->run(self::END);
        $this->assertSame(1, $counts['gone']);
        $this->assertSame([], $this->store->all());
    }

    public function testAFailedSendIsTriedAgainThenDroppedAsStale(): void
    {
        $this->client->next = new PushResult(false, false, 503);
        $this->assertSame(1, $this->sender->run(self::END)['failed']);
        $this->assertSame(1, $this->sender->run(self::END + 60)['failed']);
        $this->client->next = new PushResult(true, false, 201);
        $this->assertSame(1, $this->sender->run(self::END + 120)['sent']);

        $late = new Store(':memory:');
        $s = new Sender($late, new Steps(), $this->client);
        $keys = Keys::subscriber();
        $late->replace(Keys::ENDPOINT, $keys['p256dh'], $keys['auth'], [['stepId' => 'poolish-mix', 'endAt' => self::END, 'silent' => false]]);
        $before = count($this->client->sent);
        $this->assertSame(1, $s->run(self::END + Sender::STALE_AFTER_SECONDS + 1)['stale']);
        $this->assertCount($before, $this->client->sent, 'a message more than 10 minutes late is not sent');
    }

    public function testAThrowingClientDoesNotStopTheRun(): void
    {
        $client = new class implements PushClient {
            public function send(array $subscription, string $payload): PushResult
            {
                throw new \RuntimeException('network down');
            }
        };
        $counts = (new Sender($this->store, new Steps(), $client))->run(self::END);
        $this->assertSame(1, $counts['failed']);
        $this->assertCount(1, $this->store->all());
    }

    public function testRunPurgesOldRowsAndRecordsAHeartbeat(): void
    {
        $this->assertNull($this->store->getMeta('last_run'));
        $far = self::END + 86400 + 10;
        $counts = $this->sender->run($far);
        $this->assertSame(0, $counts['sent'], 'too old to send');
        $this->assertSame([], $this->store->all());
        $this->assertSame($far, $this->store->getMeta('last_run'));
    }
}
