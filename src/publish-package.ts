import fs from 'fs';
import path from 'path';
import os from 'os';
import type { InternalPublishMeta, InternalPublishOptions, PKG } from './types';
import core from '@actions/core';
import { runCommand } from './utils';
import { syncPackage } from './sync-package';

export async function publishPackage(meta: InternalPublishMeta, options: InternalPublishOptions) {
  core.info(`publish package root: ${meta.pkgRoot}`);
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

  try {
    _4publishPackage(meta, options);
  } finally {
    restorePkgJson();
    restoreNpmrc();
  }

  await _5syncPackage(meta, options);
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
  const prePackCode = `
const fs = require('fs');
const path = require('path');
const pkgFile = '${meta.pkgFile}';

const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
['scripts', 'publishConfig', 'devDependencies'].forEach((key) => {
  pkg[key] = undefined;
});
fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2));
    `;
  const prePackJS = path.join(os.tmpdir(), `prepack-${Date.now()}.js`);
  fs.writeFileSync(prePackJS, prePackCode);

  const restore = () => {
    core.info('restore package.json');
    fs.writeFileSync(meta.pkgFile, meta.pkgString);
  };

  meta.pkgObject.publishConfig = {
    ...meta.pkgObject.publishConfig,
    access: 'public',
  };

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

function _4publishPackage(meta: InternalPublishMeta, options: InternalPublishOptions) {
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

  runCommand('node --version', { cwd: meta.pkgRoot });
  runCommand('npm --version', { cwd: meta.pkgRoot });
  runCommand(command, { cwd: meta.pkgRoot });
}

async function _5syncPackage(meta: InternalPublishMeta, options: InternalPublishOptions) {
  if (options.disableSync) return;

  core.info(`syncing package`);
  await syncPackage(meta.pkgObject.name, options);
}
