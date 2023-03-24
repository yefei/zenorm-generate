import { User } from './model';


async function main() {
  const user = await User.find().get();
  user?.delete();
  console.log(user);
}

main();
