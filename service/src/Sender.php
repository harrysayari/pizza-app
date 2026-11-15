<?php
declare(strict_types=1);

namespace Pdp;

/**
 * Sends what is due, never early (a reminder before the timer ends would mislead the cook), and
 * never as stale news (a message more than 10 minutes late is dropped, as its TTL says).
 */
final class Sender
{
    public const STALE_AFTER_SECONDS = 600;

    public function __construct(private Store $store, private Steps $steps, private PushClient $client)
    {
    }

    /** @return array{sent:int,repeats:int,failed:int,stale:int,gone:int,purged:int} */
    public function run(int $now): array
    {
        $n = ['sent' => 0, 'repeats' => 0, 'failed' => 0, 'stale' => 0, 'gone' => 0, 'purged' => 0];
        foreach ($this->store->due($now) as $row) {
            $dueAt = $row['kind'] === 'end' ? (int) $row['end_at'] : (int) $row['repeat_due'];
            $title = $this->steps->title($row['step_id']);
            if ($title === null || $now - $dueAt > self::STALE_AFTER_SECONDS) {
                $this->store->delete($row['endpoint'], $row['step_id']);
                $n['stale']++;
                continue;
            }
            $payload = json_encode(
                ['v' => 1, 'kind' => $row['kind'], 'stepId' => $row['step_id'], 'title' => $title, 'silent' => (bool) $row['silent']],
                JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE,
            );
            try {
                $result = $this->client->send(['endpoint' => $row['endpoint'], 'p256dh' => $row['p256dh'], 'auth' => $row['auth']], $payload);
            } catch (\Throwable) {
                $n['failed']++; // tried again next minute until it goes stale
                continue;
            }
            if ($result->gone) {
                $this->store->deleteEndpoint($row['endpoint']);
                $n['gone']++;
            } elseif (!$result->ok) {
                $n['failed']++;
            } elseif ($row['kind'] === 'end') {
                $this->store->markSent($row['endpoint'], $row['step_id'], $now);
                $n['sent']++;
            } else {
                $this->store->delete($row['endpoint'], $row['step_id']); // the repeat was the last message
                $n['repeats']++;
            }
        }
        $n['purged'] = $this->store->purge($now);
        $this->store->setMeta('last_run', $now);
        return $n;
    }
}
