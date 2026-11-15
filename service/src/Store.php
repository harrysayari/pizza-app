<?php
declare(strict_types=1);

namespace Pdp;

/**
 * The only data the service keeps (specs/002 data-model.md): a phone's push address and keys, the
 * end time and a step id. No IP address, no user agent, no log of requests.
 */
final class Store
{
    public const MAX_ROWS = 5000;
    public const REPEAT_AFTER_SECONDS = 300;
    public const KEEP_AFTER_END_SECONDS = 86400; // FR-022: nothing is kept more than 24 h after its end time

    private \PDO $pdo;

    public function __construct(string $path)
    {
        $this->pdo = new \PDO('sqlite:' . $path);
        $this->pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $this->pdo->exec('PRAGMA busy_timeout = 5000');
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS reminder (
                endpoint TEXT NOT NULL,
                step_id TEXT NOT NULL,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                end_at INTEGER NOT NULL,
                silent INTEGER NOT NULL,
                sent_at INTEGER,
                repeat_due INTEGER NOT NULL,
                repeat_sent_at INTEGER,
                PRIMARY KEY (endpoint, step_id)
            )'
        );
        $this->pdo->exec('CREATE INDEX IF NOT EXISTS reminder_end ON reminder (end_at)');
        $this->pdo->exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v INTEGER NOT NULL)');
    }

    public function count(): int
    {
        return (int) $this->pdo->query('SELECT COUNT(*) FROM reminder')->fetchColumn();
    }

    /**
     * Make the stored set for one phone exactly `$reminders` (an empty list cancels everything).
     * A reminder whose end time is unchanged keeps its sent state, so a repeated request never sends twice.
     *
     * @param list<array{stepId:string,endAt:int,silent:bool}> $reminders
     * @return bool false when the row limit stops a new reminder being stored
     */
    public function replace(string $endpoint, string $p256dh, string $auth, array $reminders): bool
    {
        $this->pdo->beginTransaction();
        try {
            $rows = $this->pdo->prepare('SELECT step_id, end_at FROM reminder WHERE endpoint = ?');
            $rows->execute([$endpoint]);
            $existing = $rows->fetchAll(\PDO::FETCH_KEY_PAIR);
            $keep = array_column($reminders, 'stepId');
            foreach (array_keys($existing) as $step) {
                if (!in_array($step, $keep, true)) {
                    $this->pdo->prepare('DELETE FROM reminder WHERE endpoint = ? AND step_id = ?')->execute([$endpoint, $step]);
                    unset($existing[$step]);
                }
            }
            $total = $this->count();
            foreach ($reminders as $r) {
                $silent = $r['silent'] ? 1 : 0;
                if (isset($existing[$r['stepId']])) {
                    if ((int) $existing[$r['stepId']] === $r['endAt']) {
                        $this->pdo->prepare('UPDATE reminder SET p256dh = ?, auth = ?, silent = ? WHERE endpoint = ? AND step_id = ?')
                            ->execute([$p256dh, $auth, $silent, $endpoint, $r['stepId']]);
                    } else {
                        $this->pdo->prepare(
                            'UPDATE reminder SET p256dh = ?, auth = ?, silent = ?, end_at = ?, repeat_due = ?, sent_at = NULL, repeat_sent_at = NULL
                             WHERE endpoint = ? AND step_id = ?'
                        )->execute([$p256dh, $auth, $silent, $r['endAt'], $r['endAt'] + self::REPEAT_AFTER_SECONDS, $endpoint, $r['stepId']]);
                    }
                    continue;
                }
                if ($total >= self::MAX_ROWS) {
                    $this->pdo->rollBack();
                    return false;
                }
                $this->pdo->prepare(
                    'INSERT INTO reminder (endpoint, step_id, p256dh, auth, end_at, silent, repeat_due) VALUES (?, ?, ?, ?, ?, ?, ?)'
                )->execute([$endpoint, $r['stepId'], $p256dh, $auth, $r['endAt'], $silent, $r['endAt'] + self::REPEAT_AFTER_SECONDS]);
                $total++;
            }
            $this->pdo->commit();
            return true;
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    public function deleteEndpoint(string $endpoint): void
    {
        $this->pdo->prepare('DELETE FROM reminder WHERE endpoint = ?')->execute([$endpoint]);
    }

    /**
     * Messages that are due now: a first message at the end time, a repeat 5 minutes later.
     *
     * @return list<array{endpoint:string,step_id:string,p256dh:string,auth:string,end_at:int,silent:int,sent_at:?int,repeat_due:int,kind:string}>
     */
    public function due(int $now): array
    {
        $st = $this->pdo->prepare(
            "SELECT *, CASE WHEN sent_at IS NULL THEN 'end' ELSE 'repeat' END AS kind FROM reminder
             WHERE (sent_at IS NULL AND end_at <= :now) OR (sent_at IS NOT NULL AND repeat_sent_at IS NULL AND repeat_due <= :now)
             ORDER BY end_at"
        );
        $st->execute([':now' => $now]);
        return $st->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function markSent(string $endpoint, string $stepId, int $now): void
    {
        $this->pdo->prepare('UPDATE reminder SET sent_at = ? WHERE endpoint = ? AND step_id = ?')->execute([$now, $endpoint, $stepId]);
    }

    public function delete(string $endpoint, string $stepId): void
    {
        $this->pdo->prepare('DELETE FROM reminder WHERE endpoint = ? AND step_id = ?')->execute([$endpoint, $stepId]);
    }

    /** FR-022: delete anything more than 24 hours past its end time. Returns how many rows went. */
    public function purge(int $now): int
    {
        $st = $this->pdo->prepare('DELETE FROM reminder WHERE end_at < ?');
        $st->execute([$now - self::KEEP_AFTER_END_SECONDS]);
        return $st->rowCount();
    }

    public function setMeta(string $key, int $value): void
    {
        $this->pdo->prepare('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v')->execute([$key, $value]);
    }

    public function getMeta(string $key): ?int
    {
        $st = $this->pdo->prepare('SELECT v FROM meta WHERE k = ?');
        $st->execute([$key]);
        $v = $st->fetchColumn();
        return $v === false ? null : (int) $v;
    }

    /** @return list<array<string,mixed>> every row, for tests */
    public function all(): array
    {
        return $this->pdo->query('SELECT * FROM reminder ORDER BY endpoint, step_id')->fetchAll(\PDO::FETCH_ASSOC);
    }
}
