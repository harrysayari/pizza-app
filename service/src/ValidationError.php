<?php
declare(strict_types=1);

namespace Pdp;

final class ValidationError extends \RuntimeException
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}
