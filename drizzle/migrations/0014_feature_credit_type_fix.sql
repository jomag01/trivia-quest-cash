CREATE OR REPLACE FUNCTION public._feature_credit(_earner uuid, _buyer uuid, _sale uuid, _key text, _level int, _amt numeric, _kind text, _label text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _earner IS NULL OR _amt IS NULL OR _amt <= 0 THEN RETURN; END IF;
  INSERT INTO feature_commission_earnings(sale_id,earner_id,buyer_id,feature_key,level,amount) VALUES (_sale,_earner,_buyer,_key,_level,_amt);
  INSERT INTO commissions(user_id, from_user_id, amount, commission_type, level, related_order_id, notes)
    VALUES (_earner, _buyer, _amt, CASE _kind WHEN 'referral' THEN 'referral_commission' ELSE _kind END, _level, _sale, initcap(_kind)||' from '||_label);
  INSERT INTO user_wallets(user_id,balance,total_commissions) VALUES (_earner,_amt,_amt)
    ON CONFLICT (user_id) DO UPDATE SET balance=coalesce(user_wallets.balance,0)+_amt, total_commissions=coalesce(user_wallets.total_commissions,0)+_amt;
  INSERT INTO commission_notifications(user_id,source_type,amount,message)
    VALUES (_earner,'paid_features',_amt,'You earned ₱'||to_char(_amt,'FM999999990.00')||' ('||_kind||') from '||_label||'!');
END $$;
REVOKE EXECUTE ON FUNCTION public._feature_credit(uuid,uuid,uuid,text,int,numeric,text,text) FROM PUBLIC, anon, authenticated;