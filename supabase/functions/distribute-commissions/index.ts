import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommissionDistribution {
  userId: string;
  amount: number;
  level: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    console.log('Processing commissions for order:', orderId);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    console.log('Order found:', order);

    // Calculate total commission amount from all order items
    let totalCommission = 0;
    for (const item of order.order_items) {
      const commissionAmount = (item.total_price * item.commission_percentage) / 100;
      totalCommission += commissionAmount;
    }

    console.log('Total commission to distribute:', totalCommission);

    // Get user's referral chain
    const { data: userReferral, error: referralError } = await supabase
      .from('referrals')
      .select('referred_by')
      .eq('user_id', order.user_id)
      .maybeSingle();

    if (referralError) {
      console.error('Error fetching referral:', referralError);
    }

    console.log('User referral:', userReferral);

    // Define commission distribution percentages per level
    const commissionLevels = [
      { level: 1, percentage: 50 }, // Direct referrer gets 50%
      { level: 2, percentage: 30 }, // Second level gets 30%
      { level: 3, percentage: 20 }, // Third level gets 20%
    ];

    const distributions: CommissionDistribution[] = [];
    let currentUserId = userReferral?.referred_by;
    let currentLevel = 1;

    // Traverse up the referral chain
    while (currentUserId && currentLevel <= 3) {
      const levelConfig = commissionLevels.find(l => l.level === currentLevel);
      if (!levelConfig) break;

      const commissionAmount = (totalCommission * levelConfig.percentage) / 100;

      distributions.push({
        userId: currentUserId,
        amount: commissionAmount,
        level: currentLevel
      });

      console.log(`Level ${currentLevel}: User ${currentUserId} gets ₱${commissionAmount.toFixed(2)}`);

      // Get next level referrer
      const { data: nextReferral } = await supabase
        .from('referrals')
        .select('referred_by')
        .eq('user_id', currentUserId)
        .maybeSingle();

      currentUserId = nextReferral?.referred_by;
      currentLevel++;
    }

    // Insert commission records
    if (distributions.length > 0) {
      const commissionRecords = distributions.map(dist => ({
        order_id: orderId,
        user_id: dist.userId,
        amount: dist.amount,
        level: dist.level,
        status: 'pending'
      }));

      const { error: commissionError } = await supabase
        .from('commissions')
        .insert(commissionRecords);

      if (commissionError) {
        console.error('Error inserting commissions:', commissionError);
        throw commissionError;
      }

      // Update user balances
      for (const dist of distributions) {
        const { error: balanceError } = await supabase.rpc('increment_balance', {
          user_id: dist.userId,
          amount: dist.amount
        });

        if (balanceError) {
          console.error('Error updating balance for user', dist.userId, balanceError);
        }
      }

      console.log('Commissions distributed successfully');
    } else {
      console.log('No upline found, no commissions to distribute');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        distributedCount: distributions.length,
        totalDistributed: distributions.reduce((sum, d) => sum + d.amount, 0)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error distributing commissions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
