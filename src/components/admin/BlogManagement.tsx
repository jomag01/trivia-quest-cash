import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  FileText, Plus, Pencil, Trash2, Eye, Loader2, Sparkles, 
  Save, Globe, Calendar, Clock, Tag, Image, Search,
  Newspaper, BookOpen, Star, CheckCircle, XCircle, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  display_order: number;
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
  status: string;
  is_featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
  reading_time_minutes: number;
  view_count: number;
  published_at: string | null;
  created_at: string;
  blog_categories?: BlogCategory;
}

const BlogManagement = () => {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    category_id: '',
    author_name: '',
    post_type: 'article',
    status: 'draft',
    is_featured: false,
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    reading_time_minutes: 5
  });

  // AI generation state
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('professional');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, postRes] = await Promise.all([
        supabase.from('blog_categories').select('*').order('display_order'),
        supabase.from('blog_posts').select('*, blog_categories(*)').order('created_at', { ascending: false })
      ]);
      
      if (catRes.data) setCategories(catRes.data);
      if (postRes.data) setPosts(postRes.data as BlogPost[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load blog data');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const calculateReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  };

  const openEditor = (post?: BlogPost) => {
    if (post) {
      setEditingPost(post);
      setForm({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || '',
        content: post.content,
        featured_image: post.featured_image || '',
        category_id: post.category_id || '',
        author_name: post.author_name || '',
        post_type: post.post_type,
        status: post.status,
        is_featured: post.is_featured,
        meta_title: post.meta_title || '',
        meta_description: post.meta_description || '',
        meta_keywords: post.meta_keywords?.join(', ') || '',
        reading_time_minutes: post.reading_time_minutes
      });
    } else {
      setEditingPost(null);
      setForm({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        featured_image: '',
        category_id: '',
        author_name: '',
        post_type: 'article',
        status: 'draft',
        is_featured: false,
        meta_title: '',
        meta_description: '',
        meta_keywords: '',
        reading_time_minutes: 5
      });
    }
    setIsEditorOpen(true);
  };

  const savePost = async () => {
    if (!form.title || !form.content) {
      toast.error('Title and content are required');
      return;
    }

    setIsSaving(true);
    try {
      const slug = form.slug || generateSlug(form.title);
      const keywords = form.meta_keywords ? form.meta_keywords.split(',').map(k => k.trim()) : [];
      
      const postData = {
        title: form.title,
        slug,
        excerpt: form.excerpt || form.content.substring(0, 160) + '...',
        content: form.content,
        featured_image: form.featured_image || null,
        category_id: form.category_id || null,
        author_name: form.author_name || 'Admin',
        post_type: form.post_type,
        status: form.status,
        is_featured: form.is_featured,
        meta_title: form.meta_title || form.title,
        meta_description: form.meta_description || form.excerpt || form.content.substring(0, 160),
        meta_keywords: keywords,
        reading_time_minutes: calculateReadingTime(form.content),
        published_at: form.status === 'published' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      if (editingPost) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', editingPost.id);
        if (error) throw error;
        toast.success('Post updated successfully');
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert(postData);
        if (error) throw error;
        toast.success('Post created successfully');
      }

      setIsEditorOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving post:', error);
      toast.error(error.message || 'Failed to save post');
    } finally {
      setIsSaving(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
      toast.success('Post deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const generateAIContent = async () => {
    if (!aiTopic) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-content', {
        body: { 
          topic: aiTopic, 
          tone: aiTone,
          type: form.post_type
        }
      });

      if (error) throw error;

      if (data) {
        setForm(prev => ({
          ...prev,
          title: data.title || prev.title,
          content: data.content || prev.content,
          excerpt: data.excerpt || prev.excerpt,
          meta_title: data.meta_title || prev.meta_title,
          meta_description: data.meta_description || prev.meta_description,
          meta_keywords: data.keywords?.join(', ') || prev.meta_keywords,
          slug: generateSlug(data.title || prev.title)
        }));
        toast.success('Content generated successfully!');
      }
    } catch (error: any) {
      console.error('Error generating content:', error);
      toast.error(error.message || 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || post.category_id === filterCategory;
    const matchesStatus = filterStatus === 'all' || post.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Published</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'archived':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><XCircle className="h-3 w-3 mr-1" />Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Blog Management
              </CardTitle>
              <CardDescription>Manage blog posts, news, and articles</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => openEditor()}>
                <Plus className="h-4 w-4 mr-1" />
                New Post
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
              <div className="text-2xl font-bold text-blue-400">{posts.length}</div>
              <div className="text-xs text-muted-foreground">Total Posts</div>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
              <div className="text-2xl font-bold text-green-400">{posts.filter(p => p.status === 'published').length}</div>
              <div className="text-xs text-muted-foreground">Published</div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
              <div className="text-2xl font-bold text-yellow-400">{posts.filter(p => p.status === 'draft').length}</div>
              <div className="text-xs text-muted-foreground">Drafts</div>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
              <div className="text-2xl font-bold text-purple-400">{posts.reduce((acc, p) => acc + p.view_count, 0)}</div>
              <div className="text-xs text-muted-foreground">Total Views</div>
            </div>
          </div>

          {/* Posts List */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredPosts.map(post => (
                <div key={post.id} className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {post.is_featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                        <span className="font-medium truncate">{post.title}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {getStatusBadge(post.status)}
                        <Badge variant="outline" className="text-xs">
                          {post.post_type === 'news' ? <Newspaper className="h-3 w-3 mr-1" /> : <BookOpen className="h-3 w-3 mr-1" />}
                          {post.post_type}
                        </Badge>
                        {post.blog_categories && (
                          <Badge variant="secondary" className="text-xs">{post.blog_categories.name}</Badge>
                        )}
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />{post.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />{post.reading_time_minutes}min
                        </span>
                        <span>{format(new Date(post.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditor(post)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePost(post.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredPosts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No posts found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Post Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingPost ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingPost ? 'Edit Post' : 'Create New Post'}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="content" className="flex-1 overflow-hidden">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="ai">AI Assistant</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 h-[60vh] mt-4">
              <TabsContent value="content" className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value, slug: generateSlug(e.target.value) })}
                      placeholder="Enter post title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      placeholder="post-url-slug"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Excerpt</Label>
                  <Textarea
                    value={form.excerpt}
                    onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                    placeholder="Brief summary of the post (auto-generated if empty)"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Content *</Label>
                  <Textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Write your blog content here... (Supports Markdown)"
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Featured Image URL</Label>
                  <Input
                    value={form.featured_image}
                    onChange={(e) => setForm({ ...form, featured_image: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4 pr-4">
                <Card className="border-2 border-primary/30 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      AI Content Generator
                    </CardTitle>
                    <CardDescription>Generate SEO-optimized blog content using GPT-5</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Topic / Title Idea</Label>
                      <Textarea
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="E.g., 'The Future of AI in Web Development' or 'Top 10 Cybersecurity Tips for 2025'"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Writing Tone</Label>
                        <Select value={aiTone} onValueChange={setAiTone}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="casual">Casual & Friendly</SelectItem>
                            <SelectItem value="educational">Educational</SelectItem>
                            <SelectItem value="news">News/Journalistic</SelectItem>
                            <SelectItem value="technical">Technical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Post Type</Label>
                        <Select value={form.post_type} onValueChange={(v) => setForm({ ...form, post_type: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="article">Article</SelectItem>
                            <SelectItem value="news">News</SelectItem>
                            <SelectItem value="tutorial">Tutorial</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button 
                      onClick={generateAIContent} 
                      disabled={isGenerating || !aiTopic}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-2" />Generate Content</>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <div className="p-4 rounded-lg bg-muted/50 border space-y-2 text-sm">
                  <p className="font-medium">✨ AI will generate:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>SEO-optimized title</li>
                    <li>Engaging introduction and full article content</li>
                    <li>Meta title and description for search engines</li>
                    <li>Relevant keywords for AdSense optimization</li>
                    <li>Proper headings and formatting</li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4 pr-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-2">
                  <p className="font-medium text-green-400 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    SEO & AdSense Optimization
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Configure metadata to improve search rankings and AdSense approval.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Meta Title (60 chars max)</Label>
                  <Input
                    value={form.meta_title}
                    onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                    placeholder="SEO-friendly title for search engines"
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground">{form.meta_title.length}/60 characters</p>
                </div>

                <div className="space-y-2">
                  <Label>Meta Description (160 chars max)</Label>
                  <Textarea
                    value={form.meta_description}
                    onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                    placeholder="Compelling description for search results"
                    maxLength={160}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">{form.meta_description.length}/160 characters</p>
                </div>

                <div className="space-y-2">
                  <Label>Keywords (comma separated)</Label>
                  <Input
                    value={form.meta_keywords}
                    onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })}
                    placeholder="technology, AI, web development, tutorial"
                  />
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border space-y-2 text-sm">
                  <p className="font-medium">📊 AdSense Compliance Tips:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Content should be original and valuable</li>
                    <li>Minimum 300 words per article recommended</li>
                    <li>Include proper headings (H1, H2, H3)</li>
                    <li>Add relevant images with alt text</li>
                    <li>No prohibited content (adult, gambling, etc.)</li>
                    <li>Clear navigation and user experience</li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Post Type</Label>
                    <Select value={form.post_type} onValueChange={(v) => setForm({ ...form, post_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="article">Article</SelectItem>
                        <SelectItem value="news">News</SelectItem>
                        <SelectItem value="tutorial">Tutorial</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Author Name</Label>
                    <Input
                      value={form.author_name}
                      onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                      placeholder="Author name"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label>Featured Post</Label>
                    <p className="text-xs text-muted-foreground">Show this post prominently on the blog</p>
                  </div>
                  <Switch
                    checked={form.is_featured}
                    onCheckedChange={(v) => setForm({ ...form, is_featured: v })}
                  />
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
            <Button onClick={savePost} disabled={isSaving}>
              {isSaving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />Save Post</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogManagement;