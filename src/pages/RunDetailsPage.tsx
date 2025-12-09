// src/pages/RunDetailsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
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

type RunStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface RunDetails {
  id: string;
  name: string;
  status: RunStatus;
  startedAt: string;
  endedAt?: string;
  totalEpochs?: number;
  currentEpoch?: number;
  errorRatio?: number;
  bestValLoss?: number;
  device?: string;
}

interface RunMetricsPoint {
  epoch: number;
  train_loss?: number;
  val_loss?: number;
  error_ratio?: number;
  timestamp?: string;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

interface ApiRunResponse extends RunDetails {
  metrics?: RunMetricsPoint[];
  logs?: LogEntry[];
}

// point this at your FastAPI server
const API_BASE = 'http://localhost:8000';

const statusColor = (
  status: RunStatus
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

  const [run, setRun] = useState<RunDetails | null>(null);
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

        // IMPORTANT: path matches your backend: /api/training-runs/:id
        const res = await fetch(`${API_BASE}/api/training-runs/${id}`);
        if (!res.ok) {
          throw new Error(`Failed to load run: ${res.status}`);
        }

        const data: ApiRunResponse = await res.json();

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
  }, [id]);

  const handleStop = async () => {
    if (!id) return;
    try {
      // adjust if your stop endpoint is different, or comment this out
      await fetch(`${API_BASE}/api/training-runs/${id}/stop`, {
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
      <Box p={3}>
        <Typography>Loading run details...</Typography>
      </Box>
    );
  }

  if (error || !run) {
    return (
      <Box p={3}>
        <Typography color="error">
          {error || 'Run not found'}
        </Typography>
      </Box>
    );
  }

  const latestEpoch = metrics.length
    ? metrics[metrics.length - 1].epoch
    : run.currentEpoch ?? 0;

  return (
    <Box p={3}>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h5" gutterBottom>
            {run.name || `Run ${run.id}`}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={run.status}
              color={statusColor(run.status)}
              size="small"
            />
            <Typography variant="body2">
              Started: {formatDateTime(run.startedAt)}
            </Typography>
            {run.endedAt && (
              <Typography variant="body2">
                • Ended: {formatDateTime(run.endedAt)}
              </Typography>
            )}
            {run.device && (
              <Typography variant="body2">
                • Device: {run.device}
              </Typography>
            )}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1}>
          {run.status === 'RUNNING' && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<StopIcon />}
              onClick={handleStop}
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
          mb: 2,
        }}
      >
        {/* Stats card */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Run Stats
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                Current epoch:{' '}
                <strong>
                  {latestEpoch}/{run.totalEpochs ?? '-'}
                </strong>
              </Typography>
              <Typography variant="body2">
                Best val loss:{' '}
                <strong>
                  {run.bestValLoss !== undefined
                    ? run.bestValLoss.toFixed(5)
                    : '-'}
                </strong>
              </Typography>
              <Typography variant="body2">
                Error ratio:{' '}
                <strong>
                  {run.errorRatio !== undefined
                    ? run.errorRatio.toFixed(4)
                    : '-'}
                </strong>
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Loss chart */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Loss over epochs
            </Typography>
            <Box height={260}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="epoch" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="train_loss"
                    name="Train loss"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="val_loss"
                    name="Val loss"
                    dot={false}
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
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Error-signal ratio
            </Typography>
            <Box height={240}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="epoch" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="error_ratio"
                    name="Error ratio"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card sx={{ height: '100%' }}>
          <CardContent
            sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={1}
            >
              <Typography variant="subtitle1">Logs</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  label="Search"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
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
                  sx={{ minWidth: 90 }}
                >
                  <option value="ALL">ALL</option>
                  <option value="DEBUG">DEBUG</option>
                  <option value="INFO">INFO</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                </TextField>
                <IconButton size="small" onClick={copyLogsToClipboard}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>

            <Divider sx={{ mb: 1 }} />

            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                bgcolor: 'background.paper',
                fontFamily: 'monospace',
                fontSize: 12,
                p: 1,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {filteredLogs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No logs yet.
                </Typography>
              ) : (
                filteredLogs.map((log, idx) => (
                  <Box key={`${log.timestamp}-${idx}`}>
                    <Typography
                      component="span"
                      sx={{ color: 'text.secondary', mr: 1 }}
                    >
                      [{log.timestamp}]
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        mr: 1,
                        color:
                          log.level === 'ERROR'
                            ? 'error.main'
                            : log.level === 'WARN'
                            ? 'warning.main'
                            : 'text.secondary',
                      }}
                    >
                      [{log.level}]
                    </Typography>
                    <Typography component="span">{log.message}</Typography>
                  </Box>
                ))
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default RunDetailsPage;
