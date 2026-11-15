# Spike S0: can DreamHost run the reminder service? (task T040)

Three checks, about 10 minutes. These scripts only read the host's settings, call the front pages of
the push services and write one small log file. They contain no secrets. Delete the `spike` folder on
the server afterwards. Do not put them in the web folder.

## 1. Log in over SSH
`ssh wp_j9udin@dp-943f94a73a.dreamhostps.com` (the same user and password as SFTP; if SSH is refused
that is already an answer: write it down).

## 2. Put the scripts on the server
Upload the four `.php` files into a new folder `~/spike` (outside the web folder), with SFTP or:
`scp -r specs/002-timer-notifications/spike wp_j9udin@dp-943f94a73a.dreamhostps.com:~/`

## 3. Run the checks (on the server)
```
cd ~/spike
php -v
php env-check.php      # every line should say ok
php net-check.php      # should print "All reachable."
```

## 4. Cron every minute
```
crontab -l                                   # see what is there first; do not remove other lines
(crontab -l 2>/dev/null; echo '* * * * * php $HOME/spike/cron-tick.php') | crontab -
```
Wait 6 minutes, then: `php ~/spike/cron-report.php`

- `PASS` means cron runs about once a minute.
- `FAIL ... every 15 minutes` means the host limits cron. A reminder could be up to 15 minutes late.
- If `crontab` is not allowed, check the DreamHost panel for a Cron Jobs page (some account types have
  none) and write down what it offers.

## 5. Clean up
```
crontab -l | grep -v spike/cron-tick | crontab -
rm -rf ~/spike
```

## What to tell me
The output of `php -v`, `env-check.php`, `net-check.php`, `cron-report.php`, and any error. Then the
plan decides: pass (build the service here), or fail (a different place to run it).
