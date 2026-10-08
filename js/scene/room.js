import * as THREE from 'three';
import { mat, add, rbox } from './helpers.js';
import { C, T } from '../i18n.js';

// The walkable room: four walls and a ceiling around Alban's desk, plus a sofa corner,
// a window, a door, the painting, a bookshelf and the price board.
export const ROOM = { minX: -2.2, maxX: 3.6, minZ: -1.15, maxZ: 4.6, height: 2.9 };

const canvasTex = (w, h, draw, repeat) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
};

export function buildRoom(scene) {
  const room = new THREE.Group(); scene.add(room);
  const W = ROOM.maxX - ROOM.minX, D = ROOM.maxZ - ROOM.minZ, H = ROOM.height;
  const cx = (ROOM.minX + ROOM.maxX) / 2, cz = (ROOM.minZ + ROOM.maxZ) / 2;
  const boxes = [], circles = [], interactives = [];

  // ---------- floor: oak planks with a little grain ----------
  const plankTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#6b4630'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      const y = i * 64;
      g.fillStyle = `hsl(${22 + Math.random() * 6}, ${38 + Math.random() * 10}%, ${25 + Math.random() * 9}%)`;
      g.fillRect(0, y + 1, w, 62);
      for (let k = 0; k < 40; k++) { // grain
        g.strokeStyle = `rgba(30,15,5,${0.05 + Math.random() * 0.08})`; g.lineWidth = 1;
        const yy = y + 4 + Math.random() * 56; g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(w * 0.3, yy + Math.random() * 6 - 3, w * 0.6, yy + Math.random() * 6 - 3, w, yy); g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, y, w, 2);
      const off = Math.random() * w; g.fillRect(off, y, 2, 64); g.fillRect((off + w / 2) % w, y, 2, 64);
    }
  }, [W / 2.4, D / 2.4]);
  const floor = add(room, new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.55, metalness: 0 }), [cx, 0, cz], [-Math.PI / 2, 0, 0]);
  floor.castShadow = false;

  // ---------- walls and ceiling ----------
  const plaster = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#cbb69c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.035})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  }, [3, 1.5]);
  const wallMat = new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.95 });
  const wall = (len, pos, rotY) => { const m = add(room, new THREE.PlaneGeometry(len, H), wallMat, pos, [0, rotY, 0]); m.castShadow = false; return m; };
  wall(W, [cx, H / 2, ROOM.minZ], 0);
  wall(W, [cx, H / 2, ROOM.maxZ], Math.PI);
  wall(D, [ROOM.minX, H / 2, cz], Math.PI / 2);
  wall(D, [ROOM.maxX, H / 2, cz], -Math.PI / 2);
  const ceiling = add(room, new THREE.PlaneGeometry(W, D), mat('#e9dfcf', { roughness: 1 }), [cx, H, cz], [Math.PI / 2, 0, 0]);
  ceiling.castShadow = false;
  // skirting boards
  const skirt = mat('#3a2a1f', { roughness: 0.6 });
  add(room, new THREE.BoxGeometry(W, 0.12, 0.03), skirt, [cx, 0.06, ROOM.minZ + 0.015]);
  add(room, new THREE.BoxGeometry(W, 0.12, 0.03), skirt, [cx, 0.06, ROOM.maxZ - 0.015]);
  add(room, new THREE.BoxGeometry(0.03, 0.12, D), skirt, [ROOM.minX + 0.015, 0.06, cz]);
  add(room, new THREE.BoxGeometry(0.03, 0.12, D), skirt, [ROOM.maxX - 0.015, 0.06, cz]);

  // ---------- round rug under the chair, long rug by the sofa ----------
  add(room, new THREE.CircleGeometry(1.05, 64), mat('#7d2f2a', { roughness: 1 }), [0.05, 0.004, 0.2], [-Math.PI / 2, 0, 0]).castShadow = false;
  add(room, new THREE.RingGeometry(0.82, 0.88, 64), mat('#d9a441', { roughness: 1 }), [0.05, 0.006, 0.2], [-Math.PI / 2, 0, 0]).castShadow = false;
  const rugTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#e7dcc8'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2f5d62'; g.lineWidth = 10; g.strokeRect(16, 16, w - 32, h - 32);
    g.fillStyle = '#c0573b';
    for (let x = 60; x < w - 40; x += 56) for (let y = 70; y < h - 40; y += 56) { g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x + 14, y); g.lineTo(x, y + 14); g.lineTo(x - 14, y); g.fill(); }
  });
  add(room, new THREE.PlaneGeometry(2.1, 1.4), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 }), [2.35, 0.005, 2.7], [-Math.PI / 2, 0, Math.PI / 2]).castShadow = false;

  // ---------- painting (red flowers) and bookshelf on the back wall ----------
  {
    const ptex = canvasTex(512, 360, (g) => {
      g.fillStyle = '#efe9df'; g.fillRect(0, 0, 512, 360);
      const flower = (x, y, s) => {
        g.strokeStyle = 'rgba(90,110,80,0.6)'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y + 90, x - 4, y + 200); g.stroke();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.random();
          g.fillStyle = `rgba(${200 + Math.random() * 40}, ${50 + Math.random() * 30}, 40, 0.82)`;
          g.beginPath(); g.ellipse(x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.35, s * 0.55, s * 0.32, a, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = '#5a2a1a'; g.beginPath(); g.arc(x, y, s * 0.14, 0, 7); g.fill();
      };
      flower(150, 110, 70); flower(320, 140, 80); flower(420, 70, 40);
    });
    const frame = new THREE.Group(); frame.position.set(-0.75, 2.0, ROOM.minZ + 0.02); room.add(frame);
    add(frame, rbox(1.12, 0.82, 0.04, 0.01), mat('#2b1d15', { roughness: 0.5 }));
    add(frame, new THREE.PlaneGeometry(1.0, 0.7), new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.9 }), [0, 0, 0.022]).castShadow = false;

    const shelf = new THREE.Group(); shelf.position.set(0.9, 1.75, -1.0); room.add(shelf);
    add(shelf, rbox(0.9, 0.03, 0.24, 0.005), mat('#3d2a1d'));
    const bookColors = ['#c0392b', '#e6b04a', '#2e6e8e', '#3b7a57', '#e8dcc6', '#6c3f8f', '#d35400'];
    let bx = -0.38;
    for (let i = 0; i < 9; i++) {
      const h = 0.17 + Math.random() * 0.08, w = 0.035 + Math.random() * 0.025;
      add(shelf, rbox(w, h, 0.17, 0.004), mat(bookColors[i % bookColors.length], { roughness: 0.6 }), [bx + w / 2, h / 2 + 0.015, 0], [0, 0, i === 6 ? 0.22 : 0]);
      bx += w + 0.006;
    }
    add(shelf, new THREE.SphereGeometry(0.06, 24, 16), mat('#e6d3b3'), [0.3, 0.075, 0]);
  }

  // ---------- window on the left wall: a night sky over the rooftops ----------
  {
    const sky = canvasTex(512, 640, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, '#0b1633'); grad.addColorStop(0.7, '#2a3d6b'); grad.addColorStop(1, '#6b5a7a');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(255,255,240,${Math.random() * 0.8})`; g.fillRect(Math.random() * w, Math.random() * h * 0.6, 2, 2); }
      g.fillStyle = '#f4efd8'; g.beginPath(); g.arc(380, 120, 34, 0, 7); g.fill();
      g.fillStyle = '#141a2b';
      let x = 0; while (x < w) { const bw = 40 + Math.random() * 70, bh = 80 + Math.random() * 160; g.fillRect(x, h - bh, bw, bh);
        g.fillStyle = '#ffcf7a'; for (let k = 0; k < 4; k++) if (Math.random() < 0.6) g.fillRect(x + 8 + Math.random() * (bw - 20), h - bh + 14 + Math.random() * (bh - 30), 8, 10);
        g.fillStyle = '#141a2b'; x += bw + 4; }
    });
    const win = new THREE.Group(); win.position.set(ROOM.minX + 0.01, 1.6, 2.5); win.rotation.y = Math.PI / 2; room.add(win);
    add(win, new THREE.PlaneGeometry(1.1, 1.35), new THREE.MeshBasicMaterial({ map: sky, toneMapped: true })).castShadow = false;
    const wood = mat('#efe7da', { roughness: 0.5 });
    add(win, rbox(1.24, 0.07, 0.08, 0.01), wood, [0, 0.71, 0.03]);
    add(win, rbox(1.3, 0.06, 0.2, 0.01), wood, [0, -0.71, 0.08]);
    add(win, rbox(0.07, 1.42, 0.08, 0.01), wood, [-0.585, 0, 0.03]);
    add(win, rbox(0.07, 1.42, 0.08, 0.01), wood, [0.585, 0, 0.03]);
    add(win, rbox(0.035, 1.35, 0.05, 0.005), wood, [0, 0, 0.02]);
    add(win, rbox(1.1, 0.035, 0.05, 0.005), wood, [0, 0.1, 0.02]);
    // curtains
    const curtain = mat('#8e3b2e', { roughness: 1 });
    for (const s of [-1, 1]) add(win, new THREE.CylinderGeometry(0.11, 0.14, 2.3, 16, 1, false), curtain, [s * 0.8, -0.38, 0.12], [0, 0, 0], [1, 1, 0.45]);
    add(win, new THREE.CylinderGeometry(0.015, 0.015, 2.0, 8), mat('#2b1d15'), [0, 0.8, 0.14], [0, 0, Math.PI / 2]);
  }

  // ---------- door on the front wall ----------
  {
    const door = new THREE.Group(); door.position.set(2.7, 0, ROOM.maxZ - 0.01); door.rotation.y = Math.PI; room.add(door);
    add(door, rbox(0.9, 2.05, 0.05, 0.01), mat('#7a5236', { roughness: 0.5 }), [0, 1.025, 0.02]);
    for (const y of [0.55, 1.45]) add(door, rbox(0.62, 0.62, 0.02, 0.01), mat('#6b4730', { roughness: 0.5 }), [0, y, 0.05]);
    add(door, new THREE.SphereGeometry(0.035, 16, 12), mat('#d9b25a', { metalness: 1, roughness: 0.25 }), [0.34, 1.0, 0.08]);
    const fr = mat('#efe7da', { roughness: 0.5 });
    add(door, rbox(1.06, 0.08, 0.06, 0.01), fr, [0, 2.09, 0.02]);
    add(door, rbox(0.08, 2.1, 0.06, 0.01), fr, [-0.49, 1.05, 0.02]);
    add(door, rbox(0.08, 2.1, 0.06, 0.01), fr, [0.49, 1.05, 0.02]);
  }

  // ---------- sofa corner (right wall) ----------
  {
    const sofa = new THREE.Group(); sofa.position.set(3.12, 0, 2.7); sofa.rotation.y = -Math.PI / 2; room.add(sofa);
    const fabric = new THREE.MeshPhysicalMaterial({ color: '#2f5d62', roughness: 0.9, sheen: 1, sheenColor: new THREE.Color('#9fd3c7'), sheenRoughness: 0.6 });
    add(sofa, rbox(1.9, 0.26, 0.86, 0.06), fabric, [0, 0.27, 0]);
    add(sofa, rbox(1.9, 0.5, 0.2, 0.08), fabric, [0, 0.62, 0.34], [0.12, 0, 0]);
    for (const s of [-1, 1]) add(sofa, rbox(0.2, 0.36, 0.86, 0.08), fabric, [s * 0.95, 0.5, 0]);
    for (const s of [-1, 1]) add(sofa, rbox(0.82, 0.14, 0.62, 0.06), fabric, [s * 0.42, 0.46, -0.04]);
    add(sofa, rbox(0.4, 0.34, 0.12, 0.06), mat('#d9a441', { roughness: 0.9 }), [-0.6, 0.66, 0.2], [0.25, 0.2, 0.1]);
    add(sofa, rbox(0.36, 0.32, 0.12, 0.06), mat('#c0573b', { roughness: 0.9 }), [0.62, 0.65, 0.2], [0.2, -0.25, -0.08]);
    for (const [x, z] of [[-0.85, -0.35], [0.85, -0.35], [-0.85, 0.35], [0.85, 0.35]])
      add(sofa, new THREE.CylinderGeometry(0.025, 0.02, 0.14, 10), mat('#2b1d15'), [x, 0.07, z]);
    boxes.push({ minX: 2.66, maxX: ROOM.maxX, minZ: 1.72, maxZ: 3.68 });

    // coffee table with a book and a cup
    const table = new THREE.Group(); table.position.set(2.05, 0, 2.7); room.add(table);
    add(table, new THREE.CylinderGeometry(0.42, 0.42, 0.04, 48), mat('#8a5a3b', { roughness: 0.4 }), [0, 0.42, 0]);
    add(table, new THREE.CylinderGeometry(0.05, 0.08, 0.4, 16), mat('#2b1d15', { roughness: 0.5 }), [0, 0.2, 0]);
    add(table, new THREE.CylinderGeometry(0.22, 0.22, 0.02, 32), mat('#2b1d15', { roughness: 0.5 }), [0, 0.01, 0]);
    add(table, rbox(0.26, 0.04, 0.2, 0.005), mat('#2e6e8e', { roughness: 0.6 }), [-0.08, 0.46, 0.05], [0, 0.4, 0]);
    add(table, new THREE.CylinderGeometry(0.04, 0.035, 0.08, 20), mat('#f2efe8', { roughness: 0.3 }), [0.16, 0.48, -0.1]);
    circles.push({ x: 2.05, z: 2.7, r: 0.45 });
  }

  // ---------- big plant (front-left corner) and floor lamp (front-right) ----------
  {
    const p = new THREE.Group(); p.position.set(-1.8, 0, 4.15); room.add(p);
    add(p, new THREE.CylinderGeometry(0.22, 0.17, 0.42, 32), mat('#e8dcc6', { roughness: 0.5 }), [0, 0.21, 0]);
    const leaf = new THREE.MeshStandardMaterial({ color: '#3f8a4e', roughness: 0.55, side: THREE.DoubleSide });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3, h = 0.7 + Math.random() * 0.7, r = 0.15 + Math.random() * 0.2;
      add(p, new THREE.SphereGeometry(0.16, 16, 10), leaf, [Math.cos(a) * r, 0.42 + h * 0.6, Math.sin(a) * r], [Math.cos(a) * 0.8, a, Math.sin(a) * 0.8], [0.5, 1.6, 0.18]);
    }
    circles.push({ x: -1.8, z: 4.15, r: 0.36 });

    const lamp = new THREE.Group(); lamp.position.set(3.2, 0, 4.2); room.add(lamp);
    const brass = mat('#c9a24a', { metalness: 1, roughness: 0.3 });
    add(lamp, new THREE.CylinderGeometry(0.16, 0.18, 0.03, 32), brass, [0, 0.015, 0]);
    add(lamp, new THREE.CylinderGeometry(0.012, 0.012, 1.5, 10), brass, [0, 0.77, 0]);
    add(lamp, new THREE.CylinderGeometry(0.16, 0.24, 0.3, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#f3e3c3', roughness: 0.9, side: THREE.DoubleSide, emissive: '#ffcf8a', emissiveIntensity: 0.35 }), [0, 1.6, 0]).castShadow = false;
    circles.push({ x: 3.2, z: 4.2, r: 0.3 });
  }

  // ---------- pendant lamp ----------
  {
    const pend = new THREE.Group(); pend.position.set(0.7, ROOM.height, 1.7); room.add(pend);
    add(pend, new THREE.CylinderGeometry(0.006, 0.006, 0.6, 6), mat('#111'), [0, -0.3, 0]).castShadow = false;
    add(pend, new THREE.SphereGeometry(0.22, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2f5d62', roughness: 0.4, metalness: 0.2, side: THREE.DoubleSide }), [0, -0.78, 0]).castShadow = false;
    add(pend, new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff3d6' }), [0, -0.82, 0]).castShadow = false;
  }

  // ---------- price board on the right wall ----------
  const boardCanvas = document.createElement('canvas'); boardCanvas.width = 1024; boardCanvas.height = 720;
  const boardTex = new THREE.CanvasTexture(boardCanvas); boardTex.colorSpace = THREE.SRGBColorSpace; boardTex.anisotropy = 8;
  function drawBoard() {
    const g = boardCanvas.getContext('2d'), w = 1024, h = 720, c = C();
    g.fillStyle = '#1e2b24'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    g.fillStyle = '#f4ead8'; g.textBaseline = 'top';
    g.font = '700 74px "Bricolage Grotesque", sans-serif'; g.fillText(T().pTitle, 60, 50);
    g.fillStyle = '#ffb347'; g.fillRect(60, 140, 120, 6);
    c.offers.forEach((o, i) => {
      const y = 190 + i * 150;
      g.fillStyle = '#f4ead8'; g.font = '600 48px "Bricolage Grotesque", sans-serif'; g.fillText(o.name, 60, y);
      g.fillStyle = '#ffb347'; g.font = '700 48px "Bricolage Grotesque", sans-serif';
      g.fillText(o.price, w - 60 - g.measureText(o.price).width, y);
      g.fillStyle = 'rgba(244,234,216,0.7)'; g.font = '32px "Bricolage Grotesque", sans-serif'; g.fillText(o.items[0], 60, y + 62);
    });
    g.fillStyle = 'rgba(244,234,216,0.55)'; g.font = '28px "Bricolage Grotesque", sans-serif'; g.fillText(T().act.pricing + ' →', 60, h - 70);
    boardTex.needsUpdate = true;
  }
  drawBoard();
  const board = new THREE.Group(); board.position.set(ROOM.maxX - 0.03, 1.55, 0.55); board.rotation.y = -Math.PI / 2; room.add(board);
  add(board, rbox(1.32, 0.96, 0.05, 0.012), mat('#2b1d15', { roughness: 0.4 }));
  const boardFace = add(board, new THREE.PlaneGeometry(1.2, 0.84), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.85 }), [0, 0, 0.027]);
  boardFace.castShadow = false;
  interactives.push({ kind: 'pricing', object: board });

  return { room, boxes, circles, interactives, board, redraw: drawBoard };
}
