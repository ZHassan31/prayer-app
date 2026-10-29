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
- **5 themes**, 12/24-hour clock; the wall clock shows HH:MM, the countdown ticks in seconds
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

You will likely see this warning:

```
explicitly configured lxc.apparmor.profile overrides the following settings: features:nesting
```

**This is expected and harmless.** It means your explicit `lxc.apparmor.profile:
unconfined` takes precedence over the AppArmor profile that `nesting=1` would
otherwise set. `nesting=1` still applies its other effects, and the unconfined
profile is what allows Docker to run. No action needed.

Confirm the settings landed:

```bash
pct config 102 | grep -E 'features|apparmor|cgroup2|cap.drop'
```

> If you'd rather avoid these tweaks, create a **privileged** container instead
> (uncheck "Unprivileged container" in the Create CT wizard), or use a small VM.
> Both work fine.

#### 3. Install Docker inside the container

Now enter the container — the prompt will change to the container's hostname:

```bash
pct enter 102
```

Then install Docker with a single command:

```bash
apt-get update && apt-get install -y curl ca-certificates && curl -fsSL https://get.docker.com | sh && systemctl enable --now docker && docker run --rm hello-world
```

That updates the package list, installs the prerequisites, installs Docker,
enables it on boot, and runs the test image. You should end with
`Hello from Docker!`.

> Add `DEBIAN_FRONTEND=noninteractive apt-get upgrade -y &&` after the `update`
> if you also want to apply pending system upgrades (slower, optional).

> **Paste one command at a time.** Pasting multiple lines into `pct enter` can
> drop lines while the container's shell is still starting up.

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

### Server config is authoritative

The real location is supplied by a **`config.json`** file that is:

- **gitignored** — never committed to the repo
- **excluded from the Docker image** via `.dockerignore`
- **mounted into the container** at deploy time

So the public repo and the public GHCR image contain **no location data**.

**Every device is overwritten by this file on each load.** That is what keeps
all screens uniform: change `config.json`, restart the container, and every TV
converges on the same values within a minute.

Create it on the container:

```bash
cd /opt/prayer-app
cat > config.json <<'EOF'
{
  "latitude": 51.4613,
  "longitude": -0.1866,
  "timezone": "Europe/London",
  "method": "MoonsightingCommittee",
  "madhab": "shafi",
  "theme": "mint",
  "use24Hour": true,
  "hijriOffset": 0,
  "adjustments": { "fajr": 0, "sunrise": 0, "dhuhr": 0, "asr": 0, "maghrib": 0, "isha": 0 }
}
EOF
docker compose up -d
```

`docker-compose.yml` already mounts it read-only:

```yaml
volumes:
  - ./config.json:/usr/share/nginx/html/config.json:ro
```

nginx serves it with `no-store`, so edits take effect on the next page load
without rebuilding anything.

#### Supported keys

| Key | Type | Notes |
| --- | --- | --- |
| `latitude` / `longitude` | number | Decimal degrees — the only location data needed |
| `timezone` | string | IANA name, e.g. `Europe/London` |
| `method` | string | See the method list below |
| `madhab` | `shafi` \| `hanafi` | Affects Asr |
| `theme` | `mint` \| `midnight` \| `emerald` \| `sand` \| `slate` | |
| `use24Hour` | boolean | |
| `hijriOffset` | number | −3 to 3 |
| `adjustments` | object | Per-prayer minutes, −60 to 60 |
| `adhanEnabled` | boolean | Play audio at prayer time |
| `adhanVolume` | number | 0 to 1 |
| `adhanPrayers` | string[] | Which prayers play. Default: dhuhr, asr, maghrib, isha |

> There is no place-name field. Coordinates are all that's needed to compute
> the times, so nothing identifying is stored or displayed.

Any key you omit falls back to the device's current value.

#### The tradeoff

Because the server config wins, **per-device edits are temporary** — they're
overwritten on the next load. The settings panel says so when config is active.
If you want a device to keep its own values, remove the location from
`config.json` (or don't mount the file on that device).

### Keeping every screen on the latest build

Two mechanisms work together:

1. **Watchtower** pulls a new image within 60s of a merge to `main`.
2. **The app polls `/version.json`** every 60s and reloads itself when the
   build id changes.

So a TV left on for weeks still picks up a new deploy without anyone touching
it. A 30-second cooldown guard prevents a reload loop if a browser serves a
cached HTML shell alongside a fresh `version.json`.

### Adhan audio

The adhan plays automatically when a prayer time arrives. Three things to know:

**1. The recording lives at `public/Adhan-Makkah.mp3`.** Replace that file to
change the audio (same filename). It is served from the app's own origin, so
there are no external requests at prayer time.

If you would rather keep audio out of the repo, mount it instead:

```yaml
volumes:
  - ./Adhan-Makkah.mp3:/usr/share/nginx/html/Adhan-Makkah.mp3:ro
```

and add `public/Adhan-Makkah.mp3` to `.gitignore`.

**Fajr is off by default.** The dawn adhan is very loud in a quiet house, so
only Dhuhr, Asr, Maghrib and Isha play unless you enable Fajr in settings.

**2. Browsers block autoplay until the page is touched once.** This is a
browser policy, not something the app can bypass — `?kiosk` does not help. On a
TV that is never interacted with, the first adhan after a power cycle may be
silently blocked. Touch the screen or press any key once after setup and audio
then works for that session.

**3. Guardrails.** The adhan only fires if:

- the prayer is one of Dhuhr, Asr, Maghrib, Isha by default (Fajr is opt-in;
  Sunrise never plays),
- it is enabled for that prayer in settings,
- the current time is within **2 minutes** of the prayer time (so a TV that
  wakes hours later does not play a stale adhan),
- it has not already played today (stored in `localStorage`).

That last point means a page reload or Watchtower restart will not replay an
adhan you have already heard.

### Per-device settings

Everything else lives in the browser's `localStorage` under
`prayer-app.settings.v1`. There is no server-side state beyond `config.json`.

| Setting | Notes |
| --- | --- |
| Latitude / Longitude | Decimal degrees; "Use my location" fills these in |
| Timezone | IANA name, e.g. `Europe/London`. **Must match your city**, not the server |
| Method | Calculation method; pick the one your local mosque follows |
| Asr madhab | Hanafi uses a later Asr |
| Adjustments | Per-prayer offset in minutes, to match your mosque's timetable |
| Hijri offset | ±3 days, to align with local moon sighting |
| Theme | Mint, Midnight, Emerald, Sand, Slate |

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
    settings.ts              defaults, validation, persistence, config merge
    config.ts                runtime /config.json loader
    version.ts               build-id polling + auto-reload
    format.ts                time / date / countdown formatting
```

> `config.json` is gitignored — it holds the real location and must never be
> committed. `config.example.json` is the committed template.

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

**Watchtower logs `client version 1.25 is too old`**
The original `containrrr/watchtower` image is unmaintained and its Docker client
is too old for Docker 25+. The compose file uses the maintained fork
`nickfedor/watchtower` instead. If you copied an older compose file, update it:

```bash
cd /opt/prayer-app
curl -O https://raw.githubusercontent.com/ZHassan31/prayer-app/main/docker-compose.yml
docker compose up -d
```

**The container runs an old image even though the build succeeded**
`docker compose up -d` reuses a locally cached image. Force a pull:

```bash
docker compose pull prayer-app
docker compose up -d
```

The compose file sets `pull_policy: always`, so this shouldn't happen once
you're on the current version. Verify what's actually running:

```bash
curl -s http://localhost/version.json
```

The `buildId` starts with the commit SHA — compare it to `git log -1` on `main`.

**`/etc/pve/lxc/102.conf: No such file or directory`**
You're inside the container. `/etc/pve` only exists on the Proxmox host. Run
`exit` to get back to the host (prompt becomes `root@pve:~#`), then re-run the
command. See step 2 above.

**`Temporary failure resolving 'deb.debian.org'` / `apt` can't download anything**
The container has no working DNS or routing. Diagnose inside the container:

```bash
ip -4 addr show | grep inet
ip route
cat /etc/resolv.conf
ping -c2 1.1.1.1
ping -c2 deb.debian.org
```

- `ping 1.1.1.1` fails → **routing/IP problem**, not DNS.
- `ping 1.1.1.1` works but the hostname fails → **DNS only**.

The most common cause is a bad IP in the Create CT wizard — for example the
container taking the router's address (`192.168.1.1`) or a gateway that doesn't
exist. Check the real gateway **on the host**:

```bash
ip route | grep default
```

Then fix the container's network **on the host** (use your own free IP and the
gateway from the command above):

```bash
pct set 102 --net0 name=eth0,bridge=vmbr0,ip=192.168.1.50/24,gw=192.168.1.1
pct set 102 --nameserver 1.1.1.1
pct reboot 102
```

Pick an IP outside your router's DHCP pool. Verify inside the container:

```bash
ping -c2 1.1.1.1 && ping -c2 deb.debian.org
```

If only DNS is broken, you can also patch it in place:

```bash
rm -f /etc/resolv.conf
printf 'nameserver 1.1.1.1\nnameserver 8.8.8.8\n' > /etc/resolv.conf
```

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
