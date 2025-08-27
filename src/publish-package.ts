import fs from 'fs';
import path from 'path';
import os from 'os';
import type { InternalPublishMeta, InternalPublishOptions, PKG, PublishTarget } from './types';
import core from '@actions/core';
import { registryRecord } from './const';
import { runCommand } from './utils';
import { syncPackage } from './sync-package';

export async function publishPackage(meta: InternalPublishMeta, options: InternalPublishOptions) {
    core.info(`publish package cwd: ${meta.cwd}`);
    core.info(`publish package name: ${meta.name}`);
    core.info(`publish package version: ${meta.version}`);
    core.info(`publish package tag: ${options.tag}`);
    core.info(`publish package target: ${options.target}`);
    core.info(`publish package sync: ${!options.disableSync}`);
    core.info(`publish package strip: ${!options.disableStrip}`);

    const prePackJS = _1generatePrePackScript(meta, options);
    const restorePkgJson = _2preparePackage(prePackJS, meta, options);
    const restoreNpmrc = _3rewriteNpmrc(meta, options);
    const isExist = _4checkPackageExist(meta);

    if (isExist) {
        restorePkgJson?.();
        restoreNpmrc();
        return;
    }

    try {
        _5publishPackage(meta, options);
    } finally {
        restorePkgJson?.();
        restoreNpmrc();
    }

    _6syncPackage(meta, options);
}

function _1generatePrePackScript(meta: InternalPublishMeta, options: InternalPublishOptions) {
    const scriptCode = `
const fs = require('fs');
const path = require('path');
const pkgFile = '${meta.pkgFile}';

const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
['scripts', 'publishConfig', 'devDependencies'].forEach(key => {
  pkg[key] = undefined;
});
fs.writeFileSync(pkgFile, JSON.stringify(pkg));
    `;
    const scriptFile = path.join(os.tmpdir(), `prepack-${Date.now()}.js`);
    fs.writeFileSync(scriptFile, scriptCode);
    return scriptFile;
}

function _2preparePackage(prePackJS: string, meta: InternalPublishMeta, options: InternalPublishOptions) {
    const origin = fs.readFileSync(meta.pkgFile, 'utf-8');
    const pkg = JSON.parse(origin) as PKG;
    const restore = () => {
        core.info('restore package.json');
        fs.writeFileSync(meta.pkgFile, origin);
    };

    if (pkg.private && !options.includePrivate) {
        core.info(`package is private, skip publish`);
        return;
    }

    pkg.publishConfig = {
        ...pkg.publishConfig,
        access: 'public',
    };

    if (!options.disableStrip) {
        const oldPrePackJS = pkg.scripts?.prepack || '';
        pkg.scripts = {
            ...pkg.scripts,
            prepack: [oldPrePackJS, prePackJS].filter(Boolean).join(' && '),
        };
    }

    if (options.target === 'github') {
        // originName        ->  underlineName
        // my-pkg            ->  my-pkg
        // @my-scope/my-pkg  ->  my-scope__my-pkg
        const scopeMatches = pkg.name.match(/@(.*)\/(.*)/);
        const scope = scopeMatches ? scopeMatches[1] : '';
        const name = scopeMatches ? scopeMatches[2] : pkg.name;
        const underlineName = scope && scope !== meta.repoOwner ? `${scope}__${name}` : name;
        const ownerName = `@${meta.repoOwner}/${underlineName}`;

        core.info(`rewrite package name: ${pkg.name} -> ${ownerName}`);
        pkg.name = ownerName;
    }

    fs.writeFileSync(meta.pkgFile, JSON.stringify(pkg), 'utf-8');

    return restore;
}

function _3rewriteNpmrc(meta: InternalPublishMeta, options: InternalPublishOptions) {
    core.info(`rewriting .npmrc`);

    // monorepo 下的所有 package 都参考根目录的 npmrc
    const npmrcFile = path.resolve('.npmrc');
    const exists = fs.existsSync(npmrcFile);
    const origin = exists ? fs.readFileSync(npmrcFile, 'utf-8') : '';
    const registry = registryRecord[options.target];
    const restore = () => {
        if (exists) {
            core.info(`restore .npmrc`);
            fs.writeFileSync(npmrcFile, origin);
        } else {
            core.info(`remove .npmrc`);
            fs.unlinkSync(npmrcFile);
        }
    };

    const authURL = new URL(registry);
    core.info(`append .npmrc authToken(${options.token.length})`);
    fs.appendFileSync(npmrcFile, `\n//${authURL.host}/:_authToken=${options.token}\n`, 'utf-8');

    core.info('append .npmrc registry');
    fs.appendFileSync(npmrcFile, `registry=${registry}\n`, 'utf-8');

    return restore;
}

function _4checkPackageExist(meta: InternalPublishMeta) {
    core.info(`checking package`);

    try {
        const options = core.isDebug() ? '--verbose' : '';
        runCommand(`npm view ${meta.name}@${meta.version} ${options}`, meta.cwd);
        core.info(`${meta.name}@${meta.version} is exists, skip publish`);
        return true;
    } catch (err) {
        return false;
    }
}

function _5publishPackage(meta: InternalPublishMeta, options: InternalPublishOptions) {
    core.info('publishing package');
    const command = [
        //
        'npm',
        'publish',
        options.target === 'npm' && !options.disableProvenance && '--provenance',
        `--tag=${options.tag}`,
        options.dryRun && '--dry-run',
        core.isDebug() && '--verbose',
    ]
        .filter(Boolean)
        .join(' ');

    runCommand('node --version', meta.cwd);
    runCommand('npm --version', meta.cwd);
    runCommand(command, meta.cwd);
}

async function _6syncPackage(meta: InternalPublishMeta, options: InternalPublishOptions) {
    if (options.target === 'npm' && options.disableSync) {
        core.info(`syncing package`);
        await syncPackage(meta.name, options);
    }
}
