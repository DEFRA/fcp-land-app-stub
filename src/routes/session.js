export const session = {
  method: 'GET',
  path: '/session',
  options: {
    auth: { scope: ['user'] }
  },
  handler: (_request, h) => {
    return h.view('session')
  }
}
