// The noise lure: a small brass token thrown ahead. It pings once, and any guard
// close enough walks over to the sound instead of holding the route. This is the
// thief's one gadget: three per wing, no alarm unless a guard walks into you.

import * as THREE from '../vendor/three.module.min.js';

const PING_AT = 0.45;
const LIFE = 2.6;

export class LureManager {
  constructor(scene, onPing) {
    this.scene = scene;
    this.onPing = onPing;
    this.items = [];
    this.coinMaterial = new THREE.MeshStandardMaterial({ color: '#ffd166', emissive: '#ffb24d', emissiveIntensity: 1.7, metalness: 0.65, roughness: 0.3 });
    this.ringMaterial = new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
  }

  throwAt(x, z) {
    const group = new THREE.Group();
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.035, 14), this.coinMaterial);
    coin.rotation.z = Math.PI / 2;
    coin.position.y = 0.09;
    coin.castShadow = true;
    group.add(coin);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.24, 28), this.ringMaterial.clone());
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.025;
    group.add(ring);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.07, 20), this.ringMaterial.clone());
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.03;
    group.add(halo);
    group.position.set(x, 0, z);
    this.scene.add(group);
    this.items.push({ group, coin, ring, halo, time: 0, pinged: false });
  }

  update(dt) {
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      const item = this.items[index];
      item.time += dt;
      item.coin.rotation.y += dt * 4.2;
      item.coin.position.y = 0.09 + Math.abs(Math.sin(item.time * 6)) * 0.06;
      const pulse = 1 + Math.sin(item.time * 10) * 0.12;
      item.ring.scale.setScalar(pulse);
      if (!item.pinged && item.time >= PING_AT) {
        item.pinged = true;
        item.ring.scale.setScalar(1.8);
        if (this.onPing) this.onPing(item.group.position.x, item.group.position.z);
      }
      if (item.time > LIFE) {
        this.scene.remove(item.group);
        item.group.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material && object.material !== this.coinMaterial) object.material.dispose();
        });
        this.items.splice(index, 1);
      }
    }
  }

  dispose() {
    for (const item of this.items) {
      this.scene.remove(item.group);
      item.group.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material && object.material !== this.coinMaterial) object.material.dispose();
      });
    }
    this.items = [];
  }
}
