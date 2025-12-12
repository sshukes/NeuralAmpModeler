// src/components/NamTrainerApp.tsx
import React, { useEffect, useMemo, useState, ChangeEvent, FormEvent } from 'react';
import { NamApiClient } from '../api/namApi';
import { API_BASE_URL } from '../api/baseUrl';
import type {
    TrainingArchitecture,
    TrainingDevice,
    TrainingRunStatus,
    TrainingConfig,
    TrainingMetadata,
} from '../api/namTypes';


type FileInfo = {
    fileId: string;
    filename: string;
    createdAt: string;
    sizeBytes: number;
};

type FileInspect = {
    fileId: string;
    filename: string;
    format: {
        container: string;
        sampleRate: number;
        bitDepth: number;
        channels: number;
        durationSeconds: number;
        numSamples: number;
    };
    validForNam: {
        sampleRateOk: boolean;
        bitDepthOk: boolean;
        channelsOk: boolean;
    };
};

type LatencyInfo = {
    inputFileId: string;
    outputFileId: string;
    latencySamples: number;
    latencyMs: number;
    confidence: number;
};

type TrainingRunSummary = {
    runId: string;
    name: string;
    description?: string | null;
    status: TrainingRunStatus;
    createdAt?: string | null;
    startedAt?: string | null;
    updatedAt?: string | null;
    completedAt?: string | null;
    error?: string | null;
};

type TrainingMetrics = {
    snrDb: number;
    rmsError: number;
    spectralErrorDb: number;
    timeAlignmentErrorSamples: number;
    qualityScore: number;
};

const API_BASE = API_BASE_URL;

const defaultTrainingConfig: TrainingConfig = {
    architecture: 'standard' as TrainingArchitecture,
    epochs: 100,
    batchSize: 64,
    learningRate: 1e-3,
    device: 'auto' as TrainingDevice,
    ignoreChecks: true,
};

const defaultMetadata: TrainingMetadata = {
    modeledBy: '',
    gearMake: '',
    gearModel: '',
    gearType: '',
    toneType: '',
    reampSendLevelDb: undefined,
    reampReturnLevelDb: undefined,
    tags: [],
};

const COMPLETED_STATES: TrainingRunStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

export const NamTrainerApp: React.FC = () => {
    const client = useMemo(() => new NamApiClient(API_BASE), []);

    // Files + inspection
    const [inputFile, setInputFile] = useState<File | null>(null);
    const [outputFile, setOutputFile] = useState<File | null>(null);
    const [inputInfo, setInputInfo] = useState<FileInfo | null>(null);
    const [outputInfo, setOutputInfo] = useState<FileInfo | null>(null);
    const [inputInspect, setInputInspect] = useState<FileInspect | null>(null);
    const [outputInspect, setOutputInspect] = useState<FileInspect | null>(null);

    // Latency
    const [latency, setLatency] = useState<LatencyInfo | null>(null);

    // Training config / metadata
    const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>(defaultTrainingConfig);
    const [metadata, setMetadata] = useState<TrainingMetadata>(defaultMetadata);

    // Training run tracking
    const [runId, setRunId] = useState<string | null>(null);
    const [runSummary, setRunSummary] = useState<TrainingRunSummary | null>(null);
    const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);

    // UI state
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Logging
    type LogLevel = 'log' | 'info' | 'warn' | 'error';
    type LogEntry = { timestamp: string; level: LogLevel; message: string };
    const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

    useEffect(() => {
        const formatArgs = (args: unknown[]) =>
            args
                .map((arg) => {
                    if (typeof arg === 'string') return arg;
                    try {
                        return JSON.stringify(arg);
                    } catch (err) {
                        return String(arg);
                    }
                })
                .join(' ');

        const appendLog = (level: LogLevel, args: unknown[]) => {
            const now = new Date();
            const entry: LogEntry = {
                level,
                timestamp: now.toLocaleTimeString(),
                message: formatArgs(args),
            };

            setLogEntries((prev) => [...prev.slice(-199), entry]);
        };

        const original = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error,
        };

        (console as any).log = (...args: unknown[]) => {
            appendLog('log', args);
            original.log(...args);
        };
        (console as any).info = (...args: unknown[]) => {
            appendLog('info', args);
            original.info(...args);
        };
        (console as any).warn = (...args: unknown[]) => {
            appendLog('warn', args);
            original.warn(...args);
        };
        (console as any).error = (...args: unknown[]) => {
            appendLog('error', args);
            original.error(...args);
        };

        return () => {
            (console as any).log = original.log;
            (console as any).info = original.info;
            (console as any).warn = original.warn;
            (console as any).error = original.error;
        };
    }, []);

    // Handlers --------------------------------------------------------

    const handleFileChange =
        (kind: 'input' | 'output') =>
            (e: ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0] ?? null;
                if (kind === 'input') {
                    setInputFile(file);
                    setInputInfo(null);
                    setInputInspect(null);
                } else {
                    setOutputFile(file);
                    setOutputInfo(null);
                    setOutputInspect(null);
                }
            };

    const handleUploadFiles = async () => {
        setError(null);

        console.log('Upload clicked. inputFile =', inputFile, 'outputFile =', outputFile);

        if (!inputFile || !outputFile) {
            setError('Please select both DI (input) and amp (output) WAV files.');
            return;
        }

        setBusy(true);
        try {
            console.log('Calling client.uploadFile for both files...');

            console.log('Uploading INPUT...');
            const inputRes = await client.uploadFile(inputFile);
            console.log('Input upload OK:', inputRes);

            console.log('Uploading OUTPUT...');
            const outputRes = await client.uploadFile(outputFile);
            console.log('Output upload OK:', outputRes);

            setInputInfo(inputRes);
            setOutputInfo(outputRes);


            console.log('Upload OK:', inputRes, outputRes);

            setInputInfo(inputRes);
            setOutputInfo(outputRes);

            const [inputInspectRes, outputInspectRes] = await Promise.all([
                client.inspectFile(inputRes.fileId),
                client.inspectFile(outputRes.fileId),
            ]);

            setInputInspect(inputInspectRes);
            setOutputInspect(outputInspectRes);
        } catch (err: any) {
            console.error('Upload/inspect error:', err);
            setError(err.message ?? 'Upload/inspect failed.');
        } finally {
            setBusy(false);
        }
    };

    const handleDetectLatency = async () => {
        setError(null);
        if (!inputInfo || !outputInfo) {
            setError('Upload both files first.');
            return;
        }

        setBusy(true);
        try {
            const res = await client.detectLatency(inputInfo.fileId, outputInfo.fileId);
            setLatency(res);
        } catch (err: any) {
            console.error(err);
            setError(err.message ?? 'Latency detection failed.');
        } finally {
            setBusy(false);
        }
    };

    const handleTrainingConfigChange =
        (field: keyof TrainingConfig) =>
            (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
                setTrainingConfig((prev) => ({
                    ...prev,
                    [field]: field === 'ignoreChecks' ? (e.target as HTMLInputElement).checked : value,
                }));
            };

    const handleMetadataChange =
        (field: keyof TrainingMetadata) =>
            (e: ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                if (field === 'tags') {
                    const tags = value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean);
                    setMetadata((prev) => ({ ...prev, tags }));
                } else if (field === 'reampSendLevelDb' || field === 'reampReturnLevelDb') {
                    setMetadata((prev) => ({
                        ...prev,
                        [field]: value === '' ? undefined : Number(value),
                    }));
                } else {
                    setMetadata((prev) => ({ ...prev, [field]: value }));
                }
            };

    const handleStartTraining = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!inputInfo || !outputInfo) {
            setError('Upload files, inspect, and detect latency before starting training.');
            return;
        }

        setBusy(true);
        try {
            const request = {
                name: `${metadata.gearMake ?? ''} ${metadata.gearModel ?? ''}`.trim() || 'NAM Capture',
                description: metadata.toneType ?? undefined,
                inputFileId: inputInfo.fileId,
                outputFileId: outputInfo.fileId,
                latencySamples:  0,
                training: trainingConfig,
                metadata,
            };

            const res = await client.createTrainingRun(request);
            setRunId(res.runId);
            setRunSummary({
                runId: res.runId,
                name: request.name,
                description: request.description,
                status: 'QUEUED',
                createdAt: new Date().toISOString(),
            });
            setMetrics(null);
        } catch (err: any) {
            console.error(err);
            setError(err.message ?? 'Failed to start training.');
        } finally {
            setBusy(false);
        }
    };

    // Poll training status / metrics ---------------------------------

    useEffect(() => {
        if (!runId) return;
        if (runSummary && COMPLETED_STATES.includes(runSummary.status)) return;

        const interval = setInterval(async () => {
            try {
                const summary = await client.getTrainingRun(runId);
                setRunSummary(summary);

                if (COMPLETED_STATES.includes(summary.status)) {
                    try {
                        const m = await client.getTrainingRunMetrics(runId);
                        setMetrics(m.metrics);
                    } catch (err) {
                        console.warn('Metrics not ready or failed:', err);
                    }
                }
            } catch (err) {
                console.error('Failed to poll run status:', err);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [client, runId, runSummary?.status]);

    // Render helpers --------------------------------------------------

    const bytesToMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2);

    const renderFileCard = (title: string, info: FileInfo | null, inspect: FileInspect | null) => {
        if (!info || !inspect) return null;

        return (
            <div className="border rounded p-3 mb-3">
                <h4>{title}</h4>
                <table>
                    <tbody>
                        <tr>
                            <td>Filename</td>
                            <td>{info.filename}</td>
                        </tr>
                        <tr>
                            <td>Size</td>
                            <td>{bytesToMb(info.sizeBytes)} MB</td>
                        </tr>
                        <tr>
                            <td>Sample Rate</td>
                            <td>{inspect.format.sampleRate} Hz</td>
                        </tr>
                        <tr>
                            <td>Channels</td>
                            <td>{inspect.format.channels}</td>
                        </tr>
                        <tr>
                            <td>Duration</td>
                            <td>{inspect.format.durationSeconds.toFixed(2)} s</td>
                        </tr>
                        <tr>
                            <td>Bit Depth</td>
                            <td>{inspect.format.bitDepth}</td>
                        </tr>
                        <tr>
                            <td>Valid for NAM</td>
                            <td>
                                SR: {inspect.validForNam.sampleRateOk ? '✅' : '⚠️'} | Ch:{' '}
                                {inspect.validForNam.channelsOk ? '✅' : '⚠️'} | Bit:{' '}
                                {inspect.validForNam.bitDepthOk ? '✅' : '⚠️'}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    const renderLatencyCard = () => {
        if (!latency) return null;
        return (
            <div className="border rounded p-3 mb-3">
                <h4>Latency Detection</h4>
                <table>
                    <tbody>
                        <tr>
                            <td>Latency (samples)</td>
                            <td>{latency.latencySamples}</td>
                        </tr>
                        <tr>
                            <td>Latency (ms)</td>
                            <td>{latency.latencyMs.toFixed(2)} ms</td>
                        </tr>
                        <tr>
                            <td>Confidence</td>
                            <td>{(latency.confidence * 100).toFixed(1)}%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    const renderRunStatus = () => {
        if (!runSummary) return null;
        return (
            <div className="border rounded p-3 mb-3" style={{ minWidth: 280 }}>
                <h4>Training Run</h4>
                <table>
                    <tbody>
                        <tr>
                            <td>Run ID</td>
                            <td>{runSummary.runId}</td>
                        </tr>
                        <tr>
                            <td>Status</td>
                            <td>{runSummary.status}</td>
                        </tr>
                        <tr>
                            <td>Created</td>
                            <td>{runSummary.createdAt}</td>
                        </tr>
                        <tr>
                            <td>Started</td>
                            <td>{runSummary.startedAt}</td>
                        </tr>
                        <tr>
                            <td>Completed</td>
                            <td>{runSummary.completedAt}</td>
                        </tr>
                        {runSummary.error && (
                            <tr>
                                <td>Error</td>
                                <td style={{ color: 'red' }}>{runSummary.error}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderTrainingLogs = () => {
        return (
            <div className="border rounded p-3 mb-3" style={{ flex: 1, minWidth: 320 }}>
                <h4>Training Logs</h4>
                <div
                    style={{
                        maxHeight: 260,
                        overflowY: 'auto',
                        background: '#f8f8f8',
                        padding: '0.5rem',
                        borderRadius: 4,
                        border: '1px solid #e0e0e0',
                    }}
                >
                    {logEntries.length === 0 ? (
                        <div style={{ color: '#666' }}>No logs yet.</div>
                    ) : (
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                            {logEntries.map((entry, idx) => (
                                <li key={`${entry.timestamp}-${idx}`} style={{ marginBottom: '0.35rem' }}>
                                    <span style={{ color: '#888', marginRight: '0.5rem' }}>
                                        [{entry.timestamp}]
                                    </span>
                                    <span
                                        style={{
                                            color:
                                                entry.level === 'error'
                                                    ? '#c62828'
                                                    : entry.level === 'warn'
                                                        ? '#ed6c02'
                                                        : '#1e88e5',
                                            marginRight: '0.4rem',
                                            textTransform: 'uppercase',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {entry.level}
                                    </span>
                                    <span style={{ color: '#222', wordBreak: 'break-word' }}>
                                        {entry.message}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        );
    };

    const renderMetrics = () => {
        if (!metrics) return null;
        return (
            <div className="border rounded p-3 mb-3">
                <h4>Training Metrics</h4>
                <table>
                    <tbody>
                        <tr>
                            <td>SNR (dB)</td>
                            <td>{metrics.snrDb.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>RMS Error</td>
                            <td>{metrics.rmsError.toExponential(3)}</td>
                        </tr>
                        <tr>
                            <td>Spectral Error (dB)</td>
                            <td>{metrics.spectralErrorDb.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>Time Alignment Error (samples)</td>
                            <td>{metrics.timeAlignmentErrorSamples}</td>
                        </tr>
                        <tr>
                            <td>Quality Score</td>
                            <td>{metrics.qualityScore.toFixed(1)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    // JSX -------------------------------------------------------------

    return (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '1rem' }}>
            <h2>Neural Amp Modeler Trainer</h2>

            {error && (
                <div style={{ color: 'red', marginBottom: '0.75rem' }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {/* 1. File upload */}
            <section style={{ marginBottom: '1rem' }}>
                <h3>1. Upload DI / Amp WAVs</h3>
                <table>
                    <tbody>
                        <tr>
                            <td>DI Input WAV</td>
                            <td>
                                <input type="file" accept=".wav" onChange={handleFileChange('input')} />
                            </td>
                        </tr>
                        <tr>
                            <td>Amp Output WAV</td>
                            <td>
                                <input type="file" accept=".wav" onChange={handleFileChange('output')} />
                            </td>
                        </tr>
                    </tbody>
                </table>
                <button onClick={handleUploadFiles} disabled={busy || !inputFile || !outputFile}>
                    Upload & Inspect
                </button>
            </section>

            {/* 2. Inspection summary */}
            <section style={{ marginBottom: '1rem' }}>
                <h3>2. File Inspection</h3>
                {renderFileCard('DI Input File', inputInfo, inputInspect)}
                {renderFileCard('Amp Output File', outputInfo, outputInspect)}
            </section>

            {/* 3. Latency detection */}
            <section style={{ marginBottom: '1rem' }}>
                <h3>3. Detect Latency</h3>
                <button
                    onClick={handleDetectLatency}
                    disabled={busy || !inputInfo || !outputInfo}
                    style={{ marginBottom: '0.5rem' }}
                >
                    Detect Latency
                </button>
                {renderLatencyCard()}
            </section>

            {/* 4. Training configuration */}
            <section style={{ marginBottom: '1rem' }}>
                <h3>4. Training Configuration</h3>
                <form onSubmit={handleStartTraining}>
                    <table>
                        <tbody>
                            <tr>
                                <td>Architecture</td>
                                <td>
                                    <select
                                        value={trainingConfig.architecture}
                                        onChange={handleTrainingConfigChange('architecture')}
                                    >
                                        <option value="nano">nano</option>
                                        <option value="lite">lite</option>
                                        <option value="standard">standard</option>
                                        <option value="large">large</option>
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td>Epochs</td>
                                <td>
                                    <input
                                        type="number"
                                        min={1}
                                        value={trainingConfig.epochs}
                                        onChange={handleTrainingConfigChange('epochs')}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>Batch Size</td>
                                <td>
                                    <input
                                        type="number"
                                        min={1}
                                        value={trainingConfig.batchSize}
                                        onChange={handleTrainingConfigChange('batchSize')}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>Learning Rate</td>
                                <td>
                                    <input
                                        type="number"
                                        step="0.00001"
                                        value={trainingConfig.learningRate}
                                        onChange={handleTrainingConfigChange('learningRate')}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>Device</td>
                                <td>
                                    <select value={trainingConfig.device} onChange={handleTrainingConfigChange('device')}>
                                        <option value="auto">auto</option>
                                        <option value="cpu">cpu</option>
                                        <option value="gpu">gpu</option>
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td>Ignore Checks</td>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={trainingConfig.ignoreChecks}
                                        onChange={handleTrainingConfigChange('ignoreChecks')}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <h4 style={{ marginTop: '0.75rem' }}>Metadata</h4>
                    <table>
                        <tbody>
                            <tr>
                                <td>Modeled By</td>
                                <td>
                                    <input
                                        type="text"
                                        value={metadata.modeledBy ?? ''}
                                        onChange={handleMetadataChange('modeledBy')}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>Gear Make</td>
                                <td>
                                    <input
                                        type="text"
                                        value={metadata.gearMake ?? ''}
                                        onChange={handleMetadataChange('gearMake')}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>Gear Model</td>
                                <td>
                                    <input
                                        type="text"
                                        value={metadata.gearModel ?? ''}
                                        onChange={handleMetadataChange('gearModel')}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>Gear Type</td>
                                <td>
                                    <input
                                        type="text"
                                        placeholder="amp, preamp, drive, etc."
                                        value={metadata.gearType ?? ''}
                                        onChange={handleMetadataChange('gearType')}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>Tone Type</td>
                                <td>
                                    <input
                                        type="text"
                                        placeholder="clean, crunch, lead..."
                                        value={metadata.toneType ?? ''}
                                        onChange={handleMetadataChange('toneType')}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>Reamp Send Level (dB)</td>
                                <td>
                                    <input
                                        type="number"
                                        value={metadata.reampSendLevelDb ?? ''}
                                        onChange={handleMetadataChange('reampSendLevelDb')}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>Reamp Return Level (dB)</td>
                                <td>
                                    <input
                                        type="number"
                                        value={metadata.reampReturnLevelDb ?? ''}
                                        onChange={handleMetadataChange('reampReturnLevelDb')}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>Tags (comma-separated)</td>
                                <td>
                                    <input
                                        type="text"
                                        value={(metadata.tags ?? []).join(', ')}
                                        onChange={handleMetadataChange('tags')}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <button
                        type="submit"
                        disabled={busy || !inputInfo || !outputInfo }
                        style={{ marginTop: '0.75rem' }}
                    >
                        Start Training
                    </button>
                </form>
            </section>

            {/* 5. Status + metrics */}
            <section style={{ marginBottom: '1rem' }}>
                <h3>5. Status & Metrics</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {renderRunStatus()}
                    {renderTrainingLogs()}
                </div>
                {renderMetrics()}
            </section>
        </div>
    );
};
