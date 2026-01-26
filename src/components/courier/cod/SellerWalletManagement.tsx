import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Search, ArrowUpRight } from "lucide-react";
import { useState } from "react";

const SellerWalletManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: wallets, isLoading } = useQuery({
    queryKey: ["seller-wallets", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("courier_seller_wallets")
        .select(`
          *,
          seller:profiles(full_name, email)
        `)
        .order("balance", { ascending: false });

      const { data } = await query;
      
      if (searchTerm && data) {
        return data.filter((w: any) => 
          w.seller?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.seller?.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      return data || [];
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search seller..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wallets?.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No seller wallets found</p>
            </CardContent>
          </Card>
        ) : (
          wallets?.map((wallet: any) => (
            <Card key={wallet.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{wallet.seller?.full_name || "Unknown"}</CardTitle>
                  <Badge variant="outline">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{wallet.seller?.email}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Balance:</span>
                  <span className="text-xl font-bold">₱{wallet.balance?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Pending:</span>
                  <span>₱{wallet.pending_credit?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Credited:</span>
                  <span>₱{wallet.total_credited?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Withdrawn:</span>
                  <span>₱{wallet.total_withdrawn?.toLocaleString() || 0}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  View Transactions
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SellerWalletManagement;
