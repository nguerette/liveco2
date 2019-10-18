#!/usr/bin/env node

const {execFileSync} = require('child_process');

const cf = args => execFileSync('cf', args, {stdio: 'inherit'});

cf([
  'login',
  '-a', 'api.run.pivotal.io',
  '-u', 'nguerette@pivotal.io',
  '-o', 'labs-playground',
  '-s', 'Nick Guerette'
]);

cf([
  'push', 'liveco2',
  '-b', 'nodejs_buildpack',
  '-i', '1',
  '-k', '256M',
  '-m', '64M',
  '-c', 'node -e "require(\'./scratch_2\').newApp(process.env.PORT)"'
]);
