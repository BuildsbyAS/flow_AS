import { useState } from 'react';
import { mockActivityPosts } from '../../data/mockProject.js';

// ActivityFeed — Figma 624:16078
// ──────────────────────────────
// Header: "Activity" + 2-up pill switch (All / Updates).
// Composer card: avatar + textarea + tool icons + Post button.
// Vertical timeline line + "Today" divider.
// Posts: avatar 20px, name/time meta, content, optional progress card,
// reaction pills (heart / thumbs-up / add-emoji). On hover of an "update"
// post, a small floating action bar (reply + emoji) appears on the right.

const CURRENT_USER = { name: 'Anurag', initials: 'AJ' };

const COLOR = {
  warmBg: '#FBF9F8',
  warmHover: '#F4EEEB',
  warmBrown: '#3D1602',
  cocoaText: '#6E5649',
  cocoaText2: '#7E6454',
  cocoaMuted: '#937562', // disabled / muted warm brown (Figma 634:16871)
  cocoaMeta: '#A89889', // warm meta text replacing cool grey
  postBtn: '#F1EAE4',
  switchTrack: '#F4EEEB',
  switchActive: '#FFFFFF',
  switchTextActive: '#1B1410',
  switchTextInactive: '#7E6454',
  cardBg: '#FCFCFD',
  cardBorder: '#F2F3F7',
  success: '#0F8857',
  thumbsBg: '#131313',
  // Warm taupe avatar bg replacing the cool #989FB3 grey
  avatarBg: '#A89889',
};

export default function ActivityFeed() {
  const [posts, setPosts] = useState(mockActivityPosts);
  const [filter, setFilter] = useState('all'); // 'all' | 'updates'
  const [composer, setComposer] = useState('');
  const [composerFocused, setComposerFocused] = useState(false);

  function postUpdate() {
    const text = composer.trim();
    if (!text) return;
    setPosts((prev) => [
      {
        id: `a-new-${Date.now()}`,
        author: CURRENT_USER.name,
        initials: CURRENT_USER.initials,
        type: 'update',
        time: 'Just now',
        content: text,
        reactions: { heart: 0, heartLiked: false, thumbs: 0, thumbsLiked: false, emojis: [] },
      },
      ...prev,
    ]);
    setComposer('');
    setComposerFocused(false);
  }

  function toggleHeart(id) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              reactions: {
                ...p.reactions,
                heartLiked: !p.reactions.heartLiked,
                heart: p.reactions.heart + (p.reactions.heartLiked ? -1 : 1),
              },
            }
          : p
      )
    );
  }
  function toggleThumbs(id) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              reactions: {
                ...p.reactions,
                thumbsLiked: !p.reactions.thumbsLiked,
                thumbs: p.reactions.thumbs + (p.reactions.thumbsLiked ? -1 : 1),
              },
            }
          : p
      )
    );
  }

  const visiblePosts = filter === 'all' ? posts : posts.filter((p) => p.type === 'update');

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--f-sans)',
            fontWeight: 700,
            fontSize: 16,
            lineHeight: '20px',
            letterSpacing: '-0.1px',
            color: 'var(--c-text-primary)',
          }}
        >
          Activity
        </h2>
        <FilterSwitch value={filter} onChange={setFilter} />
      </div>

      {/* Composer */}
      <Composer
        value={composer}
        onChange={setComposer}
        focused={composerFocused}
        onFocus={() => setComposerFocused(true)}
        onBlur={() => setComposerFocused(false)}
        onPost={postUpdate}
      />

      {/* Feed with vertical timeline line */}
      <div
        style={{
          position: 'relative',
          padding: '0 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* vertical dashed timeline */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 26,
            bottom: 0,
            left: 46,
            width: 1,
            borderLeft: '1px dashed var(--c-border-primary)',
            pointerEvents: 'none',
          }}
        />

        {/* Today divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}>
          <span
            aria-hidden
            style={{
              width: 7,
              height: 7,
              background: 'var(--c-text-muted)',
              transform: 'rotate(45deg)',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--f-sans)',
              fontSize: 14,
              fontWeight: 400,
              lineHeight: '20px',
              letterSpacing: '-0.1px',
              color: 'var(--c-text-primary)',
            }}
          >
            Today
          </span>
        </div>

        {visiblePosts.map((post) => (
          <Post
            key={post.id}
            post={post}
            onHeart={() => toggleHeart(post.id)}
            onThumbs={() => toggleThumbs(post.id)}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Filter switch (All / Updates) ──────────────────────────────────────
function FilterSwitch({ value, onChange }) {
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 4,
        background: COLOR.switchTrack,
        border: '1px solid #F6F2EF',
        borderRadius: 8,
        boxShadow: 'inset 0 1px 4px rgba(36,36,36,0.04)',
      }}
    >
      <SwitchTab active={value === 'all'} onClick={() => onChange('all')} label="All" />
      <SwitchTab active={value === 'updates'} onClick={() => onChange('updates')} label="Updates" />
    </div>
  );
}
function SwitchTab({ active, onClick, label }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: 6,
        background: active ? COLOR.switchActive : 'transparent',
        color: active ? COLOR.switchTextActive : COLOR.switchTextInactive,
        fontFamily: 'var(--f-sans)',
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        lineHeight: '20px',
        letterSpacing: '-0.1px',
        boxShadow: active ? '0 1px 1px rgba(14,14,14,0.08)' : 'none',
        transition: 'background 160ms var(--ease-out), color 160ms var(--ease-out)',
      }}
    >
      {label}
    </button>
  );
}

// ─── Composer ───────────────────────────────────────────────────────────
function Composer({ value, onChange, focused, onFocus, onBlur, onPost }) {
  const hasText = value.trim().length > 0;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: 8,
        background: COLOR.warmBg,
        borderRadius: 12,
      }}
    >
      <Avatar initials={CURRENT_USER.initials} size={28} bg={COLOR.cocoaText} fg="#fff" />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onPost();
            }
          }}
          rows={focused || hasText ? 2 : 1}
          placeholder="Post an update"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            resize: 'none',
            fontFamily: 'var(--f-sans)',
            fontSize: 13,
            lineHeight: '20px',
            letterSpacing: '-0.1px',
            color: 'var(--c-text-primary)',
            padding: '0 0 0 4px',
            transition: 'height 160ms var(--ease-out)',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ComposerToolBtn ariaLabel="Mention someone"><MentionIcon /></ComposerToolBtn>
          <ComposerToolBtn ariaLabel="Attach an image"><ImageIcon /></ComposerToolBtn>
          <ComposerToolBtn ariaLabel="Add an emoji"><SmileyIcon /></ComposerToolBtn>
        </div>
      </div>
      <button
        type="button"
        onClick={onPost}
        disabled={!hasText}
        style={{
          // Figma 634:16870 — disabled keeps the warm cream bg, only text dims.
          padding: '10px 24px',
          borderRadius: 8,
          background: COLOR.postBtn,
          color: hasText ? COLOR.warmBrown : COLOR.cocoaMuted,
          fontFamily: 'var(--f-sans)',
          fontSize: 14,
          fontWeight: 500,
          lineHeight: '20px',
          letterSpacing: '-0.1px',
          cursor: hasText ? 'pointer' : 'not-allowed',
          transition: 'color 160ms var(--ease-out), transform 120ms var(--ease-out)',
          flexShrink: 0,
        }}
        onPointerDown={(e) => hasText && (e.currentTarget.style.transform = 'scale(0.97)')}
        onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        Post
      </button>
    </div>
  );
}

function ComposerToolBtn({ children, ariaLabel }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        color: COLOR.cocoaText,
        transition: 'background 160ms var(--ease-out), color 160ms var(--ease-out)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = COLOR.warmHover;
        e.currentTarget.style.color = COLOR.warmBrown;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = COLOR.cocoaText;
      }}
    >
      {children}
    </button>
  );
}

// ─── Post card ──────────────────────────────────────────────────────────
function Post({ post, onHeart, onThumbs }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        padding: '14px 12px 14px 24px',
        borderRadius: 16,
        background: 'transparent',
        transition: 'background 160ms var(--ease-out)',
      }}
    >
      <Avatar initials={post.initials} size={20} bg={COLOR.avatarBg} fg="#fff" small />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* meta line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4 }}>
          <span
            style={{
              fontFamily: 'var(--f-sans)',
              fontSize: 14,
              fontWeight: 600,
              lineHeight: '20px',
              letterSpacing: '-0.014px',
              color: 'var(--c-text-primary)',
            }}
          >
            {post.author}
          </span>
          <Dot3 />
          {post.type === 'update' && (
            <>
              <span style={metaText}>Posted an update</span>
              <Dot3 />
            </>
          )}
          <span style={metaText}>{post.time}</span>
        </div>

        {/* content */}
        {post.content && (
          <div style={{ paddingLeft: 4 }}>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--f-sans)',
                fontSize: 14,
                fontWeight: 400,
                lineHeight: '20px',
                letterSpacing: '-0.014px',
                color: 'var(--c-text-primary)',
              }}
            >
              {post.content}
            </p>
          </div>
        )}

        {/* progress card */}
        {post.progress && <ProgressCard rows={post.progress} />}

        {/* reactions */}
        {post.content && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
            <HeartPill count={post.reactions.heart} liked={post.reactions.heartLiked} onClick={onHeart} />
            <ThumbsPill count={post.reactions.thumbs} liked={post.reactions.thumbsLiked} onClick={onThumbs} />
            <AddEmojiBtn />
          </div>
        )}
      </div>

      {/* floating reply/emoji on hover (updates only, no progress card) */}
      {post.type === 'update' && !post.progress && (
        <FloatingActions hover={hover} />
      )}
    </div>
  );
}

const metaText = {
  fontFamily: 'var(--f-sans)',
  fontSize: 14,
  fontWeight: 400,
  lineHeight: '20px',
  letterSpacing: '-0.014px',
  color: COLOR.cocoaMeta,
};

function Dot3() {
  return (
    <span
      aria-hidden
      style={{
        width: 3,
        height: 3,
        borderRadius: 999,
        background: COLOR.cocoaMeta,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}

// ─── Avatar ─────────────────────────────────────────────────────────────
function Avatar({ initials, size = 28, bg, fg }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: bg,
        color: fg,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--f-sans)',
        fontWeight: 700,
        fontSize: size <= 20 ? 10 : 12,
        lineHeight: '1',
        letterSpacing: '-0.1px',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {initials}
    </span>
  );
}

// ─── Progress card ──────────────────────────────────────────────────────
function ProgressCard({ rows }) {
  return (
    <div
      style={{
        marginTop: 8,
        background: COLOR.cardBg,
        border: `1px solid ${COLOR.cardBorder}`,
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {rows.map((row) => (
        <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontFamily: 'var(--f-sans)',
              fontSize: 14,
              fontWeight: 400,
              lineHeight: '20px',
              letterSpacing: '-0.1px',
              color: 'var(--c-text-primary)',
            }}
          >
            {row.label}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ ...metaText, fontWeight: 400 }}>{row.from}</span>
            <ArrowSmallRight />
            <span
              style={{
                fontFamily: 'var(--f-sans)',
                fontSize: 14,
                fontWeight: 700,
                lineHeight: '20px',
                letterSpacing: '-0.1px',
                color: COLOR.success,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {row.to}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Reaction pills ─────────────────────────────────────────────────────
function HeartPill({ count, liked, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={liked}
      aria-label={liked ? 'Remove like' : 'Add like'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        borderRadius: 999,
        background: liked ? '#FFEBEE' : '#fff',
        border: liked ? '1px solid #FBD0D5' : `1px solid ${COLOR.cardBg}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        color: liked ? '#E11D48' : '#1d2539',
        fontFamily: 'var(--f-sans)',
        fontSize: 14,
        fontWeight: 400,
        lineHeight: '20px',
        letterSpacing: '-0.014px',
        transition: 'background 160ms var(--ease-out), border-color 160ms var(--ease-out), transform 120ms var(--ease-spring)',
      }}
      onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <HeartIcon filled={liked} />
      {count}
    </button>
  );
}

function ThumbsPill({ count, liked, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={liked}
      aria-label={liked ? 'Remove thumbs up' : 'Add thumbs up'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        borderRadius: 999,
        background: liked ? COLOR.thumbsBg : '#fff',
        border: liked ? `1px solid ${COLOR.thumbsBg}` : `1px solid ${COLOR.cardBg}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        color: liked ? '#fff' : 'var(--c-text-primary)',
        fontFamily: 'var(--f-sans)',
        fontSize: 14,
        fontWeight: 400,
        lineHeight: '20px',
        letterSpacing: '-0.014px',
        transition: 'background 160ms var(--ease-out), color 160ms var(--ease-out), transform 120ms var(--ease-spring)',
      }}
      onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <ThumbsUpIcon filled />
      {count}
    </button>
  );
}

function AddEmojiBtn() {
  return (
    <button
      type="button"
      aria-label="Add reaction"
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        color: 'var(--c-text-tertiary)',
        transition: 'background 160ms var(--ease-out), color 160ms var(--ease-out)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = COLOR.warmHover;
        e.currentTarget.style.color = COLOR.warmBrown;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--c-text-tertiary)';
      }}
    >
      <AddEmojiIcon />
    </button>
  );
}

// ─── Floating reply/emoji bubble on hover ───────────────────────────────
function FloatingActions({ hover }) {
  return (
    <div
      aria-hidden={!hover}
      style={{
        position: 'absolute',
        top: 44,
        right: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: 4,
        background: '#fff',
        borderRadius: 999,
        boxShadow: '0 2px 6px rgba(14,14,14,0.08)',
        opacity: hover ? 1 : 0,
        transform: hover ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.96)',
        pointerEvents: hover ? 'auto' : 'none',
        transition: 'opacity 160ms var(--ease-out), transform 200ms var(--ease-out)',
      }}
    >
      <FloatingBtn ariaLabel="Reply"><ReplyArrowIcon /></FloatingBtn>
      <FloatingBtn ariaLabel="Add reaction"><AddEmojiIcon /></FloatingBtn>
    </div>
  );
}

function FloatingBtn({ children, ariaLabel }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      style={{
        width: 24,
        height: 24,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        color: 'var(--c-text-secondary)',
        transition: 'background 120ms var(--ease-out), color 120ms var(--ease-out)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = COLOR.warmHover;
        e.currentTarget.style.color = COLOR.warmBrown;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--c-text-secondary)';
      }}
    >
      {children}
    </button>
  );
}

// ─── Inline SVG icons ───────────────────────────────────────────────────
function MentionIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="7" cy="7" r="2.3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M9.6 7v1.3a1.3 1.3 0 0 0 2.6 0V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function ImageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="2" width="11" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="5" cy="5.4" r="0.9" fill="currentColor" />
      <path d="M2 11l3-3 2.6 2.6L9.8 8.4 12 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SmileyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="5.2" cy="6" r="0.7" fill="currentColor" />
      <circle cx="8.8" cy="6" r="0.7" fill="currentColor" />
      <path d="M4.8 8.8c.5.6 1.3 1 2.2 1s1.7-.4 2.2-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function HeartIcon({ filled }) {
  if (filled) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 14.5s-6-3.7-6-8a3.6 3.6 0 0 1 6-2.6 3.6 3.6 0 0 1 6 2.6c0 4.3-6 8-6 8z" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 14.5s-6-3.7-6-8a3.6 3.6 0 0 1 6-2.6 3.6 3.6 0 0 1 6 2.6c0 4.3-6 8-6 8z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ThumbsUpIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'}>
      <path
        d="M5.5 7l2.4-4.4c.3-.5.9-.6 1.3-.2.4.4.5 1 .3 1.5L8.6 6.5h3.6c.8 0 1.4.7 1.2 1.5l-.9 4.2c-.1.7-.7 1.1-1.4 1.1H6.5a1 1 0 0 1-1-1V7zM2.5 7h2v6.4h-2A1 1 0 0 1 1.5 12.4V8a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function AddEmojiIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M14 8c0 3.3-2.7 6-6 6S2 11.3 2 8s2.7-6 6-6c.7 0 1.4.1 2 .3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="6" cy="7" r="0.8" fill="currentColor" />
      <circle cx="10" cy="7" r="0.8" fill="currentColor" />
      <path d="M5.6 10c.5.7 1.4 1.2 2.4 1.2s1.9-.5 2.4-1.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 2.5V5M11.7 3.7H14.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function ReplyArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5.5 4 2.5 7l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 7H8.5a3 3 0 0 1 3 3v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ArrowSmallRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M3.5 8H12.5M8.5 4L12.5 8L8.5 12"
        stroke={COLOR.success}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
