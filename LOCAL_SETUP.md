# Hermes Dashboard - Local Production Setup

## Quick Start
```bash
cd hermes-dashboard
npm run build
npm run start
# → http://localhost:3000
```

## Access from Other Devices
Find your local IP:
```bash
hostname -I
# or on Windows: ipconfig
```

Then access from any device on your network:
```
http://YOUR_IP:3000
```

## Data Source
The dashboard reads cron output directly from:
- `~/.hermes/cron/output/` — cron job run outputs
- `~/.hermes/state.db` — session database
- `~/.hermes/memory_store.db` — holographic memory

All data is read locally — no cloud dependency.

## Auto-Start on Boot (Optional)
Add to crontab:
```bash
@reboot cd /home/akhil/hermes-dashboard && npm run start &
```

## Environment Variables (Optional)
```bash
CRON_OUTPUT_DIR=/home/akhil/.hermes/cron/output  # default
STATE_DB=/home/akhil/.hermes/state.db            # default
PORT=3000                                         # default
```
