-- Add production_date column to first_pieces_approval_report table
-- This column will be used for production day logic (08:00 to 08:00)

ALTER TABLE public.first_pieces_approval_report 
ADD COLUMN IF NOT EXISTS production_date date;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_first_pieces_production_date 
ON public.first_pieces_approval_report (production_date);

-- Create composite index for line and production date
CREATE INDEX IF NOT EXISTS idx_first_pieces_line_production_date 
ON public.first_pieces_approval_report (line_id, production_date);

-- Update existing records to use entry_date as production_date
UPDATE public.first_pieces_approval_report 
SET production_date = entry_date 
WHERE production_date IS NULL;
