# ZenORM Generate

[ZenORM](https://www.npmjs.com/package/zenorm) Table Structure Code Generation Tool

表结构代码生成工具

## Generate Config - 代码生成配置

| 配置项 | 类型 | 默认值 | 说明
| ----- | --- | ----- | ----
| host | `string` | 无 | 目标数据库地址
| port | `number` | 无 | 数据库端口
| user | `string` | 无 | 数据库用户名
| password | `string` | 无 | 数据库密码
| database | `string` | 无 | 数据库名
| outputDir | `string` | `'./src/model'` | 代码输出目录
| tablesFilename | `string` | `'_tables'` | 生成数据库表结构文件名
| repositoriesFilename | `string` | `'_repositories'` | 生成 repositories 文件名
| globalFilename | `string` | 无 | 全局文件名 - 如果设置所有表将继承于此 - 例如设置为：'_global' - 如果文件不存在则自动创建
| bindQuery | `string` | 无 | 绑定 Query 对象 - 设置 query 源，格式: 'QueryParam@filename' 例如: 'pool@../db'
| generateRepositories | `boolean` | `false` | 是否生成 Repositories 类 - 通常用于多租户模式做数据库前置绑定 `Query` 对象
| declareRepositoriesToModules | `string[]` | 无 | 是否需将 Repositories 实例定义到目标模块中 - 例如: `["@zenweb/core.Core.repositories"]`
| filter | `string` | 无 | 表过滤规则正则
| include | `string` | 无 | 表包含规则正则
