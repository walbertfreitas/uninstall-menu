// Desinstalar pelo menu — extensão do GNOME Shell (GPL-3.0-or-later)
//
// Acrescenta "Desinstalar" ao menu do botão direito dos apps (grade de aplicativos, dash), logo abaixo
// de "Detalhes do aplicativo". Pergunta antes de remover. O trabalho de verdade fica no helper.py:
// apt para .deb (pede a senha pelo polkit), flatpak para Flatpak; AppImages usam a remoção do
// próprio AppImageLauncher.

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {AppMenu} from 'resource:///org/gnome/shell/ui/appMenu.js';
import * as Dialog from 'resource:///org/gnome/shell/ui/dialog.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';

const APPIMAGE_ACTION = 'AppImageLauncher-Remove-AppImage';

// palpite rápido (sem rodar nada) para decidir se o item aparece; o helper confirma ao clicar
function quickKind(appInfo) {
    const path = appInfo?.get_filename?.();
    if (!path)
        return null;
    if (appInfo.list_actions().includes(APPIMAGE_ACTION))
        return 'appimage';
    if (path.includes('/flatpak/exports/'))
        return 'flatpak';
    if (path.startsWith('/usr/'))
        return 'deb';
    return null;
}

function confirm(title, description) {
    return new Promise(resolve => {
        const dialog = new ModalDialog.ModalDialog();
        dialog.contentLayout.add_child(new Dialog.MessageDialogContent({title, description}));
        dialog.addButton({
            label: 'Cancelar',
            action: () => {
                dialog.close();
                resolve(false);
            },
            key: Clutter.KEY_Escape,
        });
        dialog.addButton({
            label: 'Desinstalar',
            action: () => {
                dialog.close();
                resolve(true);
            },
        });
        dialog.open();
    });
}

export default class UninstallMenuExtension extends Extension {
    enable() {
        this._items = new Set();
        const ext = this;
        const setApp = AppMenu.prototype.setApp;
        this._setApp = setApp;
        AppMenu.prototype.setApp = function (app) {
            setApp.call(this, app);
            ext._decorate(this);
        };
    }

    disable() {
        AppMenu.prototype.setApp = this._setApp;
        this._items.forEach(item => {
            delete item._uninstallMenu._uninstallItem;
            item.destroy();
        });
        this._items = null;
    }

    _decorate(menu) {
        if (!menu._uninstallItem) {
            const item = menu.addAction('Desinstalar', () => this._uninstall(menu._app));
            const position = menu._getMenuItems().indexOf(menu._detailsItem);
            if (position >= 0)
                menu.moveMenuItem(item, position + 1);
            item._uninstallMenu = menu;
            menu._uninstallItem = item;
            this._items.add(item);
            item.connect('destroy', () => this._items?.delete(item));
        }
        const appInfo = menu._app?.app_info;
        const kind = quickKind(appInfo);
        menu._uninstallItem.visible = kind !== null;
        // o AppImageLauncher já põe "Remover AppImage do sistema" no menu: fica só o nosso item
        if (kind === 'appimage') {
            const label = appInfo.get_action_name(APPIMAGE_ACTION);
            menu._actionSection._getMenuItems().forEach(item => {
                if (item.label?.text === label)
                    item.visible = false;
            });
        }
    }

    _helper(args) {
        return new Promise((resolve, reject) => {
            const proc = Gio.Subprocess.new(
                ['/usr/bin/python3', '-I', GLib.build_filenamev([this.path, 'helper.py']), ...args],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
            proc.communicate_utf8_async(null, null, (p, res) => {
                try {
                    const [, out, err] = p.communicate_utf8_finish(res);
                    if (p.get_successful())
                        resolve(out);
                    else
                        reject(new Error(err.trim() || 'falhou'));
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    async _uninstall(app) {
        if (!app)
            return;
        const appInfo = app.app_info;
        const name = app.get_name();
        if (quickKind(appInfo) === 'appimage') {
            // a ferramenta do AppImageLauncher já confirma e apaga o arquivo e o atalho
            app.launch_action(APPIMAGE_ACTION, global.get_current_time(), -1);
            return;
        }
        let info;
        try {
            info = JSON.parse(await this._helper(['info', appInfo.get_filename()]));
        } catch (e) {
            Main.notify(`Não foi possível desinstalar ${name}`, e.message);
            return;
        }
        if (info.kind === 'unknown') {
            Main.notify(`Não foi possível desinstalar ${name}`, 'Não descobri como este app foi instalado.');
            return;
        }
        if (info.blocked) {
            Main.notify(`${name} não pode ser desinstalado por aqui`, info.reason);
            return;
        }
        let description;
        if (info.kind === 'flatpak') {
            description = 'O app será removido. Seus dados nele ficam guardados.';
        } else {
            const extras = info.removes.filter(p => p !== info.package);
            description = extras.length
                ? `Também serão removidos: ${extras.join(', ')}.`
                : 'O app será removido. Seus arquivos pessoais ficam.';
        }
        if (!await confirm(`Desinstalar ${name}?`, `${description}\nO sistema pode pedir a sua senha.`))
            return;
        try {
            await this._helper(['remove', appInfo.get_filename()]);
            Main.notify(`${name} foi desinstalado`, '');
        } catch (e) {
            Main.notify(`Não foi possível desinstalar ${name}`, e.message);
        }
    }
}
