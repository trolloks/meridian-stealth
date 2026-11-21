// One orthographic camera looks across the gallery from the south at about 55°,
// so walls read as walls and the floor plan stays legible. Shot mode and the title
// screen can zoom or sway it without touching the game rules.

import * as THREE from '../vendor/three.module.min.js';
import { VIEW } from './config.js';

export class ViewCamera {
  constructor() {
    this.camera = new THREE.OrthographicCamera(-VIEW.width / 2, VIEW.width / 2, VIEW.height / 2, -VIEW.height / 2, 0.1, 120);
    this.width = VIEW.width;
    this.height = VIEW.height;
    this.center = { x: 0, z: 0 };
    this.zoom = 1;
    this.baseHeight = 23;
    this.baseDepth = 16;
    this.shake = 0;
    this.sway = 0;
    this.swaySpeed = 0;
    this.camera.position.set(0, this.baseHeight, this.baseDepth);
    this.camera.lookAt(0, 0, 0);
  }

  resize(aspect) {
    const targetAspect = 16 / 9;
    if (aspect >= targetAspect) {
      this.height = VIEW.height / this.zoom;
      this.width = this.height * aspect;
    } else {
      this.width = VIEW.width / this.zoom;
      this.height = this.width / aspect;
    }
    this.camera.left = -this.width / 2;
    this.camera.right = this.width / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = -this.height / 2;
    this.camera.updateProjectionMatrix();
  }

  focus(x, z, zoom = 1, aspect = 16 / 9) {
    this.center.x = x;
    this.center.z = z;
    this.zoom = zoom;
    this.resize(aspect);
    this.place();
  }

  place() {
    const shakeX = (Math.random() - 0.5) * this.shake;
    const shakeZ = (Math.random() - 0.5) * this.shake;
    const angle = this.sway;
    const dx = Math.sin(angle) * this.baseDepth;
    const dz = Math.cos(angle) * this.baseDepth;
    this.camera.position.set(this.center.x - dx + shakeX, this.baseHeight, this.center.z + dz + shakeZ);
    this.camera.lookAt(this.center.x + shakeX * 0.3, 0, this.center.z + shakeZ * 0.3);
  }

  update(dt) {
    if (this.swaySpeed !== 0) this.sway += this.swaySpeed * dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 0.09);
    this.place();
  }

  project(x, z) {
    const vector = new THREE.Vector3(x, 0, z);
    vector.project(this.camera);
    return {
      x: (vector.x * 0.5 + 0.5) * window.innerWidth,
      y: (-vector.y * 0.5 + 0.5) * window.innerHeight,
    };
  }
}
