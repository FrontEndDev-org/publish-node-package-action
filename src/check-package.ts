import core from '@actions/core';
import type { InternalPublishPkg } from './types';
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
