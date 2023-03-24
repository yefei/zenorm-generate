import { promises as fs } from 'fs';
import * as path from 'path';
import { pascalCase } from 'pascal-case';
import { snakeCase } from 'snake-case';
import { GenerateConfig, TabelDescribe } from './types';
import { checkFileDir, currentDatetime, cwdPath, notExistsPut } from './utils';

const zenormName = process.env.ZENORM_NAME || 'zenorm';

export async function generate(tables: AsyncGenerator<TabelDescribe>, cfg?: GenerateConfig) {
  console.log('generate models...');
  const config = Object.assign({
    outputDir: './src/model',
    tablesFilename: '_tables',
    repositoriesFilename: '_repositories',
  }, cfg);

  const outputDir = cwdPath(config.outputDir);
  await checkFileDir(outputDir);

  console.log('database:', config.database);

  const remark = [
    '// zenorm 自动生成文件',
    '// 请不要修改此文件，因为此文件在每次重新生成数据库结构时会被覆盖',
    `// create at: ${currentDatetime()}`,
    `// create by: ${process.env.USER || process.env.USERNAME || '-'}@${process.env.COMPUTERNAME || '-'}`,
    `// database: ${config.database}`,
  ];

  const structs: (string | null)[] = [
    ...remark,
    config.globalFilename ? `import _Global from './${config.globalFilename}';` : null,
    '',
  ];
  const models: {
    name: string,
    className: string,
    pkType: string,
  }[] = [];
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

    structs.push(`export class ${className}Table${config.globalFilename ? ' extends _Global' : ''} {`);
    structs.push(`  static columns = ${JSON.stringify(columns)};`);
    structs.push(...props);
    structs.push('}');
    structs.push('');

    // model class
    await notExistsPut(outputFilename, () => {
      return [
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
      ].filter(i => i !== null).join('\n');
    });

    models.push({ name, className, pkType });
  }

  const tablesFilename = path.join(outputDir, config.tablesFilename + '.ts');
  console.log(`write tables file: ${tablesFilename}`);
  await fs.writeFile(tablesFilename, structs.filter(i => i !== null).join('\n'));

  const repositories: string[] = [
    ...remark,
    `import { ${config.generateRepositories ? `QueryParam, ` : ''}createRepositoryQuery } from '${zenormName}';`,
    ...models.map(({ name, className }) => `import _${className} from './${name}';`),
  ];

  // 绑定静态 Query
  if (config.bindQuery) {
    const [v, p] = config.bindQuery.split('@', 2);
    repositories.push(`import { ${v} as _query } from '${p}';`);
  }

  // static
  models.forEach(({ className, pkType }) => {
    repositories.push(
      '',
      `export class ${className} extends _${className} {`,
      `  /** 使用指定 Query 对象查询 ${className}Repository */`,
      `  static query = createRepositoryQuery<${className}, ${pkType}>(${className});`,
    );
    if (config.bindQuery) {
      repositories.push(`  /** Query 绑定的 ${className}Repository */`);
      repositories.push(`  static repository = ${className}.query(_query);`);
      repositories.push(...[
        'of',
        'find',
        'findByPk',
        'getByPk',
        'count',
        'exists',
        'create',
        'createAndGet',
      ].map(i => `  static ${i}: typeof ${className}.repository.${i} = ${className}.repository.${i}.bind(${className}.repository);`));
      // 实例方法
      repositories.push(`  /** 保存当前实例数据 */`);
      repositories.push(`  save() { return ${className}.repository.save(this); }`);
      repositories.push(`  /** 更新当前实例数据 */`);
      repositories.push(`  update(data: Partial<${className}>) { return ${className}.repository.update(this, data); }`);
      repositories.push(`  /** 删除当前实例数据 */`);
      repositories.push(`  delete() { return ${className}.repository.delete(this); }`);
    }
    repositories.push('}');
  });

  // Repositories
  if (config.generateRepositories) {
    repositories.push(
      '',
      `export class Repositories {`,
      `  constructor(private _query: QueryParam) {}`,
      ...models.map(({ className }) => `  get ${className}Repository() { return ${className}.query(this._query); }`),
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
  }

  const repositoriesFilename = path.join(outputDir, config.repositoriesFilename + '.ts');
  console.log(`write repositories file: ${repositoriesFilename}`);
  await fs.writeFile(repositoriesFilename, repositories.join('\n'));

  // 生成 global.ts
  if (config.globalFilename) {
    const globalFilename = path.join(outputDir, config.globalFilename + '.ts');
    await notExistsPut(globalFilename, () => {
      console.log(`write file: ${globalFilename}`);
      return 'export default class Global {}';
    });
  }

  // 生成 index.ts
  const indexFilename = path.join(outputDir, 'index.ts');
  await notExistsPut(indexFilename, () => {
    console.log(`write file: ${indexFilename}`);
    return [
      `export * from './${config.tablesFilename}';`,
      `export * from './${config.repositoriesFilename}';`,
    ].join('\n');
  });
}
