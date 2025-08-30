import fs from 'fs';
import path from 'path';
import os from 'os';
import type { InternalPublishMeta, InternalPublishOptions, PKG } from './types';
import core from '@actions/core';
import { runCommand } from './utils';
import { syncPackage } from './sync-package';
import { glob } from 'fast-glob';

// 打包时需要修剪的字段
const STRIP_FIELDS = [
  'scripts',
  'devDependencies',
  'config',
  'private',
  'publishConfig',
  'bundleDependencies',
  'devEngines',
  'files',
];
// 打包时需要继承的字段
const INHERIT_FIELDS = [
  'keywords',
  'homepage',
  'bugs',
  'license',
  'author',
  'contributors',
  'funding',
  'maintainers',
  'repository',
];

export async function publishPackage(meta: InternalPublishMeta, options: InternalPublishOptions) {
  core.info(`publish package name: ${meta.pkgObject.name}`);
  core.info(`publish package version: ${meta.pkgObject.version}`);
  core.info(`publish package private: ${!!meta.pkgObject.private}`);
  core.info(`publish package tag: ${options.tag}`);
  core.info(`publish package sync: ${!options.disableSync}`);
  core.info(`publish package strip: ${!options.disableStrip}`);

  if (meta.pkgObject.private && !options.includePrivate) {
    core.info(`package is private, skip publish`);
    return;
  }

  const restoreNpmrc = _1rewriteNpmrc(meta, options);
  const isExist = _2checkPackageExist(meta);

  // 包版本存在，则不用再发布
  if (isExist) {
    restoreNpmrc();
    return;
  }

  const restorePkgJson = _3preparePackage(meta, options);
  const removeLicense = _4copyFile(/^license$/i, 'LICENSE', meta);
  const removeReadme = _4copyFile(/^readme\.md$/i, 'README.md', meta);

  try {
    _5publishPackage(meta, options);
  } finally {
    restorePkgJson();
    restoreNpmrc();
    removeLicense?.();
    removeReadme?.();
  }

  await _6syncPackage(meta, options);
}

function _1rewriteNpmrc(meta: InternalPublishMeta, options: InternalPublishOptions) {
  core.info(`rewriting .npmrc`);

  // monorepo 下的所有 package 都参考根目录的 npmrc
  const npmrcFile = path.resolve('.npmrc');
  const exists = fs.existsSync(npmrcFile);
  const origin = exists ? fs.readFileSync(npmrcFile, 'utf-8') : '';
  const restore = () => {
    if (exists) {
      core.info(`restore .npmrc`);
      fs.writeFileSync(npmrcFile, origin);
    } else {
      core.info(`remove .npmrc`);
      fs.unlinkSync(npmrcFile);
    }
  };

  const authURL = new URL(options.registry);
  core.info(`append .npmrc authToken(${options.token.length})`);
  fs.appendFileSync(npmrcFile, `\n//${authURL.host}/:_authToken=${options.token}\n`, 'utf-8');

  core.info('append .npmrc registry');
  fs.appendFileSync(npmrcFile, `registry=${options.registry}\n`, 'utf-8');

  return restore;
}

function _2checkPackageExist(meta: InternalPublishMeta) {
  core.info(`checking package`);

  try {
    const options = core.isDebug() ? '--verbose' : '';
    runCommand(`npm view ${meta.pkgObject.name}@${meta.pkgObject.version} ${options}`, {
      cwd: meta.pkgRoot,
      stdio: 'ignore',
    });
    core.info(`${meta.pkgObject.name}@${meta.pkgObject.version} is exists, skip publish`);
    return true;
  } catch (err) {
    return false;
  }
}

function _3preparePackage(meta: InternalPublishMeta, options: InternalPublishOptions) {
  const inheritValues = meta.isWorkspace
    ? INHERIT_FIELDS.map((field) => ({ field, value: meta.rootPkgObject[field as keyof PKG] }))
    : [];
  const prePackCode = `
const fs = require('fs');
const path = require('path');
const pkgFile = '${meta.pkgFile}';

const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
${JSON.stringify(STRIP_FIELDS)}.forEach((field) => {
  pkg[field] = undefined;
});
${JSON.stringify(inheritValues)}.forEach(({field, value}) => {
  pkg[field] = typeof pkg[field] === 'undefined' ? value : pkg[field];
});
fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2));
    `;
  const prePackJS = path.join(os.tmpdir(), `prepack-${Date.now()}.js`);
  fs.writeFileSync(prePackJS, prePackCode);

  const restore = () => {
    core.info('restore package.json');
    fs.writeFileSync(meta.pkgFile, meta.pkgString);
  };

  // 添加可公开发布标记
  meta.pkgObject.publishConfig = {
    ...meta.pkgObject.publishConfig,
    access: 'public',
  };

  // 添加仓库信息
  if (!meta.pkgObject.repository) {
    meta.pkgObject.repository = meta.rootPkgObject.repository;
  }

  // 打包前修剪
  if (!options.disableStrip) {
    const oldPrePackJS = meta.pkgObject.scripts?.prepack || '';
    meta.pkgObject.scripts = {
      ...meta.pkgObject.scripts,
      prepack: [oldPrePackJS, `node ${prePackJS}`].filter(Boolean).join(' && '),
    };
  }

  // workspace: 协议替换
  const workspaceProtocol = 'workspace:';
  const dependencies = meta.pkgObject.dependencies || {};

  for (const [depName, depVer] of Object.entries(dependencies)) {
    if (depVer.startsWith(workspaceProtocol)) {
      const realVer = meta.pkgsByName[depName].version || '*';
      const workspaceVer = depVer.slice(workspaceProtocol.length).trim();

      if (workspaceVer === '*') {
        dependencies[depName] = realVer;
      } else if (workspaceVer.length === 1) {
        dependencies[depName] = workspaceVer + realVer;
      }
    }
  }

  fs.writeFileSync(meta.pkgFile, JSON.stringify(meta.pkgObject), 'utf-8');

  return restore;
}

function __findFile(pattern: RegExp, root: string) {
  const files = glob.sync('*', { cwd: root, onlyFiles: true });

  const fileName = files.find((fileName) => pattern.test(fileName));
  if (!fileName) return;

  const file = path.join(root, fileName);
  if (!fs.existsSync(file)) return;

  // 检查文件是否为符号链接
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink()) return;

  return file;
}

function _4copyFile(pattern: RegExp, fileName: string, meta: InternalPublishMeta) {
  if (!meta.isWorkspace) return;

  const sourceFile = __findFile(pattern, meta.prjRoot);
  if (!sourceFile) return;

  const targetFile = __findFile(pattern, meta.pkgRoot);
  if (targetFile) return;

  const destFile = path.join(meta.pkgRoot, fileName);
  fs.copyFileSync(sourceFile, destFile);

  return () => {
    fs.unlinkSync(destFile);
  };
}

function _5publishPackage(meta: InternalPublishMeta, options: InternalPublishOptions) {
  core.info('publishing package');
  const command = [
    //
    'npm',
    'publish',
    !options.disableProvenance && '--provenance',
    `--tag=${options.tag}`,
    options.dryRun && '--dry-run',
    core.isDebug() && '--verbose',
  ]
    .filter(Boolean)
    .join(' ');

  runCommand(command, { cwd: meta.pkgRoot });
}

async function _6syncPackage(meta: InternalPublishMeta, options: InternalPublishOptions) {
  if (options.disableSync) return;

  core.info(`syncing package`);
  await syncPackage(meta.pkgObject.name, options);
}
