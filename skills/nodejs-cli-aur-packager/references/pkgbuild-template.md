# npm CLI → AUR 模板与检查清单

## 使用前先替换这些占位符

- `<pkgname>`：AUR 包名，例如 `openspec`
- `<npmname>`：npm 包名，例如 `@fission-ai/openspec`
- `<npmslug>`：tarball 文件名部分，例如 `openspec`
- `<pkgver>`：上游版本
- `<pkgdesc>`：包描述
- `<url>`：项目主页
- `<license>`：SPDX 或 AUR 许可字段
- `<node-min>`：`engines.node` 的最低版本
- `<libdir>`：通常是 `nodejs-${pkgname}`
- `<binname>`：CLI 命令名
- `<binpath>`：npm `bin` 指向的真实相对路径，例如 `bin/openspec.js`

## 通用 `PKGBUILD` 模板

```bash
pkgname=<pkgname>
pkgver=<pkgver>
pkgrel=1
pkgdesc='<pkgdesc>'
arch=('any')
url='<url>'
license=('<license>')
depends=('nodejs>=<node-min>')
makedepends=('npm')
options=(!emptydirs)
source=("<npmslug>-${pkgver}.tgz::https://registry.npmjs.org/<npmname>/-/<npmslug>-${pkgver}.tgz")
sha256sums=('<sha256>')

prepare() {
    cd "${srcdir}/package"

    npm install \
        --cache "${srcdir}/npm-cache" \
        --omit=dev \
        --ignore-scripts \
        --no-audit \
        --no-fund
}

package() {
    cd "${srcdir}/package"

    install -d "${pkgdir}/usr/lib/<libdir>"
    shopt -s dotglob nullglob
    cp -a -- * "${pkgdir}/usr/lib/<libdir>/"

    install -d "${pkgdir}/usr/bin"
    cat > "${pkgdir}/usr/bin/<binname>" <<'EOF'
#!/bin/sh
exec node /usr/lib/<libdir>/<binpath> "$@"
EOF
    chmod 755 "${pkgdir}/usr/bin/<binname>"

    install -Dm644 LICENSE "${pkgdir}/usr/share/licenses/${pkgname}/LICENSE"
}
```

## 需要改写的分支

### 1. 不需要 `prepare()`

删除 `prepare()` 和 `makedepends=('npm')`，适用于：

- tarball 已自带 `node_modules/`
- 或没有运行时依赖且包已自包含

### 2. `LICENSE` 文件名不是 `LICENSE`

按 tarball 里的真实文件名改写，例如：

- `LICENSE.md`
- `LICENSE.txt`
- `COPYING`

如果 tarball 根本没有许可证文件，不要保留这行安装命令。

### 3. 多个 `bin`

为每个命令分别创建包装脚本，不要只保留第一个。

### 4. `bin` 指向 `dist/`

把包装脚本中的 `<binpath>` 改成真实路径，例如：

```bash
exec node /usr/lib/<libdir>/dist/cli/index.js "$@"
```

### 5. scope 包 URL

对 `@scope/name`，`source` 形态是：

```bash
source=("name-${pkgver}.tgz::https://registry.npmjs.org/@scope/name/-/name-${pkgver}.tgz")
```

## 标准检查清单

依次执行：

```bash
npm view "<npmname>@<pkgver>" version dist.tarball bin license engines dependencies optionalDependencies bundledDependencies scripts --json
curl -sL "<tarball-url>" -o "/tmp/<npmslug>-<pkgver>.tgz"
sha256sum "/tmp/<npmslug>-<pkgver>.tgz"
makepkg --printsrcinfo > .SRCINFO
makepkg -f
```

构建后再检查：

```bash
bsdtar -tf "<pkgname>-<pkgver>-<pkgrel>-any.pkg.tar.zst"
```

如果需要验证运行：

```bash
makepkg -si
<binname> --help
```

## 必查问题

- Node 最低版本是否来自 `engines.node`
- tarball 是否包含可执行入口
- 是否误执行了 `postinstall`
- 是否遗漏了 runtime 依赖
- 是否真正生成了 `.SRCINFO`
