// Every surface in NIGHTGLASS is painted from code: the floor marble, crate
// grain, brushed metal, carpet, glow sprites and the little guard state icons.
// No image is loaded from disk or the network, which keeps the game one folder.

import * as THREE from '../vendor/three.module.min.js';

function canvas(size) {
  const surface = document.createElement('canvas');
  surface.width = size;
  surface.height = size;
  return surface;
}

function finish(surface, repeatX = 1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  return texture;
}

function speckle(context, size, count, alpha, color) {
  context.fillStyle = color;
  for (let index = 0; index < count; index += 1) {
    context.globalAlpha = alpha * (0.35 + Math.random() * 0.65);
    const radius = 0.5 + Math.random() * 2.4;
    context.beginPath();
    context.arc(Math.random() * size, Math.random() * size, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

export function marbleTexture(accent = '#5f8f96') {
  const size = 512;
  const surface = canvas(size);
  const context = surface.getContext('2d');
  const base = context.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, '#25454f');
  base.addColorStop(0.5, '#1c3a44');
  base.addColorStop(1, '#152d36');
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);

  for (let vein = 0; vein < 14; vein += 1) {
    context.strokeStyle = vein % 3 === 0 ? accent : '#28474e';
    context.globalAlpha = 0.12 + Math.random() * 0.18;
    context.lineWidth = 0.6 + Math.random() * 1.8;
    context.beginPath();
    let x = Math.random() * size;
    let y = -10;
    context.moveTo(x, y);
    while (y < size + 10) {
      x += (Math.random() - 0.5) * 26;
      y += 10 + Math.random() * 18;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  context.globalAlpha = 1;
  speckle(context, size, 420, 0.05, '#bfe8e4');

  context.strokeStyle = '#050c10';
  context.globalAlpha = 0.55;
  context.lineWidth = 3;
  context.strokeRect(0, 0, size, size);
  context.globalAlpha = 1;
  return finish(surface);
}

export function woodTexture() {
  const size = 256;
  const surface = canvas(size);
  const context = surface.getContext('2d');
  context.fillStyle = '#7a5738';
  context.fillRect(0, 0, size, size);
  for (let plank = 0; plank < 4; plank += 1) {
    const top = plank * (size / 4);
    context.fillStyle = plank % 2 === 0 ? '#8a6040' : '#6f4b30';
    context.fillRect(0, top + 2, size, size / 4 - 4);
    context.strokeStyle = 'rgba(20,10,6,0.5)';
    context.lineWidth = 2;
    context.strokeRect(0, top + 1, size, size / 4 - 2);
    for (let grain = 0; grain < 12; grain += 1) {
      context.strokeStyle = `rgba(30,17,10,${0.12 + Math.random() * 0.18})`;
      context.lineWidth = 0.7 + Math.random();
      const y = top + 6 + Math.random() * (size / 4 - 12);
      context.beginPath();
      context.moveTo(0, y);
      for (let x = 0; x <= size; x += 16) {
        context.lineTo(x, y + Math.sin(x * 0.045 + grain) * 1.8);
      }
      context.stroke();
    }
  }
  context.fillStyle = '#2e2118';
  for (let nail = 0; nail < 12; nail += 1) {
    context.beginPath();
    context.arc(10 + Math.random() * (size - 20), 10 + Math.random() * (size - 20), 1.8, 0, Math.PI * 2);
    context.fill();
  }
  return finish(surface);
}

export function metalTexture() {
  const size = 256;
  const surface = canvas(size);
  const context = surface.getContext('2d');
  context.fillStyle = '#1c2830';
  context.fillRect(0, 0, size, size);
  for (let line = 0; line < 220; line += 1) {
    context.strokeStyle = `rgba(${90 + Math.random() * 60}, ${120 + Math.random() * 60}, ${135 + Math.random() * 60}, ${0.05 + Math.random() * 0.09})`;
    context.lineWidth = 1;
    const y = Math.random() * size;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(size, y);
    context.stroke();
  }
  context.strokeStyle = '#0b1419';
  context.lineWidth = 4;
  context.strokeRect(2, 2, size - 4, size - 4);
  context.fillStyle = 'rgba(160,205,210,0.25)';
  for (let rivet = 0; rivet < 8; rivet += 1) {
    context.beginPath();
    context.arc(12 + (rivet % 2) * (size - 24), 12 + Math.floor(rivet / 2) * ((size - 24) / 3), 2.4, 0, Math.PI * 2);
    context.fill();
  }
  return finish(surface);
}

export function carpetTexture() {
  const size = 256;
  const surface = canvas(size);
  const context = surface.getContext('2d');
  context.fillStyle = '#2a1b28';
  context.fillRect(0, 0, size, size);
  context.strokeStyle = 'rgba(201,163,90,0.28)';
  context.lineWidth = 2;
  context.strokeRect(18, 18, size - 36, size - 36);
  context.strokeStyle = 'rgba(201,163,90,0.16)';
  context.lineWidth = 1;
  context.strokeRect(30, 30, size - 60, size - 60);
  for (let diamond = 0; diamond < 4; diamond += 1) {
    const x = 60 + (diamond % 2) * 136;
    const y = 60 + Math.floor(diamond / 2) * 136;
    context.save();
    context.translate(x, y);
    context.rotate(Math.PI / 4);
    context.strokeStyle = 'rgba(201,163,90,0.22)';
    context.strokeRect(-18, -18, 36, 36);
    context.restore();
  }
  speckle(context, size, 900, 0.06, '#000000');
  return finish(surface);
}

export function glowTexture(color = '#ffffff') {
  const size = 128;
  const surface = canvas(size);
  const context = surface.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.35, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function iconTexture(symbol, color) {
  const size = 128;
  const surface = canvas(size);
  const context = surface.getContext('2d');
  context.clearRect(0, 0, size, size);
  context.fillStyle = 'rgba(4,10,14,0.82)';
  context.beginPath();
  context.roundRect(14, 14, 100, 100, 18);
  context.fill();
  context.strokeStyle = color;
  context.lineWidth = 6;
  context.stroke();
  context.fillStyle = color;
  context.font = 'bold 74px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(symbol, 64, 68);
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function makeMaterials() {
  const floor = new THREE.MeshStandardMaterial({ map: marbleTexture(), roughness: 0.44, metalness: 0.1, color: '#cfdedf' });
  const carpet = new THREE.MeshStandardMaterial({ map: carpetTexture(), roughness: 0.95, metalness: 0 });
  const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.74, metalness: 0.03, color: '#c9b39a' });
  const metal = new THREE.MeshStandardMaterial({ map: metalTexture(), roughness: 0.44, metalness: 0.7, color: '#c3d6dd' });
  const darkMetal = new THREE.MeshStandardMaterial({ color: '#16232b', roughness: 0.5, metalness: 0.65 });
  const marble = new THREE.MeshStandardMaterial({ color: '#c9cfc6', roughness: 0.35, metalness: 0.05 });
  const brass = new THREE.MeshStandardMaterial({ color: '#c9a35a', roughness: 0.3, metalness: 0.9 });
  const glass = new THREE.MeshStandardMaterial({
    color: '#9ee7ff',
    roughness: 0.08,
    metalness: 0.2,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  const stone = new THREE.MeshStandardMaterial({ color: '#3d5d66', roughness: 0.78, metalness: 0.05 });
  const foliage = new THREE.MeshStandardMaterial({ color: '#1f4a38', roughness: 0.9, metalness: 0 });
  const uniform = new THREE.MeshStandardMaterial({ color: '#35566e', roughness: 0.66, metalness: 0.18 });
  const uniformTrim = new THREE.MeshStandardMaterial({ color: '#ffb24d', roughness: 0.45, metalness: 0.3, emissive: '#6b3a08', emissiveIntensity: 0.5 });
  const skin = new THREE.MeshStandardMaterial({ color: '#c99b74', roughness: 0.7, metalness: 0 });
  const suit = new THREE.MeshStandardMaterial({ color: '#26404c', roughness: 0.56, metalness: 0.24 });
  const cyan = new THREE.MeshStandardMaterial({ color: '#5ff2e3', emissive: '#2bd8c8', emissiveIntensity: 1.8, roughness: 0.3, metalness: 0.2 });
  const amber = new THREE.MeshStandardMaterial({ color: '#ffb24d', emissive: '#ff8a1a', emissiveIntensity: 1.6, roughness: 0.35, metalness: 0.1 });
  const red = new THREE.MeshStandardMaterial({ color: '#ff4d5e', emissive: '#ff2038', emissiveIntensity: 1.9, roughness: 0.35, metalness: 0.1 });
  const green = new THREE.MeshStandardMaterial({ color: '#68ffb0', emissive: '#22e07c', emissiveIntensity: 1.8, roughness: 0.3, metalness: 0.1 });
  const edge = new THREE.MeshStandardMaterial({ color: '#4fbdb6', emissive: '#2a9c94', emissiveIntensity: 0.55, roughness: 0.4, metalness: 0.35 });
  const edgeWarm = new THREE.MeshStandardMaterial({ color: '#ffd08a', emissive: '#c97a1e', emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.35 });
  const trimCyan = new THREE.MeshStandardMaterial({ color: '#5ff2e3', emissive: '#1fae9f', emissiveIntensity: 0.75, roughness: 0.38, metalness: 0.2 });
  const trimAmber = new THREE.MeshStandardMaterial({ color: '#ffb24d', emissive: '#7a3f00', emissiveIntensity: 0.55, roughness: 0.4, metalness: 0.2 });
  return { floor, carpet, wood, metal, darkMetal, marble, brass, glass, stone, foliage, uniform, uniformTrim, skin, suit, cyan, amber, red, green, edge, edgeWarm, trimCyan, trimAmber };
}
