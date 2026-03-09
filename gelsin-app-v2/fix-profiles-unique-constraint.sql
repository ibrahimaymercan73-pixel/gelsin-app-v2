-- Aynı user.id ile birden fazla profil oluşturulmasını engellemek için id üzerinde unique constraint.
-- Not: profiles.id zaten PRIMARY KEY ise bu constraint gereksizdir (PK zaten UNIQUE içerir).
-- Eğer şema farklıysa veya ek güvence istiyorsanız bu migration'ı çalıştırabilirsiniz.

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_unique UNIQUE (id);
