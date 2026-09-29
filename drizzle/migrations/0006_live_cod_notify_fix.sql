DO $$ DECLARE d text; BEGIN
  d := pg_get_functiondef('public.live_create_order'::regproc);
  d := replace(d, 'SELECT sp.user_id, ''New COD live order''', 'SELECT p.seller_id, ''New COD live order''');
  d := replace(d, 'FROM suppliers sp WHERE sp.id=p.seller_id;', ';');
  EXECUTE d;
END $$;