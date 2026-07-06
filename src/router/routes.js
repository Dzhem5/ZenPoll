export const routes = [
  {
    pattern: /^\/$/,
    load: () => import('../pages/home/home.js'),
  },
  {
    pattern: /^\/login\/?$/,
    load: () => import('../pages/login/login.js'),
  },
  {
    pattern: /^\/dashboard\/?$/,
    load: () => import('../pages/dashboard/dashboard.js'),
  },
  {
    pattern: /^\/polls\/(?<id>[^/]+)\/?$/,
    load: () => import('../pages/polls/poll-detail.js'),
  },
]
