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

if [[ $EUID -eq 0 ]]; then
  echo "Run this as your normal user, not root. It will sudo when needed." >&2
  exit 1
fi

echo "==> Kiosk user : $KIOSK_USER"
echo "==> Kiosk URL  : $KIOSK_URL"
echo

# ---------- 1. Packages ----------

echo "==> Installing packages"
sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  chromium \
  x11-xserver-utils \
  openssh-server \
  curl

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

# ---------- 5. Kill screen blanking inside the session ----------

echo "==> Writing display-power autostart entry"
cat > "$HOME/.config/autostart/kiosk-display.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=Kiosk Display Power
Comment=Disable DPMS blanking and screen saver
Exec=sh -c "xset s off; xset s noblank; xset -dpms"
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
