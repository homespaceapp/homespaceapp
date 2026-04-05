-- Test migracji v2: dodanie kolumny version do tabeli meals (jeśli nie istnieje)
-- Ten plik weryfikuje czy pipeline GitHub Actions → Supabase działa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meals' AND column_name = 'version'
  ) THEN
    ALTER TABLE meals ADD COLUMN version INTEGER DEFAULT 1;
  END IF;
END $$;
