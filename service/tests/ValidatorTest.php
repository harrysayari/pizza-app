<?php
declare(strict_types=1);

namespace Pdp\Tests;

use Pdp\{Steps, ValidationError, Validator};
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ValidatorTest extends TestCase
{
    private const NOW = 1_800_000_000;

    private function validator(): Validator
    {
        return new Validator(new Steps());
    }

    private function body(array $over = []): array
    {
        $s = Keys::subscriber();
        return array_replace_recursive([
            'subscription' => ['endpoint' => Keys::ENDPOINT, 'keys' => ['p256dh' => $s['p256dh'], 'auth' => $s['auth']]],
            'reminders' => [['stepId' => 'poolish-rest-open', 'endAt' => self::NOW + 900, 'silent' => false]],
        ], $over);
    }

    private function statusOf(callable $f): int
    {
        try {
            $f();
        } catch (ValidationError $e) {
            return $e->status;
        }
        return 0;
    }

    public function testAcceptsAValidRequest(): void
    {
        $out = $this->validator()->put($this->body(), self::NOW);
        $this->assertSame(Keys::ENDPOINT, $out['endpoint']);
        $this->assertSame([['stepId' => 'poolish-rest-open', 'endAt' => self::NOW + 900, 'silent' => false]], $out['reminders']);
    }

    public function testAcceptsABrowserSubscriptionWithExpirationTime(): void
    {
        $b = $this->body();
        $b['subscription']['expirationTime'] = null;
        $this->assertCount(1, $this->validator()->put($b, self::NOW)['reminders']);
    }

    public function testAnEmptyListIsAValidCancel(): void
    {
        $b = $this->body();
        $b['reminders'] = [];
        $this->assertSame([], $this->validator()->put($b, self::NOW)['reminders']);
    }

    /** @return array<string,array{string}> */
    public static function goodEndpoints(): array
    {
        return [
            'google' => ['https://fcm.googleapis.com/fcm/send/x'],
            'mozilla' => ['https://updates.push.services.mozilla.com/wpush/v2/x'],
            'apple' => ['https://web.push.apple.com/QAbc'],
            'windows' => ['https://wns2-par02p.notify.windows.com/w/?token=x'],
        ];
    }

    #[DataProvider('goodEndpoints')]
    public function testAllowsTheKnownPushServices(string $endpoint): void
    {
        $this->assertSame($endpoint, $this->validator()->endpoint($endpoint));
    }

    /** @return array<string,array{mixed}> */
    public static function badEndpoints(): array
    {
        return [
            'http' => ['http://fcm.googleapis.com/x'],
            'other host' => ['https://example.com/x'],
            'look-alike query' => ['https://evil.example/?fcm.googleapis.com'],
            'look-alike prefix' => ['https://fcm.googleapis.com.evil.example/x'],
            'look-alike suffix' => ['https://evilfcm.googleapis.com/x'],
            'user info' => ['https://fcm.googleapis.com@evil.example/x'],
            'user info 2' => ['https://user:pw@fcm.googleapis.com/x'],
            'odd port' => ['https://fcm.googleapis.com:8443/x'],
            'fragment' => ['https://fcm.googleapis.com/x#y'],
            'ip address' => ['https://127.0.0.1/x'],
            'localhost' => ['https://localhost/x'],
            'space' => ['https://fcm.googleapis.com/x y'],
            'backslash' => ['https://evil.example\\@fcm.googleapis.com/'],
            'empty' => [''],
            'not a string' => [123],
            'too long' => ['https://fcm.googleapis.com/' . str_repeat('a', 600)],
        ];
    }

    #[DataProvider('badEndpoints')]
    public function testRefusesAnythingElse(mixed $endpoint): void
    {
        $this->assertSame(400, $this->statusOf(fn () => $this->validator()->endpoint($endpoint)));
    }

    public function testRefusesBadKeys(): void
    {
        foreach ([['p256dh' => 'short'], ['auth' => 'AAAA'], ['p256dh' => 123], ['auth' => '!!!']] as $keys) {
            $this->assertSame(400, $this->statusOf(fn () => $this->validator()->put($this->body(['subscription' => ['keys' => $keys]]), self::NOW)));
        }
    }

    public function testRefusesUnknownFieldsAnywhere(): void
    {
        $this->assertSame(400, $this->statusOf(fn () => $this->validator()->put($this->body() + ['plan' => 'x'], self::NOW)));
        $this->assertSame(400, $this->statusOf(fn () => $this->validator()->put($this->body(['subscription' => ['name' => 'Harry']]), self::NOW)));
        $this->assertSame(400, $this->statusOf(fn () => $this->validator()->put($this->body(['reminders' => [['title' => 'Hello']]]), self::NOW)));
    }

    public function testRefusesAStepThatIsNotInTheFixedList(): void
    {
        $this->assertSame(400, $this->statusOf(fn () => $this->validator()->put($this->body(['reminders' => [['stepId' => 'free text']]]), self::NOW)));
    }

    public function testRefusesTooManyOrDuplicateReminders(): void
    {
        $ids = (new Steps())->ids();
        $five = array_map(fn ($id) => ['stepId' => $id, 'endAt' => self::NOW + 60, 'silent' => false], array_slice($ids, 0, 5));
        $this->assertSame(400, $this->statusOf(fn () => $this->validator()->put(['subscription' => $this->body()['subscription'], 'reminders' => $five], self::NOW)));
        $dup = [$five[0], $five[0]];
        $this->assertSame(400, $this->statusOf(fn () => $this->validator()->put(['subscription' => $this->body()['subscription'], 'reminders' => $dup], self::NOW)));
    }

    public function testChecksTheEndTimeWindow(): void
    {
        $with = fn (mixed $endAt) => $this->body(['reminders' => [['endAt' => $endAt]]]);
        $this->assertSame(0, $this->statusOf(fn () => $this->validator()->put($with(self::NOW - 60), self::NOW)));
        $this->assertSame(0, $this->statusOf(fn () => $this->validator()->put($with(self::NOW + 48 * 3600), self::NOW)));
        $this->assertSame(400, $this->statusOf(fn () => $this->validator()->put($with(self::NOW - 61), self::NOW)));
        $this->assertSame(400, $this->statusOf(fn () => $this->validator()->put($with(self::NOW + 48 * 3600 + 1), self::NOW)));
        $this->assertSame(400, $this->statusOf(fn () => $this->validator()->put($with('soon'), self::NOW)));
        $this->assertSame(400, $this->statusOf(fn () => $this->validator()->put($with(1.5), self::NOW)));
    }

    public function testSilentMustBeABoolean(): void
    {
        $this->assertSame(400, $this->statusOf(fn () => $this->validator()->put($this->body(['reminders' => [['silent' => 'yes']]]), self::NOW)));
    }

    public function testDeleteTakesOnlyAnEndpoint(): void
    {
        $this->assertSame(Keys::ENDPOINT, $this->validator()->delete(['endpoint' => Keys::ENDPOINT]));
        $this->assertSame(400, $this->statusOf(fn () => $this->validator()->delete(['endpoint' => Keys::ENDPOINT, 'x' => 1])));
        $this->assertSame(400, $this->statusOf(fn () => $this->validator()->delete(['endpoint' => 'https://evil.example/'])));
    }
}
