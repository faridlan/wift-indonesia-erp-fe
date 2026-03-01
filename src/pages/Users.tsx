import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAllProfiles, useUpdateProfileRole } from "@/hooks/api/useProfile";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";
import { inviteUser } from "@/services/invite-user";
import { useQueryClient } from "@tanstack/react-query";

const ROLES = [
  { value: "sales", label: "Sales" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Super Admin" },
];

const INVITE_ROLES = [
  { value: "sales", label: "Sales" },
  { value: "admin", label: "Admin" },
];

const Users = () => {
  const { role, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profiles = [], isLoading, isError, error } = useAllProfiles(role === "superadmin");
  const updateRoleMutation = useUpdateProfileRole();

  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "", role: "sales" as "sales" | "admin" });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  const getErrorMessage = (err: unknown) => {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan.";
    const lower = message.toLowerCase();
    if (lower.includes("permission") || lower.includes("rls")) {
      return "Anda tidak memiliki akses untuk mengubah role.";
    }
    return message;
  };

  const handleRoleChange = async (profileId: string, newRole: string) => {
    try {
      await updateRoleMutation.mutateAsync({ profileId, role: newRole });
      toast({ title: "Berhasil", description: "Role diperbarui." });
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" });
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) {
      toast({ title: "Error", description: "Sesi tidak valid.", variant: "destructive" });
      return;
    }
    if (!inviteForm.email.trim()) {
      toast({ title: "Error", description: "Email wajib diisi.", variant: "destructive" });
      return;
    }
    setInviteSubmitting(true);
    try {
      await inviteUser({
        email: inviteForm.email.trim(),
        full_name: inviteForm.full_name.trim() || undefined,
        role: inviteForm.role,
      });
      toast({ title: "Berhasil", description: "Undangan terkirim ke email." });
      setInviteForm({ email: "", full_name: "", role: "sales" });
      queryClient.invalidateQueries({ queryKey: ["profiles", "all"] });
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setInviteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Manajemen User</h1>
        <p className="text-muted-foreground">Kelola role user (hanya Super Admin).</p>
      </div>

      {/* Form Tambah User Baru */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Tambah User Baru
          </CardTitle>
          <p className="text-sm text-muted-foreground">Kirim undangan ke email. User akan menerima link untuk mengatur password.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInviteSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="email@contoh.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Nama lengkap (opsional)</Label>
              <Input
                id="invite-name"
                placeholder="Nama lengkap"
                value={inviteForm.full_name}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(v: "sales" | "admin") => setInviteForm((prev) => ({ ...prev, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={inviteSubmitting}>
              {inviteSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengirim...
                </>
              ) : (
                "Kirim undangan"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      )}
      {isError && (
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      )}
      {!isLoading && !isError && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daftar User</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-48">Ubah Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name || p.id}</TableCell>
                    <TableCell>
                      <span className="capitalize">{p.role || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={p.role || ""}
                        onValueChange={(v) => handleRoleChange(p.id, v)}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {profiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Belum ada user.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Users;
