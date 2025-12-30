-- Create a table for managing legal terms that admin can edit
CREATE TABLE IF NOT EXISTS public.legal_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term_type TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_terms ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active terms
CREATE POLICY "Anyone can view active terms" 
ON public.legal_terms 
FOR SELECT 
USING (is_active = true);

-- Allow admins to manage terms (via service role)
CREATE POLICY "Service role can manage terms"
ON public.legal_terms
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default seller terms
INSERT INTO public.legal_terms (term_type, title, content) VALUES (
  'seller_terms',
  'Seller Terms and Conditions',
  E'# TriviaBees Marketplace Seller Agreement\n\n## 1. Seller Registration\nBy registering as a seller, you agree to:\n- Provide accurate business and product information\n- Maintain valid identification and verification documents\n- Comply with all applicable laws and regulations\n\n## 2. Product Listings\n- All products must be accurately described with clear photos\n- Prohibited items include counterfeit goods, illegal substances, and weapons\n- You are responsible for product quality and authenticity\n\n## 3. Fees and Commissions\n- Platform commission: A percentage markup is applied to your base price\n- The markup covers platform services, payment processing, and affiliate commissions\n- Commission rates are subject to change with 30 days notice\n\n## 4. Order Fulfillment\n- Orders must be shipped within 3 business days\n- Accurate tracking information must be provided\n- Packaging must be secure and professional\n\n## 5. Returns and Refunds\n- Accept returns for defective or misrepresented items\n- Process refunds within 7 business days of receiving returned items\n\n## 6. Account Suspension\nWe may suspend your seller account for:\n- Repeated policy violations\n- High refund or complaint rates\n- Fraudulent activities\n\n## 7. Diamond Rewards\n- Buyers may earn diamond rewards on your products\n- Referral commissions are distributed through the affiliate network\n\nBy proceeding, you acknowledge that you have read and agree to these terms.'
);

-- Insert default supplier terms
INSERT INTO public.legal_terms (term_type, title, content) VALUES (
  'supplier_terms',
  'Supplier Terms and Conditions',
  E'# TriviaBees B2B Supplier Agreement\n\n## 1. Supplier Registration\nBy registering as a supplier, you agree to:\n- Provide valid business registration documents\n- Maintain accurate inventory and pricing information\n- Comply with all Philippine business regulations\n\n## 2. Wholesale Pricing\n- Set competitive wholesale prices in your registered currency\n- Admin will apply markup percentages for retail pricing\n- Pricing must remain stable for agreed periods\n\n## 3. Product Requirements\n- All products must meet quality standards\n- Provide accurate descriptions, images, and specifications\n- Maintain adequate stock levels for listed items\n\n## 4. Order Fulfillment\n- Ship orders within agreed timeframes\n- Provide bulk shipping options for retailers\n- Maintain communication regarding stock availability\n\n## 5. Payment Terms\n- Payments processed according to agreed schedule\n- Platform retains commission on completed sales\n- Bank account must be verified for payouts\n\n## 6. Quality Assurance\n- Products subject to quality inspection\n- Defective items must be replaced at supplier cost\n- Maintain consistent quality standards\n\n## 7. Exclusivity and Competition\n- Non-exclusive arrangement unless otherwise agreed\n- Fair pricing policies apply\n\n## 8. Termination\n- Either party may terminate with 30 days notice\n- Outstanding orders must be fulfilled\n- Account balance will be settled within 14 days\n\nBy proceeding, you acknowledge that you have read and agree to these terms.'
);

-- Insert default auction seller terms
INSERT INTO public.legal_terms (term_type, title, content) VALUES (
  'auction_terms',
  'Auction Seller Terms and Conditions',
  E'# TriviaBees Auction Seller Agreement\n\n## 1. Listing Requirements\n- Provide accurate item descriptions and condition\n- Upload clear, actual photos of items\n- Set reasonable starting bids and reserve prices\n\n## 2. Platform Fees\n- Listing fee: FREE for verified sellers\n- Success fee: 5% of final selling price (minimum ₱50)\n- Featured listing fee: ₱100 per week (optional)\n\n## 3. Bidding Rules\n- Honor all winning bids\n- Anti-sniping protection extends auctions by 5 minutes\n- Reserve prices are hidden from bidders\n\n## 4. Escrow and Payment\n- Buyer funds held in escrow until delivery confirmed\n- Seller receives payment after buyer confirmation\n- Disputes resolved by admin within 7 days\n\n## 5. Shipping Responsibilities\n- Ship within 3 business days of payment\n- Provide valid tracking information\n- Package items securely to prevent damage\n\n## 6. Prohibited Activities\n- Shill bidding (fake bids to increase price)\n- Bid retraction without valid reason\n- Selling prohibited or counterfeit items\n\n## 7. Buyer Protection\n- Items must match listing description\n- Refund guaranteed for misrepresented items\n- Feedback system enforces accountability\n\nBy creating an auction, you agree to these terms and platform policies.'
);

-- Insert income disclaimer
INSERT INTO public.legal_terms (term_type, title, content) VALUES (
  'income_disclaimer',
  'Income Disclaimer',
  E'**SEC Disclaimer:** This is a sales-based referral rewards program where members earn bonuses based on the successful sale and use of company products and services. Earnings are not guaranteed and depend on individual effort, team performance, and compliance with company rules.'
);

-- Create trigger to update updated_at
CREATE TRIGGER update_legal_terms_updated_at
BEFORE UPDATE ON public.legal_terms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();