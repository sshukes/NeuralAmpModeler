// src/pages/RunDetailsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Stack,
  Divider,
  TextField,
  IconButton,
} from '@mui/material';
import StopIcon from '@mui/icons-material/Stop';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { API_BASE_URL } from '../api/baseUrl';
import { NamApiClient } from '../api/namApi';
import {
  TrainingRunDetailResponse,
  RunMetricsPoint,
  LogEntry,
  TrainingRunStatus,
  TrainingMetadata,
} from '../api/namTypes';
import {
  consoleButtonSx,
  consoleCardSx,
  consoleColors,
  consoleDividerSx,
  consoleHeadingSx,
  consoleLogBoxSx,
  consoleOverlaySx,
  consolePageSx,
  consoleTextFieldSx,
} from '../theme/consoleTheme';

// point this at your FastAPI server
const API_BASE = API_BASE_URL;

type LogLevel = LogEntry['level'];

const statusColor = (
  status: TrainingRunStatus
): 'success' | 'info' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'RUNNING':
      return 'info';
    case 'QUEUED':
      return 'warning';
    case 'FAILED':
      return 'error';
    case 'CANCELLED':
    default:
      return 'default';
  }
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

const RunDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const client = useMemo(() => new NamApiClient(API_BASE), []);

  const [run, setRun] = useState<TrainingRunDetailResponse | null>(null);
  const [metrics, setMetrics] = useState<RunMetricsPoint[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [logFilter, setLogFilter] = useState<LogLevel | 'ALL'>('ALL');
  const [logSearch, setLogSearch] = useState<string>('');

  // Initial fetch (no WebSocket yet)
  useEffect(() => {
    if (!id) return;

    const fetchRun = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await client.getTrainingRunDetail(id);

        const {
          metrics: initialMetrics = [],
          logs: initialLogs = [],
          ...runData
        } = data;

        setRun(runData);
        setMetrics(initialMetrics);
        setLogs(initialLogs);
      } catch (e: any) {
        setError(e.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchRun();
  }, [client, id]);

  const handleStop = async () => {
    if (!id) return;
    try {
      // adjust if your stop endpoint is different, or comment this out
      await fetch(`${API_BASE}/training-runs/${id}/stop`, {
        method: 'POST',
      });
    } catch (e) {
      console.error('Failed to stop run', e);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (logFilter !== 'ALL' && log.level !== logFilter) return false;
      if (logSearch) {
        const s = logSearch.toLowerCase();
        if (
          !log.message.toLowerCase().includes(s) &&
          !log.level.toLowerCase().includes(s)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [logs, logFilter, logSearch]);

  const copyLogsToClipboard = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text).catch((e) => {
      console.error('Failed to copy logs', e);
    });
  };

  if (loading) {
    return (
      <Box sx={consolePageSx}>
        <Box sx={consoleOverlaySx} />
        <Stack spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h6" sx={consoleHeadingSx}>
            Loading run details...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !run) {
    return (
      <Box sx={consolePageSx}>
        <Box sx={consoleOverlaySx} />
        <Stack spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
          <Typography color="error" sx={{ textShadow: '0 0 10px rgba(255,0,0,0.3)' }}>
            {error || 'Run not found'}
          </Typography>
        </Stack>
      </Box>
    );
  }

  const latestEpoch = metrics.length
    ? metrics[metrics.length - 1].epoch
    : run.progress?.currentEpoch ?? 0;

  const totalEpochs = run.progress?.maxEpochs ?? run.training?.epochs;
  const bestValLoss =
    run.progress?.bestValLoss ?? metrics[metrics.length - 1]?.val_loss;
  const errorRatio = metrics[metrics.length - 1]?.error_ratio;

  const detailRows = [
    { label: 'Run ID', value: run.runId },
    { label: 'Created', value: formatDateTime(run.createdAt) },
    { label: 'NAM file', value: run.namFilename ?? '–' },
    {
      label: 'Epochs',
      value:
        totalEpochs !== undefined
          ? `${latestEpoch}/${totalEpochs}`
          : latestEpoch ?? '-',
    },
    { label: 'Architecture', value: run.training?.architecture ?? '–' },
    { label: 'Device', value: run.training?.device ?? run.device ?? '–' },
    { label: 'Batch size', value: run.training?.batchSize ?? '–' },
    { label: 'Learning rate', value: run.training?.learningRate ?? '–' },
  ];

  const metadata: TrainingMetadata = run.metadata ?? {};
  const metadataRows = [
    { label: 'Modeled by', value: metadata.modeledBy ?? '–' },
    { label: 'Gear make', value: metadata.gearMake ?? '–' },
    { label: 'Gear model', value: metadata.gearModel ?? '–' },
    { label: 'Gear type', value: metadata.gearType ?? '–' },
    { label: 'Tone type', value: metadata.toneType ?? '–' },
    {
      label: 'Reamp send (dB)',
      value:
        metadata.reampSendLevelDb !== undefined
          ? metadata.reampSendLevelDb
          : '–',
    },
    {
      label: 'Reamp return (dB)',
      value:
        metadata.reampReturnLevelDb !== undefined
          ? metadata.reampReturnLevelDb
          : '–',
    },
    {
      label: 'Tags',
      value:
        metadata.tags && metadata.tags.length
          ? metadata.tags.join(', ')
          : '–',
    },
  ];

  return (
    <Box sx={consolePageSx}>
      <Box sx={consoleOverlaySx} />
      <Stack spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography variant="h5" gutterBottom sx={{ ...consoleHeadingSx, letterSpacing: 2 }}>
              {run.name || `Run ${run.runId}`}
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }}>
              <Chip
                label={run.status}
                color={statusColor(run.status)}
                size="small"
              />
              <Typography variant="body2" sx={{ color: consoleColors.accent }}>
                Started: {formatDateTime(run.startedAt || run.createdAt)}
              </Typography>
              {run.completedAt && (
                <Typography variant="body2" sx={{ color: consoleColors.accent }}>
                  • Completed: {formatDateTime(run.completedAt)}
                </Typography>
              )}
              {(run.training?.device || run.device) && (
                <Typography variant="body2" sx={{ color: consoleColors.accent }}>
                  • Device: {run.training?.device || run.device}
                </Typography>
              )}
            </Stack>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button variant="contained" sx={consoleButtonSx} onClick={() => navigate('/runs')}>
              Back to runs
            </Button>
            {run.status === 'RUNNING' && (
              <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleStop}
                sx={{ ...consoleButtonSx, backgroundColor: 'rgba(28, 6, 6, 0.85)' }}
              >
                Stop
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Top row: stats + loss chart */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' },
            gap: 2,
          }}
        >
          {/* Stats + metadata card */}
          <Card sx={consoleCardSx}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={consoleHeadingSx}>
                Run Details
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ color: consoleColors.accent }}>
                  Current epoch:{' '}
                  <strong>
                    {totalEpochs !== undefined
                      ? `${latestEpoch}/${totalEpochs}`
                      : latestEpoch ?? '-'}
                  </strong>
                </Typography>
                <Typography variant="body2" sx={{ color: consoleColors.accent }}>
                  Best val loss:{' '}
                  <strong>
                    {bestValLoss !== undefined ? bestValLoss.toFixed(5) : '-'}
                  </strong>
                </Typography>
                <Typography variant="body2" sx={{ color: consoleColors.accent }}>
                  Error ratio:{' '}
                  <strong>{errorRatio !== undefined ? errorRatio.toFixed(4) : '-'}</strong>
                </Typography>
              </Stack>

              <Divider sx={{ ...consoleDividerSx, my: 1.5 }} />

              <Typography variant="subtitle2" sx={consoleHeadingSx} gutterBottom>
                Training
              </Typography>
              <Stack spacing={0.5}>
                {detailRows.map((row) => (
                  <Typography
                    key={row.label}
                    variant="body2"
                    sx={{ color: consoleColors.accent }}
                  >
                    <strong>{row.label}:</strong> {row.value ?? '–'}
                  </Typography>
                ))}
              </Stack>

              <Divider sx={{ ...consoleDividerSx, my: 1.5 }} />

              <Typography variant="subtitle2" sx={consoleHeadingSx} gutterBottom>
                NAM metadata
              </Typography>
              <Stack spacing={0.5}>
                {metadataRows.map((row) => (
                  <Typography
                    key={row.label}
                    variant="body2"
                    sx={{ color: consoleColors.accent }}
                  >
                    <strong>{row.label}:</strong> {row.value}
                  </Typography>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {/* Loss chart */}
          <Card sx={consoleCardSx}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={consoleHeadingSx}>
                Loss over epochs
              </Typography>
              <Divider sx={{ ...consoleDividerSx, mb: 2 }} />
              <Box height={260}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(132,255,186,0.25)" />
                    <XAxis dataKey="epoch" stroke={consoleColors.accent} />
                    <YAxis stroke={consoleColors.accent} />
                    <Tooltip contentStyle={{ backgroundColor: '#04210c', border: consoleColors.border, color: consoleColors.accent }} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="train_loss"
                      name="Train loss"
                      dot={false}
                      stroke={consoleColors.neon}
                    />
                    <Line
                      type="monotone"
                      dataKey="val_loss"
                      name="Val loss"
                      dot={false}
                      stroke="#9cf7ff"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Bottom row: error ratio + logs */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
          }}
        >
          {/* Error ratio chart */}
          <Card sx={consoleCardSx}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={consoleHeadingSx}>
                Error-signal ratio
              </Typography>
              <Divider sx={{ ...consoleDividerSx, mb: 2 }} />
              <Box height={240}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(132,255,186,0.25)" />
                    <XAxis dataKey="epoch" stroke={consoleColors.accent} />
                    <YAxis stroke={consoleColors.accent} />
                    <Tooltip contentStyle={{ backgroundColor: '#04210c', border: consoleColors.border, color: consoleColors.accent }} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="error_ratio"
                      name="Error ratio"
                      dot={false}
                      stroke="#ffb347"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>

          {/* Logs */}
          <Card sx={{ ...consoleCardSx, height: '100%' }}>
            <CardContent
              sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
              >
                <Typography variant="subtitle1" sx={consoleHeadingSx}>
                  Logs
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                  <TextField
                    size="small"
                    label="Search"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    sx={consoleTextFieldSx}
                  />
                  <TextField
                    size="small"
                    label="Level"
                    select
                    SelectProps={{ native: true }}
                    value={logFilter}
                    onChange={(e) =>
                      setLogFilter(e.target.value as LogLevel | 'ALL')
                    }
                    sx={{ ...consoleTextFieldSx, minWidth: 120 }}
                  >
                    <option value="ALL">ALL</option>
                    <option value="DEBUG">DEBUG</option>
                    <option value="INFO">INFO</option>
                    <option value="WARN">WARN</option>
                    <option value="ERROR">ERROR</option>
                  </TextField>
                  <IconButton size="small" onClick={copyLogsToClipboard} sx={{ color: consoleColors.accent }}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>

              <Divider sx={{ ...consoleDividerSx, mb: 1 }} />

              <Box sx={consoleLogBoxSx}>
                {filteredLogs.length === 0 ? (
                  <Typography variant="body2" sx={{ color: consoleColors.accent }}>
                    No logs yet.
                  </Typography>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <Box key={`${log.timestamp}-${idx}`}>
                      <Typography
                        component="span"
                        sx={{ color: 'rgba(211,255,231,0.7)', mr: 1 }}
                      >
                        [{log.timestamp}]
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          mr: 1,
                          color:
                            log.level === 'ERROR'
                              ? '#ff8080'
                              : log.level === 'WARN'
                              ? '#f9d65c'
                              : consoleColors.accent,
                        }}
                      >
                        [{log.level}]
                      </Typography>
                      <Typography component="span" sx={{ color: '#e0fff1' }}>
                        {log.message}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
};

export default RunDetailsPage;
