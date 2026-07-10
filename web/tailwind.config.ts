import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

// US-107: paleta semántica mínima mapeada a escalas Tailwind existentes (Doc 15 §20). El design
// system completo (tokens definitivos, componentes base) es Future.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: colors.blue,
        secondary: colors.slate,
        danger: colors.red,
        success: colors.emerald,
      },
    },
  },
  plugins: [],
};

export default config;
