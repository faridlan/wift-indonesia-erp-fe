import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAllProfiles, useUpdateProfileRole, useUpdateProfilePosition } from "@/hooks/api/useProfile";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Eye, EyeOff, Pencil, Check, X, KeyRound } from "lucide-react";
import { createUser } from "@/services/invite-user";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ROLES = [
  { value: "sales", label: "Sales" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Super Admin" },
];

const CREATE_ROLES = [
  { value: "sales", label: "Sales" },
  { value: "admin", label: "Admin" },
];

const Users = () => {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profiles = [], isLoading, isError, error } = useAllProfiles(role === "superadmin");
  const updateRoleMutation = useUpdateProfileRole();
  const updatePositionMutation = useUpdateProfilePosition();

  const [form, setForm] = useState({ username: "", password: "", full_name: "", position: "", role: "sales" as "sales" | "admin" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Position editing state
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editPositionValue, setEditPositionValue] = useState("");

  // Reset password state
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  const getErrorMessage = (err: unknown) => {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan.";
    const lower = message.toLowerCase();
    if (lower.includes("permission") || lower.includes("rls")) return "Anda tidak memiliki akses.";
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

  const startEditPosition = (profileId: string, currentPosition: string) => {
    setEditingPositionId(profileId);
    setEditPositionValue(currentPosition);
  };

  const cancelEditPosition = () => {
    setEditingPositionId(null);
    setEditPositionValue("");
  };

  const savePosition = async (profileId: string) => {
    try {
      await updatePositionMutation.mutateAsync({ profileId, position: editPositionValue });
      toast({ title: "Berhasil", description: "Jabatan diperbarui." });
      setEditingPositionId(null);
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim()) {
      toast({ title: "Error", description: "Username wajib diisi.", variant: "destructive" });
      return;
    }
    if (!form.password || form.password.length < 6) {
      toast({ title: "Error", description: "Password minimal 6 karakter.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const result = await createUser({
        username: form.username,
        password: form.password,
        full_name: form.full_name.trim() || undefined,
        role: form.role,
      });
      // Update position if provided
      if (form.position.trim()) {
        // Find the newly created profile and update position
        await queryClient.invalidateQueries({ queryKey: ["profiles", "all"] });
        const { data: newProfiles } = await supabase.from("profiles").select("id, full_name").order("created_at", { ascending: false }).limit(1);
        if (newProfiles?.[0]) {
          await supabase.from("profiles").update({ position: form.position.trim() }).eq("id", newProfiles[0].id);
        }
      }
      toast({ title: "Berhasil", description: result.message });
      setForm({ username: "", password: "", full_name: "", position: "", role: "sales" });
      queryClient.invalidateQueries({ queryKey: ["profiles", "all"] });
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !resetPassword || resetPassword.length < 6) {
      toast({ title: "Error", description: "Password minimal 6 karakter.", variant: "destructive" });
      return;
    }
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { user_id: resetTarget.id, new_password: resetPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Berhasil", description: `Password ${resetTarget.name} berhasil direset.` });
      setResetTarget(null);
      setResetPassword("");
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const getDisplayName = (p: any) => p.full_name || p.id.slice(0, 8);

  const PositionCell = ({ profile: p }: { profile: any }) => {
    const isEditing = editingPositionId === p.id;
    if (isEditing) {
      return (
        <div className="flex items-center gap-1.5">
          <Input
            value={editPositionValue}
            onChange={(e) => setEditPositionValue(e.target.value)}
            placeholder="Jabatan"
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") savePosition(p.id);
              if (e.key === "Escape") cancelEditPosition();
            }}
          />
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => savePosition(p.id)} disabled={updatePositionMutation.isPending}>
            <Check className="h-3.5 w-3.5 text-primary" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={cancelEditPosition}>
            <X className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{p.position || "—"}</span>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => startEditPosition(p.id, p.position || "")}>
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Manajemen User</h1>
        <p className="text-muted-foreground text-sm">Kelola user, role, dan jabatan (hanya Super Admin).</p>
      </div>

      {/* Create User Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Tambah User Baru
          </CardTitle>
          <p className="text-sm text-muted-foreground">Buat akun baru dengan username dan password.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="create-username" className="text-xs">Username *</Label>
                <Input
                  id="create-username"
                  placeholder="contoh: budi.sales"
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s/g, "") }))}
                  required
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="create-password" className="text-xs">Password *</Label>
                <div className="relative">
                  <Input
                    id="create-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="pr-10 h-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="create-name" className="text-xs">Nama Lengkap</Label>
                <Input
                  id="create-name"
                  placeholder="Nama lengkap"
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="create-position" className="text-xs">Jabatan</Label>
                <Input
                  id="create-position"
                  placeholder="Contoh: Sales Executive"
                  value={form.position}
                  onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v: "sales" | "admin") => setForm((prev) => ({ ...prev, role: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREATE_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={submitting} className="h-9 w-full sm:w-auto">
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Membuat...</> : <><UserPlus className="h-4 w-4 mr-2" /> Buat User</>}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* User List */}
      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      )}
      {isError && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}
      {!isLoading && !isError && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daftar User</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-48">Ubah Role</TableHead>
                    <TableHead className="w-24">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{getDisplayName(p)}</TableCell>
                      <TableCell><PositionCell profile={p} /></TableCell>
                      <TableCell><span className="capitalize">{p.role || "—"}</span></TableCell>
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
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setResetTarget({ id: p.id, name: getDisplayName(p) })}
                        >
                          <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                          Reset
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {profiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">Belum ada user.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {profiles.map((p) => (
                <Card key={p.id} className="p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{getDisplayName(p)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.role || "—"}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Jabatan</Label>
                    <PositionCell profile={p} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Ubah Role</Label>
                    <Select
                      value={p.role || ""}
                      onValueChange={(v) => handleRoleChange(p.id, v)}
                      disabled={updateRoleMutation.isPending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Ubah role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setResetTarget({ id: p.id, name: getDisplayName(p) })}
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                    Reset Password
                  </Button>
                </Card>
              ))}
              {profiles.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Belum ada user.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) { setResetTarget(null); setResetPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password untuk <strong>{resetTarget?.name}</strong>. User akan diminta setup ulang saat login berikutnya.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Password Baru</Label>
            <div className="relative">
              <Input
                type={showResetPassword ? "text" : "password"}
                placeholder="Minimal 6 karakter"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowResetPassword(!showResetPassword)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetTarget(null); setResetPassword(""); }}>Batal</Button>
            <Button onClick={handleResetPassword} disabled={resetting}>
              {resetting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mereset...</> : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
