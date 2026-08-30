---
name: srusa-data-refresh
description: Update srusa-sandbox Minecraft data, including live server stats, daily deltas, activity calendar logs, player assets, and 2D/limited 3D map assets.
metadata:
  short-description: Refresh SRUSA Minecraft data safely
---

# SRUSA Data Refresh

Use this skill when updating data for `srusa-sandbox`, especially Minecraft stats, daily player data, activity calendar logs, inventory assets, skins, or world maps.

## Default Routes

- For already extracted local data in `../aws_minecraft/data/`, use `npm run refresh:data:local -- <targets>`.
- For current live server stats, player daily data, and activity calendar logs, use `npm run refresh:live`.
- For BlueMap 2D map PNGs, render in `../srusa-portal/bluemap` first, then use `npm run refresh:data:local -- map`.

## Live Server Data

`npm run refresh:live` is the preferred all-in-one command for updating the stats page, player daily summaries, and activity calendar from the current server:

```bash
npm run refresh:live
npm run refresh:live -- --date 20260830
```

It retrieves only the data needed for public stats and calendar views:

- `world/stats`
- `world/advancements`
- `/opt/minecraft/logs`

It does not retrieve 3D BlueMap data.

Non-obvious constraints:

- AWS SSO may require a device-code login.
- Do not include BlueMap 3D tiles, full-world render output, or other bulky 3D data in routine backups or live refresh archives. Back up only the minimal source data needed for the requested public view unless the user explicitly asks for 3D data.
- If the command starts the EC2 instance, it should stop it at the end unless `--keep-instance` is explicitly passed.
- `mc-logs-YYYYMMDD.tar.gz` must be extracted to `../aws_minecraft/data/mc-logs-YYYYMMDD/` before `extract:logs` can read it.
- `minecraft-stats-YYYYMMDD.json` is generated from the newest `player-data-by-date-YYYYMMDD.json` snapshot and must keep UUID/AWS fields redacted.

## World Maps

For 2D maps:

```bash
cd ../srusa-portal/bluemap
./render.sh
cd -
npm run refresh:data:local -- map
```

For one dimension:

```bash
cd ../srusa-portal/bluemap
./render.sh -r nether
cd -
npm run refresh:data:local -- nether
```

For the limited 3D spawn map, use only the existing `overworld_spawn` BlueMap output. Do not add full-world 3D data to `srusa-sandbox`.

## Verification

After data changes, run at least:

```bash
npm run check:world-map
npm run typecheck
npm run lint
```

For UI or public asset changes, prefer the full build:

```bash
npm run build
```

Update `docs/data-update-runbook.md` when a repeated data procedure changes, and record completed work in `TODO.md` under the current date.
