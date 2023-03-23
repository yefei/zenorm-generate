import { promises as fs } from 'fs';
import * as path from 'path';
import { pascalCase } from 'pascal-case';
import { snakeCase } from 'snake-case';
import { GenerateConfig, TabelDescribe } from './types';

const zenormName = process.env.ZENORM_NAME || 'zenorm';

function cwdPath(p: string): string {
  if (p.startsWith('./')) {
    return path.join(process.cwd(), p.slice(2));
  }
  return p;
}

function checkFileDir(dir: string) {
  return fs.mkdir(dir, { recursive: true });
}

function fileExists(f: string) {
  return fs.access(f).then(() => true, e => false);
}

function datetime() {
  return new Date().toLocaleString();
}

export async function generate(tables: AsyncGenerator<TabelDescribe>, cfg?: GenerateConfig) {
  console.log('generate models...');
  const config = Object.assign({
    outputDir: './src/model',
    tablesFilename: '_tables',
    repositoriesFilename: '_repositories',
    globalFilename: '_global',
  }, cfg);

  const outputDir = cwdPath(config.outputDir);
  await checkFileDir(outputDir);

  console.log('database:', config.database);

  const remark = [
    '// zenorm 自动生成文件',
    '// 请不要修改此文件，因为此文件在每次重新生成数据库结构时会被覆盖',
    `// create at: ${datetime()}`,
    `// create by: ${process.env.USER || process.env.USERNAME || '-'}@${process.env.COMPUTERNAME || '-'}`,
    `// database: ${config.database}`,
  ];

  const structs: string[] = [
    ...remark,
    `import _Global from './${config.globalFilename}';`,
    '',
  ];
  const models: string[][] = [];
  const filterRegExp = config.filter ? new RegExp(config.filter) : null;
  const includeRegExp = config.include ? new RegExp(config.include) : null;

  for await (const t of tables) {
    const tableName = t.name;

    if ((filterRegExp && filterRegExp.test(tableName))
        || (includeRegExp && !includeRegExp.test(tableName))) {
      // console.log('table:', tableName, 'ignore');
      continue;
    }

    const className = pascalCase(tableName);
    const name = snakeCase(tableName);
    const outputFilename = path.join(outputDir, name + '.ts');
    console.log('table:', tableName);

    let pk = 'id';
    let pkType = 'number';
    const props: string[] = [];
    const columns: string[] = [];
    for (const c of t.columns) {
      if (c.pk) {
        pk = c.name;
        pkType = c.type;
      }
      if (c.comment && c.comment.length) {
        props.push(`  /**`);
        for (const line of c.comment) {
          props.push(`   * ${line}`)
        }
        props.push(`   */`);
      }
      props.push(`  ${c.name}${c.required ? '!' : '?'}: ${c.type};`);
      columns.push(c.name);
    }

    structs.push(`export class ${className}Table extends _Global {`);
    structs.push(`  static columns = ${JSON.stringify(columns)};`);
    structs.push(...props);
    structs.push('}');
    structs.push('');

    if (!await fileExists(outputFilename)) {
      const ts: (string | null)[] = [
        `import { model } from '${zenormName}';`,
        `import { ${className}Table } from './${config.tablesFilename}';`,
        '',
        `@model({`,
        `  pk: '${pk}',`,
        name != tableName ? `  name: '${name}',` : null,
        `  table: '${tableName}',`,
        `})`,
        `export default class ${className} extends ${className}Table {`,
        `}`,
        '',
      ];
      await fs.writeFile(outputFilename, ts.filter(i => i !== null).join('\n'));
    }

    models.push([name, className, pkType]);
  }

  const tablesFilename = path.join(outputDir, config.tablesFilename + '.ts');
  console.log(`write tables file: ${tablesFilename}`);
  await fs.writeFile(tablesFilename, structs.join('\n'));

  const repositories: string[] = [
    ...remark,
    `import { QueryParam, createRepositoryQuery } from '${zenormName}';`,
    ...models.map(([name, className]) => `import _${className} from './${name}';`),
    '',
  ];

  // static
  models.forEach(([name, className, pkType]) => {
    repositories.push(
      `export class ${className} extends _${className} {`,
      `  static query = createRepositoryQuery<${className}, ${pkType}>(${className});`,
      `}`,
      ''
    );
  });

  // Repositories
  repositories.push(
    `export class Repositories {`,
    `  constructor(private _query: QueryParam) {}`,
    ...models.map(([name, className]) => `  get ${className}Repository() { return ${className}.query(this._query); }`),
    `}`,
    '',
  );

  // 添加 Repositories 到目标模块中
  if (config.declareRepositoriesToModules) {
    for (const mod of config.declareRepositoriesToModules) {
      const _m = mod.split('.');
      repositories.push(`declare module '${_m[0]}' {`);
      repositories.push(`  interface ${_m.slice(1, -1).join('.')} {`);
      repositories.push(`    ${_m[_m.length - 1]}: Repositories;`);
      repositories.push(`  }`);
      repositories.push(`}`);
      repositories.push(``);
    }
  }

  const repositoriesFilename = path.join(outputDir, config.repositoriesFilename + '.ts');
  console.log(`write repositories file: ${repositoriesFilename}`);
  await fs.writeFile(repositoriesFilename, repositories.join('\n'));

  // 生成 global.ts
  await notExistsPut(path.join(outputDir, config.globalFilename + '.ts'), () => {
    return 'export default class Global {}';
  });

  // 生成 index.ts
  await notExistsPut(path.join(outputDir, 'index.ts'), () => {
    return [
      `export * from './${config.tablesFilename}';`,
      `export * from './${config.repositoriesFilename}';`,
    ].join('\n');
  });
}

/**
 * 文件不存在则创建并写入内容
 * @param filename 
 * @param getContent 
 */
async function notExistsPut(filename: string, getContent: () => string) {
  if (!await fileExists(filename)) {
    console.log(`write file: ${filename}`);
    await fs.writeFile(filename, getContent());
  }
}
