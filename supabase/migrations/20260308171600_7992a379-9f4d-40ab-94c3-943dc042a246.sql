
INSERT INTO public.roles (code, name) VALUES 
  ('superadmin', 'Super Admin'),
  ('admin', 'Admin'),
  ('sales', 'Sales');

UPDATE public.profiles SET role = 'superadmin' WHERE role = 'superadmin';
