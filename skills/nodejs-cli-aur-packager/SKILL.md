---
name: nodejs-cli-aur-packager
description: 'Package published npm CLI tools into Arch Linux AUR packages with reproducible npm tarball builds. Use when creating or updating PKGBUILD/.SRCINFO for a Node.js or TypeScript command-line package already published to npm, computing sha256 for npm tarballs, inspecting bin entries and postinstall scripts, generating wrapper scripts, or running makepkg verification. Triggers include: “把 npm CLI 打包成 AUR”, “为 npm 包生成 PKGBUILD”, “update AUR package for Node.js CLI”, “生成 .SRCINFO”, “compute sha256 for npm tarball”.'
---

# Node.js CLI → AUR 打包

## 概览

使用 npm registry tarball 作为上游源来打包 Node.js CLI。优先复用 npm 已发布的构建产物，避免从源码重新构建，以提高稳定性和可复现性。

## 适用边界

按下面的顺序判断：

1. 确认目标是 **CLI 工具**，并且 npm `package.json` 里存在 `bin`。
2. 确认目标版本已经发布到 npm registry。
3. 确认 tarball 里已经包含可运行产物，例如 `bin/`、`dist/`。
4. 如果 tarball 不含产物、必须执行完整构建流程、或依赖原生编译链，不要直接套用本 skill，改成源码构建方案。
5. 如果目标是纯库而不是 CLI，通常不要用这个 skill；库包一般按 `nodejs-*` 规则单独处理。

## 核心规则

- 优先从 npm tarball 打包，不优先从 GitHub 源码仓库打包。
- 先核对 npm 元数据，再写 `PKGBUILD`。
- 默认跳过上游 `postinstall`。只有在你已经读过脚本并确认它对打包结果必需且安全时，才手动复现必要部分。
- 不要假设只有一个 `bin` 入口；多入口时要为每个入口生成包装脚本。
- 不要假设 tarball 一定有 `LICENSE` 文件；先检查实际文件名和路径。
- 不要声称包可用，除非你真的运行过 `makepkg --printsrcinfo` 和 `makepkg -f`。

## 标准工作流

### 1. 收集上游元数据

先运行：

```bash
npm view "<npm包名>@<版本>" version dist.tarball bin license engines dependencies optionalDependencies bundledDependencies scripts --json
```

至少确认：

- 实际版本号
- tarball URL
- `bin` 入口
- 许可证类型
- `engines.node`
- 运行时依赖
- 是否存在 `postinstall`

### 2. 下载 tarball 并计算校验和

执行：

```bash
curl -sL "<tarball-url>" -o "/tmp/<name>-<ver>.tgz"
sha256sum "/tmp/<name>-<ver>.tgz"
```

把得到的 hash 写进 `sha256sums`。不要保留 `SKIP`。

### 3. 检查 tarball 内容

至少确认这些项目是否存在：

- `package/package.json`
- `package/bin/...` 或 `bin` 指向的实际入口文件
- `package/dist/...`（如果入口依赖构建产物）
- `package/LICENSE` 或类似文件
- `package/node_modules/` 是否已内置

如果 tarball 已包含 `node_modules/` 或 npm 元数据声明 `bundledDependencies`，通常不需要再跑 `npm install`。

### 4. 决定 `prepare()` 是否需要安装依赖

按下面规则处理：

- **没有运行时依赖，且 tarball 自包含**：省略 `prepare()`。
- **有运行时依赖，且 tarball 不含 `node_modules/`**：在 `prepare()` 中安装运行时依赖。
- **存在 `postinstall`**：先阅读脚本；默认继续使用 `--ignore-scripts`。

推荐的 `prepare()`：

```bash
prepare() {
    cd "${srcdir}/package"

    npm install \
        --cache "${srcdir}/npm-cache" \
        --omit=dev \
        --ignore-scripts \
        --no-audit \
        --no-fund
}
```

优先使用 `--omit=dev`，不要再写旧式的 `--production`。

### 5. 撰写 `PKGBUILD`

默认做法：

- `arch=('any')`
- `depends=('nodejs>=<engines.node 的下限>')`
- 只有 `prepare()` 会调用 npm 时，才加 `makedepends=('npm')`
- 把主体安装到 `/usr/lib/nodejs-${pkgname}` 这类稳定路径
- 用 `/usr/bin/<命令名>` 包装脚本调用 Node 入口

包装脚本基本形态：

```bash
#!/bin/sh
exec node /usr/lib/nodejs-${pkgname}/bin/<入口文件> "$@"
```

如果 `bin` 指向其他位置，就按真实路径写，不要假设一定在 `bin/`。

如果有多个 `bin`，为每个可执行命令都生成一个脚本。

写 `source` 时：

- 无 scope：`https://registry.npmjs.org/<npmname>/-/<npmname>-<pkgver>.tgz`
- 有 scope：`https://registry.npmjs.org/@scope/<name>/-/<name>-<pkgver>.tgz`

需要可直接复用的模板时，读取 `references/pkgbuild-template.md`。

### 6. 生成 `.SRCINFO`

执行：

```bash
makepkg --printsrcinfo > .SRCINFO
```

不要手写 `.SRCINFO`。

### 7. 本地构建验证

至少执行：

```bash
makepkg -f
```

建议继续做两类验证：

1. 检查产物内容：

```bash
bsdtar -tf "<生成的包文件>.pkg.tar.zst"
```

2. 检查 CLI 是否可执行：

```bash
makepkg -si
<命令名> --help
```

## 包名与路径决策

- 纯 CLI 工具：优先使用面向命令行的包名，只要不与现有 AUR 包冲突。
- 纯库：通常使用 `nodejs-<name>`。
- scope 包：AUR 包名不需要保留 scope，但 tarball URL 里要保留 scope 路径。
- 即使 AUR 包名是裸命令名，安装目录仍然可以使用 `nodejs-${pkgname}` 风格。

## 高风险点

- `postinstall` 修改用户目录、shell 配置或遥测设置
- `bin` 是对象而不是单字符串
- tarball 缺失 LICENSE 文件
- `engines.node` 下限高于 Arch 当前稳定版
- runtime 依赖未安装导致 CLI 启动即崩溃

## 完成后的输出要求

完成任务时，明确返回：

- `PKGBUILD` 路径
- `.SRCINFO` 路径
- `.pkg.tar.zst` 路径（如果已构建）
- 实际 `sha256`
- 真正执行过的验证命令
- 剩余风险与建议补充测试
