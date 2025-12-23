import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatMoney = (amount: number) => `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

import {
  Building2, 
  DollarSign, 
  TrendingUp, 
  Package,
  Percent,
  Search,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Wallet
} from "lucide-react";

interface SupplierSalesData {
  supplierId: string;
  supplierName: string;
  companyName: string;
  totalSales: number;
  productsSold: number;
  commissionRate: number;
  adminCommission: number;
  supplierEarnings: number;
  pendingPayment: number;
  status: string;
}

export default function SupplierSalesReport() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch supplier sales data
  const { data: supplierSales = [], isLoading } = useQuery({
    queryKey: ["admin-supplier-sales"],
    queryFn: async () => {
      // Fetch all approved suppliers
      const { data: suppliers, error: suppliersError } = await supabase
        .from("suppliers")
        .select("*")
        .eq("status", "approved");

      if (suppliersError) throw suppliersError;

      const salesData: SupplierSalesData[] = [];

      for (const supplier of suppliers || []) {
        // Fetch products and their sales
        const { data: products } = await supabase
          .from("supplier_products")
          .select("id, supplier_price")
          .eq("supplier_id", supplier.id)
          .eq("status", "approved");

        // Fetch order items for supplier products
        const { data: orderItems } = await supabase
          .from("order_items")
          .select(`
            quantity,
            unit_price,
            subtotal,
            orders!inner(status)
          `)
          .eq("supplier_id", supplier.id)
          .in("orders.status", ["delivered", "completed"]);

        const totalSales = orderItems?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0;
        const productsSold = orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        
        // Default commission rate is 15%
        const commissionRate = 15;
        const adminCommission = totalSales * (commissionRate / 100);
        const supplierEarnings = totalSales - adminCommission;

        // Calculate pending payment (not yet paid to supplier)
        const { data: paidCommissions } = await supabase
          .from("retailer_supplier_commissions")
          .select("commission_amount")
          .eq("supplier_id", supplier.id)
          .eq("status", "paid");

        const totalPaid = paidCommissions?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;
        const pendingPayment = supplierEarnings - totalPaid;

        salesData.push({
          supplierId: supplier.id,
          supplierName: supplier.contact_name || "Unknown",
          companyName: supplier.company_name,
          totalSales,
          productsSold,
          commissionRate,
          adminCommission,
          supplierEarnings,
          pendingPayment: Math.max(0, pendingPayment),
          status: supplier.status
        });
      }

      return salesData;
    }
  });

  // Calculate totals
  const totals = supplierSales.reduce((acc, supplier) => ({
    totalSales: acc.totalSales + supplier.totalSales,
    adminCommission: acc.adminCommission + supplier.adminCommission,
    supplierEarnings: acc.supplierEarnings + supplier.supplierEarnings,
    pendingPayment: acc.pendingPayment + supplier.pendingPayment
  }), { totalSales: 0, adminCommission: 0, supplierEarnings: 0, pendingPayment: 0 });

  const filteredSuppliers = supplierSales.filter(supplier => {
    const matchesSearch = 
      supplier.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "pending" && supplier.pendingPayment > 0) ||
      (statusFilter === "paid" && supplier.pendingPayment === 0);
    return matchesSearch && matchesStatus;
  });

  const exportReport = () => {
    const csv = [
      ["Supplier", "Company", "Total Sales", "Commission Rate", "Admin Commission", "Supplier Earnings", "Pending Payment"],
      ...filteredSuppliers.map(s => [
        s.supplierName,
        s.companyName,
        s.totalSales.toFixed(2),
        `${s.commissionRate}%`,
        s.adminCommission.toFixed(2),
        s.supplierEarnings.toFixed(2),
        s.pendingPayment.toFixed(2)
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supplier-sales-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totals.totalSales)}</p>
                <p className="text-sm text-muted-foreground">Total Supplier Sales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Percent className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totals.adminCommission)}</p>
                <p className="text-sm text-muted-foreground">Admin Commission</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totals.supplierEarnings)}</p>
                <p className="text-sm text-muted-foreground">Supplier Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Wallet className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totals.pendingPayment)}</p>
                <p className="text-sm text-muted-foreground">Owed to Suppliers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            <SelectItem value="pending">Pending Payment</SelectItem>
            <SelectItem value="paid">Fully Paid</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportReport}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Supplier Sales Report
          </CardTitle>
          <CardDescription>Track supplier sales and commission payouts</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No supplier sales data found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Supplier</th>
                    <th className="text-right py-3 px-2 font-medium">Products Sold</th>
                    <th className="text-right py-3 px-2 font-medium">Total Sales</th>
                    <th className="text-right py-3 px-2 font-medium">Commission</th>
                    <th className="text-right py-3 px-2 font-medium">Supplier Earnings</th>
                    <th className="text-right py-3 px-2 font-medium">Pending Payment</th>
                    <th className="text-center py-3 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.supplierId} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">{supplier.companyName}</p>
                          <p className="text-xs text-muted-foreground">{supplier.supplierName}</p>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2">{supplier.productsSold}</td>
                      <td className="text-right py-3 px-2 font-medium text-green-600">
                        {formatCurrency(supplier.totalSales)}
                      </td>
                      <td className="text-right py-3 px-2">
                        <span className="text-muted-foreground">{supplier.commissionRate}%</span>
                        <br />
                        <span className="font-medium">{formatCurrency(supplier.adminCommission)}</span>
                      </td>
                      <td className="text-right py-3 px-2 font-medium text-blue-600">
                        {formatCurrency(supplier.supplierEarnings)}
                      </td>
                      <td className="text-right py-3 px-2">
                        {supplier.pendingPayment > 0 ? (
                          <span className="font-medium text-orange-600">
                            {formatCurrency(supplier.pendingPayment)}
                          </span>
                        ) : (
                          <span className="text-green-600">Paid</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {supplier.pendingPayment > 0 ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Paid
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/50">
                  <tr className="font-bold">
                    <td className="py-3 px-2">TOTAL</td>
                    <td className="text-right py-3 px-2">
                      {filteredSuppliers.reduce((sum, s) => sum + s.productsSold, 0)}
                    </td>
                    <td className="text-right py-3 px-2 text-green-600">
                      {formatCurrency(filteredSuppliers.reduce((sum, s) => sum + s.totalSales, 0))}
                    </td>
                    <td className="text-right py-3 px-2">
                      {formatCurrency(filteredSuppliers.reduce((sum, s) => sum + s.adminCommission, 0))}
                    </td>
                    <td className="text-right py-3 px-2 text-blue-600">
                      {formatCurrency(filteredSuppliers.reduce((sum, s) => sum + s.supplierEarnings, 0))}
                    </td>
                    <td className="text-right py-3 px-2 text-orange-600">
                      {formatCurrency(filteredSuppliers.reduce((sum, s) => sum + s.pendingPayment, 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
