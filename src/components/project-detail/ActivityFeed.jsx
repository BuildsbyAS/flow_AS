import { useState } from 'react';
import { SectionHead, Avatar, IconBtn } from '../shared.jsx';
import {
  HeartIcon,
  ReplyIcon,
  SmileyAdd,
  SendIcon,
  MoreHorizontal,
} from '../icons.jsx';
import { mockActivity, emojiSet } from '../../data/mockProject.js';
import { color } from '../../styles/ds.js';

const CURRENT_USER = 'You';

export default function ActivityFeed() {
  const [items, setItems] = useState(mockActivity);
  const [composer, setComposer] = useState('');

  function postComment() {
    const text = composer.trim();
    if (!text) return;
    const newItem = {
      id: `a-${Date.now()}`,
      kind: 'comment',
      actor: CURRENT_USER,
      text,
      timestamp: 'Just now',
      reactions: [],
      likes: 0,
      likedByMe: false,
      replies: [],
    };
    setItems((prev) => [newItem, ...prev]);
    setComposer('');
  }

  function toggleLike(id) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, likedByMe: !it.likedByMe, likes: it.likes + (it.likedByMe ? -1 : 1) }
          : it
      )
    );
  }

  function toggleReaction(id, emoji) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const existing = it.reactions.find((r) => r.emoji === emoji);
        if (existing) {
          if (existing.byMe) {
            const next = it.reactions
              .map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1, byMe: false } : r))
              .filter((r) => r.count > 0);
            return { ...it, reactions: next };
          }
          return {
            ...it,
            reactions: it.reactions.map((r) =>
              r.emoji === emoji ? { ...r, count: r.count + 1, byMe: true } : r
            ),
          };
        }
        return { ...it, reactions: [...it.reactions, { emoji, count: 1, byMe: true }] };
      })
    );
  }

  function addReply(id, text) {
    const t = text.trim();
    if (!t) return;
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              replies: [
                ...it.replies,
                {
                  id: `${id}-r-${Date.now()}`,
                  actor: CURRENT_USER,
                  text: t,
                  timestamp: 'Just now',
                  likes: 0,
                  likedByMe: false,
                },
              ],
            }
          : it
      )
    );
  }

  return (
    <section>
      <SectionHead title="Activity" count={items.length} />

      <Composer value={composer} onChange={setComposer} onPost={postComment} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 16 }}>
        {items.map((it) => (
          <ActivityItem
            key={it.id}
            item={it}
            onLike={() => toggleLike(it.id)}
            onReact={(emoji) => toggleReaction(it.id, emoji)}
            onReply={(text) => addReply(it.id, text)}
          />
        ))}
      </div>
    </section>
  );
}

function Composer({ value, onChange, onPost }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: 12,
        background: 'var(--c-surface-secondary)',
        border: '1px solid var(--c-border-primary)',
        borderRadius: 12,
      }}
    >
      <Avatar name={CURRENT_USER} size={32} radius={9} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onPost();
            }
          }}
          placeholder="Share an update, ask a question, or post a milestone..."
          rows={2}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            resize: 'none',
            fontSize: 14,
            color: 'var(--c-text-primary)',
            lineHeight: '20px',
            letterSpacing: '-0.05px',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>⌘+Enter to post</span>
          <button
            onClick={onPost}
            disabled={!value.trim()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              background: value.trim() ? 'var(--c-text-action)' : 'var(--c-surface-tertiary)',
              color: value.trim() ? 'var(--c-text-on-action)' : 'var(--c-text-muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: value.trim() ? 'pointer' : 'not-allowed',
              transition: 'background 160ms var(--ease-interaction)',
            }}
          >
            <SendIcon size={12} /> Post
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ item, onLike, onReact, onReply }) {
  if (item.kind === 'event') return <EventRow item={item} />;
  return <CommentCard item={item} onLike={onLike} onReact={onReact} onReply={onReply} />;
}

function EventRow({ item }) {
  const targetColor = {
    qa: color.phase.qa,
    design: color.phase.design,
    dev: color.phase.dev,
    resource: color.text.action,
    team: color.text.action,
  }[item.targetTone] || color.text.action;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 4px',
        borderBottom: '1px dashed var(--c-border-subtle)',
      }}
    >
      <Avatar name={item.actor} size={24} radius={8} />
      <span style={{ fontSize: 13, color: 'var(--c-text-secondary)', flex: 1 }}>
        <span style={{ fontWeight: 600, color: 'var(--c-text-primary)' }}>{item.actor}</span>{' '}
        {item.action}{' '}
        <span style={{ color: targetColor, fontWeight: 600 }}>{item.target}</span>
      </span>
      <span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{item.timestamp}</span>
    </div>
  );
}

function CommentCard({ item, onLike, onReact, onReply }) {
  const [showReplies, setShowReplies] = useState(true);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [replying, setReplying] = useState(false);

  return (
    <div
      style={{
        padding: 16,
        background: 'var(--c-surface-primary)',
        border: '1px solid var(--c-border-primary)',
        borderRadius: 12,
        marginTop: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Avatar name={item.actor} size={36} radius={10} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}>
              {item.actor}
            </span>
            <span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>· {item.timestamp}</span>
          </div>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 14,
              lineHeight: '20px',
              color: 'var(--c-text-primary)',
              letterSpacing: '-0.05px',
            }}
          >
            {item.text}
          </p>
        </div>
        <IconBtn ariaLabel="More" size={24}>
          <MoreHorizontal size={14} />
        </IconBtn>
      </div>

      {/* reactions row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
          marginTop: 12,
          paddingLeft: 46,
          position: 'relative',
        }}
      >
        {item.reactions.map((r) => (
          <button
            key={r.emoji}
            onClick={() => onReact(r.emoji)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 999,
              background: r.byMe ? '#E8F0FF' : 'var(--c-surface-secondary)',
              border: r.byMe ? '1px solid #B6CCFF' : '1px solid var(--c-border-primary)',
              fontSize: 12,
              color: r.byMe ? 'var(--c-text-action)' : 'var(--c-text-secondary)',
              fontWeight: 600,
              transition: 'transform 120ms var(--ease-spring)',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <span style={{ fontSize: 13 }}>{r.emoji}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.count}</span>
          </button>
        ))}

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setEmojiPickerOpen((v) => !v)}
            aria-label="Add reaction"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 999,
              border: '1px dashed var(--c-border-primary)',
              fontSize: 12,
              color: 'var(--c-text-tertiary)',
            }}
          >
            <SmileyAdd size={12} /> Add
          </button>

          {emojiPickerOpen && (
            <div
              className="flow-pop"
              style={{
                position: 'absolute',
                bottom: '110%',
                left: 0,
                display: 'flex',
                gap: 4,
                padding: 6,
                background: 'var(--c-surface-primary)',
                border: '1px solid var(--c-border-primary)',
                borderRadius: 12,
                boxShadow: 'var(--sh-elevated)',
                zIndex: 10,
              }}
            >
              {emojiSet.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    onReact(e);
                    setEmojiPickerOpen(false);
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    fontSize: 16,
                    transition: 'background 120ms var(--ease-interaction), transform 120ms var(--ease-spring)',
                  }}
                  onMouseEnter={(e2) => {
                    e2.currentTarget.style.background = 'var(--c-surface-secondary)';
                    e2.currentTarget.style.transform = 'scale(1.18)';
                  }}
                  onMouseLeave={(e2) => {
                    e2.currentTarget.style.background = 'transparent';
                    e2.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* action bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginTop: 12,
          paddingLeft: 46,
          paddingTop: 8,
          borderTop: '1px solid var(--c-border-subtle)',
        }}
      >
        <button
          onClick={onLike}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: item.likedByMe ? '#E10078' : 'var(--c-text-secondary)',
          }}
        >
          <HeartIcon size={14} filled={item.likedByMe} />
          {item.likes} {item.likes === 1 ? 'like' : 'likes'}
        </button>
        <button
          onClick={() => setReplying((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--c-text-secondary)',
          }}
        >
          <ReplyIcon size={14} />
          Reply
        </button>
        {item.replies.length > 0 && (
          <button
            onClick={() => setShowReplies((v) => !v)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--c-text-action)',
              marginLeft: 'auto',
            }}
          >
            {showReplies ? 'Hide' : 'Show'} {item.replies.length}{' '}
            {item.replies.length === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {/* reply composer */}
      {replying && (
        <div
          className="flow-rise"
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 12,
            paddingLeft: 46,
          }}
        >
          <Avatar name={CURRENT_USER} size={28} radius={8} />
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              background: 'var(--c-surface-secondary)',
              border: '1px solid var(--c-border-primary)',
              borderRadius: 999,
            }}
          >
            <input
              autoFocus
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onReply(replyDraft);
                  setReplyDraft('');
                  setReplying(false);
                }
                if (e.key === 'Escape') {
                  setReplying(false);
                  setReplyDraft('');
                }
              }}
              placeholder="Write a reply..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                fontSize: 13,
                color: 'var(--c-text-primary)',
              }}
            />
            <button
              onClick={() => {
                onReply(replyDraft);
                setReplyDraft('');
                setReplying(false);
              }}
              disabled={!replyDraft.trim()}
              style={{
                color: replyDraft.trim() ? 'var(--c-text-action)' : 'var(--c-text-muted)',
                cursor: replyDraft.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <SendIcon size={14} />
            </button>
          </div>
        </div>
      )}

      {/* replies */}
      {showReplies && item.replies.length > 0 && (
        <div
          style={{
            marginTop: 14,
            marginLeft: 46,
            paddingLeft: 16,
            borderLeft: '2px solid var(--c-border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {item.replies.map((r) => (
            <Reply key={r.id} reply={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function Reply({ reply }) {
  const [liked, setLiked] = useState(reply.likedByMe);
  const [likes, setLikes] = useState(reply.likes);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <Avatar name={reply.actor} size={28} radius={8} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-primary)' }}>
            {reply.actor}
          </span>
          <span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>· {reply.timestamp}</span>
        </div>
        <p style={{ margin: '2px 0 6px', fontSize: 13, color: 'var(--c-text-primary)' }}>
          {reply.text}
        </p>
        <button
          onClick={() => {
            setLiked((v) => !v);
            setLikes((n) => n + (liked ? -1 : 1));
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: liked ? '#E10078' : 'var(--c-text-tertiary)',
          }}
        >
          <HeartIcon size={12} filled={liked} /> {likes}
        </button>
      </div>
    </div>
  );
}
