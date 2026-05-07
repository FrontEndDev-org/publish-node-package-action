# publish-node-package-action

![release](https://img.shields.io/github/v/release/FrontEndDev-org/publish-node-package-action)
[![marketplace](https://img.shields.io/badge/marketplace-publish--node--package--action-blueviolet)](https://github.com/marketplace/actions/publish-node-package-action)
![license](https://img.shields.io/github/license/FrontEndDev-org/publish-node-package-action)

发布 NodeJS 软件包

# 特性

- 发布到 NPM 仓库，比 npm publish 更好用
- 支持任意工程类型，如 MonoRepo、PolyRepo、SingleRepo
- 支持任务包管理工具，如 npm、pnpm、yarn
- 支持同步新版本到 npmMirror.com
- 支持自动从根目录复制 License 到当前 package，如果当前软件包没有时
- 支持自动从根目录复制 README.md 到当前 package，如果当前软件包没有时
- 自动修剪 package.json 文件
  - 删除多余属性，如 `devDependencies`、`scripts` 等
  - 继承相关属性，如 `author`、`license` 等

# 发版到 NPM 仓库

- 确保您已在仓库中存储了 NPM **Classic Token**（即 "Automation" token）作为密钥。您可以在 <https://www.npmjs.com/settings/your-username/tokens> 生成一个。
- 如果您想发布作用域包，您需要在 npmjs.com 上申请创建一个组织，地址为 <https://www.npmjs.com/org/create>。

```yaml
jobs:
  publish-npm:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
          cache-dependency-path: package-lock.json
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: FrontEndDev-org/publish-node-package-action@v5
```

# 入参

| 名称                 | 必填 | 默认值                       | 描述                                                                   |
| -------------------- | ---- | ---------------------------- | ---------------------------------------------------------------------- |
| `token`              | 否   | ""                           | 软件包源的授权令牌，未指定时表示使用可信源发布模式                                                     |
| `registry`           | 否   | `https://registry.npmjs.org` | 软件包源地址                                                           |
| `tag`                | 否   | `latest`                     | 版本标签，默认为 latest                                                |
| `dryRun`             | 否   | `false`                      | 模拟发布                                                               |
| `includePrivate`     | 否   | `false`                      | 同时发布私有包                                                         |
| `disableProvenance`  | 否   | `false`                      | 禁用 npm 发布的来源证明                                                |
| `disableSync`        | 否   | `false`                      | 禁用同步到 npmMirror.com                                               |
| `disableStrip`       | 否   | `false`                      | 禁用修剪软件包中 package.json 中的字段，workspace 模式时会继承相关字段 |
| `disableCopyLicense` | 否   | `false`                      | 禁用复制根目录许可证文件（只在 workspace 模式启用，且软件包没有时）    |
| `disableCopyReadme`  | 否   | `false`                      | 禁用复制根目录 README 文件（只在 workspace 模式启用，且软件包没有时）  |
| `syncTimeout`        | 否   | `30`                         | 同步到 npmMirror.com 超时时间（秒），默认为 30 秒                      |
| `packageFields`      | 否   | ""                           | 额外指定发布时携带的 package.json 字段，逗号分隔，默认为空字符串                     |

# 出参

无
