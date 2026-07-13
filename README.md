<p align="center">
    <img alt="hero" width="450" src="https://emoji-route.deno.dev/png/🛜" />
</p>

<h1 align="center">IP Indicator</h1>

<p align="center">
    Display your public IP in Gnome topbar
</p>

<p align="center">
  <em>Maintained fork by <a href="https://github.com/ArnavK-09">ArnavK-09</a></em>
</p>

---

## Overview

**IP Indicator** is a minimalist GNOME Shell extension that keeps you aware of your current public IP address without opening a terminal or browser. It sits in your system panel and refreshes automatically when your network state changes using `icanhazip.com`.

This is a fork of the <a href="https://github.com/vjects/ip-indicator">original IP Indicator extension</a>, now maintained under **ArnavK-09** with updates and small improvements.

## Features

- **IPv4 / IPv6 Toggle:** Choose whether to display your public IPv4 or IPv6 address from the settings.
- **State-Based IP Monitoring:** Refreshes your IP when network connectivity, primary connection, wireless state, or device state changes — no wasteful polling.
- **Manual Refresh:** Instant update button in the panel menu.
- **Copy IP:** Copy the current public IP to the clipboard from the panel menu.
- **Customizable Appearance:** Change background color, text color, or pick from predefined color presets.
- **Lightweight:** Written in GJS using native `Soup3` for network requests.

## Requirements

- **GNOME Shell:** `45`, `46`, `47`, `48`, `49`, `50`

## Installation

### Manual Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/ArnavK-09/ip-indicator.git
   ```
2. Move the directory to your local extensions folder:
   ```bash
   mv ip-indicator ~/.local/share/gnome-shell/extensions/ip-indicator@ArnavK-09
   ```
3. Restart GNOME Shell (press `Alt+F2`, type `r`, and hit `Enter` on X11, or log out and back in on Wayland).
4. Enable the extension:
   ```bash
   gnome-extensions enable ip-indicator@ArnavK-09
   ```

## Configuration

Open the extension settings via the **GNOME Extensions** app or by right-clicking the indicator.

- **Appearance:** Adjust background color, text color, or choose a preset theme.
- **Behavior:** Switch between IPv4 and IPv6 display.

## Building & Packaging

```bash
cd ip-indicator
zip -r ip-indicator@ArnavK-09.zip . -x "*.git*"
```
