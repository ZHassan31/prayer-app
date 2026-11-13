#!/usr/bin/env python3
"""
Prayer Times — night screen blanking.

Turns the display off after Isha and back on before Fajr, so the panel is not
lit all night. The machine stays awake throughout, which means the Fajr adhan
still plays: audio does not depend on the display.

Why this exists separately from the web app
-------------------------------------------
A browser cannot switch off a display. The Screen Wake Lock API can only
prevent sleep, never force it. So the app's half of the job is to render a
black page and stop polling (see src/lib/sleep.ts); this script's half is to
drop the backlight, which is where the actual watts are.

The two are deliberately independent. If the browser crashes or is mid-reload,
the screen still blanks on schedule.

Why DPMS and not suspend
------------------------
Suspend saves more power (~8-10W vs ~2W) but the machine is asleep, so the
adhan cannot play. Waking on an RTC alarm is also a failure mode that would
silently break the app's whole purpose. Blanking the panel keeps every
guarantee and still saves the backlight.

Usage
-----
    ./kiosk-sleep.py --lat 51.46 --lon -0.19 --tz Europe/London

Run it from the XFCE autostart entry so it has access to the X display. It
loops forever, sleeping until the next transition.

Requires: python3, adhan (pip install adhan), xset (x11-xserver-utils).
"""

from __future__ import annotations

import argparse
import datetime as dt
import subprocess
import sys
import time
from zoneinfo import ZoneInfo

try:
    from adhan import CalculationMethod, Coordinates, Madhab, PrayerTimes
except ImportError:
    sys.exit(
        "Missing dependency: adhan\n"
        "Install with:  pip install --user adhan\n"
        "(or: apt install python3-adhan if available)"
    )


# Shortest window worth honouring. At high latitudes Isha and Fajr can nearly
# meet in summer; below this the screen would flicker off and on, so we stay on.
MIN_WINDOW = dt.timedelta(minutes=60)


def build_params(method: str, madhab: str):
    """Builds adhan parameters from the same names the web app uses."""
    factory = getattr(CalculationMethod, method, None)
    if factory is None:
        print(f"Unknown method {method!r}, falling back to MoonsightingCommittee")
        factory = CalculationMethod.MoonsightingCommittee
    params = factory()
    params.madhab = Madhab.Hanafi if madhab == "hanafi" else Madhab.Shafi
    return params


def times_for(day: dt.date, coords, params, tz: ZoneInfo):
    """Returns (isha, fajr) for a civil date, as timezone-aware datetimes."""
    # adhan reads only Y/M/D from this value.
    anchor = dt.datetime(day.year, day.month, day.day, 12, 0, 0)
    times = PrayerTimes(coords, anchor, params)
    return times.isha.replace(tzinfo=tz), times.fajr.replace(tzinfo=tz)


def next_window(now: dt.datetime, coords, params, tz: ZoneInfo, args):
    """
    Works out the next (sleep_at, wake_at) pair at or after `now`.

    Looks at today and tomorrow, because after Isha the relevant Fajr is
    tomorrow's.
    """
    for offset in (0, 1, 2):
        day = (now + dt.timedelta(days=offset)).date()
        isha, _ = times_for(day, coords, params, tz)
        _, fajr_tomorrow = times_for(day + dt.timedelta(days=1), coords, params, tz)

        sleep_at = isha + dt.timedelta(minutes=args.after_isha)
        wake_at = fajr_tomorrow - dt.timedelta(minutes=args.before_fajr)

        if wake_at - sleep_at < MIN_WINDOW:
            continue
        if wake_at <= now:
            continue
        return sleep_at, wake_at

    return None, None


def set_display(on: bool) -> None:
    """Blanks or restores the display via DPMS."""
    try:
        if on:
            # Force it back on: DPMS on, then a nudge so the panel wakes.
            subprocess.run(["xset", "dpms", "force", "on"], check=False)
            subprocess.run(["xset", "s", "reset"], check=False)
        else:
            subprocess.run(["xset", "dpms", "force", "off"], check=False)
    except FileNotFoundError:
        print("xset not found — install x11-xserver-utils", file=sys.stderr)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--lon", type=float, required=True)
    parser.add_argument("--tz", default="Europe/London")
    parser.add_argument("--method", default="MoonsightingCommittee")
    parser.add_argument("--madhab", default="shafi", choices=["shafi", "hanafi"])
    parser.add_argument("--after-isha", type=int, default=30, metavar="MIN")
    parser.add_argument("--before-fajr", type=int, default=10, metavar="MIN")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the schedule instead of touching the display",
    )
    args = parser.parse_args()

    tz = ZoneInfo(args.tz)
    coords = Coordinates(args.lat, args.lon)
    params = build_params(args.method, args.madhab)

    print(
        f"Night blanking active: {args.after_isha} min after Isha, "
        f"{args.before_fajr} min before Fajr ({args.tz})"
    )

    while True:
        now = dt.datetime.now(tz)
        sleep_at, wake_at = next_window(now, coords, params, tz, args)

        if sleep_at is None:
            print("No usable window found (high latitude?); staying on")
            time.sleep(3600)
            continue

        if args.dry_run:
            print(f"  sleep {sleep_at:%Y-%m-%d %H:%M}  wake {wake_at:%Y-%m-%d %H:%M}")
            return 0

        if now < sleep_at:
            # Wait for the window to open.
            wait = (sleep_at - now).total_seconds()
            print(f"  next blank at {sleep_at:%H:%M} (in {wait / 3600:.1f}h)")
            time.sleep(max(1, wait))
            continue

        if now < wake_at:
            print(f"  blanking now, waking at {wake_at:%H:%M}")
            set_display(False)
            time.sleep(max(1, (wake_at - now).total_seconds()))
            set_display(True)
            print("  display restored")
            # Small pause so the next loop recomputes against the new day.
            time.sleep(60)
            continue

        # Window already passed; recompute.
        time.sleep(60)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        set_display(True)
        sys.exit(0)
