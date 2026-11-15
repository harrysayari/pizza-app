<?php
declare(strict_types=1);

namespace Pdp\Tests;

use Pdp\{Api, Steps, Store, Validator};
use PHPUnit\Framework\TestCase;

final class StoreAndApiTest extends TestCase
{
    private const NOW = 1_800_000_000;
    private Store $store;
    private Api $api;
    /** @var array{p256dh:string,auth:string} */
    private array $keys;

    protected function setUp(): void
    {
        $this->store = new Store(':memory:');
        $this->api = new Api($this->store, new Validator(new Steps()));
        $s = Keys::subscriber();
        $this->keys = ['p256dh' => $s['p256dh'], 'auth' => $s['auth']];
    }

    private function put(array $reminders, ?string $endpoint = null): int
    {
        return $this->api->handle('PUT', json_encode(['subscription' => ['endpoint' => $endpoint ?? Keys::ENDPOINT, 'keys' => $this->keys], 'reminders' => $reminders]), self::NOW);
    }

    private function r(string $id, int $in = 900, bool $silent = false): array
    {
        return ['stepId' => $id, 'endAt' => self::NOW + $in, 'silent' => $silent];
    }

    public function testStoresOnlyTheFixedColumnsAndNothingElse(): void
    {
        $this->assertSame(204, $this->put([$this->r('poolish-rest-open')]));
        $rows = $this->store->all();
        $this->assertCount(1, $rows);
        $this->assertSame(
            ['auth', 'end_at', 'endpoint', 'p256dh', 'repeat_due', 'repeat_sent_at', 'sent_at', 'silent', 'step_id'],
            (function () use ($rows) { $k = array_keys($rows[0]); sort($k); return $k; })(),
        );
        $this->assertSame(self::NOW + 900 + 300, (int) $rows[0]['repeat_due']);
    }

    public function testPutReplacesTheWholeSetForAPhone(): void
    {
        $this->put([$this->r('poolish-rest-open'), $this->r('poolish-fridge', 3600)]);
        $this->put([$this->r('poolish-fridge', 3600)]);
        $this->assertSame(['poolish-fridge'], array_column($this->store->all(), 'step_id'));
        $this->put([]);
        $this->assertSame([], $this->store->all());
    }

    public function testOtherPhonesAreUntouched(): void
    {
        $this->put([$this->r('poolish-rest-open')]);
        $this->put([$this->r('poolish-fridge')], 'https://updates.push.services.mozilla.com/x');
        $this->put([]);
        $this->assertSame(['https://updates.push.services.mozilla.com/x'], array_column($this->store->all(), 'endpoint'));
    }

    public function testRepeatingTheSameRequestKeepsTheSentState(): void
    {
        $this->put([$this->r('poolish-rest-open')]);
        $this->store->markSent(Keys::ENDPOINT, 'poolish-rest-open', self::NOW + 900);
        $this->put([$this->r('poolish-rest-open')]);
        $this->assertNotNull($this->store->all()[0]['sent_at']);
    }

    public function testAMovedEndTimeResetsTheRow(): void
    {
        $this->put([$this->r('poolish-rest-open')]);
        $this->store->markSent(Keys::ENDPOINT, 'poolish-rest-open', self::NOW + 900);
        $this->put([$this->r('poolish-rest-open', 960)]); // +1 min
        $row = $this->store->all()[0];
        $this->assertNull($row['sent_at']);
        $this->assertSame(self::NOW + 960, (int) $row['end_at']);
    }

    public function testDeleteRemovesEveryRowForThePhoneAndAlwaysAnswers204(): void
    {
        $this->put([$this->r('poolish-rest-open'), $this->r('poolish-fridge')]);
        $this->assertSame(204, $this->api->handle('DELETE', json_encode(['endpoint' => Keys::ENDPOINT]), self::NOW));
        $this->assertSame([], $this->store->all());
        $this->assertSame(204, $this->api->handle('DELETE', json_encode(['endpoint' => Keys::ENDPOINT]), self::NOW));
    }

    public function testStatusCodes(): void
    {
        $this->assertSame(405, $this->api->handle('GET', '', self::NOW));
        $this->assertSame(405, $this->api->handle('POST', '{}', self::NOW));
        $this->assertSame(413, $this->api->handle('PUT', str_repeat('x', Validator::MAX_BODY_BYTES + 1), self::NOW));
        $this->assertSame(400, $this->api->handle('PUT', 'not json', self::NOW));
        $this->assertSame(400, $this->api->handle('PUT', '[]', self::NOW));
        $this->assertSame(400, $this->api->handle('PUT', '{"subscription":{"endpoint":"https://evil.example/"},"reminders":[]}', self::NOW));
        $this->assertSame(204, $this->api->handle('PUT', json_encode(['subscription' => ['endpoint' => Keys::ENDPOINT, 'keys' => $this->keys], 'reminders' => []]), self::NOW));
    }

    public function testTheRowLimitAnswers429AndStoresNothingMore(): void
    {
        $pdo = new \ReflectionClass(Store::class);
        $store = new Store(':memory:');
        // Fill to the limit directly, then try one more.
        $reflect = $pdo->getProperty('pdo');
        $db = $reflect->getValue($store);
        $db->beginTransaction();
        $ins = $db->prepare("INSERT INTO reminder (endpoint, step_id, p256dh, auth, end_at, silent, repeat_due) VALUES (?, 'poolish-mix', 'p', 'a', ?, 0, ?)");
        for ($i = 0; $i < Store::MAX_ROWS; $i++) {
            $ins->execute(["https://fcm.googleapis.com/x$i", self::NOW + 60, self::NOW + 360]);
        }
        $db->commit();
        $api = new Api($store, new Validator(new Steps()));
        $body = json_encode(['subscription' => ['endpoint' => Keys::ENDPOINT, 'keys' => $this->keys], 'reminders' => [$this->r('poolish-mix')]]);
        $this->assertSame(429, $api->handle('PUT', $body, self::NOW));
        $this->assertSame(Store::MAX_ROWS, $store->count());
        // A phone already stored can still update its own row at the limit.
        $own = json_encode(['subscription' => ['endpoint' => 'https://fcm.googleapis.com/x0', 'keys' => $this->keys], 'reminders' => [$this->r('poolish-mix')]]);
        $this->assertSame(204, $api->handle('PUT', $own, self::NOW));
    }

    public function testRowsAreDeletedMoreThan24HoursAfterTheirEndTime(): void
    {
        $this->put([$this->r('poolish-fridge', 3600)]);
        $end = self::NOW + 3600;
        $this->assertSame(0, $this->store->purge($end + 86400));
        $this->assertCount(1, $this->store->all());
        $this->assertSame(1, $this->store->purge($end + 86401));
        $this->assertSame([], $this->store->all());
    }
}
