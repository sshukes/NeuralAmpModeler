import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Link, Stack, Typography } from '@mui/material';
// Adjust this path/name to match your actual file exactly:
import { NamTrainerApp } from '../components/NamTrainerApp';
import {
  consoleCardSx,
  consoleLinkSx,
  consoleOverlaySx,
  consolePageSx,
} from '../theme/consoleTheme';

const NamTrainerPage: React.FC = () => {
  return (
    <Box sx={consolePageSx}>
      <Box sx={consoleOverlaySx} />
      <Stack spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 2 }}>
            Neural Amp Modeler Trainer
          </Typography>
          <Stack direction="row" spacing={2}>
            <Link component={RouterLink} to="/runs" sx={consoleLinkSx}>
              View training runs
            </Link>
            <Link component={RouterLink} to="/theme-test" sx={consoleLinkSx}>
              Theme preview
            </Link>
          </Stack>
        </Stack>

        <Box sx={{ ...consoleCardSx, p: { xs: 2, md: 3 } }}>
          <NamTrainerApp />
        </Box>
      </Stack>
    </Box>
  );
};

export default NamTrainerPage;
