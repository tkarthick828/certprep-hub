import React, { useState, useEffect } from 'react';
import { ThumbsUp, Send, LogIn, Trash2, MessageSquare } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function ForumTab({ catalog, currentUser = null }) {
  const [user, setUser] = useState(currentUser);
  const [posts, setPosts] = useState([]);
  const [myUpvotes, setMyUpvotes] = useState(new Set());
  const [selectedTag, setSelectedTag] = useState('All');
  const [loading, setLoading] = useState(true);

  // New Post Form
  const [certHashtag, setCertHashtag] = useState(catalog[0]?.hashtag || '#CCA-F');
  const [postType, setPostType] = useState('Passed Debrief');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    if (!supabase || currentUser) return;

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, [currentUser]);

  const loadPosts = async () => {
    if (!supabase) return;
    setLoading(true);
    let query = supabase
      .from('forum_posts')
      .select('*')
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: false });

    if (selectedTag !== 'All') {
      query = query.eq('cert_hashtag', selectedTag);
    }

    const { data } = await query;
    setPosts(data || []);

    if (user) {
      const { data: voteRows } = await supabase
        .from('post_upvotes')
        .select('post_id')
        .eq('user_id', user.id);
      setMyUpvotes(new Set((voteRows || []).map((v) => v.post_id)));
    } else {
      setMyUpvotes(new Set());
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
  }, [selectedTag, user]);

  const handleGoogleLogin = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!supabase || !user || !title.trim() || !body.trim()) return;
    setSubmitting(true);

    const authorName =
      user.user_metadata?.full_name || user.email?.split('@')[0] || 'Certified Member';

    const { error } = await supabase.from('forum_posts').insert({
      user_id: user.id,
      author_name: authorName,
      cert_hashtag: certHashtag,
      post_type: postType,
      title: title.trim(),
      body: body.trim(),
    });

    setSubmitting(false);
    if (!error) {
      setTitle('');
      setBody('');
      loadPosts();
    }
  };

  const handleToggleUpvote = async (postId) => {
    if (!supabase || !user) {
      alert('Please sign in to upvote helpful guides.');
      return;
    }
    const { data: newCount, error } = await supabase.rpc('toggle_upvote', {
      p_post_id: postId,
    });
    if (!error && typeof newCount === 'number') {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, upvotes: newCount } : p))
      );
      setMyUpvotes((prev) => {
        const next = new Set(prev);
        if (next.has(postId)) next.delete(postId);
        else next.add(postId);
        return next;
      });
    }
  };

  const handleDelete = async (postId) => {
    if (!supabase || !user) return;
    await supabase.from('forum_posts').delete().eq('id', postId);
    loadPosts();
  };

  if (!supabase) {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-5 text-xs text-stone-600">
        Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to{' '}
        <code>.env.local</code> and restart <code>npm run dev</code> to activate the live forum.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-stone-900">Certification Hashtag Guidance</h2>
            <p className="text-[11px] text-stone-500">Share #Passed debriefs & exam study notes</p>
          </div>
        </div>

        {!user && (
          <button
            onClick={handleGoogleLogin}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" /> Sign in with Google to Post
          </button>
        )}
      </div>

      {/* Hashtag Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedTag('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition ${
            selectedTag === 'All'
              ? 'bg-emerald-700 text-white border-emerald-700'
              : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-400'
          }`}
        >
          All Hashtags
        </button>
        {catalog.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedTag(c.hashtag)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono border whitespace-nowrap transition ${
              selectedTag === c.hashtag
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-emerald-800 border-stone-200 hover:border-emerald-400'
            }`}
          >
            {c.hashtag}
          </button>
        ))}
      </div>

      {/* Create Post Form (Signed-in Users) */}
      {user && (
        <form
          onSubmit={handleCreatePost}
          className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <select
              value={certHashtag}
              onChange={(e) => setCertHashtag(e.target.value)}
              className="border border-stone-200 rounded-lg px-2.5 py-2 text-xs font-mono text-emerald-800 bg-stone-50"
            >
              {catalog.map((c) => (
                <option key={c.id} value={c.hashtag}>
                  {c.hashtag} — {c.title}
                </option>
              ))}
            </select>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value)}
              className="border border-stone-200 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-700 bg-stone-50"
            >
              <option value="Passed Debrief">Passed Debrief</option>
              <option value="Study Tip">Study Tip</option>
              <option value="Question Discussion">Question Discussion</option>
            </select>
          </div>

          <input
            type="text"
            required
            maxLength={120}
            placeholder="Post title (e.g., How I scored 810 on CCA-F in 2 weeks)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />

          <textarea
            required
            rows={3}
            maxLength={2000}
            placeholder="Share key domains to focus on, time management tips, or study notes..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />

          <button
            disabled={submitting}
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" /> {submitting ? 'Publishing...' : 'Publish Guidance'}
          </button>
        </form>
      )}

      {/* Feed */}
      {loading ? (
        <p className="text-center text-xs text-stone-500 py-6">Loading community posts...</p>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center text-xs text-stone-500">
          No posts for <strong>{selectedTag}</strong> yet. Share the first exam guide!
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const voted = myUpvotes.has(post.id);
            return (
              <div
                key={post.id}
                className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100">
                      {post.cert_hashtag}
                    </span>
                    <span className="text-[11px] font-medium bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-100">
                      {post.post_type}
                    </span>
                  </div>
                  {user?.id === post.user_id && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-stone-400 hover:text-rose-600 p-1"
                      title="Delete post"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="font-bold text-sm text-stone-900">{post.title}</h3>
                <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line">
                  {post.body}
                </p>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                  <span>
                    By <strong>{post.author_name}</strong> •{' '}
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleToggleUpvote(post.id)}
                    className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 transition ${
                      voted
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-emerald-400'
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3" /> {post.upvotes}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}