#!/usr/bin/env bash
# ==================================================================
# Prayer Times — kiosk setup for Debian 13 (trixie) + XFCE
#
# Turns a fresh Debian XFCE install into a dedicated always-on display:
#   - autologin straight into the XFCE session
#   - Chromium launches fullscreen on boot, no chrome, no dialogs
#   - screen never blanks, machine never sleeps, lid close is ignored
#   - audio allowed to autoplay (adhan) without a click
#
# Usage:
#   scp scripts/setup-kiosk.sh kiosk@<host>:~/
#   ssh kiosk@<host>
#   chmod +x setup-kiosk.sh
#   ./setup-kiosk.sh                      # uses default URL below
#   KIOSK_URL=http://1.2.3.4/?kiosk ./setup-kiosk.sh
#
# Idempotent — safe to re-run.
# ==================================================================

set -euo pipefail

KIOSK_URL="${KIOSK_URL:-http://192.168.1.21/?kiosk}"
KIOSK_USER="${KIOSK_USER:-$(id -un)}"
# 75% is the practical ceiling on the Latitude's internal speakers; higher
# starts to clip. The app's own adhanVolume is already at its 1.0 maximum, so
# this is the only remaining headroom.
KIOSK_VOLUME="${KIOSK_VOLUME:-75%}"

if [[ $EUID -eq 0 ]]; then
  echo "Run this as your normal user, not root. It will sudo when needed." >&2
  exit 1
fi

echo "==> Kiosk user : $KIOSK_USER"
echo "==> Kiosk URL  : $KIOSK_URL"
echo "==> Volume     : $KIOSK_VOLUME"
echo

# ---------- 1. Packages ----------

echo "==> Installing packages"
sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  chromium \
  x11-xserver-utils \
  openssh-server \
  curl \
  systemd-timesyncd \
  pulseaudio-utils

# ---------- 1b. Clock synchronisation ----------

# A kiosk that shows prayer times is useless with a wrong clock, and the
# Debian live image ships no NTP daemon at all. Without this the machine
# drifts (or boots an hour off) and every displayed time is wrong.
echo "==> Enabling NTP time sync"
sudo systemctl enable --now systemd-timesyncd
sudo timedatectl set-ntp true 2>/dev/null || true

# ---------- 2. Autologin ----------

echo "==> Configuring LightDM autologin"
sudo mkdir -p /etc/lightdm/lightdm.conf.d
sudo tee /etc/lightdm/lightdm.conf.d/50-kiosk-autologin.conf >/dev/null <<EOF
[Seat:*]
autologin-user=$KIOSK_USER
autologin-user-timeout=0
autologin-session=xfce
EOF

# ---------- 3. Never sleep, never blank ----------

echo "==> Disabling sleep / suspend / hibernate"
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

echo "==> Ignoring lid close"
sudo mkdir -p /etc/systemd/logind.conf.d
sudo tee /etc/systemd/logind.conf.d/50-kiosk-lid.conf >/dev/null <<'EOF'
[Login]
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
IdleAction=ignore
EOF

# logind only reads its config at start-up. Without this restart the drop-in
# above has no effect until the next reboot, and closing the lid still sleeps.
sudo systemctl restart systemd-logind

# ---------- 3b. Never auto-reboot from unattended upgrades ----------

echo "==> Disabling automatic reboot after updates"
sudo tee /etc/apt/apt.conf.d/51-kiosk-no-autoreboot >/dev/null <<'EOF'
Unattended-Upgrade::Automatic-Reboot "false";
EOF

# ---------- 4. Chromium kiosk autostart ----------

echo "==> Writing Chromium autostart entry"
mkdir -p "$HOME/.config/autostart"

CHROMIUM_FLAGS=(
  --kiosk
  --start-fullscreen
  --no-first-run
  --no-default-browser-check
  --noerrdialogs
  --disable-infobars
  --disable-session-crashed-bubble
  --disable-component-update
  --disable-features=Translate,MediaRouter
  --overscroll-history-navigation=0
  --password-store=basic
  --autoplay-policy=no-user-gesture-required
  --check-for-update-interval=31536000
)

cat > "$HOME/.config/autostart/kiosk-browser.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Kiosk Browser
Comment=Prayer times display
Exec=chromium ${CHROMIUM_FLAGS[*]} "$KIOSK_URL"
Terminal=false
X-GNOME-Autostart-enabled=true
X-GNOME-Autostart-Delay=5
EOF

# ---------- 4b. Output volume ----------

# PipeWire resets to its own default on every restart, so the volume has to be
# re-applied on login. The sleep lets the audio server finish starting first.
# `pactl` comes from pulseaudio-utils, which is installed above.
echo "==> Writing volume autostart entry"
cat > "$HOME/.config/autostart/kiosk-volume.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Kiosk Volume
Comment=Set the default output volume on login
Exec=sh -c "sleep 3; pactl set-sink-volume @DEFAULT_SINK@ ${KIOSK_VOLUME}"
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

# Apply it now too, so the change takes effect without waiting for a reboot.
if command -v pactl >/dev/null 2>&1; then
  pactl set-sink-volume @DEFAULT_SINK@ "$KIOSK_VOLUME" 2>/dev/null || true
fi

# ---------- 5. Kill screen blanking inside the session ----------

# The screensaver and the idle timers must be off, or the screen would blank
# at random times during the day.
#
# DPMS itself must stay ENABLED, though. `xset -dpms` disables the extension
# entirely, which also blocks the deliberate `xset dpms force off` that
# kiosk-sleep.py uses at night — the command silently does nothing. So we
# disable the timers but leave the extension on.
echo "==> Writing display-power autostart entry"
cat > "$HOME/.config/autostart/kiosk-display.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=Kiosk Display Power
Comment=Disable screen saver and idle blanking, keep DPMS available
Exec=sh -c "xset s off; xset s noblank; xset +dpms; xset dpms 0 0 0"
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

# XFCE power manager: never blank, never suspend.
if command -v xfconf-query >/dev/null 2>&1; then
  echo "==> Disabling XFCE power management timeouts"
  xfconf-query -c xfce4-power-manager -p /xfce4-power-manager/dpms-enabled -n -t bool -s false 2>/dev/null || true
  xfconf-query -c xfce4-power-manager -p /xfce4-power-manager/blank-on-ac -n -t int -s 0 2>/dev/null || true
  xfconf-query -c xfce4-power-manager -p /xfce4-power-manager/dpms-on-ac-sleep -n -t int -s 0 2>/dev/null || true
  xfconf-query -c xfce4-power-manager -p /xfce4-power-manager/dpms-on-ac-off -n -t int -s 0 2>/dev/null || true
  xfconf-query -c xfce4-power-manager -p /xfce4-power-manager/inactivity-on-ac -n -t int -s 0 2>/dev/null || true

  # XFCE's power manager handles lid close itself and defaults to suspend.
  # Hand lid handling to XFCE (not logind) and set both actions to "nothing".
  xfconf-query -c xfce4-power-manager -p /xfce4-power-manager/logind-handle-lid-switch -n -t bool -s false 2>/dev/null || true
  xfconf-query -c xfce4-power-manager -p /xfce4-power-manager/lid-action-on-ac -n -t int -s 0 2>/dev/null || true
  xfconf-query -c xfce4-power-manager -p /xfce4-power-manager/lid-action-on-battery -n -t int -s 0 2>/dev/null || true
fi

# ---------- 5b. Night screen blanking ----------

# The browser cannot switch off a display, so a small Python daemon does it:
# DPMS off after Isha, back on before Fajr. The machine stays awake, so the
# Fajr adhan still plays.
#
# It computes its own times rather than reading them from the app, so the
# screen still blanks correctly if the browser has crashed or is reloading.
echo "==> Installing night blanking daemon"
sudo apt-get install -y python3-pip >/dev/null 2>&1 || true
python3 -m pip install --user --quiet adhan 2>/dev/null || \
  echo "    (could not install adhan — the daemon will report it at startup)"

install -m 755 "$(dirname "$0")/kiosk-sleep.py" "$HOME/kiosk-sleep.py" 2>/dev/null || true

cat > "$HOME/.config/autostart/kiosk-sleep.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Kiosk Night Blanking
Comment=Blank the display between Isha and Fajr
Exec=python3 $HOME/kiosk-sleep.py --lat ${KIOSK_LAT:-51.4613} --lon ${KIOSK_LON:--0.1866} --tz ${KIOSK_TZ:-Europe/London} --method ${KIOSK_METHOD:-MoonsightingCommittee} --madhab ${KIOSK_MADHAB:-shafi}
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

echo "    lat/lon default to the values in config.json — override with"
echo "    KIOSK_LAT / KIOSK_LON / KIOSK_TZ if they differ."

# ---------- 6. WiFi power saving ----------

# Power saving makes the WiFi radio nap between packets, which shows up as
# periodic stalls or drops on an always-on display. Turn it off for every
# saved connection. (No-op on a wired-only box.)
if command -v nmcli >/dev/null 2>&1; then
  echo "==> Disabling WiFi power saving"
  while IFS= read -r conn; do
    [[ -z "$conn" ]] && continue
    sudo nmcli connection modify "$conn" 802-11-wireless.powersave 2 2>/dev/null || true
  done < <(nmcli -t -f NAME,TYPE connection show | awk -F: '$2 ~ /wireless/ {print $1}')
fi

# ---------- 7. SSH ----------

echo "==> Enabling SSH"
sudo systemctl enable --now ssh

# ---------- 8. Reachability check ----------

echo
echo "==> Checking the app is reachable"
if curl -fsS --max-time 5 -o /dev/null "$KIOSK_URL"; then
  echo "    OK — $KIOSK_URL responded"
else
  echo "    WARNING — $KIOSK_URL did not respond."
  echo "    The kiosk will still boot, but will show an error page."
  echo "    Check the server is up and the URL is correct."
fi

# ---------- Done ----------

echo
echo "=================================================="
echo " Kiosk setup complete."
echo
echo " Reboot to apply:   sudo reboot"
echo
echo " After reboot the machine should autologin and"
echo " open $KIOSK_URL fullscreen."
echo
echo " To exit kiosk temporarily:  Alt+F4"
echo " To switch to a TTY:        Ctrl+Alt+F2"
echo "=================================================="
