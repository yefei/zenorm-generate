import { createPoolCompatible } from 'mysql-easy-query';
import { bindQuery, User } from './model';

const pool = createPoolCompatible({
  pools: {
    MASTER: {
      host: '127.0.0.1',
      user: 'root',
      database: 'zenorm_test',
    }
  }
});

bindQuery(pool);

async function main() {
  const user = await User.find().get();
  user?.delete();
  console.log(user);
}

main();
