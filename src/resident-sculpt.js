import * as THREE from 'three';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const D = Math.PI / 180;
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);

/* ---------- SDF 积木：像 Nomad 里摆基本形、再体素重拓扑合成一块 ---------- */
function sdRoundCone(a, b, r1, r2) {
  const bax = b.x - a.x, bay = b.y - a.y, baz = b.z - a.z;
  const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const ax = a.x, ay = a.y, az = a.z, srr = Math.sign(rr);
  return (px, py, pz) => {
    const pax = px - ax, pay = py - ay, paz = pz - az;
    const y = pax * bax + pay * bay + paz * baz, z = y - l2;
    const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y;
    const x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2;
    const k = srr * rr * rr * x2;
    if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
  };
}
function frameY(dir, hint = V(0, 0, 1)) {
  const Y = dir.clone().normalize();
  let X = new THREE.Vector3().crossVectors(Y, hint);
  if (X.lengthSq() < 1e-6) X = new THREE.Vector3().crossVectors(Y, V(1, 0, 0));
  X.normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y).normalize();
  return [X, Y, Z];
}
function sdEllipsoid(c, r, axes) {
  const [X, Y, Z] = axes || [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)];
  const [rx, ry, rz] = r;
  return (px, py, pz) => {
    const dx = px - c.x, dy = py - c.y, dz = pz - c.z;
    const lx = (X.x * dx + X.y * dy + X.z * dz) / rx, ly = (Y.x * dx + Y.y * dy + Y.z * dz) / ry, lz = (Z.x * dx + Z.y * dy + Z.z * dz) / rz;
    const k0 = Math.sqrt(lx * lx + ly * ly + lz * lz);
    const k1 = Math.sqrt((lx / rx) ** 2 + (ly / ry) ** 2 + (lz / rz) ** 2) + 1e-9;
    return k0 * (k0 - 1) / k1;
  };
}
function sdTorus(c, axis, R, r) {
  const A = axis.clone().normalize();
  return (px, py, pz) => {
    const dx = px - c.x, dy = py - c.y, dz = pz - c.z;
    const h = dx * A.x + dy * A.y + dz * A.z;
    const qx = dx - A.x * h, qy = dy - A.y * h, qz = dz - A.z * h;
    return Math.hypot(Math.sqrt(qx * qx + qy * qy + qz * qz) - R, h) - r;
  };
}

/* 表面网格（surface nets）：在格子里找到 0 等值面，再沿梯度贴回表面 */
function meshSDF(f, min, max, cell, opts = {}) {
  const nx = Math.ceil((max[0] - min[0]) / cell) + 1, ny = Math.ceil((max[1] - min[1]) / cell) + 1, nz = Math.ceil((max[2] - min[2]) / cell) + 1;
  const F = new Float32Array(nx * ny * nz);
  const B = 4, reach = Math.sqrt(3) * (B - 1) * 0.5 * cell * 1.7 + cell * 1.5;
  for (let bz = 0; bz < nz; bz += B) for (let by = 0; by < ny; by += B) for (let bx = 0; bx < nx; bx += B) {
    const x1 = Math.min(bx + B, nx), y1 = Math.min(by + B, ny), z1 = Math.min(bz + B, nz);
    const dc = f(min[0] + (bx + (x1 - bx - 1) / 2) * cell, min[1] + (by + (y1 - by - 1) / 2) * cell, min[2] + (bz + (z1 - bz - 1) / 2) * cell);
    const far = Math.abs(dc) > reach;
    for (let z = bz; z < z1; z++) for (let y = by; y < y1; y++) {
      let i = bx + nx * (y + ny * z);
      for (let x = bx; x < x1; x++, i++) F[i] = far ? dc : f(min[0] + x * cell, min[1] + y * cell, min[2] + z * cell);
    }
  }
  const cxn = nx - 1, cyn = ny - 1, czn = nz - 1;
  const vid = new Int32Array(cxn * cyn * czn).fill(-1);
  const P = [];
  const CO = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const ED = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const val = new Float32Array(8);
  for (let z = 0; z < czn; z++) for (let y = 0; y < cyn; y++) for (let x = 0; x < cxn; x++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const o = CO[c]; const v = F[(x + o[0]) + nx * ((y + o[1]) + ny * (z + o[2]))]; val[c] = v; if (v < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (let e = 0; e < 12; e++) {
      const a = ED[e][0], b = ED[e][1], va = val[a], vb = val[b];
      if ((va < 0) !== (vb < 0)) { const t = va / (va - vb), oa = CO[a], ob = CO[b]; sx += oa[0] + (ob[0] - oa[0]) * t; sy += oa[1] + (ob[1] - oa[1]) * t; sz += oa[2] + (ob[2] - oa[2]) * t; n++; }
    }
    vid[x + cxn * (y + cyn * z)] = P.length / 3;
    P.push(min[0] + (x + sx / n) * cell, min[1] + (y + sy / n) * cell, min[2] + (z + sz / n) * cell);
  }
  const I = [];
  const cid = (x, y, z) => vid[x + cxn * (y + cyn * z)];
  const quad = (a, b, c, d) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; I.push(a, b, c, a, c, d); };
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const in0 = F[x + nx * (y + ny * z)] < 0;
    if (x < nx - 1 && y > 0 && z > 0 && y < ny - 1 && z < nz - 1 && in0 !== (F[(x + 1) + nx * (y + ny * z)] < 0)) {
      const a = cid(x, y - 1, z - 1), b = cid(x, y, z - 1), c = cid(x, y, z), d = cid(x, y - 1, z); in0 ? quad(a, b, c, d) : quad(a, d, c, b);
    }
    if (y < ny - 1 && x > 0 && z > 0 && x < nx - 1 && z < nz - 1 && in0 !== (F[x + nx * ((y + 1) + ny * z)] < 0)) {
      const a = cid(x - 1, y, z - 1), b = cid(x - 1, y, z), c = cid(x, y, z), d = cid(x, y, z - 1); in0 ? quad(a, b, c, d) : quad(a, d, c, b);
    }
    if (z < nz - 1 && x > 0 && y > 0 && x < nx - 1 && y < ny - 1 && in0 !== (F[x + nx * (y + ny * (z + 1))] < 0)) {
      const a = cid(x - 1, y - 1, z), b = cid(x, y - 1, z), c = cid(x, y, z), d = cid(x - 1, y, z); in0 ? quad(a, b, c, d) : quad(a, d, c, b);
    }
  }
  const pos = new Float32Array(P), nor = new Float32Array(P.length);
  const e = cell * 0.4, maxMove = cell * 0.9, fast = !!opts.fast;
  for (let i = 0; i < pos.length; i += 3) {
    const x0 = pos[i], y0 = pos[i + 1], z0 = pos[i + 2];
    let x = x0, y = y0, z = z0, gx = 0, gy = 0, gz = 1;
    for (let it = 0; it < (fast ? 1 : 3); it++) {
      const d = f(x, y, z);
      if (fast) { gx = (f(x + e, y, z) - d) / e; gy = (f(x, y + e, z) - d) / e; gz = (f(x, y, z + e) - d) / e; }
      else {
        gx = (f(x + e, y, z) - f(x - e, y, z)) / (2 * e);
        gy = (f(x, y + e, z) - f(x, y - e, z)) / (2 * e);
        gz = (f(x, y, z + e) - f(x, y, z - e)) / (2 * e);
      }
      const g2 = gx * gx + gy * gy + gz * gz + 1e-12;
      x -= d * gx / g2; y -= d * gy / g2; z -= d * gz / g2;
      const mx = x - x0, my = y - y0, mz = z - z0, ml = Math.hypot(mx, my, mz);
      if (ml > maxMove) { x = x0 + mx * maxMove / ml; y = y0 + my * maxMove / ml; z = z0 + mz * maxMove / ml; }
    }
    gx = (f(x + e, y, z) - f(x - e, y, z)); gy = (f(x, y + e, z) - f(x, y - e, z)); gz = (f(x, y, z + e) - f(x, y, z - e));
    const gl = Math.hypot(gx, gy, gz) || 1;
    pos[i] = x; pos[i + 1] = y; pos[i + 2] = z;
    nor[i] = gx / gl; nor[i + 1] = gy / gl; nor[i + 2] = gz / gl;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex(I);
  return g;
}


export {meshSDF,sdRoundCone,smin,smax,V};
