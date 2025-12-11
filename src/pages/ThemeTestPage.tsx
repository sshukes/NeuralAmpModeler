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

const neonGreen = '#84ffba';
const neonBorder = '1px solid rgba(54, 255, 143, 0.7)';

const cardStyle = {
  border: neonBorder,
  background: 'linear-gradient(145deg, rgba(5,20,5,0.9), rgba(8,28,8,0.8))',
  boxShadow:
    '0 0 24px rgba(54,255,143,0.18), inset 0 0 12px rgba(54,255,143,0.12)',
  backdropFilter: 'blur(4px)',
};

const consoleText = [
  '[1983:SYS] Boot sequence initiated…',
  '[1983:SYS] Loading neural amplifier matrix…',
  '[1983:PROC] Voltage rails stable at +12V / -12V.',
  '[1983:PROC] Cabsim IR cache primed.',
  '[1983:TRAIN] Tracking pick dynamics…OK',
  '[1983:TRAIN] Harmonic saturation…ENGAGED',
  '[1983:DONE] Ready for shred mode. >_'
];

const accentText = '#d3ffe7';

const neonButtonStyles = {
  border: neonBorder,
  color: neonGreen,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: 2,
  backgroundColor: 'rgba(3, 30, 3, 0.9)',
  boxShadow:
    '0 0 18px rgba(54,255,143,0.26), inset 0 0 8px rgba(54,255,143,0.2)',
  '&:hover': {
    backgroundColor: 'rgba(5, 46, 5, 0.95)',
    boxShadow:
      '0 0 28px rgba(54,255,143,0.36), inset 0 0 14px rgba(54,255,143,0.26)',
  },
};

const statChips = [
  { label: '128kB RAM', icon: <MemoryIcon /> },
  { label: '8-bit Wave Driver', icon: <GraphicEqIcon /> },
  { label: 'Turbo Clock x2', icon: <FlashOnIcon /> },
];

const ThemeTestPage: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#020902',
        color: neonGreen,
        fontFamily: '"IBM Plex Mono", "Fira Code", monospace',
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(54,255,143,0.18) 1px, transparent 0), radial-gradient(circle at 25px 25px, rgba(54,255,143,0.12) 1px, transparent 0)',
        backgroundSize: '50px 50px',
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 3, md: 5 },
        textShadow: '0 0 10px rgba(132,255,186,0.45)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 20% 20%, rgba(54,255,143,0.06), transparent 30%), radial-gradient(circle at 80% 10%, rgba(54,255,143,0.05), transparent 25%)',
          pointerEvents: 'none',
        }}
      />

      <Stack spacing={4} sx={{ position: 'relative', zIndex: 1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TerminalIcon sx={{ fontSize: 42, color: accentText }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase' }}>
              Console Theme Preview
            </Typography>
            <Typography variant="subtitle1" sx={{ color: accentText, textShadow: '0 0 12px rgba(211,255,231,0.65)' }}>
              Neon green phosphor, CRT glow, and command-line attitude—circa 1980s.
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={cardStyle}>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ letterSpacing: 2, color: accentText, textShadow: '0 0 10px rgba(211,255,231,0.6)' }}
                >
                  System Log
                </Typography>
                <Divider sx={{ borderColor: 'rgba(54,255,143,0.35)', mb: 2 }} />
                <Box
                  sx={{
                    height: 220,
                    border: neonBorder,
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
                          backgroundColor: accentText,
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
            <Card sx={cardStyle}>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ letterSpacing: 2, color: accentText, textShadow: '0 0 10px rgba(211,255,231,0.6)' }}
                >
                  Control Pad
                </Typography>
                <Divider sx={{ borderColor: 'rgba(54,255,143,0.35)', mb: 2 }} />
                <Stack spacing={1.5}>
                  <Button variant="contained" sx={neonButtonStyles} fullWidth>
                    Arm Amplifier
                  </Button>
                  <Button variant="contained" sx={neonButtonStyles} fullWidth>
                    Engage Capture
                  </Button>
                  <Button variant="contained" sx={neonButtonStyles} fullWidth>
                    Export NAM File
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={cardStyle}>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ letterSpacing: 2, color: accentText, textShadow: '0 0 10px rgba(211,255,231,0.6)' }}
                >
                  Metrics
                </Typography>
                <Divider sx={{ borderColor: 'rgba(54,255,143,0.35)', mb: 2 }} />
                <Grid container spacing={2}>
                  {[['Gain', '8.5'], ['Sustain', '9.1'], ['Clarity', '7.8'], ['Noise Floor', '-92dB']].map(
                    ([label, value]) => (
                      <Grid key={label} item xs={6}>
                        <Box sx={{ border: neonBorder, p: 1.5, textAlign: 'center', color: '#e0fff1' }}>
                          <Typography variant="caption" sx={{ color: accentText, letterSpacing: 1 }}>
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
            <Card sx={cardStyle}>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ letterSpacing: 2, color: accentText, textShadow: '0 0 10px rgba(211,255,231,0.6)' }}
                >
                  Hardware Flags
                </Typography>
                <Divider sx={{ borderColor: 'rgba(54,255,143,0.35)', mb: 2 }} />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {statChips.map((chip) => (
                    <Chip
                      key={chip.label}
                      icon={chip.icon}
                      label={chip.label}
                      sx={{
                        border: neonBorder,
                        color: neonGreen,
                        backgroundColor: 'rgba(3, 22, 3, 0.9)',
                        boxShadow: '0 0 10px rgba(54,255,143,0.18)',
                        '& .MuiChip-icon': { color: accentText },
                      }}
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
