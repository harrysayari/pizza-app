<?php
declare(strict_types=1);

namespace Pdp;

final class PushResult
{
    public function __construct(public readonly bool $ok, public readonly bool $gone, public readonly int $status)
    {
    }
}
