export const home = {
  method: 'GET',
  path: '/home',
  options: {
    auth: { scope: ['user'] }
  },
  handler: (_request, h) => {
    return h.view('home')
  }
}
