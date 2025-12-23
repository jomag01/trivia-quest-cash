-- Create suppliers table
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    description TEXT,
    logo_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
    commission_rate NUMERIC(5,2) DEFAULT 0,
    notes TEXT,
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Create supplier_products table
CREATE TABLE public.supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT,
    barcode TEXT,
    category_id TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    supplier_price NUMERIC(10,2) NOT NULL,
    admin_markup_percent NUMERIC(5,2) DEFAULT 0,
    admin_markup_fixed NUMERIC(10,2) DEFAULT 0,
    final_price NUMERIC(10,2),
    stock_quantity INTEGER DEFAULT 0,
    min_order_quantity INTEGER DEFAULT 1,
    unit TEXT DEFAULT 'piece',
    specifications JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
    is_active BOOLEAN DEFAULT true,
    admin_notes TEXT,
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create supplier role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'supplier');
    ELSE
        -- Add supplier to existing enum if not exists
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supplier';
    END IF;
END$$;

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

-- Create security definer function for supplier check
CREATE OR REPLACE FUNCTION public.is_supplier(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.suppliers
        WHERE user_id = _user_id
        AND status = 'approved'
    )
$$;

-- Get supplier id for user
CREATE OR REPLACE FUNCTION public.get_supplier_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.suppliers WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for suppliers
CREATE POLICY "Admins can manage all suppliers"
ON public.suppliers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Suppliers can view own profile"
ON public.suppliers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Suppliers can update own profile"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can apply as supplier"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS Policies for supplier_products
CREATE POLICY "Admins can manage all supplier products"
ON public.supplier_products
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Suppliers can view own products"
ON public.supplier_products
FOR SELECT
TO authenticated
USING (supplier_id = public.get_supplier_id(auth.uid()));

CREATE POLICY "Suppliers can insert own products"
ON public.supplier_products
FOR INSERT
TO authenticated
WITH CHECK (
    supplier_id = public.get_supplier_id(auth.uid()) 
    AND public.is_supplier(auth.uid())
);

CREATE POLICY "Suppliers can update own products"
ON public.supplier_products
FOR UPDATE
TO authenticated
USING (supplier_id = public.get_supplier_id(auth.uid()))
WITH CHECK (supplier_id = public.get_supplier_id(auth.uid()));

CREATE POLICY "Suppliers can delete own products"
ON public.supplier_products
FOR DELETE
TO authenticated
USING (supplier_id = public.get_supplier_id(auth.uid()));

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_supplier_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_supplier_updated_at();

CREATE TRIGGER update_supplier_products_updated_at
BEFORE UPDATE ON public.supplier_products
FOR EACH ROW
EXECUTE FUNCTION public.update_supplier_updated_at();

-- Function to calculate final price
CREATE OR REPLACE FUNCTION public.calculate_supplier_product_price()
RETURNS TRIGGER AS $$
BEGIN
    NEW.final_price = NEW.supplier_price + (NEW.supplier_price * COALESCE(NEW.admin_markup_percent, 0) / 100) + COALESCE(NEW.admin_markup_fixed, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_final_price
BEFORE INSERT OR UPDATE ON public.supplier_products
FOR EACH ROW
EXECUTE FUNCTION public.calculate_supplier_product_price();