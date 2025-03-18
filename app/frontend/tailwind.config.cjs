const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      satoshi: ['Satoshi', 'sans-serif'],
    },
    screens: {
      '2xsm': '375px',
      xsm: '425px',
      '3xl': '2000px',
      ...defaultTheme.screens,
    },
    extend: {
      colors: {
        current: 'currentColor',
        transparent: 'transparent',
        white: '#FFFFFF',
        black: '#1C2434',
        'black-2': '#010101',
        body: '#64748B',
        bodydark: '#AEB7C0',
        bodydark1: '#DEE4EE',
        bodydark2: '#8A99AF',
        primary: '#3C50E0',
        secondary: '#80CAEE',
        stroke: '#E2E8F0',
        gray: '#EFF4FB',
        graydark: '#333A48',
        'gray-2': '#F7F9FC',
        'gray-3': '#FAFAFA',
        whiten: '#F8F9FA',
        whiter: '#F5F7FD',
        boxdark: '#24303F',
        'boxdark-2': '#1A222C',
        strokedark: '#2E3A47',
        'form-strokedark': '#3d4d60',
        'form-input': '#1d2a39',
        'meta-1': '#DC3545',
        'meta-2': '#EFF2F7',
        'meta-3': '#10B981',
        'meta-4': '#313D4A',
        'meta-5': '#259AE6',
        'meta-6': '#FFBA00',
        'meta-7': '#FF6766',
        'meta-8': '#F0950C',
        'meta-9': '#E5E7EB',
        button: {
          primary: {
            default: '#3C50E0', // Deep blue
            hover: '#2F3BBE', // Darker shade
            disabled: '#A0AEC0', // Grayish for disabled state
          },
          secondary: {
            default: '#6B7280', // Cool gray
            hover: '#4B5563', // Darker gray
            disabled: '#D1D5DB', // Light gray
          },
          success: {
            default: '#10B981', // Green for success actions
            hover: '#059669', // Darker green
            disabled: '#A7F3D0', // Light green
          },
          danger: {
            default: '#EF4444', // Red for destructive actions
            hover: '#DC2626', // Darker red
            disabled: '#FCA5A5', // Light red
          },
          warning: {
            default: '#F59E0B', // Yellow for warnings
            hover: '#D97706', // Darker yellow
            disabled: '#FDE68A', // Light yellow
          },
          info: {
            default: '#0EA5E9', // Sky blue for informational actions
            hover: '#0284C7', // Darker blue
            disabled: '#BAE6FD', // Light blue
          },
        },
        input: {
          border: '#CBD5E0',
          focus: '#3C50E0',
          disabled: '#E2E8F0',
        },
        sidebar: {
          active: '#3C50E0', // Active menu item (matches primary button)
          hover: '#2F3BBE', // Hover state for menu items
          text: '#FFFFFF', // Text color for sidebar items
        },
      },
      backgroundImage: {
        video: "url('../images/video/video.png')",
        // Existing gradients
        'sidebar-gradient-1':
          'linear-gradient(360deg, rgb(0 0 0), rgb(113 73 183))',
        'sidebar-gradient-2':
          'linear-gradient(180deg, rgb(30, 30, 30), rgb(60, 60, 60))',
        'sidebar-gradient-3':
          'linear-gradient(180deg, rgb(10, 42, 90), rgb(25, 100, 180))',
        'sidebar-gradient-4':
          'linear-gradient(180deg, rgb(50, 50, 50), rgb(80, 80, 80))',

        // Additional banking-themed gradients
        'sidebar-gradient-5':
          'linear-gradient(180deg, rgb(0, 50, 90), rgb(0, 100, 150))', // **Financial Blue** (Trust & Security)
        'sidebar-gradient-6':
          'linear-gradient(180deg, rgb(20, 20, 20), rgb(45, 45, 45))', // **Dark Elegance** (Luxury & Professionalism)
        'sidebar-gradient-7':
          'linear-gradient(180deg, rgb(30, 80, 40), rgb(10, 140, 70))', // **Wealth Green** (Finance & Growth)
        'sidebar-gradient-8':
          'linear-gradient(180deg, rgb(100, 75, 50), rgb(140, 110, 80))', // **Gold Tone** (Premium & Stability)
        'sidebar-gradient-9':
          'linear-gradient(180deg, rgb(20, 20, 30), rgb(45, 45, 65))', // **Deep Navy** (Corporate Banking Look)
        'sidebar-gradient-10':
          'linear-gradient(180deg, rgb(150, 125, 80), rgb(180, 160, 100))', // **Luxury Gold** (High-end Banking)
      },
      fontSize: {
        'title-xxl': ['44px', '55px'],
        'title-xl': ['36px', '45px'],
        'title-xl2': ['33px', '45px'],
        'title-lg': ['28px', '35px'],
        'title-md': ['24px', '30px'],
        'title-md2': ['26px', '30px'],
        'title-sm': ['20px', '26px'],
        'title-xsm': ['18px', '24px'],
      },
      zIndex: {
        999999: '999999',
        99999: '99999',
        9999: '9999',
        999: '999',
        99: '99',
        9: '9',
        1: '1',
      },
      spacing: {
        4.5: '1.125rem',
        5.5: '1.375rem',
        6.5: '1.625rem',
        7.5: '1.875rem',
        8.5: '2.125rem',
        9.5: '2.375rem',
        10.5: '2.625rem',
        11: '2.75rem',
        11.5: '2.875rem',
        12.5: '3.125rem',
        13: '3.25rem',
        13.5: '3.375rem',
        14: '3.5rem',
        14.5: '3.625rem',
        15: '3.75rem',
        15.5: '3.875rem',
        16: '4rem',
        16.5: '4.125rem',
        17: '4.25rem',
        17.5: '4.375rem',
        18: '4.5rem',
        18.5: '4.625rem',
        19: '4.75rem',
        19.5: '4.875rem',
        21: '5.25rem',
        21.5: '5.375rem',
        22: '5.5rem',
        22.5: '5.625rem',
        24.5: '6.125rem',
        25: '6.25rem',
        25.5: '6.375rem',
        26: '6.5rem',
        27: '6.75rem',
        27.5: '6.875rem',
        29: '7.25rem',
        29.5: '7.375rem',
        30: '7.5rem',
        31: '7.75rem',
        32.5: '8.125rem',
        34: '8.5rem',
        34.5: '8.625rem',
        35: '8.75rem',
        36.5: '9.125rem',
        37.5: '9.375rem',
        39: '9.75rem',
        39.5: '9.875rem',
        40: '10rem',
      },
      transitionProperty: { width: 'width', stroke: 'stroke' },
      borderWidth: {
        6: '6px',
      },
      boxShadow: {
        default: '0px 8px 13px -3px rgba(0, 0, 0, 0.07)',
        card: '0px 1px 3px rgba(0, 0, 0, 0.12)',
        'card-2': '0px 1px 2px rgba(0, 0, 0, 0.05)',
        switcher:
          '0px 2px 4px rgba(0, 0, 0, 0.2), inset 0px 2px 2px #FFFFFF, inset 0px -1px 1px rgba(0, 0, 0, 0.1)',
        'switch-1': '0px 0px 5px rgba(0, 0, 0, 0.15)',
        1: '0px 1px 3px rgba(0, 0, 0, 0.08)',
        2: '0px 1px 4px rgba(0, 0, 0, 0.12)',
        3: '0px 1px 5px rgba(0, 0, 0, 0.14)',
        4: '0px 4px 10px rgba(0, 0, 0, 0.12)',
        5: '0px 1px 1px rgba(0, 0, 0, 0.15)',
        6: '0px 3px 15px rgba(0, 0, 0, 0.1)',
        7: '-5px 0 0 #313D4A, 5px 0 0 #313D4A',
        8: '1px 0 0 #313D4A, -1px 0 0 #313D4A, 0 1px 0 #313D4A, 0 -1px 0 #313D4A, 0 3px 13px rgb(0 0 0 / 8%)',
        button: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      opacity: {
        65: '.65',
      },
    },
  },
  plugins: [],
};
