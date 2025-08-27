# publish-node-package-action

![release](https://img.shields.io/github/v/release/FrontEndDev-org/publish-node-package-action)
[![marketplace](https://img.shields.io/badge/marketplace-publish--node--package--action-blueviolet)](https://github.com/marketplace/actions/publish-node-package-action)
![license](https://img.shields.io/github/license/FrontEndDev-org/publish-node-package-action)

将 NodeJS 软件包发布到存储库

# 特性

- 发布到 NPM 仓库，比 npm publish 更好用
- 支持任意工程类型，如 MonoRepo、PolyRepo、SingleRepo
- 支持任务包管理工具，如 npm、pnpm、yarn
- 支持同步新版本到 npmmirror.com
- 支持自动从根目录复制 License 到当前 package，如果当前没有的话
- 支持自动从根目录复制 README.md 到当前 package，如果当前没有的话
- 自动修剪 package.json 文件，删除多余的属性，如 `devDependencies`、`scripts` 等

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
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - uses: FrontEndDev-org/publish-node-package-action@v2
        with:
          token: ${{ secrets.NPM_TOKEN }}
```

# 入参

| 名称                 | 必填 | 默认值                       | 描述                                            |
| -------------------- | ---- | ---------------------------- | ----------------------------------------------- |
| `token`              | 是   | 无                           | 授权令牌                                        |
| `registry`           | 否   | `https://registry.npmjs.org` | 包源地址                                        |
| `tag`                | 否   | `latest`                     | 要发布的版本标签，默认为 latest                 |
| `dryRun`             | 否   | `false`                      | 模拟发布，但不实际上传到注册表                  |
| `includePrivate`     | 否   | `false`                      | 同时发布私有包                                  |
| `disableProvenance`  | 否   | `false`                      | 禁用 npm 发布的来源证明                         |
| `disableSync`        | 否   | `false`                      | 禁用同步到 npmmirror.com                        |
| `disableStrip`       | 否   | `false`                      | 禁用删除包中不需要的键，如 `scripts`、`devDependencies` 等                          |
| `disableCopyLicense` | 否   | `false`                      | 禁用复制根目录许可证文件（如果包没有的情况）    |
| `disableCopyReadme`  | 否   | `false`                      | 禁用复制根目录 README 文件（如果包没有的情况） |
| `syncTimeout`        | 否   | `30`                         | 同步超时时间（秒），默认为 30 秒                |

# 出错

无
