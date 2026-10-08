import { aiogps } from './projects/aiogps.js';
import { aiotech } from './projects/aiotech.js';
import { aiosearch } from './projects/aiosearch.js';
import { aiotrade } from './projects/aiotrade.js';
import { aiobot } from './projects/aiobot.js';
import { aiov3 } from './projects/aiov3.js';

// Alban's six public projects, one per number on the screen, each in its own site's colours.
// Each builder returns { group, frame: { target, dist, pitch, yaw }, update(dt, t, camera) } and sits on y = 0.
export const BUILDERS = { aiogps, aiotech, aiosearch, aiotrade, aiobot, aiov3 };
