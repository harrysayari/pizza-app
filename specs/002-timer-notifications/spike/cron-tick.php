<?php
// Spike S0, check 1: the cron job runs this every minute. It adds one line to ticks.log.
file_put_contents(__DIR__ . '/ticks.log', time() . ' ' . gmdate('c') . "\n", FILE_APPEND | LOCK_EX);
