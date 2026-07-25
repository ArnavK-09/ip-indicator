import Adw from "gi://Adw";
import Gdk from "gi://Gdk";
import Gtk from "gi://Gtk";
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class IPIndicatorPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();

    const page = new Adw.PreferencesPage({
      title: "Settings",
      icon_name: "preferences-system-symbolic",
    });

    page.add(this._buildAppearanceGroup(settings));
    page.add(this._buildSpacingGroup(settings));
    page.add(this._buildBehaviorGroup(settings));

    window.add(page);
  }

  _createColorRow(
    settings,
    {
      title,
      subtitle,
      settingsKey,
      allowReset = false,
      resetValue = "transparent",
      resetRgba,
    },
  ) {
    const row = new Adw.ActionRow({ title, subtitle });

    const box = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 6,
      valign: Gtk.Align.CENTER,
    });

    const entry = new Gtk.Entry({
      text: settings.get_string(settingsKey),
      width_chars: 8,
      max_width_chars: 12,
      valign: Gtk.Align.CENTER,
    });

    const button = new Gtk.ColorButton({
      valign: Gtk.Align.CENTER,
      use_alpha: true,
    });

    const initialRgba = new Gdk.RGBA();
    if (initialRgba.parse(settings.get_string(settingsKey)))
      button.set_rgba(initialRgba);

    const applyText = (text) => {
      const rgba = new Gdk.RGBA();
      if (!rgba.parse(text)) return false;
      settings.set_string(settingsKey, text);
      button.set_rgba(rgba);
      return true;
    };

    entry.connect("changed", () => applyText(entry.get_text()));

    button.connect("color-set", () => {
      const color = button.get_rgba().to_string();
      entry.set_text(color);
      settings.set_string(settingsKey, color);
    });

    if (allowReset) {
      const resetButton = new Gtk.Button({
        icon_name: "edit-clear-symbolic",
        valign: Gtk.Align.CENTER,
        tooltip_text: `Reset to ${resetValue}`,
      });
      resetButton.connect("clicked", () => {
        settings.set_string(settingsKey, resetValue);
        entry.set_text(resetValue);
        const rgba = new Gdk.RGBA();
        if (rgba.parse(resetRgba ?? resetValue)) button.set_rgba(rgba);
      });
      box.append(resetButton);
    }

    box.prepend(entry);
    box.insert_child_after(button, entry);

    row.add_suffix(box);
    return { row, setValue: applyText };
  }

  _buildAppearanceGroup(settings) {
    const group = new Adw.PreferencesGroup({
      title: "Appearance",
      description:
        "Customize the appearance of the IP Indicator in the top panel",
    });

    const bg = this._createColorRow(settings, {
      title: "Background Color",
      subtitle:
        "Choose a background color for the indicator pill (HEX or RGBA)",
      settingsKey: "background-color",
      allowReset: true,
      resetValue: "transparent",
      resetRgba: "rgba(255, 255, 255, 0)",
    });
    group.add(bg.row);

    const fg = this._createColorRow(settings, {
      title: "Text Color",
      subtitle: "Color for the IP text",
      settingsKey: "text-color",
    });
    group.add(fg.row);

    // Presets
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
        name: "Adwaita Purple",
        bg: "rgba(145, 65, 172, 1)",
        text: "rgba(255, 255, 255, 1)",
      },
      {
        name: "Adwaita Teal",
        bg: "rgba(33, 144, 164, 1)",
        text: "rgba(255, 255, 255, 1)",
      },
      {
        name: "Clean Light",
        bg: "rgba(250, 250, 250, 0.95)",
        text: "rgba(36, 36, 36, 1)",
      },
    ];

    for (const preset of presets) {
      const btn = new Gtk.Button({ label: preset.name, hexpand: true });
      btn.connect("clicked", () => {
        bg.setValue(preset.bg);
        fg.setValue(preset.text);
      });
      presetBox.append(new Gtk.FlowBoxChild({ child: btn }));
    }
    presetRow.add_suffix(presetBox);
    group.add(presetRow);

    return group;
  }

  _buildSpacingGroup(settings) {
    const group = new Adw.PreferencesGroup({
      title: "Spacing",
      description:
        "Adjust padding and margin around the IP indicator (in pixels)",
    });

    const makeSpinRow = ({
      key,
      title,
      subtitle,
      lower,
      upper,
      defaultValue,
    }) => {
      const row = new Adw.SpinRow({
        title,
        subtitle,
        adjustment: new Gtk.Adjustment({
          lower,
          upper,
          step_increment: 1,
          page_increment: 5,
          value: settings.get_int(key) || defaultValue,
        }),
      });

      row.connect("notify::value", () => settings.set_int(key, row.value));
      return row;
    };

    const fields = [
      {
        key: "padding-x",
        title: "Horizontal Padding",
        subtitle: "Left and right padding inside the IP pill",
        default: 8,
      },
      {
        key: "padding-y",
        title: "Vertical Padding",
        subtitle: "Top and bottom padding inside the IP pill",
        default: 1,
      },
      {
        key: "margin-x",
        title: "Horizontal Margin",
        subtitle: "Left and right spacing around the IP text",
        default: 4,
      },
      {
        key: "margin-y",
        title: "Vertical Margin",
        subtitle: "Top and bottom spacing around the IP text",
        default: 0,
      },
    ];

    for (const f of fields) {
      group.add(
        makeSpinRow({
          key: f.key,
          title: f.title,
          subtitle: f.subtitle,
          lower: 0,
          upper: 50,
          defaultValue: f.default,
        }),
      );
    }

    return group;
  }

  _buildBehaviorGroup(settings) {
    const group = new Adw.PreferencesGroup({
      title: "Behavior",
      description: "Configure network-based IP detection behavior",
    });

    const ipVersionRow = new Adw.ComboRow({
      title: "IP Version",
      subtitle: "Choose whether to display your public IPv4 or IPv6 address",
      model: new Gtk.StringList({ strings: ["IPv4", "IPv6"] }),
    });

    ipVersionRow.selected =
      settings.get_string("ip-version") === "ipv6" ? 1 : 0;
    ipVersionRow.connect("notify::selected", () => {
      settings.set_string(
        "ip-version",
        ipVersionRow.selected === 1 ? "ipv6" : "ipv4",
      );
    });

    group.add(ipVersionRow);
    return group;
  }
}
