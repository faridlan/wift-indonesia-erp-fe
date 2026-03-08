import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, Lock, Mail, UserIcon } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";

const FirstLoginSetup = () => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1); // 1: password, 2: profile info
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password minimal 6 karakter.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Password tidak cocok.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Password berhasil diubah." });
      setStep(2);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("profiles").upload(path, file, { upsert: true });
    if (uploadErr) {
      toast({ title: "Gagal upload", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("profiles").getPublicUrl(path);
    const url = `${urlData.publicUrl}?t=${Date.now()}`;
    setImageUrl(url);
    setUploading(false);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({ title: "Error", description: "Nama lengkap wajib diisi.", variant: "destructive" });
      return;
    }
    if (!email.trim()) {
      toast({ title: "Error", description: "Email wajib diisi.", variant: "destructive" });
      return;
    }
    if (!user) return;
    setLoading(true);

    // Update auth email via edge function (bypasses @app.local validation issue)
    const { error: authErr } = await supabase.functions.invoke("update-email", {
      body: { email },
    });
    if (authErr) {
      toast({ title: "Gagal update email", description: authErr.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Update profile
    const updates: Record<string, unknown> = {
      full_name: fullName,
      password_changed: true,
    };
    if (imageUrl) updates.image_url = imageUrl;

    const { error: profileErr } = await supabase.from("profiles").update(updates).eq("id", user.id);
    setLoading(false);

    if (profileErr) {
      toast({ title: "Gagal", description: profileErr.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Setup akun selesai!" });
      await refreshProfile();
    }
  };

  const initials = (fullName || "U").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-bold tracking-wider text-primary">Setup Akun</CardTitle>
          <CardDescription>
            {step === 1 ? "Silakan ubah password Anda terlebih dahulu" : "Lengkapi informasi profil Anda"}
          </CardDescription>
          <div className="flex justify-center gap-2 pt-2">
            <div className={`h-2 w-12 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-2 w-12 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="flex justify-center mb-2">
                <div className="rounded-full bg-primary/10 p-4">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password Baru</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Konfirmasi Password</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password"
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</> : "Ubah Password"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={imageUrl || undefined} />
                    <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
                <p className="text-xs text-muted-foreground">Foto profil (opsional)</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5" /> Nama Lengkap</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Masukkan nama lengkap" />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@contoh.com" />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</> : "Selesai"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FirstLoginSetup;
