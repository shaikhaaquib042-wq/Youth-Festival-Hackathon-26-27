import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { access, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const suite = JSON.parse(await readFile(resolve(projectRoot, 'satya-test-cases.json'), 'utf8'));
const testCases = new Map(suite.test_cases.map(testCase => [testCase.id, testCase]));
const executionResults = new Map();
const vite = await createServer({
  root: projectRoot,
  configFile: resolve(projectRoot, 'vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});
const engine = await vite.ssrLoadModule('/src/core/verification.ts');
const spokenSummary = await vite.ssrLoadModule('/src/core/spokenSummary.ts');
const speech = await vite.ssrLoadModule('/src/services/speech.ts');
const voiceApi = await vite.ssrLoadModule('/src/services/voiceApi.ts');
const verdicts = suite.verdicts;

function runCase(id, run) {
  const testCase = testCases.get(id);
  test(`${id}: ${testCase.title}`, async () => {
    try {
      const actual = await run(testCase);
      executionResults.set(id, { actual, execution_status: 'PASS' });
    } catch (error) {
      executionResults.set(id, {
        actual: error instanceof Error ? error.message : String(error),
        execution_status: 'FAIL',
      });
      throw error;
    }
  });
}

runCase('SATYA-005', testCase => {
  const actual = engine.detectLanguage(testCase.input);
  assert.equal(actual, 'English');
  return { detected_language: actual };
});

runCase('SATYA-006', testCase => {
  const actual = engine.detectLanguage(testCase.input);
  assert.equal(actual, 'Hindi');
  return { detected_language: actual };
});

runCase('SATYA-007', testCase => {
  const actual = engine.detectLanguage(testCase.input);
  assert.equal(actual, 'Marathi');
  return { detected_language: actual };
});

runCase('SATYA-008', testCase => {
  const actual = engine.extractClaims(testCase.input);
  assert.equal(actual.length, 2);
  assert.match(actual[0], /scheme started in 2020/);
  assert.match(actual[1], /Every student is eligible/);
  const assessments = actual.map(text => engine.verifyMessage(text));
  assert.equal(assessments.length, 2);
  assert.ok(assessments.every(result => result.claims.length === 1));
  return { claims: actual, claim_assessment_counts: assessments.map(result => result.claims.length) };
});

runCase('SATYA-009', async () => {
  const typeSource = await readFile(resolve(projectRoot, 'src/app/types.ts'), 'utf8');
  const reportSource = await readFile(resolve(projectRoot, 'src/components/VerificationReport.tsx'), 'utf8');
  const styleSource = await readFile(resolve(projectRoot, 'src/styles/global.css'), 'utf8');
  for (const verdict of verdicts) {
    assert.equal(engine.overallVerdict([{ verdict }]), verdict);
    assert.match(typeSource, new RegExp(`'${verdict}'`));
    assert.ok(reportSource.includes(`${verdict}:`), `Report icon missing for ${verdict}`);
    assert.ok(styleSource.includes(`verdict-${verdict.toLowerCase()}`), `Verdict styling missing for ${verdict}`);
    assert.ok(styleSource.includes(`status-${verdict.toLowerCase()}`), `Claim status styling missing for ${verdict}`);
  }
  return { supported_verdicts: verdicts, report_icons_and_styles: 'present for all five' };
});

runCase('SATYA-010', testCase => {
  const report = engine.verifyMessage(testCase.input);
  assert.equal(report.claims.length, 1);
  assert.equal(report.claims[0].verdict, 'UNVERIFIED');
  assert.equal(report.claims[0].evidence, null);
  assert.match(report.claims[0].explanation, /not enough reliable evidence/i);
  return { claim_verdict: report.claims[0].verdict, evidence: report.claims[0].evidence, explanation: report.claims[0].explanation };
});

runCase('SATYA-011', testCase => {
  const claim = 'The government is giving free laptops to every college student.';
  const report = engine.verifyMessage(claim);
  const record = report.claims[0].evidence;
  assert.ok(record, 'Expected a matching configured evidence record');
  for (const field of ['sourceTitle', 'issuingAuthority', 'publicationDate', 'evidenceExcerpt']) {
    assert.ok(record[field], `Expected populated ${field}`);
  }
  assert.equal(record.demoOnly, true);
  assert.equal(record.sourceUrl, '', 'The synthetic fixture intentionally has no source URL');
  return {
    claim_verdict: report.claims[0].verdict,
    provenance: {
      sourceTitle: record.sourceTitle,
      issuingAuthority: record.issuingAuthority,
      publicationDate: record.publicationDate,
      evidenceExcerpt: record.evidenceExcerpt,
      sourceUrl: record.sourceUrl,
      demoOnly: record.demoOnly,
    },
    note: 'Synthetic record is labelled; no URL is supplied or invented.',
  };
});

runCase('SATYA-012', testCase => {
  const input = 'The government is giving free laptops to every college student. All citizens are eligible for a special cash reward.';
  const report = engine.verifyMessage(input);
  const claimVerdicts = report.claims.map(claim => claim.verdict);
  assert.deepEqual(claimVerdicts, ['FALSE', 'MISLEADING']);
  assert.equal(report.overall, 'FALSE');
  assert.equal(report.claims.length, 2);
  return { overall_verdict: report.overall, claim_verdicts: claimVerdicts, claims: report.claims.map(claim => claim.text) };
});

runCase('SATYA-013', testCase => {
  const input = 'A newly created local message with no matching demonstration evidence.';
  const reports = ['English', 'Hindi', 'Marathi'].map(language => engine.verifyMessage(input, language));
  assert.deepEqual(reports.map(report => report.outputLanguage), ['English', 'Hindi', 'Marathi']);
  assert.ok(reports.every(report => report.overall === 'UNVERIFIED'));
  assert.equal(new Set(reports.map(report => report.summary)).size, 3);
  return {
    output_languages: reports.map(report => report.outputLanguage),
    verdicts: reports.map(report => report.overall),
    summaries_are_translated: true,
  };
});

runCase('SATYA-019', () => {
  const unmatched = engine.verifyMessage('A uniquely worded claim that is not in the local demonstration records.');
  const syntheticReports = verdicts.map(verdict => ({
    ...unmatched,
    overall: verdict,
    claims: unmatched.claims.map(claim => ({
      ...claim,
      verdict,
      evidence: { demoOnly: true },
    })),
  }));
  const summaries = syntheticReports.map(report => spokenSummary.createSpokenSummary(report, 'English'));
  const falseSummary = summaries[verdicts.indexOf('FALSE')];
  const unverifiedSummary = summaries[verdicts.indexOf('UNVERIFIED')];
  assert.match(falseSummary, /^Demonstration example: FALSE\./);
  assert.match(falseSummary, /No real-world fact-check was performed/);
  assert.doesNotMatch(falseSummary, /Reliable evidence shows/);
  assert.match(unverifiedSummary, /does not mean it is false/i);
  assert.ok(summaries.every(summary => /No real-world fact-check was performed/.test(summary)));
  assert.ok(summaries.every(summary => summary.length < 320));
  assert.ok(summaries.every(summary => !summary.includes(unmatched.claims[0].text)));
  assert.ok(verdicts.every(verdict => summaries[verdicts.indexOf(verdict)].includes(verdict)));

  const hindi = spokenSummary.createSpokenSummary(syntheticReports[0], 'Hindi');
  const marathi = spokenSummary.createSpokenSummary(syntheticReports[0], 'Marathi');
  assert.match(hindi, /डेमो उदाहरण/);
  assert.match(marathi, /डेमो उदाहरण/);
  return {
    verdicts: verdicts.map((verdict, index) => ({ verdict, characters: summaries[index].length })),
    synthetic_false_summary: falseSummary,
    unverified_summary: unverifiedSummary,
    hindi_and_marathi_demo_labels: true,
  };
});

runCase('SATYA-020', () => {
  const voices = [
    { name: 'Microsoft David - English (United States)', lang: 'en-US' },
    { name: 'English Standard Voice', lang: 'en-IN' },
    { name: 'Microsoft Zira - English (United States)', lang: 'en-GB' },
    { name: 'English Natural Voice', lang: 'en-GB' },
    { name: 'Hindi Desktop', lang: 'hi-IN' },
    { name: 'Marathi Female', lang: 'mr-IN' },
  ];
  assert.equal(speech.selectVoice(voices, 'English')?.name, 'English Natural Voice');
  assert.equal(speech.selectVoice(voices, 'English', 'male')?.name, 'Microsoft David - English (United States)');
  assert.equal(speech.selectVoice(voices, 'English', 'female')?.name, 'Microsoft Zira - English (United States)');
  assert.equal(speech.selectVoice(voices, 'Hindi')?.name, 'Hindi Desktop');
  assert.equal(speech.selectVoice(voices, 'Marathi')?.name, 'Marathi Female');
  assert.equal(speech.selectVoice(voices.filter(voice => voice.lang.startsWith('en')), 'Hindi'), undefined);
  assert.equal(speech.selectVoice(voices.filter(voice => voice.lang.startsWith('en')), 'Marathi'), undefined);
  return {
    selected: ['English', 'Hindi', 'Marathi'].map(language => ({
      language,
      voice: speech.selectVoice(voices, language)?.name,
    })),
    english_gender_match: {
      male: speech.selectVoice(voices, 'English', 'male')?.name,
      female: speech.selectVoice(voices, 'English', 'female')?.name,
    },
    unrelated_language_fallback: false,
  };
});

runCase('SATYA-021', async () => {
  assert.equal(speech.speechSettings.pitch, 1.1);
  assert.equal(speech.speechSettings.rate, 0.95);
  assert.equal(speech.speechSettings.volume, 1);
  const reportSource = await readFile(resolve(projectRoot, 'src/components/VerificationReport.tsx'), 'utf8');
  const controlsSource = await readFile(resolve(projectRoot, 'src/components/AudioControls.tsx'), 'utf8');
  assert.match(reportSource, /<AudioControls report=\{report\} language=\{language\}/);
  assert.match(controlsSource, /createSpokenSummary\(report, speechLanguage\)/);
  assert.match(controlsSource, /className="spoken-preview"/);
  assert.match(controlsSource, /<p className="spoken-preview"[^>]*>\{text\}<\/p>/);
  return {
    pitch: speech.speechSettings.pitch,
    rate: speech.speechSettings.rate,
    volume: speech.speechSettings.volume,
    summary_connected_to_report_and_preview: true,
  };
});

runCase('SATYA-022', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    return new Response(new Uint8Array([82, 73, 70, 70]), {
      status: 200,
      headers: { 'content-type': 'audio/wav' },
    });
  };
  try {
    for (const language of ['English', 'Hindi', 'Marathi']) {
      for (const gender of ['male', 'female']) {
        const audio = await voiceApi.synthesizeWithVoiceApi({
          text: 'Short spoken test.',
          language,
          gender,
          speed: 0.95,
          pitch: 1.1,
        });
        assert.ok(audio.size > 0);
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
  }

  const voiceIds = requests.map(({ init }) => JSON.parse(init.body).voice);
  assert.deepEqual(voiceIds, [
    'en_male', 'en_female', 'hi_male', 'hi_female', 'mr_male', 'mr_female',
  ]);
  assert.ok(requests.every(({ url }) => url.endsWith('/synthesize')));
  const request = JSON.parse(requests[0].init.body);
  assert.equal(request.speed, 0.95);
  assert.equal(request.pitch, 1.1);
  assert.equal(request.energy, 0.9);
  assert.equal(request.style, undefined);
  assert.equal(request.normalize, true);
  assert.equal(requests[0].init.credentials, undefined);
  return {
    voice_ids_tested: voiceIds,
    endpoint: '/synthesize',
    audio_format: 'audio/wav',
    speed_pitch_and_energy_sent_without_preset_multipliers: true,
    credentials_exposed: false,
  };
});

runCase('SATYA-023', async () => {
  const controls = await readFile(resolve(projectRoot, 'src/components/AudioControls.tsx'), 'utf8');
  const apiSource = await readFile(resolve(projectRoot, 'src/services/voiceApi.ts'), 'utf8');
  const speechSource = await readFile(resolve(projectRoot, 'src/services/speech.ts'), 'utf8');
  for (const label of ['audioLanguage', 'voiceGender', 'maleVoice', 'femaleVoice', 'speakingSpeed', 'speechPitch']) {
    assert.ok(controls.includes(`'${label}'`), `Audio control missing ${label}`);
  }
  for (const control of ['Play', 'Pause', 'Resume', 'Replay', 'Stop']) {
    assert.ok(controls.includes(`label('${control.toLowerCase()}')`), `Missing ${control} control`);
  }
  assert.match(controls, /synthesizeWithVoiceApi/);
  assert.match(controls, /speak\(text, speechLanguage, gender, \{ pitch, rate: speed \}/);
  assert.match(controls, /audioServiceNotice/);
  assert.match(controls, /AbortController/);
  assert.match(apiSource, /VITE_VOICE_API_BASE_URL/);
  assert.match(speechSource, /selectVoice\(voices, language, gender\)/);
  return {
    language_gender_speed_pitch_controls: true,
    browser_speech_fallback: true,
    request_cancellation_and_single_active_playback: true,
    loading_and_unavailable_voice_messages: true,
  };
});

after(async () => {
  await vite.close();
  const resultsPath = resolve(projectRoot, 'satya-test-results.json');
  let priorResults = [];
  try {
    await access(resultsPath);
    priorResults = JSON.parse(await readFile(resultsPath, 'utf8')).test_results ?? [];
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const priorById = new Map(priorResults.map(result => [result.id, result]));
  const cases = suite.test_cases.map(testCase => {
    const automated = executionResults.get(testCase.id);
    const prior = priorById.get(testCase.id);
    const result = automated && prior
      ? {
          ...prior,
          ...automated,
          actual: automated.actual && prior.actual
            && typeof automated.actual === 'object'
            && typeof prior.actual === 'object'
            ? { ...prior.actual, ...automated.actual }
            : automated.actual,
        }
      : automated ?? prior;
    return {
      id: testCase.id,
      category: testCase.category,
      priority: testCase.priority,
      title: testCase.title,
      expected: testCase.expected,
      actual: result?.actual ?? 'Not run by the automated Node suite; requires browser/manual verification.',
      execution_status: result?.execution_status ?? 'BLOCKED',
    };
  });
  const summary = {
    total: cases.length,
    passed: cases.filter(testCase => testCase.execution_status === 'PASS').length,
    failed: cases.filter(testCase => testCase.execution_status === 'FAIL').length,
    blocked: cases.filter(testCase => testCase.execution_status === 'BLOCKED').length,
  };
  await writeFile(resolve(projectRoot, 'satya-test-results.json'), `${JSON.stringify({
    project: suite.project,
    suite_version: suite.suite_version,
    generated_at: new Date().toISOString(),
    test_results: cases,
    execution_summary: summary,
  }, null, 2)}\n`);
});
