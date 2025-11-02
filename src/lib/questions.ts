export interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
}

export const questionsByCategory: Record<string, Question[]> = {
  general: [
    { question: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"], correctAnswer: 2, category: "general" },
    { question: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correctAnswer: 1, category: "general" },
    { question: "What is the largest ocean on Earth?", options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"], correctAnswer: 3, category: "general" },
    { question: "In which year did World War II end?", options: ["1943", "1944", "1945", "1946"], correctAnswer: 2, category: "general" },
    { question: "What is the smallest prime number?", options: ["0", "1", "2", "3"], correctAnswer: 2, category: "general" },
    { question: "Which country has the largest population?", options: ["USA", "India", "China", "Russia"], correctAnswer: 2, category: "general" },
    { question: "What is the main ingredient in guacamole?", options: ["Tomato", "Avocado", "Pepper", "Onion"], correctAnswer: 1, category: "general" },
    { question: "How many continents are there?", options: ["5", "6", "7", "8"], correctAnswer: 2, category: "general" },
    { question: "What is the largest mammal?", options: ["Elephant", "Blue Whale", "Giraffe", "Shark"], correctAnswer: 1, category: "general" },
    { question: "Which gas do plants absorb?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Helium"], correctAnswer: 2, category: "general" }
  ],
  science: [
    { question: "What is the chemical symbol for gold?", options: ["Go", "Au", "Gd", "Ag"], correctAnswer: 1, category: "science" },
    { question: "What is the speed of light in vacuum (approximately)?", options: ["300,000 km/s", "150,000 km/s", "450,000 km/s", "200,000 km/s"], correctAnswer: 0, category: "science" },
    { question: "What is H2O commonly known as?", options: ["Oxygen", "Hydrogen", "Water", "Acid"], correctAnswer: 2, category: "science" },
    { question: "How many bones are in the human body?", options: ["186", "206", "226", "246"], correctAnswer: 1, category: "science" },
    { question: "What is the largest planet in our solar system?", options: ["Saturn", "Jupiter", "Neptune", "Uranus"], correctAnswer: 1, category: "science" },
    { question: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Chloroplast"], correctAnswer: 2, category: "science" },
    { question: "What is the hardest natural substance on Earth?", options: ["Gold", "Iron", "Diamond", "Steel"], correctAnswer: 2, category: "science" },
    { question: "At what temperature does water boil (Celsius)?", options: ["90°C", "100°C", "110°C", "120°C"], correctAnswer: 1, category: "science" },
    { question: "What is the most abundant gas in Earth's atmosphere?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], correctAnswer: 2, category: "science" },
    { question: "How many chromosomes do humans have?", options: ["23", "46", "52", "64"], correctAnswer: 1, category: "science" }
  ],
  history: [
    { question: "Who painted the Mona Lisa?", options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"], correctAnswer: 2, category: "history" },
    { question: "Who wrote 'Romeo and Juliet'?", options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"], correctAnswer: 1, category: "history" },
    { question: "In what year did the Titanic sink?", options: ["1910", "1912", "1914", "1916"], correctAnswer: 1, category: "history" },
    { question: "Who was the first president of the United States?", options: ["Thomas Jefferson", "Abraham Lincoln", "George Washington", "John Adams"], correctAnswer: 2, category: "history" },
    { question: "Which ancient wonder is still standing?", options: ["Colossus of Rhodes", "Hanging Gardens", "Great Pyramid of Giza", "Lighthouse of Alexandria"], correctAnswer: 2, category: "history" },
    { question: "Who invented the telephone?", options: ["Thomas Edison", "Nikola Tesla", "Alexander Graham Bell", "Benjamin Franklin"], correctAnswer: 2, category: "history" },
    { question: "What year did the Berlin Wall fall?", options: ["1987", "1988", "1989", "1990"], correctAnswer: 2, category: "history" },
    { question: "Who was the first person to walk on the moon?", options: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "Alan Shepard"], correctAnswer: 1, category: "history" },
    { question: "In which year did India gain independence?", options: ["1945", "1947", "1950", "1952"], correctAnswer: 1, category: "history" },
    { question: "Who discovered penicillin?", options: ["Louis Pasteur", "Marie Curie", "Alexander Fleming", "Jonas Salk"], correctAnswer: 2, category: "history" }
  ],
  entertainment: [
    { question: "Who directed 'Jurassic Park'?", options: ["George Lucas", "Steven Spielberg", "James Cameron", "Christopher Nolan"], correctAnswer: 1, category: "entertainment" },
    { question: "Which band released 'Bohemian Rhapsody'?", options: ["The Beatles", "Led Zeppelin", "Queen", "Pink Floyd"], correctAnswer: 2, category: "entertainment" },
    { question: "What is the highest-grossing film of all time?", options: ["Titanic", "Avatar", "Avengers: Endgame", "Star Wars"], correctAnswer: 1, category: "entertainment" },
    { question: "Who played Iron Man in Marvel movies?", options: ["Chris Evans", "Robert Downey Jr.", "Mark Ruffalo", "Chris Hemsworth"], correctAnswer: 1, category: "entertainment" },
    { question: "Which streaming service created 'Stranger Things'?", options: ["HBO", "Disney+", "Netflix", "Amazon Prime"], correctAnswer: 2, category: "entertainment" },
    { question: "Who won the first season of American Idol?", options: ["Carrie Underwood", "Kelly Clarkson", "Jennifer Hudson", "Adam Lambert"], correctAnswer: 1, category: "entertainment" },
    { question: "What is the name of Harry Potter's owl?", options: ["Scabbers", "Crookshanks", "Hedwig", "Fawkes"], correctAnswer: 2, category: "entertainment" },
    { question: "Which movie won the Best Picture Oscar in 2020?", options: ["1917", "Joker", "Parasite", "Once Upon a Time"], correctAnswer: 2, category: "entertainment" },
    { question: "Who is the lead singer of Coldplay?", options: ["Chris Martin", "Bono", "Adam Levine", "Brandon Flowers"], correctAnswer: 0, category: "entertainment" },
    { question: "What is the longest-running Broadway show?", options: ["The Lion King", "Cats", "The Phantom of the Opera", "Chicago"], correctAnswer: 2, category: "entertainment" }
  ],
  sports: [
    { question: "Which country hosted the 2016 Olympics?", options: ["China", "UK", "Brazil", "Russia"], correctAnswer: 2, category: "sports" },
    { question: "How many players are on a soccer team?", options: ["9", "10", "11", "12"], correctAnswer: 2, category: "sports" },
    { question: "Which sport uses a shuttlecock?", options: ["Tennis", "Badminton", "Squash", "Table Tennis"], correctAnswer: 1, category: "sports" },
    { question: "What is the diameter of a basketball hoop (in inches)?", options: ["16", "18", "20", "22"], correctAnswer: 1, category: "sports" },
    { question: "Who has won the most Olympic gold medals?", options: ["Usain Bolt", "Michael Phelps", "Simone Biles", "Carl Lewis"], correctAnswer: 1, category: "sports" },
    { question: "In which sport would you perform a 'slam dunk'?", options: ["Volleyball", "Basketball", "Tennis", "Handball"], correctAnswer: 1, category: "sports" },
    { question: "How many Grand Slam tournaments are there in tennis?", options: ["3", "4", "5", "6"], correctAnswer: 1, category: "sports" },
    { question: "What is the national sport of Japan?", options: ["Karate", "Judo", "Sumo Wrestling", "Kendo"], correctAnswer: 2, category: "sports" },
    { question: "How long is a marathon?", options: ["26.2 miles", "24.8 miles", "28.4 miles", "30.1 miles"], correctAnswer: 0, category: "sports" },
    { question: "Which country won the FIFA World Cup 2018?", options: ["Germany", "Brazil", "France", "Argentina"], correctAnswer: 2, category: "sports" }
  ],
  geography: [
    { question: "Which country is home to the kangaroo?", options: ["New Zealand", "South Africa", "Australia", "Brazil"], correctAnswer: 2, category: "geography" },
    { question: "What is the capital of Japan?", options: ["Osaka", "Kyoto", "Tokyo", "Hiroshima"], correctAnswer: 2, category: "geography" },
    { question: "Which river is the longest in the world?", options: ["Amazon", "Nile", "Yangtze", "Mississippi"], correctAnswer: 1, category: "geography" },
    { question: "What is the smallest country in the world?", options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], correctAnswer: 1, category: "geography" },
    { question: "Mount Everest is located in which mountain range?", options: ["Alps", "Andes", "Himalayas", "Rockies"], correctAnswer: 2, category: "geography" },
    { question: "Which desert is the largest in the world?", options: ["Sahara", "Gobi", "Arabian", "Antarctic"], correctAnswer: 3, category: "geography" },
    { question: "What is the capital of Canada?", options: ["Toronto", "Vancouver", "Ottawa", "Montreal"], correctAnswer: 2, category: "geography" },
    { question: "Which ocean is the smallest?", options: ["Indian", "Atlantic", "Arctic", "Southern"], correctAnswer: 2, category: "geography" },
    { question: "In which continent is Egypt located?", options: ["Asia", "Africa", "Europe", "Middle East"], correctAnswer: 1, category: "geography" },
    { question: "What is the tallest waterfall in the world?", options: ["Niagara Falls", "Victoria Falls", "Angel Falls", "Iguazu Falls"], correctAnswer: 2, category: "geography" }
  ],
  scrambled: [
    { question: "Unscramble: PELPA", options: ["APPLE", "APPLY", "PALPE", "PAPEL"], correctAnswer: 0, category: "scrambled" },
    { question: "Unscramble: TEWRA", options: ["WATER", "WEART", "TWARE", "REAWT"], correctAnswer: 0, category: "scrambled" },
    { question: "Unscramble: SOHEU", options: ["HOUSE", "HOCUS", "HUSEO", "SHOUT"], correctAnswer: 0, category: "scrambled" },
    { question: "Unscramble: KBOO", options: ["BOOK", "BOKO", "KOBO", "BOOB"], correctAnswer: 0, category: "scrambled" },
    { question: "Unscramble: EOHPN", options: ["PHONE", "HOPEN", "EPHON", "NOHEP"], correctAnswer: 0, category: "scrambled" },
    { question: "Unscramble: UMSCI", options: ["MUSIC", "SUMCI", "MICUS", "CUSIM"], correctAnswer: 0, category: "scrambled" },
    { question: "Unscramble: LEOWFR", options: ["FLOWER", "FOWLER", "WOLFER", "REFLWO"], correctAnswer: 0, category: "scrambled" },
    { question: "Unscramble: EMNOY", options: ["MONEY", "NOYME", "MEONY", "YENOM"], correctAnswer: 0, category: "scrambled" },
    { question: "Unscramble: NGARED", options: ["GARDEN", "DANGER", "GARNED", "NRAGED"], correctAnswer: 0, category: "scrambled" },
    { question: "Unscramble: CSHOOL", options: ["SCHOOL", "CHOLOS", "SOCHOL", "LOCHSO"], correctAnswer: 0, category: "scrambled" },
    { question: "Unscramble: DRIENF", options: ["FRIEND", "FINDER", "REDFIN", "KINDER"], correctAnswer: 0, category: "scrambled" },
    { question: "Unscramble: TMEHOR", options: ["MOTHER", "HERMIT", "THERMO", "HAMTER"], correctAnswer: 0, category: "scrambled" },
    { question: "Unscramble: TEWRIN", options: ["WINTER", "TWINER", "WRITEN", "INTREW"], correctAnswer: 0, category: "scrambled" },
    { question: "Unscramble: SUMERM", options: ["SUMMER", "RESUME", "MUNSER", "UNSMER"], correctAnswer: 0, category: "scrambled" },
    { question: "Unscramble: GNOINRM", options: ["MORNING", "NORMING", "IGNORING", "RONGING"], correctAnswer: 0, category: "scrambled" }
  ]
};

export const getCategoryQuestions = (category: string): Question[] => {
  return questionsByCategory[category] || questionsByCategory.general;
};

export const getAllCategories = () => {
  return [
    { slug: "general", title: "General Knowledge", icon: "🌍" },
    { slug: "science", title: "Science & Tech", icon: "🔬" },
    { slug: "history", title: "History", icon: "📚" },
    { slug: "entertainment", title: "Entertainment", icon: "🎬" },
    { slug: "sports", title: "Sports", icon: "⚽" },
    { slug: "geography", title: "Geography", icon: "🗺️" },
    { slug: "scrambled", title: "Scrambled Words", icon: "🔀" }
  ];
};