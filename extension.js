import St from "gi://St";
import Clutter from "gi://Clutter";
import Gdk from "gi://Gdk";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import NM from "gi://NM";
import Soup from "gi://Soup?version=3.0";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

Gio._promisify(NM.Client, "new_async");

const FETCH_TIMEOUT_SECONDS = 5;

export default class IPIndicatorExtension extends Extension {
  enable() {
    this._settings = this.getSettings();
    this._currentIP = null;

    this._indicator = new PanelMenu.Button(0.0, "IP Indicator");

    this._box = new St.BoxLayout({
      style_class: "panel-status-menu-box",
    });

    this._label = new St.Label({
      text: "offline",
      y_align: Clutter.ActorAlign.CENTER,
      style: "font-weight:bold; margin-left:4px; margin-right:4px;",
    });

    this._box.add_child(this._label);
    this._indicator.add_child(this._box);

    //
    // Menu
    //

    this._refreshItem = new PopupMenu.PopupMenuItem("Refresh IP");
    this._refreshItem.connect("activate", () => {
      this._updateIP(true);
    });

    this._copyItem = new PopupMenu.PopupMenuItem("Copy IP");
    this._copyItem.setSensitive(false);

    this._copyItem.connect("activate", () => {
      if (!this._currentIP) return;

      const clipboard = St.Clipboard.get_default();
      clipboard.set_text(St.ClipboardType.CLIPBOARD, this._currentIP);
    });

    this._indicator.menu.addMenuItem(this._refreshItem);
    this._indicator.menu.addMenuItem(this._copyItem);

    Main.panel.addToStatusArea("ip-indicator-arnavk-09", this._indicator);

    this._applyStyles();

    this._settings.connectObject(
      "changed::background-color",
      () => this._applyStyles(),
      "changed::text-color",
      () => this._applyStyles(),
      "changed::ip-version",
      () => this._updateIP(true),
      this,
    );

    this._initNetworkMonitoring();
    this._updateIP();
  }

  disable() {
    this._settings?.disconnectObject(this);
    this._settings = null;

    if (this._networkRefreshId) {
      GLib.source_remove(this._networkRefreshId);
      this._networkRefreshId = null;
    }

    if (this._nmClient) {
      for (const device of this._nmClient.get_devices())
        device.disconnectObject(this);
      this._nmClient.disconnectObject(this);
      this._nmClient = null;
    }

    this._networkMonitor?.disconnectObject(this);
    this._networkMonitor = null;

    this._fetchCancellable?.cancel();
    this._fetchCancellable = null;

    this._session?.abort();
    this._session = null;

    this._indicator?.destroy();
    this._indicator = null;

    this._box = null;
    this._label = null;
    this._refreshItem = null;
    this._copyItem = null;
    this._currentIP = null;
  }

  _applyStyles() {
    if (!this._box || !this._settings) return;

    const textColor = this._settings.get_string("text-color");
    const safeTextColor = this._parseColor(textColor)
      ? textColor
      : "rgba(255, 255, 255, 1)";

    const backgroundColor = this._settings.get_string("background-color");
    const safeBgColor = this._parseColor(backgroundColor)
      ? backgroundColor
      : "transparent";

    const backgroundStyle =
      safeBgColor === "transparent"
        ? ""
        : `background-color: ${safeBgColor}; padding: 0 8px;`;

    this._box.set_style(`
            color: ${safeTextColor};
            ${backgroundStyle}
            border-radius: 14px;
            margin: 4px 0;
        `);
  }

  _parseColor(color) {
    const rgba = new Gdk.RGBA();
    return rgba.parse(color);
  }

  _setOffline() {
    this._currentIP = null;

    if (this._label) this._label.set_text("offline");

    this._copyItem?.setSensitive(false);
  }

  _initNetworkMonitoring() {
    this._networkMonitor = Gio.NetworkMonitor.get_default();
    this._networkMonitor.connectObject(
      "network-changed",
      () => this._scheduleNetworkRefresh(),
      this,
    );

    NM.Client.new_async(null)
      .then((client) => {
        if (!this._label) return;

        this._nmClient = client;

        this._nmClient.connectObject(
          "notify::state",
          () => this._scheduleNetworkRefresh(),
          "notify::networking-enabled",
          () => this._scheduleNetworkRefresh(),
          "notify::wireless-enabled",
          () => this._scheduleNetworkRefresh(),
          "notify::primary-connection",
          () => this._scheduleNetworkRefresh(),
          "notify::activating-connection",
          () => this._scheduleNetworkRefresh(),
          "notify::active-connections",
          () => this._scheduleNetworkRefresh(),
          "notify::connectivity",
          () => this._scheduleNetworkRefresh(),
          "device-added",
          (_client, device) => this._trackDevice(device),
          "device-removed",
          (_client, device) => this._untrackDevice(device),
          this,
        );

        if (!this._label || !this._nmClient) return;

        for (const device of this._nmClient.get_devices())
          this._trackDevice(device);
      })
      .catch((e) => logError(e, "IP Indicator network monitoring"));
  }

  _trackDevice(device) {
    if (device._ipIndicatorTracked) return;

    device._ipIndicatorTracked = true;
    device.connectObject(
      "state-changed",
      () => this._scheduleNetworkRefresh(),
      this,
    );
  }

  _untrackDevice(device) {
    if (!device._ipIndicatorTracked) return;

    device.disconnectObject(this);
    delete device._ipIndicatorTracked;
  }

  _scheduleNetworkRefresh() {
    if (!this._label) return;

    if (this._networkRefreshId) GLib.source_remove(this._networkRefreshId);

    this._networkRefreshId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      2,
      () => {
        this._networkRefreshId = null;
        if (this._label) this._updateIP(true);
        return GLib.SOURCE_REMOVE;
      },
    );
  }

  async _updateIP(manually = false) {
    if (!this._label || !this._settings) return;

    this._fetchCancellable?.cancel();
    const cancellable = new Gio.Cancellable();
    this._fetchCancellable = cancellable;

    if (this._networkMonitor?.get_network_available() === false) {
      this._setOffline();
      return;
    }

    if (manually) {
      this._currentIP = null;

      if (this._label) this._label.set_text("fetching");

      this._copyItem?.setSensitive(false);
    } else {
      this._setOffline();
    }

    try {
      if (!this._session) {
        this._session = new Soup.Session({});
        this._session.timeout = FETCH_TIMEOUT_SECONDS;
      }

      const useIPv6 = this._settings?.get_string("ip-version") === "ipv6";
      const url = useIPv6
        ? "https://ipv6.icanhazip.com"
        : "https://ipv4.icanhazip.com";
      const message = Soup.Message.new("GET", url);

      const bytes = await this._session.send_and_read_async(
        message,
        GLib.PRIORITY_DEFAULT,
        cancellable,
      );

      if (!this._label || this._fetchCancellable !== cancellable) return;

      if (message.get_status() !== Soup.Status.OK) {
        this._setOffline();
        return;
      }

      const ip = new TextDecoder().decode(bytes.toArray()).trim();

      if (!ip) {
        this._setOffline();
        return;
      }

      this._currentIP = ip;
      this._label.set_text(ip);
      this._copyItem?.setSensitive(true);
    } catch (e) {
      if (this._fetchCancellable !== cancellable) return;

      if (!(
        e instanceof GLib.Error &&
        e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)
      ))
        logError(e, "IP Indicator");

      this._setOffline();
    } finally {
      if (this._fetchCancellable === cancellable) this._fetchCancellable = null;
    }
  }
}
