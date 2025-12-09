import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Chip,
  CircularProgress,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { NamApiClient } from '../api/namApi';
import type { TrainingRunSummary, TrainingRunStatus } from '../api/namTypes';

const API_BASE = 'http://localhost:8000/api';

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

const formatDuration = (start?: string, end?: string) => {
  if (!start) return '-';

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return '-';

  const endDate = end ? new Date(end) : new Date();
  if (Number.isNaN(endDate.getTime())) return '-';

  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) return '-';

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [
    hours ? `${hours}h` : null,
    hours || minutes ? `${minutes}m` : null,
    `${seconds}s`,
  ].filter(Boolean);

  return parts.join(' ');
};

const RunListPage: React.FC = () => {
  const navigate = useNavigate();
  const client = useMemo(() => new NamApiClient(API_BASE), []);

  const [runs, setRuns] = useState<TrainingRunSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRuns = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await client.listTrainingRuns({ limit: 200 });
        const items = Array.isArray((data as any)?.items)
          ? (data as any).items
          : Array.isArray(data)
            ? data
            : [];

        setRuns(items);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load runs');
      } finally {
        setLoading(false);
      }
    };

    fetchRuns();
  }, [client]);

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Training Runs</Typography>
        <Link component={RouterLink} to="/">
          Back to trainer
        </Link>
      </Stack>

      {loading && (
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <CircularProgress size={20} />
          <Typography>Loading runs…</Typography>
        </Stack>
      )}

      {error && (
        <Typography color="error" mb={2}>
          {error}
        </Typography>
      )}

      {!loading && !error && runs.length === 0 && (
        <Typography>No training runs found.</Typography>
      )}

      {runs.length > 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>NAM File</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Architecture</TableCell>
                <TableCell>Device</TableCell>
                <TableCell align="right">Quality</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {runs.map((run) => (
                <TableRow
                  key={run.runId}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/runs/${run.runId}`)}
                >
                  <TableCell>{run.name || run.runId}</TableCell>
                  <TableCell>
                    <Chip
                      label={run.status}
                      size="small"
                      color={statusColor(run.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {run.namUrl ? (
                      <Link
                        href={run.namUrl}
                        onClick={(e) => e.stopPropagation()}
                        target="_blank"
                        rel="noreferrer"
                        download={run.namFilename || undefined}
                      >
                        {run.namFilename || 'Download'}
                      </Link>
                    ) : (
                      run.namStatus || '–'
                    )}
                  </TableCell>
                  <TableCell>{formatDateTime(run.createdAt)}</TableCell>
                  <TableCell>{formatDateTime(run.completedAt)}</TableCell>
                  <TableCell>
                    {formatDuration(run.createdAt, run.completedAt)}
                  </TableCell>
                  <TableCell>{run.architecture}</TableCell>
                  <TableCell>{run.device}</TableCell>
                  <TableCell align="right">
                    {run.qualityScore !== undefined && run.qualityScore !== null
                      ? run.qualityScore.toFixed(1)
                      : '–'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default RunListPage;
