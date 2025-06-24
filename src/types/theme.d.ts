// Custom theme types to extend Material-UI

import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    link: Palette['primary'];
  }

  interface PaletteOptions {
    link?: PaletteOptions['primary'];
  }
}

export {};
