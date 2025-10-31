import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

// Material Design 3 theme
const lightTheme = {
  dark: false,
  colors: {
    primary: '#6750A4',
    'primary-darken-1': '#4F378B',
    secondary: '#625B71',
    'secondary-darken-1': '#4A4458',
    error: '#B3261E',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FB8C00',
    background: '#FFFBFE',
    surface: '#FFFBFE',
    'surface-variant': '#E7E0EC',
    'on-surface-variant': '#49454F',
  },
}

const darkTheme = {
  dark: true,
  colors: {
    primary: '#D0BCFF',
    'primary-darken-1': '#B69DF8',
    secondary: '#CCC2DC',
    'secondary-darken-1': '#B0A7C0',
    error: '#F2B8B5',
    info: '#64B5F6',
    success: '#81C784',
    warning: '#FFB74D',
    background: '#1C1B1F',
    surface: '#1C1B1F',
    'surface-variant': '#49454F',
    'on-surface-variant': '#CAC4D0',
  },
}

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: lightTheme,
      dark: darkTheme,
    },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  defaults: {
    VBtn: {
      color: 'primary',
      variant: 'elevated',
    },
    VCard: {
      elevation: 2,
    },
  },
})
