import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, Plus, Trash2, ExternalLink } from "lucide-react";
import { useBankAccounts, useCreateBankAccount, useDeleteBankAccount } from "@/hooks/api/useBankAccounts";
import type { Tables } from "@/integrations/supabase/types";

type ProfileType = Tables<"profiles">;

const Profile = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    position: "",
    bio: "",
    slug: "",
    meta_pixel_id: "",
  });

  const isSales = role === "sales";
  const isSuperadmin = role === "superadmin";

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data);
        setForm({
          full_name: data.full_name || "",
          phone_number: data.phone_number || "",
          position: data.position || "",
          bio: data.bio || "",
          slug: data.slug || "",
          meta_pixel_id: data.meta_pixel_id || "",
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const updates: Record<string, unknown> = {
      full_name: form.full_name || null,
      phone_number: form.phone_number || null,
      bio: form.bio || null,
    };

    // Only sales can edit slug and meta_pixel_id
    if (isSales) {
      updates.slug = form.slug || null;
      updates.meta_pixel_id = form.meta_pixel_id || null;
    }

    // Only superadmin can edit position
    if (isSuperadmin) {
      updates.position = form.position || null;
    }

    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Berhasil", description: "Profil diperbarui." });
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
    const image_url = `${urlData.publicUrl}?t=${Date.now()}`;
    const { error: updateErr } = await supabase.from("profiles").update({ image_url }).eq("id", user.id);
    if (updateErr) {
      toast({ title: "Error", description: updateErr.message, variant: "destructive" });
    } else {
      setProfile((prev) => prev ? { ...prev, image_url } : prev);
      toast({ title: "Berhasil", description: "Foto profil diperbarui." });
    }
    setUploading(false);
  };

  const setField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  if (loading) return <p className="text-muted-foreground p-4">Loading...</p>;

  const initials = (form.full_name || "U").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Profile</h1>

      {/* Avatar Card */}
      <Card>
        <CardContent className="pt-6 flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.image_url || undefined} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="text-center">
            <p className="font-semibold">{form.full_name || "—"}</p>
            <p className="text-sm text-muted-foreground capitalize">{profile?.role || "sales"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informasi Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>No. Telepon</Label>
                <Input value={form.phone_number} onChange={(e) => setField("phone_number", e.target.value)} placeholder="08xxx" />
              </div>
            </div>

            {/* Position - only superadmin can edit, others see disabled */}
            <div className="space-y-2">
              <Label>Posisi / Jabatan</Label>
              <Input
                value={form.position}
                onChange={(e) => setField("position", e.target.value)}
                placeholder="Sales Executive"
                disabled={!isSuperadmin}
              />
              {!isSuperadmin && <p className="text-xs text-muted-foreground">Hanya superadmin yang dapat mengubah jabatan.</p>}
            </div>

            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={(e) => setField("bio", e.target.value.slice(0, 120))} placeholder="Tentang saya..." rows={3} maxLength={120} />
              <p className="text-xs text-muted-foreground text-right">{form.bio.length}/120</p>
            </div>

            {/* Slug & Meta Pixel - only for sales */}
            {isSales && (
              <>
                <div className="space-y-2">
                  <Label>Slug (URL Landing Page)</Label>
                  <Input value={form.slug} onChange={(e) => setField("slug", e.target.value)} placeholder="nama-saya" />
                </div>
                <div className="space-y-2">
                  <Label>Meta Pixel ID</Label>
                  <Input value={form.meta_pixel_id} onChange={(e) => setField("meta_pixel_id", e.target.value)} placeholder="123456789" />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={profile?.role || ""} disabled />
            </div>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</> : "Simpan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
