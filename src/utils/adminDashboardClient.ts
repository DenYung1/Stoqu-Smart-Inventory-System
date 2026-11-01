export function getAdminDashboardClient(adminClient: unknown, fallbackClient: unknown) {
  return adminClient ?? fallbackClient ?? null;
}
