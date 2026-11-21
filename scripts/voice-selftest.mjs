// node scripts/voice-selftest.mjs — spoken-help detector + voice report parsing.
import assert from 'node:assert/strict';
import { detectHelp } from '../src/engine/sos.js';
import { classifyPost } from '../src/engine/gazetteer.js';

const help = [
  'help me please', 'Help!', 'call an ambulance', 'my friend fainted', 'there is an accident here', 'dial 108',
  'one zero eight', 'मदत करा, अपघात झाला', 'आम्हाला वाचवा', 'कोणीतरी बेशुद्ध पडलं', 'मदद चाहिए', 'बचाओ',
  'ಸಹಾಯ ಮಾಡಿ', 'ದಯವಿಟ್ಟು ಕಾಪಾಡಿ', 'సహాయం చేయండి', 'నన్ను కాపాడండి', 'mujhe madad chahiye', 'chakkar aa raha hai', '१०८ ला फोन करा',
];
const notHelp = [
  'knee deep water at Sinhagad Road', 'पुलाखाली गुडघाभर पाणी आहे', 'Swargate underpass flooded, police closed the road',
  'drain is blocked near Deccan', 'helpful', 'फायर', 'नाला तुंबला आहे', '',
];
for (const s of help) assert.equal(detectHelp(s).help, true, `should be help: ${s}`);
for (const s of notHelp) assert.equal(detectHelp(s).help, false, `should NOT be help: ${s}`);

let c = classifyPost('पुलाखाली गुडघाभर पाणी आहे');
assert.equal(c.depth, 'knee'); assert.equal(c.depthKnown, true);
c = classifyPost('water on the road near Deccan');
assert.equal(c.depthKnown, false);
c = classifyPost('Swargate underpass waist deep');
assert.equal(c.depth, 'above_knee'); assert.equal(c.underpass, true);
assert.equal(classifyPost('ಚರಂಡಿ ಕಟ್ಟಿಕೊಂಡಿದೆ').type, 'clog');
assert.equal(classifyPost('మోకాలు లోతు నీరు').depth, 'knee');
// Real Deepgram nova-3 output (21 Nov): Marathi 'गुडघाभर' came back as 'गुद्दाभर'; Hindi help came back code-switched.
assert.equal(classifyPost('पुलाखाली गुद्दाभर पाणी आहे स्वारगेट जवळ.').depth, 'knee');
assert.equal(detectHelp('मदद चाहिए, accident हो गया है, ambulance बुलाओ.').help, true);
{ const c2 = classifyPost('Need deep water at the Swargate Underpass. Please be careful.'); assert.equal(c2.depth, 'knee'); assert.equal(c2.underpass, true); }
console.log(`ALL VOICE TESTS PASSED (${help.length} help, ${notHelp.length} not-help, 5 parse)`);
