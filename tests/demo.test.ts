import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import seedJson from '../data/seed.json';
import { buildDemoTimeline } from '../lib/demo/timeline';
import { AppDataStore } from '../types';

const seedData = seedJson as unknown as AppDataStore;

describe('Phase 8: Scripted Demo Mode & Deterministic Timeline', () => {
  it('1. builds exactly 8 named demo scenes with proper sequence', () => {
    const chapters = buildDemoTimeline(seedData);
    expect(chapters.length).toBe(8);

    const expectedTitles = [
      'The Problem',
      'The Verified Request',
      'Intelligent Matching',
      'Controlled Escalation',
      'Donor Acceptance',
      'Request Fulfilment',
      'Strategic Intelligence',
      'The Final Impact',
    ];

    chapters.forEach((ch, i) => {
      expect(ch.id).toBe(i + 1);
      expect(ch.title).toContain(expectedTitles[i]);
    });
  });

  it('2. guarantees that running the full demo timeline twice yields byte-identical state', () => {
    const chapters1 = buildDemoTimeline(seedData);
    let state1 = JSON.parse(JSON.stringify(seedData));
    for (const ch of chapters1) {
      state1 = ch.applyState(state1);
    }

    const chapters2 = buildDemoTimeline(seedData);
    let state2 = JSON.parse(JSON.stringify(seedData));
    for (const ch of chapters2) {
      state2 = ch.applyState(state2);
    }

    const hash1 = crypto.createHash('sha256').update(JSON.stringify(state1)).digest('hex');
    const hash2 = crypto.createHash('sha256').update(JSON.stringify(state2)).digest('hex');

    expect(hash1).toBe(hash2);
  });

  it('3. validates state transitions through all 8 chapters', () => {
    const chapters = buildDemoTimeline(seedData);
    let state = JSON.parse(JSON.stringify(seedData));

    // Scene 1: The Problem
    state = chapters[0].applyState(state);
    expect(chapters[0].view).toBe('impact');

    // Scene 2: Verified Request created
    state = chapters[1].applyState(state);
    const demoReq = state.requests.find((r: { id: string }) => r.id === 'demo-req-rubyhall-01');
    expect(demoReq).toBeDefined();
    expect(demoReq?.verificationStatus).toBe('verified');
    expect(demoReq?.bloodGroup).toBe('B+');

    // Scene 3: Tier 1 Activated (5 donors notified)
    state = chapters[2].applyState(state);
    const reqS3 = state.requests.find((r: { id: string }) => r.id === 'demo-req-rubyhall-01');
    expect(reqS3?.tier).toBe(1);
    expect(reqS3?.notifiedDonorIds.length).toBe(5);

    // Scene 4: Tier 2 Escalation (widens to 15 notified donors)
    state = chapters[3].applyState(state);
    const reqS4 = state.requests.find((r: { id: string }) => r.id === 'demo-req-rubyhall-01');
    expect(reqS4?.tier).toBe(2);
    expect(reqS4?.notifiedDonorIds.length).toBe(15);

    // Scene 5: Donor Acceptance & Contact Reveal
    state = chapters[4].applyState(state);
    const reqS5 = state.requests.find((r: { id: string }) => r.id === 'demo-req-rubyhall-01');
    expect(reqS5?.acceptedDonorIds).toContain('donor-007');
    expect(state.auditLogs.some((a: { action: string }) => a.action === 'DONOR_CONTACT_REVEALED')).toBe(true);

    // Scene 6: Fulfilment & Closure
    state = chapters[5].applyState(state);
    const reqS6 = state.requests.find((r: { id: string }) => r.id === 'demo-req-rubyhall-01');
    expect(reqS6?.status).toBe('fulfilled');
    expect(reqS6?.fulfilledUnits).toBe(2);
    expect(state.donationEvents.length).toBeGreaterThanOrEqual(2);

    // Scene 7: Strategic Intelligence
    state = chapters[6].applyState(state);
    expect(chapters[6].view).toBe('heatmap');

    // Scene 8: Final Impact
    state = chapters[7].applyState(state);
    expect(chapters[7].view).toBe('impact');
  });

  it('4. ensures replay to any arbitrary chapter is deterministic and self-contained', () => {
    const chapters = buildDemoTimeline(seedData);

    // Replay to scene 5 directly
    const stateAt5 = chapters[4].applyState(seedData);
    expect(stateAt5.auditLogs.length).toBeGreaterThan(0);

    // Replay to scene 3 directly
    const stateAt3 = chapters[2].applyState(seedData);
    const req = stateAt3.requests.find((r) => r.id === 'demo-req-rubyhall-01');
    expect(req?.tier).toBe(1);
    expect(req?.notifiedDonorIds.length).toBe(5);
  });
});
