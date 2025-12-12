import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
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
import {
  consoleButtonSx,
  consoleCardSx,
  consoleColors,
  consoleHeadingSx,
  consoleTextFieldSx,
} from '../theme/consoleTheme';

type NamMetadataDialogProps = {
  open: boolean;
  run: TrainingRunSummary | null;
  apiBaseUrl: string;
  onClose: () => void;
  onSaved?: (metadata: TrainingMetadata, namFilename: string) => void;
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

      const trimmedFilename = namFilename.trim();

      const payload = {
        namFilename: trimmedFilename || undefined,
        metadata: {
          ...metadata,
          tags,
        },
      };

      const response = await client.updateNamMetadata(run.runId, payload);
      setMetadata({ ...emptyMetadata, ...(response?.metadata ?? {}) });
      setTagsInput((response?.metadata?.tags ?? []).join(', '));
      setNamFilename(response?.namFilename ?? '');
      if (onSaved && response?.metadata) {
        onSaved(response.metadata, response.namFilename);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save metadata');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          ...consoleCardSx,
          color: consoleColors.accent,
          borderRadius: 2,
          border: consoleColors.border,
          background: 'linear-gradient(155deg, rgba(4,16,4,0.95), rgba(6,28,6,0.9))',
        },
      }}
    >
      <DialogTitle sx={{ ...consoleHeadingSx, borderBottom: '1px solid rgba(54,255,143,0.3)' }}>
        Edit NAM metadata
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          background: 'radial-gradient(circle at 20% 20%, rgba(54,255,143,0.08), transparent 45%)',
        }}
      >
        {error && (
          <Box mb={2}>
            <Alert
              severity="error"
              sx={{
                backgroundColor: 'rgba(42,0,0,0.35)',
                border: '1px solid rgba(255,99,99,0.4)',
                color: '#ffb3b3',
                '& .MuiAlert-icon': { color: '#ff7b7b' },
              }}
            >
              {error}
            </Alert>
          </Box>
        )}

        <Stack spacing={2}>
          <Box sx={{ ...consoleCardSx, p: 2 }}>
            <Typography variant="body1" sx={{ color: consoleColors.accent, fontWeight: 700 }}>
              {run?.name || run?.runId || 'NAM metadata'}
            </Typography>
            <Typography variant="body2" sx={{ color: consoleColors.neon, mt: 0.5 }}>
              {loading
                ? 'Loading metadata...'
                : namFilename
                  ? `Editing metadata saved in ${namFilename}`
                  : 'Fill out the details to brand your NAM file'}
            </Typography>
            {run?.namFilename && (
              <Typography variant="body2" sx={{ mt: 0.5, color: consoleColors.accent }}>
                Current download name: <strong>{run.namFilename}</strong>
              </Typography>
            )}
            <Divider sx={{ my: 1.5, borderColor: 'rgba(54,255,143,0.25)' }} />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {tagsInput
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
                .slice(0, 6)
                .map((tag) => (
                  <Chip key={tag} label={tag} size="small" sx={{ border: consoleColors.border }} />
                ))}
              {tagsInput.trim() === '' && (
                <Typography variant="body2" sx={{ color: consoleColors.accent }}>
                  Tags will appear here as you add them.
                </Typography>
              )}
            </Stack>
          </Box>

          <Grid container spacing={2}>
            <Grid xs={12}>
              <TextField
                label="NAM filename"
                fullWidth
                size="small"
                value={namFilename}
                onChange={(e) => setNamFilename(e.target.value)}
                helperText="Set the filename used when downloading the NAM model"
                disabled={loading}
                sx={consoleTextFieldSx}
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                label="Modeled By"
                fullWidth
                size="small"
                value={metadata.modeledBy ?? ''}
                onChange={handleFieldChange('modeledBy')}
                disabled={loading}
                sx={consoleTextFieldSx}
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                label="Gear Make"
                fullWidth
                size="small"
                value={metadata.gearMake ?? ''}
                onChange={handleFieldChange('gearMake')}
                disabled={loading}
                sx={consoleTextFieldSx}
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                label="Gear Model"
                fullWidth
                size="small"
                value={metadata.gearModel ?? ''}
                onChange={handleFieldChange('gearModel')}
                disabled={loading}
                sx={consoleTextFieldSx}
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                label="Gear Type"
                fullWidth
                size="small"
                value={metadata.gearType ?? ''}
                onChange={handleFieldChange('gearType')}
                disabled={loading}
                sx={consoleTextFieldSx}
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                label="Tone Type"
                fullWidth
                size="small"
                value={metadata.toneType ?? ''}
                onChange={handleFieldChange('toneType')}
                disabled={loading}
                sx={consoleTextFieldSx}
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                label="Reamp Send Level (dB)"
                fullWidth
                size="small"
                type="number"
                value={metadata.reampSendLevelDb ?? ''}
                onChange={handleNumberChange('reampSendLevelDb')}
                disabled={loading}
                helperText="Optional; leave blank if unknown"
                sx={consoleTextFieldSx}
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                label="Reamp Return Level (dB)"
                fullWidth
                size="small"
                type="number"
                value={metadata.reampReturnLevelDb ?? ''}
                onChange={handleNumberChange('reampReturnLevelDb')}
                disabled={loading}
                helperText="Optional; leave blank if unknown"
                sx={consoleTextFieldSx}
              />
            </Grid>
            <Grid xs={12}>
              <TextField
                label="Tags"
                helperText="Comma-separated list"
                fullWidth
                size="small"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                disabled={loading}
                sx={consoleTextFieldSx}
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid rgba(54,255,143,0.3)', px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          disabled={saving}
          sx={{
            ...consoleButtonSx,
            backgroundColor: 'rgba(18, 32, 18, 0.9)',
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loading || !run}
          sx={{
            ...consoleButtonSx,
            backgroundColor: 'rgba(6, 52, 6, 0.95)',
            ml: 1,
          }}
        >
          {saving ? 'Saving…' : 'Save to NAM'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NamMetadataDialog;
