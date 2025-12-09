// src/api/namTypes.ts

// ---------- Shared types ----------

export type TrainingArchitecture = 'nano' | 'lite' | 'standard' | 'large';
export type TrainingDevice = 'cpu' | 'gpu' | 'auto';

export type TrainingRunStatus =
    | 'QUEUED'
    | 'RUNNING'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED';

// ---------- File upload / inspect ----------

export interface FileUploadResponse {
    fileId: string;
    filename: string;
    sizeBytes: number;
    createdAt: string; // ISO timestamp
}

export interface WavFormatInfo {
    container: 'wav' | string;
    sampleRate: number;
    bitDepth: number;
    channels: number;
    durationSeconds: number;
    numSamples: number;
}

export interface FileValidForNam {
    sampleRateOk: boolean;
    bitDepthOk: boolean;
    channelsOk: boolean;
}

export interface FileInspectResponse {
    fileId: string;
    filename: string;
    format: WavFormatInfo;
    validForNam: FileValidForNam;
}

export interface LatencyDetectionRequest {
    inputFileId: string;
    outputFileId: string;
}

export interface LatencyDetectionResponse {
    inputFileId: string;
    outputFileId: string;
    latencySamples: number;
    latencyMs: number;
    confidence: number; // 0–1
    alignmentPreview: {
        segmentStartSeconds: number;
        segmentDurationSeconds: number;
    };
}

// ---------- Training runs ----------

export interface TrainingConfig {
    architecture: TrainingArchitecture;
    epochs: number;
    batchSize: number;
    learningRate: number;
    device: TrainingDevice;
    ignoreChecks: boolean;
}

export interface TrainingMetadata {
    modeledBy?: string;
    gearMake?: string;
    gearModel?: string;
    gearType?: string; // "Amp" | "Cab" | "Amp+Cab" | "Pedal" | ...
    toneType?: string; // "Clean" | "Crunch" | "Lead" | ...
    reampSendLevelDb?: number;
    reampReturnLevelDb?: number;
    tags?: string[];
}

export interface TrainingRunCreateRequest {
    name: string;
    description?: string;
    inputFileId: string;
    outputFileId: string;
    latencySamples: number;
    training: TrainingConfig;
    metadata?: TrainingMetadata;
}

export interface TrainingRunCreateResponse {
    runId: string;
    status: TrainingRunStatus;
}

export interface TrainingRunProgress {
    currentEpoch: number;
    maxEpochs: number;
    trainLoss: number | null;
    valLoss: number | null;
    bestValLoss: number | null;
    bestEpoch: number | null;
}

export interface TrainingRunDetailResponse {
    runId: string;
    name: string;
    description?: string;
    status: TrainingRunStatus;
    createdAt: string;
    startedAt?: string;
    updatedAt?: string;
    completedAt?: string;
    progress?: TrainingRunProgress;
    training: TrainingConfig;
    metadata?: TrainingMetadata;
}

// List runs (/api/training-runs)

export interface TrainingRunSummary {
    runId: string;
    name: string;
    status: TrainingRunStatus;
    createdAt: string;
    completedAt?: string;
    architecture: TrainingArchitecture;
    device: TrainingDevice;
    qualityScore?: number;
    namStatus?: string;
}

export interface ListTrainingRunsParams {
    limit?: number;
    status?: TrainingRunStatus;
}

export interface ListTrainingRunsResponse {
    items: TrainingRunSummary[];
}

// Cancel run

export interface TrainingRunCancelResponse {
    runId: string;
    status: TrainingRunStatus;
}

// ---------- Metrics / comparison ----------

export interface TrainingRunMetrics {
    runId: string;
    metrics: {
        snrDb: number;
        rmsError: number;
        spectralErrorDb: number;
        timeAlignmentErrorSamples: number;
        qualityScore: number;
    };
}

export interface TrainingRunMetricsResponse {
    runId: string;
    metrics: TrainingRunMetrics;
}

export interface ComparisonSegmentSignal {
    numSamples: number;
    samples: number[]; // usually downsampled for UI
}

export interface ComparisonSegmentResponse {
    segment: {
        startSeconds: number;
        durationSeconds: number;
    };
    sampleRate: number;
    target: ComparisonSegmentSignal;
    model: ComparisonSegmentSignal;
    error: ComparisonSegmentSignal;
}
