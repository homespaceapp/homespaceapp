-- Dodaj kolumny type i notes do expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'wydatek';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT;

-- Dodaj kolumny dla bills CRUD
ALTER TABLE bills ADD COLUMN IF NOT EXISTS notes TEXT;
