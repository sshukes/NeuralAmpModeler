// src/api/namApi.ts
import type {
  TrainingRunCreateRequest,
  TrainingRunSummary,
  TrainingRunMetrics,
  FileUploadResponse,
  FileInspectResponse,
  LatencyDetectionResponse,
} from './namTypes';

const DEFAULT_TIMEOUT_MS = 300_000; // 60s – adjust if needed

export class NamApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private async requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    console.log('requestJson →', url, init?.method ?? 'GET');

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, DEFAULT_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Request failed: ${res.status} ${res.statusText} - ${text}`);
      }

      return (await res.json()) as T;
    } catch (err: any) {
      console.error('requestJson error for', url, err);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async uploadFile(file: File): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.requestJson<FileUploadResponse>('/files', {
      method: 'POST',
      body: formData,
    });
  }

  async inspectFile(fileId: string): Promise<FileInspectResponse> {
    return this.requestJson<FileInspectResponse>(`/files/${encodeURIComponent(fileId)}/inspect`);
  }

  async detectLatency(
    inputFileId: string,
    outputFileId: string
  ): Promise<LatencyDetectionResponse> {
    return this.requestJson<LatencyDetectionResponse>('/files/detect-latency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputFileId, outputFileId }),
    });
  }

  async createTrainingRun(
    payload: TrainingRunCreateRequest
  ): Promise<{ runId: string; status: string }> {
    return this.requestJson<{ runId: string; status: string }>('/training-runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async getTrainingRun(runId: string): Promise<TrainingRunSummary> {
    return this.requestJson<TrainingRunSummary>(`/training-runs/${encodeURIComponent(runId)}`);
  }

  async getTrainingRunMetrics(runId: string): Promise<TrainingRunMetrics> {
    return this.requestJson<TrainingRunMetrics>(
      `/training-runs/${encodeURIComponent(runId)}/metrics`
    );
  }
}
