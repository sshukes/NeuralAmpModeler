import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Stack,
  Typography,
  Chip,
} from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import MemoryIcon from '@mui/icons-material/Memory';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import {
  consoleButtonSx,
  consoleCardSx,
  consoleColors,
  consoleDividerSx,
  consoleHeadingSx,
  consoleOverlaySx,
  consolePageSx,
  consoleChipSx,
} from '../theme/consoleTheme';

const consoleText = [
  '[1983:SYS] Boot sequence initiated…',
  '[1983:SYS] Loading neural amplifier matrix…',
  '[1983:PROC] Voltage rails stable at +12V / -12V.',
  '[1983:PROC] Cabsim IR cache primed.',
  '[1983:TRAIN] Tracking pick dynamics…OK',
  '[1983:TRAIN] Harmonic saturation…ENGAGED',
  '[1983:DONE] Ready for shred mode. >_'
];

const statChips = [
  { label: '128kB RAM', icon: <MemoryIcon /> },
  { label: '8-bit Wave Driver', icon: <GraphicEqIcon /> },
  { label: 'Turbo Clock x2', icon: <FlashOnIcon /> },
];

const ThemeTestPage: React.FC = () => {
  return (
    <Box sx={consolePageSx}>
      <Box sx={consoleOverlaySx} />

      <Stack spacing={4} sx={{ position: 'relative', zIndex: 1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TerminalIcon sx={{ fontSize: 42, color: consoleColors.accent }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase' }}>
              Console Theme Preview
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ color: consoleColors.accent, textShadow: '0 0 12px rgba(211,255,231,0.65)' }}
            >
              Neon green phosphor, CRT glow, and command-line attitude—circa 1980s.
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={consoleCardSx}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={consoleHeadingSx}>
                  System Log
                </Typography>
                <Divider sx={{ ...consoleDividerSx, mb: 2 }} />
                <Box
                  sx={{
                    height: 220,
                    border: consoleColors.border,
                    p: 2,
                    background:
                      'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.55))',
                    boxShadow: 'inset 0 0 12px rgba(54,255,143,0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    overflow: 'hidden',
                    color: '#e0fff1',
                  }}
                >
                  {consoleText.map((line) => (
                    <Typography
                      key={line}
                      component="p"
                      sx={{
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: consoleColors.accent,
                          boxShadow: '0 0 10px rgba(138,255,193,0.8)',
                        }}
                      />
                      {line}
                    </Typography>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={consoleCardSx}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={consoleHeadingSx}>
                  Control Pad
                </Typography>
                <Divider sx={{ ...consoleDividerSx, mb: 2 }} />
                <Stack spacing={1.5}>
                  <Button variant="contained" sx={consoleButtonSx} fullWidth>
                    Arm Amplifier
                  </Button>
                  <Button variant="contained" sx={consoleButtonSx} fullWidth>
                    Engage Capture
                  </Button>
                  <Button variant="contained" sx={consoleButtonSx} fullWidth>
                    Export NAM File
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={consoleCardSx}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={consoleHeadingSx}>
                  Metrics
                </Typography>
                <Divider sx={{ ...consoleDividerSx, mb: 2 }} />
                <Grid container spacing={2}>
                  {[['Gain', '8.5'], ['Sustain', '9.1'], ['Clarity', '7.8'], ['Noise Floor', '-92dB']].map(
                    ([label, value]) => (
                      <Grid key={label} item xs={6}>
                        <Box sx={{ border: consoleColors.border, p: 1.5, textAlign: 'center', color: '#e0fff1' }}>
                          <Typography variant="caption" sx={{ color: consoleColors.accent, letterSpacing: 1 }}>
                            {label}
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800, textShadow: '0 0 10px rgba(132,255,186,0.45)' }}>
                            {value}
                          </Typography>
                        </Box>
                      </Grid>
                    )
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={consoleCardSx}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={consoleHeadingSx}>
                  Hardware Flags
                </Typography>
                <Divider sx={{ ...consoleDividerSx, mb: 2 }} />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {statChips.map((chip) => (
                    <Chip
                      key={chip.label}
                      icon={chip.icon}
                      label={chip.label}
                      sx={consoleChipSx}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};

export default ThemeTestPage;
