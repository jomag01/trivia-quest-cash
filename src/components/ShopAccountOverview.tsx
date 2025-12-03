import { Package, Users, Calculator, Award, ShoppingBag, Heart } from "lucide-react";
import { Link } from "react-router-dom";

const ShopAccountOverview = () => {
  const quickLinks = [
    { icon: Package, label: "Orders", href: "/dashboard?tab=orders" },
    { icon: Users, label: "Network", href: "/dashboard?tab=network" },
    { icon: Calculator, label: "Calculator", href: "/dashboard?tab=earnings" },
    { icon: Award, label: "Leadership", href: "/dashboard?tab=leadership" },
    { icon: ShoppingBag, label: "Cart", href: "/dashboard?tab=cart" },
    { icon: Heart, label: "Wishlist", href: "/dashboard?tab=wishlist" },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto py-2 px-1 scrollbar-hide">
      {quickLinks.map((item) => (
        <Link
          key={item.label}
          to={item.href}
          className="flex flex-col items-center gap-1 min-w-[50px] text-center"
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <item.icon className="w-4 h-4 text-gray-700" />
          </div>
          <span className="text-[10px] text-gray-600 font-medium">{item.label}</span>
        </Link>
      ))}
    </div>
  );
};

export default ShopAccountOverview;
