'use strict';

import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

let _httpSession = null;

// Einmalige Erstellung einer Soup-Session
function getHttpSession() {
    if (!_httpSession) {
        _httpSession = new Soup.Session({
            timeout: 10,
            user_agent: 'GNOME-JSON-Extension'
        });
        _httpSession.add_feature(new Soup.ProxyResolverDefault());
    }
    return _httpSession;
}

/**
 * Extrahiert anhand eines Pfads (z.B. '0.balance') einen Wert aus JSON.
 *  - '0.balance' -> array[0].balance
 *  - '1.firm_name' -> array[1].firm_name
 *  - 'balance' -> object.balance
 */
function getValueByPath(jsonData, path) {
    const parts = path.split('.');
    let value = jsonData;

    for (const p of parts) {
        if (!isNaN(p)) {
            const idx = parseInt(p, 10);
            if (Array.isArray(value) && value[idx] !== undefined) {
                value = value[idx];
            } else {
                return null;
            }
        } else {
            if (value[p] !== undefined) {
                value = value[p];
            } else {
                return null;
            }
        }
    }

    return value;
}

const JsonValueIndicator = GObject.registerClass(
class JsonValueIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, 'JSON Value Indicator', false);

        this._extension = extension;
        this._settings = this._extension.getSettings('org.gnome.shell.extensions.jsonvalue');

        this._label = new St.Label({
            text: 'lade...',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'jsonvalue-label'
        });
        this.add_child(this._label);

        this._timeoutId = null;

        this._startUpdateLoop();
    }

    _startUpdateLoop() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        this._update();
    }

    async _update() {
        const url = this._settings.get_string('url');
        const path = this._settings.get_string('json-path');
        const interval = this._settings.get_int('update-interval');

        try {
            const session = getHttpSession();
            const message = Soup.Message.new('GET', url);
            const bytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
            if (message.get_status() === 200) {
                const data = new TextDecoder().decode(bytes.get_data());
                const json = JSON.parse(data);
                const value = getValueByPath(json, path);
                this._label.set_text(value !== null && value !== undefined ? value.toString() : 'N/A');
            } else {
                this._label.set_text(`Err ${message.get_status()}`);
            }
        } catch (e) {
            logError(e);
            this._label.set_text('Error');
        }

        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
            this._update();
            return GLib.SOURCE_CONTINUE;
        });
    }

    destroy() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        super.destroy();
    }
});

export default class JsonValueExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
    }

    enable() {
        try {
            this._indicator = new JsonValueIndicator(this);
            Main.panel.addToStatusArea('jsonValueIndicator', this._indicator);
            log('Erweiterung erfolgreich aktiviert');
        } catch (e) {
            logError(e, 'Aktivierung der Erweiterung fehlgeschlagen');
        }
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        log('Erweiterung deaktiviert');
    }
}

