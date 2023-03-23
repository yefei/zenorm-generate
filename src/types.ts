/**
 * 模型文件生成 - 列描述
 */
export interface ColumnDescribe {
  /**
   * 是否为主键
   */
  pk: boolean;

  /**
   * 列名称
   */
  name: string;

  /**
   * 列类型，例如 number, string, boolean
   */
  type: string;

  /**
   * 是否为必须项（非NULL）
   */
  required: boolean;

  /**
   * 注释信息，一行一条
   */
  comment: string[];
}

/**
 * 模型文件生成 - 表描述
 */
export interface TabelDescribe {
  /**
   * 表名称
   */
  name: string;

  /**
   * 列描述信息
   */
  columns: ColumnDescribe[];
}

/**
 * 生成配置
 */
export interface GenerateConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;

  /**
   * 代码输出目录
   * @default './src/model'
   */
  outputDir?: string;

  /**
   * 生成数据库表结构文件名
   * 此文件每次生成都会被重新改写
   * @default '_tables'
   */
  tablesFilename?: string;

  /**
   * 生成 Repositories 文件名
   * 此文件每次生成都会被重新改写
   * @default '_repositories'
   */
  repositoriesFilename?: string;

  /**
   * 全局文件名
   * @default '_global'
   */
  globalFilename?: string;

  /**
   * 是否需将 Repositories 实例定义到目标模块中
   * - 例如: ["@zenweb/core.Core.repositories"]
   * @default undefined
   */
  declareRepositoriesToModules?: string[];

  /**
   * 表过滤规则正则，默认不处理
   */
  filter?: string;

  /**
   * 表包含规则正则，默认不处理
   */
  include?: string;
}

/**
 * 数据库表信息生成方法
 */
export type GenerateFunction = (config: GenerateConfig) => AsyncGenerator<TabelDescribe>;
