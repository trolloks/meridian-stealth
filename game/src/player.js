// The thief: keyboard movement, a crouch that halves the silhouette and the noise,
// cover-friendly collision, and a small walk cycle. The camera looks north, so W
// moves up the screen (negative z).

import { PLAYER } from './config.js';
import { makePlayerModel } from './models.js';
import { approach, distance, turnToward } from './math2d.js';

export class Player {
  constructor(level, scene, materials) {
    this.level = level;
    this.model = makePlayerModel(materials);
    this.group = this.model.group;
    this.position = { x: level.data.spawn.x, z: level.data.spawn.z };
    this.facing = level.data.spawn.angle;
    this.crouching = false;
    this.crouchAmount = 0;
    this.stepPhase = 0;
    this.speed = 0;
    this.noise = 0;
    this.radius = PLAYER.radius;
    this.stepTimer = 0;
    this.concealed = false;
    this.group.position.set(this.position.x, 0, this.position.z);
    this.group.rotation.y = -this.facing;
    scene.add(this.group);
  }

  update(dt, input) {
    const forward = (input.up ? 1 : 0) - (input.down ? 1 : 0);
    const side = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let dx = side;
    let dz = -forward;
    const length = Math.hypot(dx, dz);
    this.crouching = Boolean(input.crouch);
    const targetCrouch = this.crouching ? 0.7 : 1;
    this.crouchAmount = approach(this.crouchAmount, targetCrouch, dt * 5.5);

    if (length > 0) {
      dx /= length;
      dz /= length;
      const wanted = Math.atan2(dz, dx);
      this.facing = turnToward(this.facing, wanted, PLAYER.turnRate * dt);
      const speed = this.crouching ? PLAYER.crouchSpeed : PLAYER.walkSpeed;
      const moved = this.level.moveCircle(this.position.x, this.position.z, this.radius, dx * speed * dt, dz * speed * dt);
      const travelled = distance(this.position.x, this.position.z, moved.x, moved.z);
      this.position.x = moved.x;
      this.position.z = moved.z;
      this.speed = travelled / Math.max(dt, 1e-5);
      this.stepPhase += dt * (this.crouching ? 5 : 9);
      this.noise = this.crouching ? 0 : this.speed > 0.4 ? 1 : 0;
    } else {
      this.speed = 0;
      this.noise = 0;
    }

    this.group.position.set(this.position.x, 0, this.position.z);
    this.group.scale.set(1.08, this.crouchAmount * 1.08, 1.08);
    this.group.rotation.y = -this.facing;
    const swing = Math.sin(this.stepPhase) * (this.speed > 0.2 ? 0.62 : 0.03);
    this.model.legLeft.rotation.z = swing;
    this.model.legRight.rotation.z = -swing;
    this.model.armLeft.rotation.z = -swing * 0.7;
    this.model.armRight.rotation.z = swing * 0.7;
    this.stepTimer += dt;
    return this.speed > 0.2;
  }

  eyeHeight() {
    return PLAYER.standEye * this.crouchAmount + 0.02;
  }

  setConcealed(concealed) {
    this.concealed = concealed;
    this.model.marker.material.color.set(concealed ? '#68ffb0' : '#5ff2e3');
    this.model.marker.material.opacity = concealed ? 0.72 : 0.5;
  }

  dispose(scene) {
    scene.remove(this.group);
    this.group.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
    });
  }
}
