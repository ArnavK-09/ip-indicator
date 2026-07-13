import Adw from "gi://Adw";
import Gdk from "gi://Gdk";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class IPIndicatorPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();

    // Create preferences page
    const page = new Adw.PreferencesPage({
      title: "Settings",
      icon_name: "preferences-system-symbolic",
    });

    // Group 1: Appearance
    const stylingGroup = new Adw.PreferencesGroup({
      title: "Appearance",
      description:
        "Customize the appearance of the IP Indicator in the top panel",
    });
    page.add(stylingGroup);

    // Background Color Row
    const bgRow = new Adw.ActionRow({
      title: "Background Color",
      subtitle:
        "Choose a background color for the indicator pill (HEX or RGBA)",
    });

    const bgBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 6,
      valign: Gtk.Align.CENTER,
    });

    const bgEntry = new Gtk.Entry({
      text: settings.get_string("background-color"),
      width_chars: 10,
      max_width_chars: 14,
      valign: Gtk.Align.CENTER,
    });

    const bgButton = new Gtk.ColorButton({
      valign: Gtk.Align.CENTER,
      use_alpha: true,
    });

    const resetBgButton = new Gtk.Button({
      icon_name: "edit-clear-symbolic",
      valign: Gtk.Align.CENTER,
      tooltip_text: "Reset background to transparent",
    });

    let rgbaBg = new Gdk.RGBA();
    const currentBg = settings.get_string("background-color");
    if (rgbaBg.parse(currentBg)) bgButton.set_rgba(rgbaBg);

    bgEntry.connect("changed", () => {
      const text = bgEntry.get_text();
      let rgba = new Gdk.RGBA();
      if (rgba.parse(text)) {
        settings.set_string("background-color", text);
        bgButton.set_rgba(rgba);
      }
    });

    bgButton.connect("color-set", () => {
      let color = bgButton.get_rgba().to_string();
      bgEntry.set_text(color);
      settings.set_string("background-color", color);
    });

    resetBgButton.connect("clicked", () => {
      settings.set_string("background-color", "transparent");
      bgEntry.set_text("transparent");
      let rgba = new Gdk.RGBA();
      rgba.parse("rgba(255, 255, 255, 0)");
      bgButton.set_rgba(rgba);
    });

    bgBox.append(bgEntry);
    bgBox.append(bgButton);
    bgBox.append(resetBgButton);
    bgRow.add_suffix(bgBox);
    stylingGroup.add(bgRow);

    // Text Color Row
    const textRow = new Adw.ActionRow({
      title: "Text & Icon Color",
      subtitle: "Choose a color for the IP text and icons",
    });

    const textBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 6,
      valign: Gtk.Align.CENTER,
    });

    const textEntry = new Gtk.Entry({
      text: settings.get_string("text-color"),
      width_chars: 10,
      max_width_chars: 14,
      valign: Gtk.Align.CENTER,
    });

    const textButton = new Gtk.ColorButton({
      valign: Gtk.Align.CENTER,
      use_alpha: true,
    });

    let rgbaText = new Gdk.RGBA();
    rgbaText.parse(settings.get_string("text-color"));
    textButton.set_rgba(rgbaText);

    textEntry.connect("changed", () => {
      const text = textEntry.get_text();
      let rgba = new Gdk.RGBA();
      if (rgba.parse(text)) {
        settings.set_string("text-color", text);
        textButton.set_rgba(rgba);
      }
    });

    textButton.connect("color-set", () => {
      let color = textButton.get_rgba().to_string();
      textEntry.set_text(color);
      settings.set_string("text-color", color);
    });

    textBox.append(textEntry);
    textBox.append(textButton);
    textRow.add_suffix(textBox);
    stylingGroup.add(textRow);

    // Presets Row
    const presetRow = new Adw.ActionRow({
      title: "Color Presets",
      subtitle: "Quickly select from one of these elegant color themes",
    });

    const presetBox = new Gtk.FlowBox({
      valign: Gtk.Align.CENTER,
      homogeneous: true,
      selection_mode: Gtk.SelectionMode.NONE,
      column_spacing: 8,
      row_spacing: 8,
      max_children_per_line: 2,
      min_children_per_line: 1,
    });

    const presets = [
      {
        name: "Adwaita Blue",
        bg: "rgba(53, 132, 228, 1)",
        text: "rgba(255, 255, 255, 1)",
      },
      {
        name: "Glassmorphism",
        bg: "rgba(255, 255, 255, 0.15)",
        text: "rgba(255, 255, 255, 1)",
      },
      {
        name: "Sleek Dark",
        bg: "rgba(45, 45, 45, 0.85)",
        text: "rgba(240, 240, 240, 1)",
      },
      {
        name: "Warm Amber",
        bg: "rgba(230, 97, 0, 1)",
        text: "rgba(255, 255, 255, 1)",
      },
    ];

    presets.forEach((p) => {
      const btn = new Gtk.Button({
        label: p.name,
        hexpand: true,
      });
      btn.connect("clicked", () => {
        bgEntry.set_text(p.bg);
        textEntry.set_text(p.text);

        let rgbaB = new Gdk.RGBA();
        let rgbaT = new Gdk.RGBA();
        rgbaB.parse(p.bg);
        rgbaT.parse(p.text);
        bgButton.set_rgba(rgbaB);
        textButton.set_rgba(rgbaT);

        settings.set_string("background-color", p.bg);
        settings.set_string("text-color", p.text);
      });
      presetBox.append(new Gtk.FlowBoxChild({ child: btn }));
    });
    presetRow.add_suffix(presetBox);
    stylingGroup.add(presetRow);

    // Group 2: Behavior
    const behaviorGroup = new Adw.PreferencesGroup({
      title: "Behavior",
      description: "Configure network-based IP detection behavior",
    });
    page.add(behaviorGroup);

    // IP Version Row
    const ipVersionRow = new Adw.ComboRow({
      title: "IP Version",
      subtitle: "Choose whether to display your public IPv4 or IPv6 address",
      model: new Gtk.StringList({ strings: ["IPv4", "IPv6"] }),
    });

    ipVersionRow.selected =
      settings.get_string("ip-version") === "ipv6" ? 1 : 0;

    ipVersionRow.connect("notify::selected", () => {
      const value = ipVersionRow.selected === 1 ? "ipv6" : "ipv4";
      settings.set_string("ip-version", value);
    });
    behaviorGroup.add(ipVersionRow);

    window.add(page);
  }
}
