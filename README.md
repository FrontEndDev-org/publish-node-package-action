# publish-node-package-action

![release](https://img.shields.io/github/v/release/cloudcome/publish-node-package-action)
[![marketplace](https://img.shields.io/badge/marketplace-publish--node--package--action-blueviolet)](https://github.com/marketplace/actions/publish-node-package-action)
![license](https://img.shields.io/github/license/cloudcome/publish-node-package-action)

Publish a NodeJS package to NPM Repository or GitHub Packages

# Publish to NPM Repository

```yaml
jobs:
  publish-npm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - uses: cloudcome/publish-node-package-action@v1
        with:
          target: npm
          token: ${{ secrets.NPM_TOKEN }}
```

# Publish to GitHub Packages

**Requires GitHub Packages write access**

```yaml
permissions:
  packages: write

jobs:
  publish-github:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - uses: cloudcome/publish-node-package-action@v1
        with:
          target: github
```

# Inputs

| Name     | Required | Default  | Description                                                                                                            |
| -------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `target` | true     | None     | Release target, optionally npm/github                                                                                  |
| `token`  | false    | None     | Target authorization token, GitHub Packages target does not need, internally has automatically obtained `github.token` |
| `tag`    | false    | `latest` | The version label to release, the default is latest                                                                    |
