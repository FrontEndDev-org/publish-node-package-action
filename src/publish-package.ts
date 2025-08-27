import fs from 'fs';
import path from 'path';
import type { InternalPublishPkg, InternalPublishOptions, PublishTarget } from './types';
import core from '@actions/core';
import { registryRecord } from './const';
import { runCommand } from './utils';

export function checkPackageExist(pkg: InternalPublishPkg) {
    try {
        const options = core.isDebug() ? '--verbose' : '';
        runCommand(`npm view ${pkg.name}@${pkg.version} ${options}`, pkg.cwd);
        return true;
    } catch (err) {
        return false;
    }
}

export function publishPackage(pkg: InternalPublishPkg, options: InternalPublishOptions) {
    // monorepo 下的所有 package 都参考根目录的 npmrc
    const npmrcFile = path.resolve('.npmrc');
    const backupFile = npmrcFile + '-' + Date.now();
    const exists = fs.existsSync(npmrcFile);

    if (exists) {
        core.info('found .npmrc');
        core.info('backup .npmrc ' + path.relative(process.cwd(), backupFile));
        fs.copyFileSync(npmrcFile, backupFile);
    } else {
        core.info('not found .npmrc');
    }

    const registry = registryRecord[options.target];
    const authURL = new URL(registry);

    core.info(`append .npmrc authToken(${options.token.length})`);
    fs.appendFileSync(npmrcFile, `\n//${authURL.host}/:_authToken=${options.token}\n`, 'utf-8');

    core.info('append .npmrc registry');
    fs.appendFileSync(npmrcFile, `registry=${registry}\n`, 'utf-8');

    const cleanup = () => {
        if (exists) {
            fs.renameSync(backupFile, npmrcFile);
        } else {
            fs.unlinkSync(npmrcFile);
        }
    };

    const check = () => {
        core.info(`checking package is exist`);
        const isExist = checkPackageExist(pkg);

        if (isExist) {
            core.info(`package is exists, skip publish`);
            cleanup();
            return true;
        }
    };

    const publish = () => {
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

        try {
            runCommand('node --version', pkg.cwd);
            runCommand('npm --version', pkg.cwd);
            runCommand(command, pkg.cwd);
        } finally {
            cleanup();
        }
    };

    if (check()) return;
    publish();
}
