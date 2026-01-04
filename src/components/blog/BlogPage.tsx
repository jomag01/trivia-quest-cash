import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, Search, Clock, Eye, Calendar, ChevronRight, 
  Newspaper, BookOpen, Star, ArrowLeft, User, Tag,
  Share2, Loader2, TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  category_id: string | null;
  author_name: string | null;
  post_type: string;
  is_featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
  reading_time_minutes: number;
  view_count: number;
  like_count: number;
  published_at: string | null;
  created_at: string;
  blog_categories?: BlogCategory;
}

const BlogPage = () => {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  // Update page title when viewing a post
  useEffect(() => {
    if (selectedPost) {
      document.title = selectedPost.meta_title || selectedPost.title;
    } else {
      document.title = 'Tech Blog - Latest Technology News & Articles';
    }
  }, [selectedPost]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, postRes] = await Promise.all([
        supabase.from('blog_categories').select('*').eq('is_active', true).order('display_order'),
        supabase.from('blog_posts').select('*, blog_categories(*)').eq('status', 'published').order('published_at', { ascending: false })
      ]);
      
      if (catRes.data) setCategories(catRes.data);
      if (postRes.data) {
        const allPosts = postRes.data as BlogPost[];
        setPosts(allPosts);
        setFeaturedPosts(allPosts.filter(p => p.is_featured));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openPost = async (post: BlogPost) => {
    setSelectedPost(post);
    // Increment view count
    await supabase
      .from('blog_posts')
      .update({ view_count: post.view_count + 1 })
      .eq('id', post.id);
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || post.category_id === selectedCategory;
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'news' && post.post_type === 'news') ||
                      (activeTab === 'articles' && post.post_type === 'article') ||
                      (activeTab === 'tutorials' && post.post_type === 'tutorial');
    return matchesSearch && matchesCategory && matchesTab;
  });

  const renderMarkdown = (content: string) => {
    return content
      .split('\n\n')
      .map((paragraph, idx) => {
        if (paragraph.startsWith('# ')) {
          return <h1 key={idx} className="text-3xl font-bold mb-4 mt-6">{paragraph.slice(2)}</h1>;
        }
        if (paragraph.startsWith('## ')) {
          return <h2 key={idx} className="text-2xl font-bold mb-3 mt-5">{paragraph.slice(3)}</h2>;
        }
        if (paragraph.startsWith('### ')) {
          return <h3 key={idx} className="text-xl font-semibold mb-2 mt-4">{paragraph.slice(4)}</h3>;
        }
        if (paragraph.startsWith('- ')) {
          const items = paragraph.split('\n').filter(l => l.startsWith('- '));
          return (
            <ul key={idx} className="list-disc list-inside space-y-1 mb-4">
              {items.map((item, i) => <li key={i}>{item.slice(2)}</li>)}
            </ul>
          );
        }
        return <p key={idx} className="mb-4 leading-relaxed">{paragraph}</p>;
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Single Post View
  if (selectedPost) {
    return (
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => setSelectedPost(null)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Blog
        </Button>

        <article className="space-y-6">
          {selectedPost.featured_image && (
            <div className="aspect-video rounded-xl overflow-hidden">
              <img 
                src={selectedPost.featured_image} 
                alt={selectedPost.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {selectedPost.blog_categories && (
                <Badge style={{ backgroundColor: selectedPost.blog_categories.color || '#3b82f6' }}>
                  {selectedPost.blog_categories.name}
                </Badge>
              )}
              <Badge variant="outline">
                {selectedPost.post_type === 'news' ? <Newspaper className="h-3 w-3 mr-1" /> : <BookOpen className="h-3 w-3 mr-1" />}
                {selectedPost.post_type}
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold">{selectedPost.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {selectedPost.author_name || 'Admin'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(selectedPost.published_at || selectedPost.created_at), 'MMMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {selectedPost.reading_time_minutes} min read
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {selectedPost.view_count} views
              </span>
            </div>

            {selectedPost.excerpt && (
              <p className="text-lg text-muted-foreground italic border-l-4 border-primary pl-4">
                {selectedPost.excerpt}
              </p>
            )}
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            {renderMarkdown(selectedPost.content)}
          </div>

          {selectedPost.meta_keywords && selectedPost.meta_keywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-6 border-t">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {selectedPost.meta_keywords.map((keyword, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">{keyword}</Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">Share:</span>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </article>

        {/* Related Posts */}
        <div className="mt-12 pt-8 border-t">
          <h3 className="text-xl font-bold mb-4">Related Articles</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {posts
              .filter(p => p.id !== selectedPost.id && p.category_id === selectedPost.category_id)
              .slice(0, 2)
              .map(post => (
                <Card 
                  key={post.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => openPost(post)}
                >
                  <CardContent className="p-4">
                    <h4 className="font-semibold line-clamp-2">{post.title}</h4>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{post.excerpt}</p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </div>
    );
  }

  // Blog Listing View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
          Tech Blog
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Stay updated with the latest technology news, AI developments, tutorials, and industry insights.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          <Button
            variant={!selectedCategory ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              style={selectedCategory === cat.id ? { backgroundColor: cat.color || undefined } : {}}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </ScrollArea>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-md mx-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && !searchQuery && !selectedCategory && activeTab === 'all' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            Featured
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredPosts.slice(0, 3).map(post => (
              <Card 
                key={post.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] overflow-hidden group"
                onClick={() => openPost(post)}
              >
                {post.featured_image && (
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={post.featured_image} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    {post.blog_categories && (
                      <Badge variant="secondary" className="text-xs">{post.blog_categories.name}</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.reading_time_minutes}m</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.view_count}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Posts */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {activeTab === 'all' ? 'Latest Posts' : activeTab === 'news' ? 'Latest News' : activeTab === 'articles' ? 'Articles' : 'Tutorials'}
          <Badge variant="secondary" className="ml-2">{filteredPosts.length}</Badge>
        </h2>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
            <p className="text-muted-foreground">No posts found</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredPosts.map(post => (
              <Card 
                key={post.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openPost(post)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {post.featured_image && (
                      <div className="hidden sm:block w-32 h-24 rounded-lg overflow-hidden flex-shrink-0">
                        <img 
                          src={post.featured_image} 
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {post.blog_categories && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                            style={{ backgroundColor: `${post.blog_categories.color}20`, color: post.blog_categories.color || undefined }}
                          >
                            {post.blog_categories.name}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {post.post_type}
                        </Badge>
                      </div>
                      <h3 className="font-semibold line-clamp-1 hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.excerpt}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />{post.author_name || 'Admin'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(post.published_at || post.created_at), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />{post.reading_time_minutes}m read
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />{post.view_count}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground self-center" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPage;