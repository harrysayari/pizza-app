<?php
declare(strict_types=1);

namespace Pdp\Tests;

use Pdp\Steps;
use PHPUnit\Framework\TestCase;

final class StepsTest extends TestCase
{
    public function testHasTheFourteenRecipeSteps(): void
    {
        $steps = new Steps();
        $this->assertCount(14, $steps->ids());
        $this->assertSame('Mix the poolish', $steps->title('poolish-mix'));
        $this->assertNull($steps->title('nope'));
    }
}
