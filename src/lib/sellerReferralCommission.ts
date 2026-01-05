import { supabase } from "@/integrations/supabase/client";

interface CommissionConfig {
  category: string;
  commission_percent: number;
  admin_markup_percent: number;
  unilevel_percent: number;
  stairstep_percent: number;
  leadership_percent: number;
}

/**
 * Process seller referrer commission when a sale is made
 * This distributes recurring commissions to the affiliate who referred the seller
 */
export async function processSellerReferrerCommission(
  sellerId: string,
  orderId: string | null,
  saleAmount: number,
  sourceCategory: 'products' | 'auctions' | 'services' | 'food' | 'marketplace'
): Promise<boolean> {
  try {
    // Get seller's referrer
    const { data: seller, error: sellerError } = await supabase
      .from("profiles")
      .select("seller_referrer_id, referred_by")
      .eq("id", sellerId)
      .single();

    if (sellerError || !seller) {
      console.log("Seller not found or no referrer");
      return false;
    }

    // Use seller_referrer_id if set, fallback to referred_by
    const referrerId = seller.seller_referrer_id || seller.referred_by;
    
    if (!referrerId) {
      console.log("No referrer found for seller");
      return false;
    }

    // Get commission config for this category
    const { data: config, error: configError } = await supabase
      .from("seller_referrer_commissions")
      .select("*")
      .eq("category", sourceCategory)
      .eq("is_active", true)
      .single();

    if (configError || !config) {
      console.log("Commission config not found for category:", sourceCategory);
      return false;
    }

    // Calculate commissions from admin markup (not from seller's price)
    const adminMarkupAmount = saleAmount * (config.admin_markup_percent / 100);
    const referrerCommission = adminMarkupAmount * (config.commission_percent / 100);
    
    // Remaining pool after referrer commission
    const remainingPool = adminMarkupAmount - referrerCommission;
    const unilevelAmount = remainingPool * (config.unilevel_percent / 100);
    const stairstepAmount = remainingPool * (config.stairstep_percent / 100);
    const leadershipAmount = remainingPool * (config.leadership_percent / 100);
    const adminNetProfit = remainingPool - unilevelAmount - stairstepAmount - leadershipAmount;

    // Insert earning record
    const { data: earning, error: earningError } = await supabase
      .from("seller_referrer_earnings")
      .insert({
        referrer_id: referrerId,
        seller_id: sellerId,
        order_id: orderId,
        source_category: sourceCategory,
        sale_amount: saleAmount,
        admin_markup_amount: adminMarkupAmount,
        referrer_commission: referrerCommission,
        unilevel_amount: unilevelAmount,
        stairstep_amount: stairstepAmount,
        leadership_amount: leadershipAmount,
        admin_net_profit: adminNetProfit,
        status: 'processed',
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (earningError) {
      console.error("Error recording earning:", earningError);
      return false;
    }

    // Update referrer's wallet with commission
    const { data: wallet } = await supabase
      .from("user_wallets")
      .select("balance, total_commissions")
      .eq("user_id", referrerId)
      .maybeSingle();

    if (wallet) {
      await supabase
        .from("user_wallets")
        .update({
          balance: (wallet.balance || 0) + referrerCommission,
          total_commissions: (wallet.total_commissions || 0) + referrerCommission
        })
        .eq("user_id", referrerId);
    } else {
      await supabase
        .from("user_wallets")
        .insert({
          user_id: referrerId,
          balance: referrerCommission,
          total_commissions: referrerCommission
        });
    }

    // Create notification for referrer
    const categoryLabels: { [key: string]: string } = {
      products: "Shop",
      auctions: "Auction",
      services: "Service Booking",
      food: "Food Delivery",
      marketplace: "Marketplace"
    };

    await supabase
      .from("commission_notifications")
      .insert({
        user_id: referrerId,
        source_type: sourceCategory,
        source_id: orderId,
        amount: referrerCommission,
        message: `You earned ₱${referrerCommission.toFixed(2)} commission from ${categoryLabels[sourceCategory]} sale by your referred seller!`
      });

    console.log(`Processed ${sourceCategory} commission: ₱${referrerCommission} to referrer ${referrerId}`);
    return true;
  } catch (error) {
    console.error("Error processing seller referrer commission:", error);
    return false;
  }
}

/**
 * Track seller referral from cookie when they register as seller
 */
export async function trackSellerReferral(
  sellerId: string,
  referrerId: string,
  sellerCategory: 'products' | 'auctions' | 'services' | 'food' | 'marketplace'
): Promise<void> {
  try {
    await supabase
      .from("profiles")
      .update({
        seller_referrer_id: referrerId,
        is_seller: true,
        seller_registered_at: new Date().toISOString(),
        seller_category: sellerCategory
      })
      .eq("id", sellerId);

    console.log(`Tracked seller referral: ${sellerId} referred by ${referrerId}`);
  } catch (error) {
    console.error("Error tracking seller referral:", error);
  }
}

/**
 * Get referrer ID from cookies for seller tracking
 */
export function getSellerReferrerFromCookie(): string | null {
  const cookieName = 'aff_referral_referrer=';
  const cookies = document.cookie.split(';');
  
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(cookieName) === 0) {
      return decodeURIComponent(cookie.substring(cookieName.length));
    }
  }
  
  // Also check affiliate cookie
  const affCookieName = 'aff_affiliate_referrer=';
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(affCookieName) === 0) {
      return decodeURIComponent(cookie.substring(affCookieName.length));
    }
  }
  
  return null;
}
