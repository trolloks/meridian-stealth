// Tiny visual feedback: footprint rings behind the thief and a shard burst when a
// relic leaves its plinth. Both are pooled, so a long run allocates nothing.

import * as THREE from '../vendor/three.module.min.js';

export class Footprints {
  constructor(scene, count = 16) {
    this.scene = scene;
    this.items = [];
    const material = new THREE.MeshBasicMaterial({ color: '#5ff2e3', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    for (let index = 0; index < count; index += 1) {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.2, 16), material.clone());
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.02;
      mesh.visible = false;
      scene.add(mesh);
      this.items.push({ mesh, life: 0 });
    }
    this.cursor = 0;
    this.cooldown = 0;
  }

  emit(x, z, crouching) {
    if (this.cooldown > 0) return;
    this.cooldown = crouching ? 0.55 : 0.32;
    const item = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    item.mesh.position.set(x, 0.02, z);
    item.mesh.scale.setScalar(crouching ? 0.65 : 1);
    item.mesh.material.opacity = crouching ? 0.12 : 0.24;
    item.mesh.visible = true;
    item.life = 0.8;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (const item of this.items) {
      if (item.life <= 0) continue;
      item.life -= dt;
      item.mesh.scale.multiplyScalar(1 + dt * 1.6);
      item.mesh.material.opacity = Math.max(0, item.life * 0.25);
      if (item.life <= 0) item.mesh.visible = false;
    }
  }
}

export class ShardBursts {
  constructor(scene) {
    this.scene = scene;
    this.shards = [];
    this.material = new THREE.MeshStandardMaterial({ color: '#ffe1a1', emissive: '#ffb24d', emissiveIntensity: 2, roughness: 0.3 });
    this.materialCyan = new THREE.MeshStandardMaterial({ color: '#a9fff2', emissive: '#5ff2e3', emissiveIntensity: 2.4, roughness: 0.3 });
  }

  burst(x, y, z, main, scale = 1) {
    const material = main ? this.materialCyan : this.material;
    for (let index = 0; index < 12; index += 1) {
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.06 * scale, 0), material);
      mesh.position.set(x, y, z);
      const angle = (index / 12) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 1.2 + Math.random() * 2.2;
      this.scene.add(mesh);
      this.shards.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 1.6 + Math.random() * 2.1,
        vz: Math.sin(angle) * speed,
        life: 0.9,
      });
    }
  }

  update(dt) {
    for (let index = this.shards.length - 1; index >= 0; index -= 1) {
      const shard = this.shards[index];
      shard.life -= dt;
      shard.vy -= 7.5 * dt;
      shard.mesh.position.x += shard.vx * dt;
      shard.mesh.position.y += shard.vy * dt;
      shard.mesh.position.z += shard.vz * dt;
      if (shard.mesh.position.y < 0.05) {
        shard.mesh.position.y = 0.05;
        shard.vy *= -0.35;
      }
      shard.mesh.scale.setScalar(Math.max(0.01, shard.life));
      if (shard.life <= 0) {
        this.scene.remove(shard.mesh);
        shard.mesh.geometry.dispose();
        this.shards.splice(index, 1);
      }
    }
  }
}
