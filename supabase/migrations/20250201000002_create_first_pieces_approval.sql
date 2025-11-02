-- Create first_pieces_approval table
CREATE TABLE IF NOT EXISTS public.first_pieces_approval (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    line_id character varying(50) NOT NULL,
    mold_name character varying(100) NOT NULL,
    production_date date NOT NULL,
    entry_time time without time zone NOT NULL,
    line_no character varying(50) NOT NULL,
    material_grade character varying(100),
    material_percentage character varying(10),
    product_name character varying(100),
    color character varying(50),
    shift character varying(20),
    no_of_cavity integer,
    mb_grade_percentage character varying(10),
    cycle_time character varying(10),
    barrel_temp_nozzle jsonb,
    cavity_data jsonb NOT NULL,
    wall_thickness_data jsonb NOT NULL,
    remarks text,
    is_submitted boolean DEFAULT false,
    submitted_by character varying(100),
    submitted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100),
    updated_by character varying(100),
    CONSTRAINT first_pieces_approval_pkey PRIMARY KEY (id),
    CONSTRAINT fk_first_pieces_approval_line FOREIGN KEY (line_id) REFERENCES lines (line_id),
    CONSTRAINT fk_first_pieces_approval_mold FOREIGN KEY (mold_name) REFERENCES molds (mold_name)
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_first_pieces_approval_production_date ON public.first_pieces_approval USING btree (production_date) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_first_pieces_approval_line_production_date ON public.first_pieces_approval USING btree (line_id, production_date) TABLESPACE pg_default;

-- Disable RLS for now (can be enabled later with proper policies)
ALTER TABLE public.first_pieces_approval DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON TABLE public.first_pieces_approval TO authenticated;
GRANT ALL ON TABLE public.first_pieces_approval TO anon;
