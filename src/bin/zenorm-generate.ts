#!/usr/bin/env node

import * as path from 'path';
import { generate } from '../generate';

function getConfig() {
  const configFile = path.join(process.cwd(), process.argv[3]);
  const config = require(configFile);
  return Object.assign({
    backend: '@zenorm/mysql',
  }, config);
}

async function main() {
  const config = await getConfig();
  const call = require(config.backend).default;
  await generate(call()(config), config);
}

if (!process.argv[2]) {
  console.log('zenorm-generate config.json');
  process.exit(1);
} else {
  main().then(() => process.exit(), e => {
    console.error(e);
    process.exit(1);
  });
}
