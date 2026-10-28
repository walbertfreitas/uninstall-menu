# Desinstalar pelo menu

**Uninstall any app from the GNOME app grid with a right click.**

*[Leia em português](README.pt-BR.md)*

A GNOME Shell extension that adds **Desinstalar** (Uninstall) to the right-click menu of apps in the app grid
and the dash, right below "App Details". It works out what kind of install the app is and removes it the
right way:

- **.deb (apt)** — `apt-get remove` through polkit (the system asks for your password). Never `--autoremove`:
  leftover dependencies stay installed.
- **Flatpak** — `flatpak uninstall`, system or user install. Your app data is kept.
- **AppImage (AppImageLauncher)** — uses AppImageLauncher's own remove action and hides its duplicate menu entry.

It always asks before removing anything.

## Safety

- Packages marked essential, required or important are never removed.
- A removal that would also take the desktop metapackage with it (for example `zorin-os-desktop` or
  `ubuntu-desktop`) is refused.
- Apps from unknown sources (such as custom launchers in `~/.local/share/applications`) don't get the item.

## Install

Requires GNOME Shell 46–50.

```sh
git clone https://github.com/walbertfreitas/uninstall-menu.git
mkdir -p ~/.local/share/gnome-shell/extensions
cp -r uninstall-menu/uninstall-menu@walbertfreitas.github.io ~/.local/share/gnome-shell/extensions/
gnome-extensions enable uninstall-menu@walbertfreitas.github.io
```

On Wayland, log out and back in before enabling it.

The interface is in Brazilian Portuguese for now. Translations are welcome.

## About

I'm not a programmer. All the code was written by Claude (Anthropic's AI) at my request, and I tested it on
my own computer (Zorin OS 18, GNOME 46). Use it at your own risk, and feel free to open an issue or a pull
request.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
