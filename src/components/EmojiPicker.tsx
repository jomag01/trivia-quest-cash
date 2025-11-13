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
      <PopoverContent className="w-80 p-0" align="start">
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-4">
            {Object.entries(emojiCategories).map(([category, emojis]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                  {category}
                </h4>
                <div className="grid grid-cols-5 gap-2">
                  {emojis.map((emoji) => (
                    <Button
                      key={emoji}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0 text-2xl hover:bg-accent"
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
