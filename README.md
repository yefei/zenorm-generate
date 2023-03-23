# ZenORM

[ZenWeb](https://www.npmjs.com/package/zenweb) 衍生的核心项目，此项目可以独立使用

## 安装

```bash
npm install zenorm mysql-easy-query
npm install @zenorm/mysql --save-dev
```

## 配置

在 `package.json` 的 `scripts` 中增加如下代码，用于执行 `dbgen` 命令

```json title="package.json"
{
  "scripts": {
    "dbgen": "zenorm gen .dbgen.json"
  }
}
```

创建文件 `.dbgen.json` 用于生成数据库结构代码时连接到指定数据库

*提示：运行时并不使用此配置*

```json title=".dbgen.json"
{
  "host": "localhost",
  "port": 3306,
  "user": "root",
  "password": "",
  "database": "test"
}
```

## 演示

以下数据库结构为演示用，在数据中创建表结构

```sql
CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `profile` (
  `id` int(11) NOT NULL,
  `edu` varchar(255) DEFAULT NULL,
  `work` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `message` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `content` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk1` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

运行命令开始生成数据库结构代码

```bash
npm run dbgen
```

### 编辑模型关系

编辑生成的模型文件 `src/model/user.ts`

```ts
import { model, createRepositoryQuery, join, many, data } from 'zenorm';
import { UserTable } from './_tables';
import { Profile } from './profile';
import { Message } from './message';

@model({
  pk: 'id',
  table: 'user',
})
export default class User extends UserTable {
  static query = createRepositoryQuery<User, number>(User);

  // 添加以下代码
  
  // join 描述支持使用文件名，解决互相依赖问题
  @join(__dirname + '/profile', { type: 'OneToMany', asList: false })
  profile?: Profile;

  @join(Message)
  messages?: Message[];

  @many(Message)
  messageList?: Message[];

  @data
  get age() {
    return this.birthday ? (new Date().getFullYear()) - this.birthday.getFullYear() : undefined;
  }

  set age(v) {
    if (v === undefined) throw new Error('age is undefined');
    const date = new Date();
    date.setFullYear(date.getFullYear() - v, 1, 1);
    this.birthday = date;
  }
}
```

编辑生成的模型文件 `src/model/profile.ts`

```ts
import { model, createRepositoryQuery, join } from 'zenorm';
import { ProfileTable } from './_tables';
import User from './user';

@model({
  pk: 'id',
  table: 'profile',
})
export default class Profile extends ProfileTable {
  static query = createRepositoryQuery<Profile, number>(Profile);
  
  // 添加以下代码

  @join(User)
  user?: User;
}
```

### 初始化数据库访问层

创建代码 `src/db.ts`

```ts title="src/test.ts"
import { createPoolCompatible } from 'mysql-easy-query';
import { Repositories } from './model';

// 创建数据库连接池
export const pool = createPoolCompatible({
  pools: {
    // 主库
    MASTER: {
      host: '10.0.0.1',
      user: 'root',
      database: 'test',
      password: '',
    },
    // 如果需要读写分离，创建命令规则为 SLAVE* 的只读配置
    /*
    SLAVE1: {
      host: '10.0.0.2'
    },
    */
  }
});

// 创建仓库访问层
export const repositories = new Repositories(pool);
```

### 开始使用

#### 常规使用

```ts
import { repositories } from './db';

const {
  UserRepository,
  MessageRepository,
} = repositories;

async function test() {
  // create
  const id = await UserRepository.create({ name: 'yf' });
  console.log(id); // 1

  // get and update
  const user = await UserRepository.findByPk(id);
  user.name = 'yefei';
  user.age = 20;
  await UserRepository.save(user);

  // find all
  const users = await UserRepository.find().all();

  // find limit
  const users = await UserRepository.find().limit(10).all();

  // find by where
  const users = await UserRepository.find({ name: { $like: `%y%` } }).all();

  // get all count
  const count = await UserRepository.count();

  // page
  const page = await UserRepository.page();

  // exists
  const exists = await UserRepository.exists({ id: 1 });
  // or
  const exists = await UserRepository.find({ name: 'yf' }).exists();

  // update
  const updatedCount = await UserRepository.find({ id: 1 }).update({ name: 'yf', age: 11 });

  // delete
  const user = await UserRepository.findByPk(1);
  const deletedCount = await UserRepository.delete(user);

  await UserRepository.find({ name: 'aaa' }).delete();

  // join 预定义
  const user = await UserRepository.find().join("messages").get();

  // join 模型(未定义的)
  const user = await MessageRepository.find().join(User).all();

  // many 独立查询功能
  const userList = await UserRepository.find().many("messageList").all();

  // 指定使用主从库
  await UserRepository.find().of('MASTER').all();
  await UserRepository.find().of('SLAVE*').all();
}
```

#### 事物支持

```ts
import { pool } from './db';
import { User, Message } from './model';

async function test() {
  await pool.transaction(async tx => {
    await User.query(tx).find().update({ some: 'data' });
    await Message.query(tx).find().update({ some: 'data' });
  });
}
```

## Related projects
[mysql-easy-query](https://www.npmjs.com/package/mysql-easy-query)
[sql-easy-builder](https://www.npmjs.com/package/sql-easy-builder)
