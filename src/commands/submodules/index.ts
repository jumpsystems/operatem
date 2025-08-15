import { add } from './add';
import { list } from './list';

export const submodules = {
  name: 'submodules',
  description: 'Manage git submodules',
  aliases: ['subs'],
  commands: {
    add,
    list
  }
};