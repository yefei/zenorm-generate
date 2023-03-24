import { createPoolCompatible } from 'mysql-easy-query';

export const pool = createPoolCompatible({
  pools: {
    MASTER: {
      host: '127.0.0.1',
      user: 'root',
      database: 'zenorm_test',
    }
  }
});
