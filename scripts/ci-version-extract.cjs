const pkg = require('../package.json');
const core = require('@actions/core');

const [major, minor, patch] = pkg.version.split('.');

core.setOutput('version', pkg.version);
core.setOutput('major', major);
core.setOutput('minor', minor);
core.setOutput('patch', patch);
