"use client";

import { useState } from "react";
import { LogOut, RefreshCw, ShieldCheck, User } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { DetailGrid, DetailRow } from "@/components/record-details";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/utils";

export default function SettingsPage() {
  const { user, logout, refresh } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setConfirmLogout(false);
    }
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Your BANJARA administrator account."
        actions={
          <Button variant="outline" size="sm" onClick={handleRefresh} loading={refreshing}>
            {refreshing ? null : <RefreshCw className="h-4 w-4" aria-hidden />}
            Refresh profile
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <User className="h-4 w-4 text-sky" aria-hidden />
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailGrid>
              <DetailRow label="Name" value={user?.name || "—"} />
              <DetailRow label="Email" value={user?.email || "—"} />
              <DetailRow label="Phone" value={user?.phone || "—"} />
              <DetailRow
                label="Role"
                value={<span className="capitalize">{user?.role ?? "—"}</span>}
              />
              <DetailRow
                label="Account status"
                value={user?.status ? <StatusBadge status={user.status} /> : <span>—</span>}
              />
              <DetailRow label="Member since" value={formatDateTime(user?.createdAt)} />
            </DetailGrid>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sky" aria-hidden />
            <CardTitle>Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailGrid>
              <DetailRow label="Admin ID" value={user?.id || "—"} />
              <DetailRow label="API endpoint" value={apiUrl} />
            </DetailGrid>
            <p className="text-sm text-muted">
              Account details are managed by the BANJARA backend. Sign out to end this session on
              this device.
            </p>
            <Button variant="danger" onClick={() => setConfirmLogout(true)}>
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Sign out of BANJARA Admin?"
        description="You will need to sign in again to manage the platform."
        confirmLabel="Sign out"
        tone="danger"
        loading={loggingOut}
        onConfirm={handleLogout}
        onClose={() => setConfirmLogout(false)}
      />
    </div>
  );
}
