import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { TrainingMetadata, TrainingRunSummary } from '../api/namTypes';
import { NamApiClient } from '../api/namApi';

type NamMetadataDialogProps = {
  open: boolean;
  run: TrainingRunSummary | null;
  apiBaseUrl: string;
  onClose: () => void;
  onSaved?: (metadata: TrainingMetadata) => void;
};

const emptyMetadata: TrainingMetadata = {
  modeledBy: '',
  gearMake: '',
  gearModel: '',
  gearType: '',
  toneType: '',
  reampSendLevelDb: undefined,
  reampReturnLevelDb: undefined,
  tags: [],
};

const NamMetadataDialog: React.FC<NamMetadataDialogProps> = ({
  open,
  run,
  apiBaseUrl,
  onClose,
  onSaved,
}) => {
  const client = useMemo(() => new NamApiClient(apiBaseUrl), [apiBaseUrl]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<TrainingMetadata>(emptyMetadata);
  const [tagsInput, setTagsInput] = useState('');
  const [namFilename, setNamFilename] = useState<string>('');

  useEffect(() => {
    if (!open || !run) {
      setMetadata({ ...emptyMetadata });
      setTagsInput('');
      setNamFilename('');
      setError(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await client.getNamMetadata(run.runId);
        setMetadata({ ...emptyMetadata, ...(response?.metadata ?? {}) });
        const tags = response?.metadata?.tags ?? [];
        setTagsInput(tags.join(', '));
        setNamFilename(response.namFilename);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load NAM metadata');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [client, open, run]);

  const handleFieldChange = (field: keyof TrainingMetadata) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setMetadata((prev) => ({ ...prev, [field]: value }));
    };

  const handleNumberChange = (field: keyof TrainingMetadata) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setMetadata((prev) => ({
        ...prev,
        [field]: value === '' ? undefined : Number(value),
      }));
    };

  const handleSave = async () => {
    if (!run) return;
    setSaving(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const payload: TrainingMetadata = {
        ...metadata,
        tags,
      };

      const response = await client.updateNamMetadata(run.runId, payload);
      setMetadata({ ...emptyMetadata, ...(response?.metadata ?? {}) });
      setTagsInput((response?.metadata?.tags ?? []).join(', '));
      if (onSaved && response?.metadata) {
        onSaved(response.metadata);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save metadata');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit NAM metadata</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Box mb={2}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {loading
              ? 'Loading metadata...'
              : namFilename
                ? `Editing metadata in ${namFilename}`
                : 'NAM metadata'}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Modeled By"
                fullWidth
                size="small"
                value={metadata.modeledBy ?? ''}
                onChange={handleFieldChange('modeledBy')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Gear Make"
                fullWidth
                size="small"
                value={metadata.gearMake ?? ''}
                onChange={handleFieldChange('gearMake')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Gear Model"
                fullWidth
                size="small"
                value={metadata.gearModel ?? ''}
                onChange={handleFieldChange('gearModel')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Gear Type"
                fullWidth
                size="small"
                value={metadata.gearType ?? ''}
                onChange={handleFieldChange('gearType')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Tone Type"
                fullWidth
                size="small"
                value={metadata.toneType ?? ''}
                onChange={handleFieldChange('toneType')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Reamp Send Level (dB)"
                fullWidth
                size="small"
                type="number"
                value={metadata.reampSendLevelDb ?? ''}
                onChange={handleNumberChange('reampSendLevelDb')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Reamp Return Level (dB)"
                fullWidth
                size="small"
                type="number"
                value={metadata.reampReturnLevelDb ?? ''}
                onChange={handleNumberChange('reampReturnLevelDb')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Tags"
                helperText="Comma-separated list"
                fullWidth
                size="small"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                disabled={loading}
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || loading || !run}>
          {saving ? 'Saving…' : 'Save to NAM'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NamMetadataDialog;
