<?php
declare(strict_types=1);

namespace Pdp\Tests;

use Minishlink\WebPush\VAPID;
use Pdp\{Api, Sender, Steps, Store, Validator, WebPushClient};
use PHPUnit\Framework\TestCase;

/**
 * The real sending code against a local stand-in for a push service. The payload is decrypted with a
 * phone's own keys, so this proves what a phone would actually receive.
 */
final class WebPushClientTest extends TestCase
{
    private static $server;
    private static string $dir;
    private static int $port;

    public static function setUpBeforeClass(): void
    {
        self::$dir = sys_get_temp_dir() . '/pdp-mock-' . bin2hex(random_bytes(4));
        mkdir(self::$dir);
        self::$port = random_int(20000, 40000);
        self::$server = proc_open(
            [PHP_BINARY, '-S', '127.0.0.1:' . self::$port, __DIR__ . '/mock-push.php'],
            [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']],
            $pipes,
            null,
            ['MOCK_PUSH_DIR' => self::$dir],
        );
        for ($i = 0; $i < 50; $i++) {
            if (@fsockopen('127.0.0.1', self::$port)) {
                return;
            }
            usleep(100_000);
        }
        self::fail('the mock push server did not start');
    }

    public static function tearDownAfterClass(): void
    {
        proc_terminate(self::$server);
        @unlink(self::$dir . '/requests.log');
        @rmdir(self::$dir);
    }

    public function testAPhoneCanDecryptExactlyTheFixedMessage(): void
    {
        $vapid = VAPID::createVapidKeys();
        $sub = Keys::subscriber();
        $endpoint = 'http://127.0.0.1:' . self::$port . '/push/abc';

        $store = new Store(':memory:');
        $store->replace($endpoint, $sub['p256dh'], $sub['auth'], [['stepId' => 'poolish-fridge', 'endAt' => 1_800_000_000, 'silent' => true]]);
        $client = new WebPushClient(['subject' => 'https://designandinspire.com.au/pizza/', 'publicKey' => $vapid['publicKey'], 'privateKey' => $vapid['privateKey']]);
        $counts = (new Sender($store, new Steps(), $client))->run(1_800_000_000);
        $this->assertSame(1, $counts['sent'], json_encode($counts));

        $req = json_decode(trim((string) file_get_contents(self::$dir . '/requests.log')), true);
        $this->assertSame('POST', $req['method']);
        $this->assertSame('/push/abc', $req['uri']);
        $this->assertSame('aes128gcm', $req['headers']['content-encoding']);
        $this->assertSame('600', $req['headers']['ttl']);
        $this->assertSame('high', $req['headers']['urgency']);
        $this->assertStringStartsWith('vapid t=', $req['headers']['authorization']);
        $this->assertStringContainsString('k=' . $vapid['publicKey'], $req['headers']['authorization']);

        $plain = Keys::decrypt(base64_decode($req['body']), $sub);
        $this->assertSame(
            ['v' => 1, 'kind' => 'end', 'stepId' => 'poolish-fridge', 'title' => 'Into the fridge', 'silent' => true],
            json_decode($plain, true),
        );
        $this->assertStringNotContainsString($endpoint, $plain, 'the message carries no address');
    }
}
