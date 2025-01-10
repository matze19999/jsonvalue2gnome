'use strict';

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class JsonValuePrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.jsonvalue');

        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup();

        // 1) URL-Eingabe
        const urlRow = new Adw.ActionRow({
            title: _('JSON URL'),
            subtitle: _('z.B. https://example.com/data.json'),
        });
        const urlEntry = new Gtk.Entry({
            text: settings.get_string('url'),
            hexpand: true,
        });
        urlEntry.connect('changed', (widget) => {
            settings.set_string('url', widget.get_text());
        });
        urlRow.add_suffix(urlEntry);
        group.add(urlRow);

        // 2) JSON-Pfad
        const pathRow = new Adw.ActionRow({
            title: _('JSON Pfad'),
            subtitle: _('z.B. 0.balance'),
        });
        const pathEntry = new Gtk.Entry({
            text: settings.get_string('json-path'),
            hexpand: true,
        });
        pathEntry.connect('changed', (widget) => {
            settings.set_string('json-path', widget.get_text());
        });
        pathRow.add_suffix(pathEntry);
        group.add(pathRow);

        // 3) Update-Intervall
        const intervalRow = new Adw.ActionRow({
            title: _('Update Intervall (Sekunden)'),
        });
        const intervalAdjustment = new Gtk.Adjustment({
            lower: 5,
            upper: 3600,
            step_increment: 5,
        });
        const intervalSpin = new Gtk.SpinButton({
            adjustment: intervalAdjustment,
            value: settings.get_int('update-interval'),
            hexpand: true,
        });
        intervalSpin.connect('value-changed', (widget) => {
            settings.set_int('update-interval', widget.get_value_as_int());
        });
        intervalRow.add_suffix(intervalSpin);
        group.add(intervalRow);

        page.add(group);
        window.add(page);
    }
}
