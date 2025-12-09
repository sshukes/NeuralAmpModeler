// tests/namApiClient.test.ts

import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

import { NamApiClient } from '../api/namApi';
import type {
  TrainingRunStatus,
  TrainingRunCreateRequest
} from '../../src/api/namTypes';

// ---------- Helpers ----------

// Simple sleep for polling
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Minimal File polyfill for Node (Node 18+ has Blob built in)
// Minimal File polyfill for Node (Node 18+ has Blob built in)
class NodeFile extends Blob implements File {
  readonly name: string;
  readonly lastModified: number;
  readonly webkitRelativePath: string = '';

  constructor(
    fileBits: BlobPart[],
    fileName: string,
    options?: FilePropertyBag
  ) {
    super(fileBits, options);
    this.name = fileName;
    this.lastModified = options?.lastModified ?? Date.now();
  }
}


// ---------- Test config ----------

const BACKEND_BASE_URL = process.env.NAM_TEST_BASE_URL ?? 'http://localhost:8000';

// Keep epochs small so the sanity-check runs quickly
const TEST_EPOCHS = Number(process.env.NAM_TEST_EPOCHS ?? '2');

// Max time to wait for training before failing (ms)
const TRAINING_TIMEOUT_MS = Number(
  process.env.NAM_TEST_TIMEOUT_MS ?? (5 * 60 * 1000).toString() // 5 minutes default
);

// Allowed terminal statuses
const TERMINAL_STATUSES: TrainingRunStatus[] = [
  'COMPLETED',
  'FAILED',
  'CANCELLED'
];

// ---------- Main integration test ----------

describe('NamApiClient integration sanity check', () => {
  it(
    'uploads files, detects latency, starts training, and reads metrics',
    async () => {
      const inputPath = process.env.NAM_TEST_INPUT_WAV;
      const outputPath = process.env.NAM_TEST_OUTPUT_WAV;

      if (!inputPath || !outputPath) {
        throw new Error(
          'NAM_TEST_INPUT_WAV and NAM_TEST_OUTPUT_WAV env vars must be set to local .wav file paths'
        );
      }

      const api = new NamApiClient(BACKEND_BASE_URL);

      // ---- 1. Upload files ----

      const [inputBuf, outputBuf] = await Promise.all([
        fs.readFile(inputPath),
        fs.readFile(outputPath)
      ]);

      const inputFileName = path.basename(inputPath);
      const outputFileName = path.basename(outputPath);

      const inputFile = new NodeFile([inputBuf], inputFileName, {
        type: 'audio/wav'
      });
      const outputFile = new NodeFile([outputBuf], outputFileName, {
        type: 'audio/wav'
      });

      const inputUpload = await api.uploadFile(inputFile);
      const outputUpload = await api.uploadFile(outputFile);

      expect(inputUpload.fileId).toBeTruthy();
      expect(outputUpload.fileId).toBeTruthy();

      // ---- 2. Inspect files ----

      const [inputInspect, outputInspect] = await Promise.all([
        api.inspectFile(inputUpload.fileId),
        api.inspectFile(outputUpload.fileId)
      ]);

      // Basic sanity checks — adjust if your backend allows other formats
      expect(inputInspect.format.container).toBe('wav');
      expect(outputInspect.format.container).toBe('wav');

      expect(inputInspect.format.sampleRate).toBe(48000);
      expect(outputInspect.format.sampleRate).toBe(48000);

      expect(inputInspect.format.channels).toBe(1);
      expect(outputInspect.format.channels).toBe(1);

      // NAM wants same length input/output
      expect(inputInspect.format.numSamples).toBe(
        outputInspect.format.numSamples
      );

      // Optional: ensure backend flags them as NAM-valid
      expect(inputInspect.validForNam.sampleRateOk).toBe(true);
      expect(inputInspect.validForNam.channelsOk).toBe(true);
      expect(outputInspect.validForNam.sampleRateOk).toBe(true);
      expect(outputInspect.validForNam.channelsOk).toBe(true);

      // ---- 3. Detect latency ----

      const latency = await api.detectLatency(
        inputUpload.fileId,
        outputUpload.fileId
      );

      expect(latency.latencySamples).toBeGreaterThanOrEqual(0);
      expect(latency.confidence).toBeGreaterThan(0);
      expect(latency.confidence).toBeLessThanOrEqual(1);

      // ---- 4. Start a small training run ----

      const payload: TrainingRunCreateRequest = {
        name: 'NAM Sanity Test Run',
        description: 'Automated integration test',
        inputFileId: inputUpload.fileId,
        outputFileId: outputUpload.fileId,
        latencySamples: latency.latencySamples,
        training: {
          architecture: 'nano',
          epochs: TEST_EPOCHS,
          batchSize: 8,
          learningRate: 0.004,
          device: 'auto',
          ignoreChecks: false
        },
        metadata: {
          modeledBy: 'NAM Test Harness',
          gearMake: 'Test',
          gearModel: 'TestRig',
          gearType: 'Amp+Cab',
          toneType: 'Test',
          tags: ['sanity-check', 'integration-test']
        }
      };

      const createResp = await api.createTrainingRun(payload);
      expect(createResp.runId).toBeTruthy();

      const runId = createResp.runId;

      // ---- 5. Poll training status until terminal or timeout ----

      const startedAt = Date.now();
      let finalStatus: TrainingRunStatus | null = null;
      let lastDetail = await api.getTrainingRun(runId);

      while (!TERMINAL_STATUSES.includes(lastDetail.status)) {
        const elapsed = Date.now() - startedAt;
        if (elapsed > TRAINING_TIMEOUT_MS) {
          throw new Error(
            `Training did not reach a terminal status within ${TRAINING_TIMEOUT_MS} ms. Last status: ${lastDetail.status}`
          );
        }

        // Small delay before next poll
        await sleep(3000);

        lastDetail = await api.getTrainingRun(runId);
      }

      finalStatus = lastDetail.status;

      // We consider the test failed if training itself failed/cancelled
      expect(finalStatus).toBe('COMPLETED');

      // ---- 6. Fetch metrics and do basic sanity checks ----

      const metricsResp = await api.getTrainingRunMetrics(runId);
      expect(metricsResp.runId).toBe(runId);

      const m = metricsResp.metrics;

      // These checks are intentionally loose — just verifying we got sensible numbers
      expect(m.qualityScore).toBeGreaterThanOrEqual(0);
      expect(m.qualityScore).toBeLessThanOrEqual(100);

      expect(Number.isFinite(m.snrDb)).toBe(true);
      expect(Number.isFinite(m.rmsError)).toBe(true);
      expect(Number.isFinite(m.spectralErrorDb)).toBe(true);

      // Optional: check that error is not completely insane
      expect(m.rmsError).toBeGreaterThanOrEqual(0);
    },
    // Vitest timeout for the whole test (in ms)
    TRAINING_TIMEOUT_MS + 60_000
  );
});
