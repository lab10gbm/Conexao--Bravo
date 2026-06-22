import { createRequire } from 'module';
let req;
if (typeof require !== 'undefined') {
  req = require;
} else {
  // @ts-ignore
  req = createRequire(import.meta.url);
}
console.log(typeof req);
