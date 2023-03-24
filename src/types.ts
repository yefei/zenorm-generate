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
  /**
   * 目标数据库地址
   */
  host?: string;

  /**
   * 数据库端口
   */
  port?: number;

  /**
   * 数据库用户名
   */
  user?: string;

  /**
   * 数据库密码
   */
  password?: string;

  /**
   * 数据库名
   */
  database?: string;

  /**
   * 代码输出目录
   * @default './src/model'
   */
  outputDir?: string;

  /**
   * 生成数据库表结构文件名
   * - 此文件每次生成都会被重新改写
   * @default '_tables'
   */
  tablesFilename?: string;

  /**
   * 生成 repositories 文件名
   * - 此文件每次生成都会被重新改写
   * @default '_repositories'
   */
  repositoriesFilename?: string;

  /**
   * 全局文件名
   * - 例如设置为：'_global'
   * - 如果设置所有表将继承于此
   * - 如果文件不存在则自动创建
   */
  globalFilename?: string;

  /**
   * 绑定 Query 对象
   * - repositories 文件生成 bindQuery(query: QueryParam) 方法用于设置模型的 Query 源
   * - 并生成模型的静态 Repository 方法
   * - 对于多租户多数据库系统不适用
   * @default false
   */
  bindQuery?: boolean;

  /**
   * 是否生成 Repositories 类
   * - 通常用于多租户模式做数据库前置绑定 `Query` 对象
   * @default false
   */
  generateRepositories?: boolean;

  /**
   * 是否需将 Repositories 实例定义到目标模块中
   * - 例如: `["@zenweb/core.Core.repositories"]`
   * - 需要启用: `generateRepositories`
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
 * - 返回表描述的处理方法
 */
export type GenerateFunction = (config: GenerateConfig) => AsyncGenerator<TabelDescribe>;
