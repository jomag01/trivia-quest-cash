import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const emojiCategories = {
  "Old Testament": ["🏺", "🔦", "🎺", "📜", "⚱️", "🕯️", "🪔", "🔔", "⚖️", "🗿"],
  "Treasures": ["💎", "👑", "💰", "🏆", "⭐", "💍", "🔱", "🗝️", "🎁", "🪙"],
  "Ancient Tools": ["⚔️", "🗡️", "🛡️", "🏹", "⚒️", "🔨", "⛏️", "🪓", "🔧", "⚙️"],
  "Mystical": ["🔮", "✨", "🌟", "💫", "⚡", "🌙", "☀️", "🌈", "🦅", "🕊️"],
  "Nature": ["🌿", "🍃", "🌺", "🌸", "🌻", "🦋", "🐚", "🪶", "🌾", "🍀"],
  "Egyptian": ["🐫", "🏜️", "🪲", "🐍", "🦂", "🦅", "🔺", "🏛️", "🗿", "📿"],
  "Roman": ["🏛️", "🏺", "⚱️", "🗿", "🏹", "🛡️", "⚔️", "🪙", "👑", "🏆"],
  "Medieval": ["🏰", "🗡️", "🛡️", "👑", "🏹", "⚔️", "🔱", "🏺", "📖", "🕯️"],
  "Fruits": ["🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍒", "🍑", "🥭", "🍍", "🥝", "🍐", "🍏", "🥥"],
  "Animals": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵"],
  "Cars": ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🏍️"],
  "Electronics": ["📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "💾", "💿", "📀", "📷", "📹", "📺", "📻", "⏰", "⌚"],
  "Gadgets": ["🔋", "🔌", "💡", "🔦", "🕯️", "🧯", "🛠️", "🔧", "🔨", "⚙️", "🔩", "⚡", "🔬", "🔭", "📡"],
  "Things": ["⚽", "🏀", "🏈", "⚾", "🎾", "🎱", "🎮", "🎲", "🎯", "🎪", "🎨", "🎭", "🎪", "🎺", "🎸"],
};

export const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Smile className="w-4 h-4 mr-2" />
          Pick Emoji
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 bg-popover" align="start" sideOffset={5}>
        <ScrollArea className="h-[320px]">
          <div className="p-3 space-y-3">
            {Object.entries(emojiCategories).map(([category, emojis]) => (
              <div key={category}>
                <h4 className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  {category}
                </h4>
                <div className="grid grid-cols-6 gap-1">
                  {emojis.map((emoji) => (
                    <Button
                      key={emoji}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-xl hover:bg-accent transition-colors"
                      onClick={() => onEmojiSelect(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
