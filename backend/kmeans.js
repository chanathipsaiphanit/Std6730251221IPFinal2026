// 1D K-Means clustering (k = 3 by default)
// Handles edge cases: empty data, fewer unique values than k, identical salaries.

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function kMeans1D(values, k = 3, maxIter = 100) {
  const data = values
    .map(Number)
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  const unique = [...new Set(data)];
  const kk = Math.min(k, unique.length);
  if (kk === 0) return [];

  // Deterministic init: centroids spread evenly across the sorted unique values
  let centroids = Array.from({ length: kk }, (_, i) =>
    unique[Math.round((i * (unique.length - 1)) / Math.max(kk - 1, 1))]
  );

  let assign = new Array(data.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // 1) Assignment step: each salary -> nearest centroid
    assign = data.map((v) => {
      let best = 0;
      for (let c = 1; c < kk; c++) {
        if (Math.abs(v - centroids[c]) < Math.abs(v - centroids[best])) best = c;
      }
      return best;
    });

    // 2) Update step: centroid = mean of its members
    const next = centroids.map((c, i) => {
      const members = data.filter((_, j) => assign[j] === i);
      return members.length ? mean(members) : c;
    });

    const converged = next.every((c, i) => Math.abs(c - centroids[i]) < 1e-9);
    centroids = next;
    if (converged) break;
  }

  // Build final result from the final assignment
  return centroids
    .map((_, i) => {
      const members = data.filter((_, j) => assign[j] === i);
      return { count: members.length, centroid: members.length ? mean(members) : 0 };
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => a.centroid - b.centroid)
    .map((c, i) => ({
      group: `Tier ${i + 1}`,
      centroid: Math.round(c.centroid * 100) / 100,
      count: c.count,
    }));
}

module.exports = { kMeans1D };
