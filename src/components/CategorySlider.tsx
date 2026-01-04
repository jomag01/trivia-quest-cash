import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface CategorySliderProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

const CategorySlider = ({ categories, selectedCategory, onSelectCategory }: CategorySliderProps) => {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-1.5 py-1 pr-2 snap-x snap-mandatory">
        <button
          type="button"
          onClick={() => onSelectCategory("all")}
          aria-pressed={selectedCategory === "all"}
          className={`shrink-0 snap-start px-2 py-1 rounded-full text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            selectedCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            type="button"
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            aria-pressed={selectedCategory === cat.id}
            className={`shrink-0 snap-start px-2 py-1 rounded-full text-[10px] font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {cat.icon && <span className="mr-0.5 text-xs">{cat.icon}</span>}
            {cat.name}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export default CategorySlider;
