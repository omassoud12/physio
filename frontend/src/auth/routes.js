export function dashboardForRole(role) {
  return {
    admin: '/admin/dashboard',
    patient: '/patient/dashboard',
    physiotherapist: '/physiotherapist/dashboard',
  }[role] || '/signin'
}
