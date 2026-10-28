# Desinstalar pelo menu

**Desinstale qualquer app pela grade de aplicativos do GNOME, com o botão direito.**

*[Read in English](README.md)*

Extensão do GNOME Shell que acrescenta **Desinstalar** ao menu do botão direito dos apps na grade de
aplicativos e no dash, logo abaixo de "Detalhes do aplicativo". Ela descobre como o app foi instalado e
remove do jeito certo:

- **.deb (apt)**: `apt-get remove` pelo polkit (o sistema pede a sua senha). Nunca usa `--autoremove`, então
  as dependências que sobrarem continuam instaladas.
- **Flatpak**: `flatpak uninstall`, instalação do sistema ou do usuário. Os dados do app ficam guardados.
- **AppImage (AppImageLauncher)**: usa a remoção do próprio AppImageLauncher e esconde o item repetido dele
  no menu.

Sempre pergunta antes de remover.

## Segurança

- Pacotes marcados como essenciais, obrigatórios ou importantes nunca são removidos.
- Uma remoção que levaria junto o metapacote da área de trabalho (como `zorin-os-desktop` ou
  `ubuntu-desktop`) é recusada.
- Apps de origem desconhecida (como atalhos próprios em `~/.local/share/applications`) não ganham o item.

## Instalação

Precisa do GNOME Shell 46 a 50.

```sh
git clone https://github.com/walbertfreitas/uninstall-menu.git
mkdir -p ~/.local/share/gnome-shell/extensions
cp -r uninstall-menu/uninstall-menu@walbertfreitas.github.io ~/.local/share/gnome-shell/extensions/
gnome-extensions enable uninstall-menu@walbertfreitas.github.io
```

No Wayland, saia e entre de novo na sessão antes de ativar.

## Sobre

Não sou programador. Todo o código foi escrito pelo Claude (a IA da Anthropic) a meu pedido, e eu testei no
meu computador (Zorin OS 18, GNOME 46). Use por sua conta e risco, e fique à vontade para abrir uma issue ou
um pull request.

## Licença

GPL-3.0-or-later. Veja [LICENSE](LICENSE).
