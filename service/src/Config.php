<?php
declare(strict_types=1);

namespace Pdp;

/** Settings from config.php (never in git; see config.example.php). */
final class Config
{
    /** @param array{db_path:string,vapid_subject:string,vapid_public:string,vapid_private:string} $values */
    private function __construct(public readonly array $values)
    {
    }

    public static function load(string $file): self
    {
        if (!is_file($file)) {
            throw new \RuntimeException('config.php is missing');
        }
        $values = require $file;
        foreach (['db_path', 'vapid_subject', 'vapid_public', 'vapid_private'] as $key) {
            if (!is_array($values) || !isset($values[$key]) || !is_string($values[$key]) || $values[$key] === '') {
                throw new \RuntimeException("config.php needs $key");
            }
        }
        return new self($values);
    }

    /** @return array{subject:string,publicKey:string,privateKey:string} */
    public function vapid(): array
    {
        return ['subject' => $this->values['vapid_subject'], 'publicKey' => $this->values['vapid_public'], 'privateKey' => $this->values['vapid_private']];
    }
}
