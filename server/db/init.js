import db from './index.js';

// Initialize database tables
export function initDatabase() {
  // Users table (email-only for now, TODO: add auth)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Feeds table (news feed items)
  db.exec(`
    CREATE TABLE IF NOT EXISTS feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      author_avatar TEXT,
      image_url TEXT,
      category TEXT,
      read_time INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Saved feeds table (user's saved items)
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      feed_id INTEGER NOT NULL,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_email) REFERENCES users(email),
      FOREIGN KEY (feed_id) REFERENCES feeds(id),
      UNIQUE(user_email, feed_id)
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_feeds_created_at ON feeds(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_saved_feeds_user ON saved_feeds(user_email);
    CREATE INDEX IF NOT EXISTS idx_saved_feeds_feed ON saved_feeds(feed_id);
  `);

  // Seed sample feeds if empty
  const count = db.prepare('SELECT COUNT(*) as count FROM feeds').get();
  if (count.count === 0) {
    seedFeeds();
  }
}

function seedFeeds() {
  const insert = db.prepare(`
    INSERT INTO feeds (title, content, author, author_avatar, image_url, category, read_time)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const sampleFeeds = [
    {
      title: 'The Future of AI in Creative Industries',
      content: 'Artificial intelligence is reshaping how artists, writers, and designers work. From generating initial concepts to refining final pieces, AI tools are becoming creative partners rather than replacements.',
      author: 'Sarah Chen',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
      image_url: 'https://picsum.photos/seed/ai-creative/800/450',
      category: 'Technology',
      read_time: 8
    },
    {
      title: 'Building Sustainable Cities for the Future',
      content: 'Urban planners are reimagining cities with green corridors, pedestrian-first design, and circular economies. Copenhagen and Singapore lead the way with innovative approaches to sustainable urban living.',
      author: 'Marcus Johnson',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marcus',
      image_url: 'https://picsum.photos/seed/sustainable-city/800/450',
      category: 'Environment',
      read_time: 6
    },
    {
      title: 'The Psychology of Habit Formation',
      content: 'Understanding the habit loop—cue, routine, reward—can transform how we build better habits. Small changes in environment design often matter more than willpower alone.',
      author: 'Dr. Emily Rodriguez',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emily',
      image_url: 'https://picsum.photos/seed/habits/800/450',
      category: 'Psychology',
      read_time: 7
    },
    {
      title: 'Quantum Computing: Beyond the Hype',
      content: 'Quantum computers won\'t replace classical computers—they\'ll solve specific problems exponentially faster. Drug discovery, cryptography, and optimization are the first real-world applications.',
      author: 'Prof. David Kim',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
      image_url: 'https://picsum.photos/seed/quantum/800/450',
      category: 'Science',
      read_time: 10
    },
    {
      title: 'The Art of Minimalist Design',
      content: 'Less is more—but only when every element serves a purpose. Dieter Rams\' principles still guide modern digital design, from typography to interaction patterns.',
      author: 'Lisa Park',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa',
      image_url: 'https://picsum.photos/seed/minimalism/800/450',
      category: 'Design',
      read_time: 5
    },
    {
      title: 'Remote Work: Three Years Later',
      content: 'The great remote work experiment has reshaped how companies think about productivity, culture, and space. Hybrid models are emerging as the dominant paradigm.',
      author: 'James Wilson',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=james',
      image_url: 'https://picsum.photos/seed/remote-work/800/450',
      category: 'Work',
      read_time: 6
    },
    {
      title: 'Ocean Cleanup: Technology Meets Ecology',
      content: 'Innovative systems are removing plastic from oceans at scale. The Interceptor river systems prevent waste from reaching the sea, while ocean arrays collect existing debris.',
      author: 'Maria Santos',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maria',
      image_url: 'https://picsum.photos/seed/ocean-cleanup/800/450',
      category: 'Environment',
      read_time: 7
    },
    {
      title: 'The Science of Deep Work',
      content: 'In a world of constant distraction, the ability to focus deeply is becoming a superpower. Cal Newport\'s principles show how to cultivate sustained attention for meaningful work.',
      author: 'Alex Thompson',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
      image_url: 'https://picsum.photos/seed/deep-work/800/450',
      category: 'Productivity',
      read_time: 8
    },
    {
      title: 'Renewable Energy Breakthroughs in 2024',
      content: 'Perovskite solar cells, advanced battery storage, and green hydrogen are reaching commercial viability. The energy transition is accelerating faster than most predictions.',
      author: 'Dr. Priya Sharma',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya',
      image_url: 'https://picsum.photos/seed/renewable/800/450',
      category: 'Technology',
      read_time: 9
    },
    {
      title: 'Storytelling in the Age of Short Attention Spans',
      content: 'TikTok and Reels changed how stories are told. But the fundamentals—conflict, character, resolution—remain. The best creators adapt timeless structures to new formats.',
      author: 'Rachel Kim',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rachel',
      image_url: 'https://picsum.photos/seed/storytelling/800/450',
      category: 'Media',
      read_time: 6
    },
    {
      title: 'The Biology of Sleep and Performance',
      content: 'Sleep isn\'t passive downtime—it\'s active maintenance. Glymphatic clearance, memory consolidation, and hormone regulation all depend on quality sleep cycles.',
      author: 'Dr. Michael Chen',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael',
      image_url: 'https://picsum.photos/seed/sleep/800/450',
      category: 'Health',
      read_time: 7
    },
    {
      title: 'Space Exploration: The New Golden Age',
      content: 'Private companies and national agencies are returning to the Moon and targeting Mars. Reusable rockets have reduced launch costs by 90%, opening new possibilities.',
      author: 'Astronaut Lisa Wong',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa-wong',
      image_url: 'https://picsum.photos/seed/space/800/450',
      category: 'Science',
      read_time: 8
    },
    {
      title: 'Mindful Technology: Designing for Well-being',
      content: 'Digital wellness features—screen time limits, focus modes, grayscale displays—are becoming standard. The next frontier: designing apps that respect attention by default.',
      author: 'Jordan Lee',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jordan',
      image_url: 'https://picsum.photos/seed/mindful-tech/800/450',
      category: 'Technology',
      read_time: 5
    },
    {
      title: 'The Economics of Climate Change',
      content: 'Climate change isn\'t just environmental—it\'s economic. Carbon pricing, green bonds, and climate risk disclosure are reshaping financial markets worldwide.',
      author: 'Prof. Robert Chang',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=robert',
      image_url: 'https://picsum.photos/seed/climate-econ/800/450',
      category: 'Economics',
      read_time: 9
    },
    {
      title: 'Learning How to Learn: Evidence-Based Strategies',
      content: 'Spaced repetition, active recall, and interleaving outperform re-reading and highlighting. Understanding how memory works transforms how we acquire new skills.',
      author: 'Dr. Amanda Foster',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=amanda',
      image_url: 'https://picsum.photos/seed/learning/800/450',
      category: 'Education',
      read_time: 7
    },
    {
      title: 'The Rise of Vertical Farming',
      content: 'Indoor farms using hydroponics and LED lighting grow food year-round with 95% less water. Urban agriculture could transform food security in dense cities.',
      author: 'Carlos Mendoza',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos',
      image_url: 'https://picsum.photos/seed/vertical-farm/800/450',
      category: 'Environment',
      read_time: 6
    },
    {
      title: 'Cryptocurrency Beyond Speculation',
      content: 'Beyond price charts, blockchain enables programmable money, decentralized identity, and new ownership models. The infrastructure layer is maturing rapidly.',
      author: 'Priya Nair',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya-nair',
      image_url: 'https://picsum.photos/seed/crypto/800/450',
      category: 'Technology',
      read_time: 8
    },
    {
      title: 'The Psychology of Decision Making',
      content: 'System 1 and System 2 thinking explain why we make irrational choices. Understanding cognitive biases helps us design better systems and make wiser decisions.',
      author: 'Dr. Kevin Park',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kevin',
      image_url: 'https://picsum.photos/seed/decision-making/800/450',
      category: 'Psychology',
      read_time: 7
    },
    {
      title: 'Sustainable Fashion: From Trend to Necessity',
      content: 'Fast fashion\'s environmental cost is staggering. Circular design, bio-materials, and rental models are creating a more sustainable industry—if consumers embrace them.',
      author: 'Sofia Andersson',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sofia',
      image_url: 'https://picsum.photos/seed/sustainable-fashion/800/450',
      category: 'Environment',
      read_time: 6
    },
    {
      title: 'The Future of Human-Computer Interaction',
      content: 'Voice, gesture, eye-tracking, and brain-computer interfaces are moving beyond screens. Spatial computing blends digital and physical worlds in unprecedented ways.',
      author: 'Dr. Thomas Mueller',
      author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=thomas',
      image_url: 'https://picsum.photos/seed/hci/800/450',
      category: 'Technology',
      read_time: 9
    }
  ];

  const insertMany = db.transaction((feeds) => {
    for (const feed of feeds) {
      insert.run(feed.title, feed.content, feed.author, feed.author_avatar, feed.image_url, feed.category, feed.read_time);
    }
  });

  insertMany(sampleFeeds);
  console.log(`Seeded ${sampleFeeds.length} sample feeds`);
}

export default initDatabase;