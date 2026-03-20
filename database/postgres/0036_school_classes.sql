ALTER TABLE schools_directory 
ADD COLUMN IF NOT EXISTS classes_json TEXT DEFAULT '[]';
