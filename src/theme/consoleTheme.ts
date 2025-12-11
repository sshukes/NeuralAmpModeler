import { SxProps, Theme } from '@mui/material/styles';

export const consoleColors = {
  background: '#020902',
  neon: '#84ffba',
  accent: '#d3ffe7',
  border: '1px solid rgba(54, 255, 143, 0.7)',
};

export const consolePageSx: SxProps<Theme> = {
  minHeight: '100vh',
  backgroundColor: consoleColors.background,
  color: consoleColors.neon,
  fontFamily: '"IBM Plex Mono", "Fira Code", monospace',
  backgroundImage:
    'radial-gradient(circle at 1px 1px, rgba(54,255,143,0.18) 1px, transparent 0), radial-gradient(circle at 25px 25px, rgba(54,255,143,0.12) 1px, transparent 0)',
  backgroundSize: '50px 50px',
  position: 'relative',
  overflow: 'hidden',
  p: { xs: 3, md: 5 },
  textShadow: '0 0 10px rgba(132,255,186,0.45)',
};

export const consoleOverlaySx: SxProps<Theme> = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(circle at 20% 20%, rgba(54,255,143,0.06), transparent 30%), radial-gradient(circle at 80% 10%, rgba(54,255,143,0.05), transparent 25%)',
  pointerEvents: 'none',
};

export const consoleCardSx: SxProps<Theme> = {
  border: consoleColors.border,
  background: 'linear-gradient(145deg, rgba(5,20,5,0.9), rgba(8,28,8,0.8))',
  boxShadow: '0 0 24px rgba(54,255,143,0.18), inset 0 0 12px rgba(54,255,143,0.12)',
  backdropFilter: 'blur(4px)',
};

export const consoleHeadingSx: SxProps<Theme> = {
  letterSpacing: 2,
  color: consoleColors.accent,
  textShadow: '0 0 10px rgba(211,255,231,0.6)',
};

export const consoleDividerSx: SxProps<Theme> = {
  borderColor: 'rgba(54,255,143,0.35)',
};

export const consoleButtonSx: SxProps<Theme> = {
  border: consoleColors.border,
  color: consoleColors.neon,
  fontWeight: 700,
  textTransform: 'uppercase',
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

export const consoleChipSx: SxProps<Theme> = {
  border: consoleColors.border,
  color: consoleColors.neon,
  backgroundColor: 'rgba(3, 22, 3, 0.9)',
  boxShadow: '0 0 10px rgba(54,255,143,0.18)',
  '& .MuiChip-icon': { color: consoleColors.accent },
};

export const consoleLinkSx: SxProps<Theme> = {
  color: consoleColors.accent,
  fontWeight: 700,
  textDecoration: 'none',
  '&:hover': {
    color: consoleColors.neon,
    textDecoration: 'underline',
  },
};

export const consoleTextFieldSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(3, 22, 3, 0.9)',
    color: consoleColors.neon,
    '& fieldset': {
      borderColor: 'rgba(54,255,143,0.5)',
    },
    '&:hover fieldset': {
      borderColor: consoleColors.neon,
      boxShadow: '0 0 8px rgba(54,255,143,0.4)',
    },
    '&.Mui-focused fieldset': {
      borderColor: consoleColors.neon,
      boxShadow: '0 0 14px rgba(54,255,143,0.45)',
    },
  },
  '& .MuiInputBase-input': {
    color: consoleColors.accent,
  },
  '& .MuiInputLabel-root': {
    color: consoleColors.accent,
  },
  '& .MuiSvgIcon-root': {
    color: consoleColors.accent,
  },
};

export const consoleTableCellSx: SxProps<Theme> = {
  borderBottom: '1px solid rgba(54,255,143,0.24)',
  color: consoleColors.accent,
};

export const consoleLogBoxSx: SxProps<Theme> = {
  flex: 1,
  overflow: 'auto',
  fontFamily: 'monospace',
  fontSize: 12,
  p: 1,
  borderRadius: 1,
  border: consoleColors.border,
  background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.55))',
  boxShadow: 'inset 0 0 12px rgba(54,255,143,0.25)',
};
