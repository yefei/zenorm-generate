#!/usr/bin/env node

import * as path from 'path';
import { generate } from '../generate';

function getConfig(filename: string) {
  const configFile = path.join(process.cwd(), filename);
  const config = require(configFile);
  return Object.assign({
    backend: '@zenorm/generate-mysql',
  }, config);
}

async function main(configFilename: string) {
  const config = await getConfig(configFilename);
  const call = require(config.backend).default;
  await generate(call()(config), config);
}

if (!process.argv[2]) {
  console.log('zenorm-generate config.json');
  process.exit(1);
} else {
  main(process.argv[2]).then(() => process.exit(), e => {
    console.error(e);
    process.exit(1);
  });
}
