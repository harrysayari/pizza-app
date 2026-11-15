<?php
declare(strict_types=1);

namespace Pdp;

/** The fixed list of step ids and titles (generated from the recipe by `npm run steps`). */
final class Steps
{
    /** @var array<string,string> */
    private array $titles = [];

    public function __construct(?string $file = null)
    {
        $data = json_decode((string) file_get_contents($file ?? __DIR__ . '/steps.json'), true, 8, JSON_THROW_ON_ERROR);
        foreach ($data as $step) {
            $this->titles[$step['id']] = $step['title'];
        }
    }

    public function has(string $id): bool
    {
        return isset($this->titles[$id]);
    }

    public function title(string $id): ?string
    {
        return $this->titles[$id] ?? null;
    }

    /** @return list<string> */
    public function ids(): array
    {
        return array_keys($this->titles);
    }
}
