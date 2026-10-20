const assert = require('assert');
const { kMeans1D } = require('./kmeans');

const r1 = kMeans1D([45000, 18000, 22000, 85000, 48000, 92000, 16000]);
console.log(r1);
assert.strictEqual(r1.length, 3);
assert.strictEqual(r1.reduce((s, c) => s + c.count, 0), 7);

console.log(kMeans1D([]));                    // no employees
console.log(kMeans1D([30000, 30000, 30000]));  // identical salaries
console.log(kMeans1D([10000, 50000]));         // fewer than 3
console.log(kMeans1D(['20000', 'abc', 80000, 81000, 15000])); // string / invalid
assert.deepStrictEqual(kMeans1D([]), []);
assert.strictEqual(kMeans1D([30000, 30000, 30000]).length, 1);
console.log('All K-Means tests passed');
