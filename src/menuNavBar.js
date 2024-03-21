import {
  mdiMenu,
  mdiClockOutline,
  mdiCloud,
  mdiCrop,
  mdiAccount,
  mdiCogOutline,
  mdiEmail,
  mdiLogout,
  mdiThemeLightDark,
  mdiGithub,
  mdiReact
} from '@mdi/js'

export default [
  {
    icon: mdiMenu,
    label: 'Choose Model',
    menu: []
  },
  {
    isCurrentUser: true,
    menu: [
      {
        icon: mdiAccount,
        label: 'Profile',
        to: '/profile'
      },
      {
        icon: mdiCogOutline,
        label: 'Users',
        to: '/users'
      },
      {
        icon: mdiEmail,
        label: 'Models',
        to: '/models'
      },
      {
        icon: mdiThemeLightDark,
        label: 'Platforms',
        to: '/platforms'
      },
      {
        isDivider: true
      },
      {
        icon: mdiLogout,
        label: 'Log Out',
        isLogout: true
      }
    ]
  }
  // {
  //   icon: mdiThemeLightDark,
  //   label: 'Light/Dark',
  //   isDesktopNoLabel: true,
  //   isToggleLightDark: true
  // },
  // {
  //   icon: mdiGithub,
  //   label: 'GitHub',
  //   isDesktopNoLabel: true,
  //   href: 'https://github.com/justboil/admin-one-vue-tailwind',
  //   target: '_blank'
  // },
  // {
  //   icon: mdiReact,
  //   label: 'React version',
  //   isDesktopNoLabel: true,
  //   href: 'https://github.com/justboil/admin-one-react-tailwind',
  //   target: '_blank'
  // },
  // {
  //   icon: mdiLogout,
  //   label: 'Log out',
  //   isDesktopNoLabel: true,
  //   isLogout: true
  // }
]
