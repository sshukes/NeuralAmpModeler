// src/api/namApi.ts
import type {
  TrainingRunCreateRequest,
  TrainingRunSummary,
  TrainingRunDetailResponse,
  TrainingRunMetrics,
  FileUploadResponse,
  FileInspectResponse,
  LatencyDetectionResponse,
  ListTrainingRunsParams,
  ListTrainingRunsResponse,
  NamMetadataResponse,
  TrainingMetadata,
  RunFilesDeletionResponse,
  NamMetadataUpdateRequest,
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
      const resClone = res.clone();

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Request failed: ${res.status} ${res.statusText} - ${text}`);
      }

      const contentType = res.headers.get('content-type');
      const isJsonContentType = contentType?.includes('application/json');

      if (isJsonContentType) {
        try {
          return (await res.json()) as T;
        } catch (parseErr) {
          const bodyText = await resClone.text().catch(() => '');
          const snippet = bodyText.length > 300 ? `${bodyText.slice(0, 300)}…` : bodyText;
          throw new Error(
            `Failed to parse JSON from ${url} (status ${res.status}): ${snippet}`
          );
        }
      }

      const bodyText = await res.text().catch(() => '');
      const trimmed = bodyText.trim();

      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return JSON.parse(bodyText) as T;
        } catch (parseErr) {
          const snippet = bodyText.length > 300 ? `${bodyText.slice(0, 300)}…` : bodyText;
          throw new Error(
            `Failed to parse JSON from ${url} (status ${res.status}): ${snippet}`
          );
        }
      }

      const snippet = bodyText.length > 300 ? `${bodyText.slice(0, 300)}…` : bodyText;
      throw new Error(
        `Expected JSON response from ${url} (status ${res.status}) but received ${contentType ?? 'unknown content type'}: ${snippet}`
      );
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

  async getTrainingRunDetail(
    runId: string
  ): Promise<TrainingRunDetailResponse> {
    return this.requestJson<TrainingRunDetailResponse>(
      `/training-runs/${encodeURIComponent(runId)}`
    );
  }

  async getTrainingRunMetrics(runId: string): Promise<TrainingRunMetrics> {
    return this.requestJson<TrainingRunMetrics>(
      `/training-runs/${encodeURIComponent(runId)}/metrics`
    );
  }

  async listTrainingRuns(
    params: ListTrainingRunsParams = {}
  ): Promise<ListTrainingRunsResponse> {
    const search = new URLSearchParams();
    if (params.limit !== undefined) {
      search.set('limit', String(params.limit));
    }
    if (params.status) {
      search.set('status', params.status);
    }

    const query = search.toString();
    const path = `/training-runs${query ? `?${query}` : ''}`;

    return this.requestJson<ListTrainingRunsResponse>(path);
  }

  async getNamMetadata(runId: string): Promise<NamMetadataResponse> {
    return this.requestJson<NamMetadataResponse>(
      `/training-runs/${encodeURIComponent(runId)}/nam-metadata`
    );
  }

  async updateNamMetadata(
    runId: string,
    payload: NamMetadataUpdateRequest
  ): Promise<NamMetadataResponse> {
    return this.requestJson<NamMetadataResponse>(
      `/training-runs/${encodeURIComponent(runId)}/nam-metadata`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
  }

  async deleteTrainingRunFiles(runId: string): Promise<RunFilesDeletionResponse> {
    return this.requestJson(`/training-runs/${encodeURIComponent(runId)}/files`, {
      method: 'DELETE',
    });
  }
}
