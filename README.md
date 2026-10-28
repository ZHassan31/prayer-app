# 🕌 Prayer Times

A self-hosted prayer times display built for a **home TV**. Shows the next prayer,
a live countdown, today's full schedule, and the Qibla direction.

Prayer times are computed **locally** with the [`adhan`](https://github.com/batoulapps/adhan-js)
library — no external API, no network dependency, no rate limits. It works even if
your internet goes down.

---

## Features

- **Next prayer + live countdown** — updates every second, rolls over to tomorrow's Fajr automatically
- **Full daily schedule** — Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha with Arabic names
- **Progress bar** between the previous and next prayer
- **Qibla bearing** from your coordinates
- **Hijri + Gregorian dates** (Umm al-Qura calendar, adjustable ±3 days)
- **12 calculation methods** + Hanafi/Shafi Asr, per-prayer minute adjustments
- **4 themes**, 12/24-hour clock, optional seconds
- **TV-optimised** — scales to any screen, hides the cursor when idle, keeps the screen awake
- **Kiosk mode** — `?kiosk` hides the settings button for a locked-down display
- **Offline-first** — settings stored in `localStorage`, no backend required

---

## Quick start (local development)

```bash
npm install
npm run dev
```

Open http://localhost:5173. On first run you'll be asked for your location.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `S` | Open / close settings |
| `F` | Toggle fullscreen |
| `Esc` | Close settings |

---

## Architecture

```
Browser (TV)  ──HTTP──▶  nginx container  ──▶  static React build
                              ▲
                              │ docker pull (every 60s)
                         Watchtower
                              ▲
                              │ push image on merge to main
                       GitHub Actions ──▶ GHCR
```

**Why this design?** The app is a static bundle, so there is no server to maintain,
no database, and nothing to back up. A merge to `main` builds a new image, and
Watchtower on the Proxmox container picks it up within a minute. The TV just needs
a page refresh (or a kiosk browser that reloads periodically).

---

## Deploying to Proxmox

You have two options. **Option A (Docker in an LXC)** is what the included
`docker-compose.yml` targets and is the recommended path.

### Option A — Docker inside a Proxmox LXC

#### 1. Create the container

In the Proxmox web UI: **Create CT**.

| Setting | Value |
| --- | --- |
| Template | `debian-12-standard` (or Ubuntu 24.04) |
| Cores | 1 |
| RAM | 512 MB |
| Disk | 4 GB |
| Network | Static IP, e.g. `192.168.1.50/24` |

> **Important:** give it a **static IP** (or a DHCP reservation). You'll be typing
> this IP into your TV, so it must not change.

#### 2. Enable Docker inside the LXC

Docker needs a couple of tweaks to run in an unprivileged LXC.

> ⚠️ **This step runs on the Proxmox HOST, not inside the container.**
> `/etc/pve` only exists on the host. If you see
> `-bash: /etc/pve/lxc/102.conf: No such file or directory`, you are inside the
> container — run `exit` first.
>
> | Prompt | Where you are | Has `/etc/pve`? |
> | --- | --- | --- |
> | `root@pve:~#` | Proxmox host | ✅ |
> | `root@prayer:~#` | Inside the LXC | ❌ |
>
> Not sure? Run `ls /etc/pve >/dev/null 2>&1 && echo HOST || echo CONTAINER`.
> You can also use **Datacenter → your node → Shell** in the web UI, which is
> always the host.

On the **host** (replace `102` with your container ID):

```bash
# Allow the container to use the overlay filesystem and create devices
cat >> /etc/pve/lxc/102.conf <<'EOF'
features: nesting=1,keyctl=1
lxc.apparmor.profile: unconfined
lxc.cgroup2.devices.allow: a
lxc.cap.drop:
EOF
```

Then restart the container — also on the host:

```bash
pct stop 102 && pct start 102
```

> If you'd rather avoid these tweaks, create a **privileged** container instead
> (uncheck "Unprivileged container" in the Create CT wizard), or use a small VM.
> Both work fine.

#### 3. Install Docker inside the container

Now enter the container — the prompt will change to the container's hostname:

```bash
pct enter 102

apt update && apt upgrade -y
apt install -y curl ca-certificates
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

Verify it works:

```bash
docker run --rm hello-world
```

#### 4. Publish the image from GitHub

1. Push this repo to GitHub.
2. Go to **Settings → Actions → General → Workflow permissions** and select
   **Read and write permissions**. This lets the workflow push to GHCR.
3. Push to `main`. The workflow builds and publishes
   `ghcr.io/zhassan31/prayer-app:latest`.

#### 5. Make the package pullable

By default a GHCR package is **private**. Either:

- **Make it public** (easiest): GitHub → your profile → **Packages** → `prayer-app`
  → **Package settings** → **Change visibility** → **Public**.

- **Or keep it private** and authenticate on the container:

  ```bash
  docker login ghcr.io -u <your-github-user>
  # paste a Personal Access Token with read:packages scope
  mkdir -p /opt/prayer-app/watchtower-config
  cp ~/.docker/config.json /opt/prayer-app/watchtower-config/config.json
  ```

#### 6. Deploy

```bash
mkdir -p /opt/prayer-app && cd /opt/prayer-app
```

Copy `docker-compose.yml` from this repo into `/opt/prayer-app/`. The image line
already points at your repo:

```yaml
image: ghcr.io/zhassan31/prayer-app:latest
```

Also set `TZ` to your timezone. Then:

```bash
docker compose up -d
docker compose ps
```

Open `http://<container-ip>/` — you should see the setup screen.

#### 7. Point your TV at it

On your TV's browser, navigate to:

```
http://192.168.1.50/?kiosk
```

`?kiosk` hides the settings button so nobody accidentally changes it. To edit
settings later, drop the `?kiosk` (or press `S`).

**Tips for a permanent TV display:**

- Bookmark the URL, or set it as the browser's homepage / startup page.
- Use fullscreen (`F`, or the browser's fullscreen button).
- If your TV browser supports it, enable "keep screen on" — the app also requests
  a Screen Wake Lock automatically.
- Some TV browsers reload on power-on, which is exactly what you want: it will
  always fetch the latest deploy.

---

### Option B — Build directly on the container (no registry)

If you'd rather not use GitHub Actions, build on the LXC itself:

```bash
apt install -y git
git clone https://github.com/zhassan31/prayer-app.git /opt/prayer-app-src
cd /opt/prayer-app-src
docker build -t prayer-app:local .
docker run -d --name prayer-app --restart unless-stopped -p 80:80 prayer-app:local
```

To update after editing code:

```bash
cd /opt/prayer-app-src
git pull
docker build -t prayer-app:local .
docker rm -f prayer-app
docker run -d --name prayer-app --restart unless-stopped -p 80:80 prayer-app:local
```

This is simpler but requires you to SSH in and run commands after each change.
Option A gives you the "merge to main → live" workflow you asked for.

---

## The edit → merge → live workflow

Once Option A is set up, the loop is:

1. Edit code locally, run `npm run dev` to preview.
2. Commit and push to a branch, open a PR, merge to `main`.
3. GitHub Actions builds and pushes a new image (~1–2 min).
4. Watchtower on the LXC notices within 60s and restarts the container.
5. The TV picks up the new version on its next page load.

To force an immediate update on the TV, just reload the page. Because
`index.html` is served with `no-store`, a reload always gets the newest build.

### Verifying a deploy landed

```bash
# On the LXC
docker compose logs -f watchtower
```

You'll see it detect and pull the new image. Then check the running image digest:

```bash
docker inspect prayer-app --format '{{.Image}}'
```

---

## Configuration reference

All settings live in the browser's `localStorage` under `prayer-app.settings.v1`.
There is no server-side config, which means **each browser/TV keeps its own
settings**. If you clear site data, you'll be asked to set up again.

| Setting | Notes |
| --- | --- |
| Location label | Free text shown in the header |
| Latitude / Longitude | Decimal degrees; "Use my location" fills these in |
| Timezone | IANA name, e.g. `Europe/London`. **Must match your city**, not the server |
| Method | Calculation method; pick the one your local mosque follows |
| Asr madhab | Hanafi uses a later Asr |
| Adjustments | Per-prayer offset in minutes, to match your mosque's timetable |
| Hijri offset | ±3 days, to align with local moon sighting |
| Theme | Midnight, Emerald, Sand, Slate |

> **Timezone matters.** Prayer times are computed for a civil date in the
> configured timezone, so the display is correct even if the TV's own clock is
> set to a different zone.

---

## Project structure

```
src/
  App.tsx                    app shell, state, keyboard shortcuts
  main.tsx                   React entry point
  styles.css                 TV-first responsive styles + themes
  components/
    PrayerBoard.tsx          main layout: hero, schedule, qibla
    PrayerList.tsx           today's six events
    SettingsPanel.tsx        setup + settings form
    Clock.tsx                live clock
    DateLine.tsx             Gregorian + Hijri dates
  hooks/
    useNow.ts                second-aligned ticking clock
    useWakeLock.ts           keeps the TV screen awake
  lib/
    prayer.ts                adhan wrapper, schedule + selection logic
    settings.ts              defaults, validation, persistence
    format.ts                time / date / countdown formatting
```

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server with hot reload, exposed on your LAN |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript only, no emit |

---

## Troubleshooting

**Times look wrong**
Check the **timezone** setting first — it must match your city. Then verify the
calculation method matches your local mosque. Use the per-prayer adjustments to
fine-tune.

**The TV shows an old version after a deploy**
Reload the page. If it persists, check `docker compose logs watchtower` on the
LXC to confirm the new image was pulled.

**`/etc/pve/lxc/102.conf: No such file or directory`**
You're inside the container. `/etc/pve` only exists on the Proxmox host. Run
`exit` to get back to the host (prompt becomes `root@pve:~#`), then re-run the
command. See step 2 above.

**Container won't start / Docker fails in LXC**
Re-check the `features: nesting=1` and `lxc.apparmor.profile: unconfined` lines
in `/etc/pve/lxc/<id>.conf` — edited **on the host** — then restart the container
with `pct stop <id> && pct start <id>`.

**Port 80 is already in use**
Change the left side of the port mapping in `docker-compose.yml`, e.g. `"8080:80"`,
then browse to `http://<ip>:8080/`.

**Screen dims after a while**
The app requests a Screen Wake Lock, but not all TV browsers support it. Check
your TV's energy-saving settings and disable auto-standby.

**Settings button is missing**
You're in kiosk mode (`?kiosk`). Remove the query string, or press `S`.
