import { Package, Users, Calculator, Award, ShoppingCart, Heart, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ShopAccountOverview = () => {
  const navigate = useNavigate();
  
  const quickLinks = [
    { icon: Package, label: "Orders", href: "/dashboard?tab=orders", color: "bg-blue-100 text-blue-600" },
    { icon: Users, label: "Network", href: "/dashboard?tab=network", color: "bg-purple-100 text-purple-600" },
    { icon: Calculator, label: "Calculator", href: "/dashboard?tab=earnings", color: "bg-green-100 text-green-600" },
    { icon: Award, label: "Leadership", href: "/dashboard?tab=leadership", color: "bg-yellow-100 text-yellow-600" },
    { icon: ShoppingCart, label: "Cart", href: "/dashboard?tab=cart", color: "bg-red-100 text-red-600" },
    { icon: Heart, label: "Wishlist", href: "/dashboard?tab=wishlist", color: "bg-pink-100 text-pink-600" },
    { icon: Store, label: "Seller", href: "/seller-dashboard", color: "bg-orange-100 text-orange-600" },
  ];

  const handleClick = (href: string) => {
    navigate(href);
  };

  return (
    <div className="flex gap-3 overflow-x-auto py-2 px-1 scrollbar-hide">
      {quickLinks.map((item) => (
        <button
          key={item.label}
          onClick={() => handleClick(item.href)}
          className="flex flex-col items-center gap-1 min-w-[50px] text-center"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.color}`}>
            <item.icon className="w-4 h-4" />
          </div>
          <span className="text-[10px] text-gray-700 font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ShopAccountOverview;
