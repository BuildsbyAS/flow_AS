// Flow — Guide View
// Onboarding page: explains the pillars of Flow with inline visual examples
import React from "react";
import { c, typo, space, layout, motion, entityColors, phaseColors, typeConfig } from "../styles/theme";
import { Surface, Badge, Btn } from "../components/shared";
import FlowLogo from "../components/FlowLogo";
import useDevLabel from "../hooks/useDevLabel";

/* ══════════════════════════════════════════════════════════════════
   VISUAL HELPERS — inline examples that mirror the real UI
   ══════════════════════════════════════════════════════════════════ */
const Divider = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
    <div style={{ flex: 1, height: 1, background: c.border }} />
    <span style={{
      fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
      fontWeight: typo.monoMd.weight, letterSpacing: typo.monoMd.tracking,
      color: c.textDim, textTransform: "uppercase",
    }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: c.border }} />
  </div>
);

const Kbd = ({ children }) => (
  <span style={{
    fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 600,
    letterSpacing: "0.04em",
    color: c.textDim, background: c.surfaceAlt,
    padding: "1px 6px", borderRadius: layout.radiusXs,
    border: `1px solid ${c.border}`, marginLeft: 2, marginRight: 2,
  }}>{children}</span>
);

// Fake project ID chip — matches the real app styling
const ProjectId = ({ id }) => (
  <span style={{
    fontFamily: typo.monoMd.font, fontSize: typo.monoSm.size, fontWeight: 700,
    letterSpacing: typo.monoMd.tracking, color: entityColors().project,
  }}>{id}</span>
);

// Mini badge row — shows stage + type like in the real cards
const MiniRow = ({ items }) => (
  <div style={{ display: "flex", gap: space[1] + 1, flexWrap: "wrap", marginTop: space[2] }}>
    {items.map((item, i) => (
      <span key={i} style={{
        fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 600,
        letterSpacing: typo.monoSm.tracking, textTransform: "uppercase",
        color: item.color, background: item.bg,
        padding: `2px ${space[2]}px`, borderRadius: layout.radiusTag,
      }}>{item.label}</span>
    ))}
  </div>
);

// Inline example card — a mini version of what the real UI looks like
const ExampleCard = ({ children, style: s }) => (
  <div style={{
    background: c.surfaceAlt, border: `1px solid ${c.border}`,
    borderRadius: layout.radiusSm, padding: `${space[2] + 2}px ${space[3]}px`,
    ...s,
  }}>{children}</div>
);

// Dot visual for the Commit planning dots
const Dot = ({ filled, label }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
    <div style={{
      width: 18, height: 18, borderRadius: "50%",
      background: filled ? c.accent : "transparent",
      border: `2px solid ${filled ? c.accent : c.textDim}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, color: filled ? c.textCrit : c.textDim,
      fontFamily: typo.monoSm.font,
    }}>{label}</div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   GUIDE VIEW
   ══════════════════════════════════════════════════════════════════ */
const GuideView = ({ onNavigate }) => {
  const devRef = useDevLabel('Onboarding guide explaining Flow pillars with inline visual examples');
  const pc = phaseColors();
  const tc = typeConfig();

  return (
    <div ref={devRef} style={{
      maxWidth: 800, margin: "0 auto",
      display: "flex", flexDirection: "column", gap: space[6],
      paddingBottom: space[8],
    }}>

      {/* ═══ HEADER ═══ */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", paddingTop: space[7], paddingBottom: space[2],
      }}>
        <FlowLogo size={80} />
        <h1 style={{
          fontFamily: typo.displayHero.font, fontSize: typo.displayHero.size,
          fontWeight: typo.displayHero.weight, letterSpacing: typo.displayHero.tracking,
          lineHeight: typo.displayHero.lineHeight, color: c.text,
          marginTop: space[5], marginBottom: space[2],
        }}>Flow</h1>
        <p style={{
          fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size,
          fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking,
          color: c.accent, marginTop: 0, marginBottom: space[4],
        }}>Flow is the live record of every project, by the people running it.</p>
        <p style={{
          fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size,
          lineHeight: 1.7, color: c.textMid, maxWidth: 580, margin: 0,
        }}>
          Every project has an owner, a small set of members, and an activity feed.
          Owners post updates. Members chime in. Phase changes, status flips, and
          new members land in the same timeline. Nothing important lives in a DM
          or a slide.
        </p>
        <p style={{
          fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size,
          lineHeight: 1.7, color: c.textMid, maxWidth: 580,
          marginTop: space[4], marginBottom: 0,
        }}>
          The result: anyone in the company can open a project and instantly see
          what's happening, who's on it, and whether it's stalling.
        </p>
      </div>

      <Divider label="How Flow is organized" />

      {/* ═══ OVERVIEW — visual layer diagram ═══ */}
      <div style={{ maxWidth: 620, margin: "0 auto", display: "flex", flexDirection: "column", gap: space[4] }}>

        <p style={{
          fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
          lineHeight: 1.7, color: c.textMid, textAlign: "center", margin: 0,
        }}>
          Flow has three surfaces. Navigate with <Kbd>1</Kbd>–<Kbd>4</Kbd>, or press <Kbd>⌘K</Kbd> to search.
        </p>

        {/* Surface cards — Projects is the centre, Summary + People are lenses on it. */}
        <div style={{ display: "flex", gap: space[3] }}>
          <div style={{
            flex: 1, padding: `${space[4]}px`, borderRadius: layout.radiusMd,
            background: `${c.accent}06`, border: `1px solid ${c.accent}20`,
            display: "flex", flexDirection: "column", gap: space[2],
          }}>
            <div style={{
              fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
              fontWeight: typo.monoSm.weight, letterSpacing: "0.06em",
              color: c.accent, textTransform: "uppercase",
            }}>The work</div>
            <div style={{
              fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size,
              fontWeight: typo.displaySm.weight, color: c.text, lineHeight: 1.3,
            }}>Projects</div>
            <div style={{
              fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
              color: c.textMid, lineHeight: 1.5,
            }}>
              Every project has a deep-dive page with members, an activity feed,
              and a stale flag when no one's posting.
            </div>
            <div style={{ display: "flex", gap: space[2], marginTop: space[1] }}>
              <span style={{
                fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                fontWeight: 600, color: c.accent, background: c.accentDim,
                padding: `2px ${space[2]}px`, borderRadius: layout.radiusTag,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <span style={{ fontSize: 11, opacity: 0.6 }}>2</span> Projects
              </span>
            </div>
          </div>

          <div style={{
            flex: 1, padding: `${space[4]}px`, borderRadius: layout.radiusMd,
            background: `${c.cyan}06`, border: `1px solid ${c.cyan}20`,
            display: "flex", flexDirection: "column", gap: space[2],
          }}>
            <div style={{
              fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
              fontWeight: typo.monoSm.weight, letterSpacing: "0.06em",
              color: c.cyan, textTransform: "uppercase",
            }}>The lenses</div>
            <div style={{
              fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size,
              fontWeight: typo.displaySm.weight, color: c.text, lineHeight: 1.3,
            }}>Summary & People</div>
            <div style={{
              fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
              color: c.textMid, lineHeight: 1.5,
            }}>
              Summary rolls up health across all projects. People shows who owns
              what and where each person is active.
            </div>
            <div style={{ display: "flex", gap: space[2], marginTop: space[1], flexWrap: "wrap" }}>
              {[{ label: "Summary", num: "1", color: c.green }, { label: "People", num: "3", color: c.cyan }].map(t => (
                <span key={t.num} style={{
                  fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                  fontWeight: 600, color: t.color, background: `${t.color}12`,
                  padding: `2px ${space[2]}px`, borderRadius: layout.radiusTag,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span style={{ fontSize: 11, opacity: 0.6 }}>{t.num}</span> {t.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* ══════════════════════════════════════════════════════════════
          SECTION 2: PROJECTS & PEOPLE
          ══════════════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <div style={{ width: 4, height: 28, borderRadius: 2, background: c.cyan }} />
          <div>
            <div style={{ fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size, fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking, color: c.text, lineHeight: 1 }}>Projects & People</div>
            <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.cyan, textTransform: "uppercase", marginTop: 4 }}>The deep-dive layer</div>
          </div>
        </div>

        <p style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid, margin: 0, paddingLeft: space[4] + 4 }}>
          Drill into any project or person for historical context, trends, and detail for resourcing decisions.
        </p>

        {/* PROJECTS */}
        <Surface id="guide-projects" variant="panel" style={{ padding: `${space[4] + 2}px ${space[5]}px`, display: "flex", flexDirection: "column", gap: space[3], marginLeft: space[4] + 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
            <div style={{ width: 32, height: 32, borderRadius: layout.radiusSm, background: `${c.cyan}12`, border: `1px solid ${c.cyan}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: c.cyan }}>2</span>
            </div>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>Projects</div>
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Registry of every project — active, completed, or deprioritized. See owner, phase, health, timeline, and headcount at a glance.
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Click into any project for a deep-dive: week-by-week activity, who worked on it, phase changes, and total investment.
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Three view modes: <strong style={{ color: c.text, fontWeight: 600 }}>Table</strong> for dense sortable data, <strong style={{ color: c.text, fontWeight: 600 }}>Board</strong> to see work grouped by phase, and <strong style={{ color: c.text, fontWeight: 600 }}>Gantt</strong> for a timeline with squad and phase filters.
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Scope chips at the top filter by <strong style={{ color: c.text, fontWeight: 600 }}>In Flight</strong>, <strong style={{ color: c.text, fontWeight: 600 }}>Shipped</strong> (reached GA), <strong style={{ color: c.text, fontWeight: 600 }}>Deprioritized</strong>, or <strong style={{ color: c.text, fontWeight: 600 }}>All</strong>. The KPI cards above surface <strong style={{ color: c.orange, fontWeight: 600 }}>At Risk</strong> and <strong style={{ color: c.red, fontWeight: 600 }}>Overdue</strong> as sub-filters of In Flight.
          </div>
          {/* Mini visual: project timeline */}
          <ExampleCard>
            <div style={{ display: "flex", alignItems: "center", gap: space[2], marginBottom: space[2] }}>
              <ProjectId id="X16" />
              <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text }}>App Performance</span>
              <span style={{ marginLeft: "auto", fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.green }}>Active</span>
            </div>
            <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 24 }}>
              {["PRD", "PRD", "Design", "Design", "Design", "Dev", "Dev"].map((ph, i) => {
                const phColor = ph === "PRD" ? pc.PRD : ph === "Design" ? pc.Design : pc.Dev;
                return <div key={i} style={{ flex: 1, height: 12 + (i * 2), background: `${phColor}40`, borderRadius: 2, borderBottom: `2px solid ${phColor}` }} />;
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontFamily: typo.monoSm.font, fontSize: 11, color: c.textDim }}>Feb 3</span>
              <span style={{ fontFamily: typo.monoSm.font, fontSize: 11, color: c.textDim }}>7 weeks</span>
              <span style={{ fontFamily: typo.monoSm.font, fontSize: 11, color: c.textDim }}>Now</span>
            </div>
          </ExampleCard>

          {/* ── Project Phases ── */}
          <div style={{ marginTop: space[3] }}>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text, marginBottom: space[2] }}>Project Phases</div>
            <ExampleCard style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
              {[
                { phase: "PRD", color: pc.PRD, desc: "Product requirements being defined" },
                { phase: "Design", color: pc.Design, desc: "UX/UI design and technical architecture" },
                { phase: "Dev", color: pc.Dev, desc: "Active development and implementation" },
                { phase: "QA", color: pc.QA, desc: "Quality assurance and testing" },
                { phase: "Alpha", color: pc.Alpha, desc: "Internal testing with the team" },
                { phase: "Beta", color: pc.Beta, desc: "Real-user testing and A/B experiments" },
                { phase: "GA", color: pc.GA, desc: "Generally available to 100% of users" },
              ].map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                  <span style={{
                    fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 600,
                    letterSpacing: typo.monoSm.tracking, textTransform: "uppercase",
                    color: p.color, background: `${p.color}15`,
                    padding: `2px ${space[2]}px`, borderRadius: layout.radiusTag,
                    minWidth: 52, textAlign: "center",
                  }}>{p.phase}</span>
                  <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid }}>— {p.desc}</span>
                </div>
              ))}
            </ExampleCard>
          </div>

          {/* ── Project Health Scoring ── */}
          <div id="guide-health" style={{ marginTop: space[3] }}>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text, marginBottom: space[2] }}>Project Health Scoring</div>
            <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid, marginBottom: space[3] }}>
              Every project gets a health score out of 100, calculated each week:
            </div>
            <ExampleCard style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
              <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text }}>
                Base score: <span style={{ color: c.green }}>100</span>
              </div>
              <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim, textTransform: "uppercase", marginTop: space[1] }}>Deductions</div>
              <div style={{ paddingLeft: space[3], display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid, lineHeight: 1.5 }}>
                  <span style={{ color: c.red }}>−20</span> if the project is overdue
                </div>
                <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid, lineHeight: 1.5 }}>
                  <span style={{ color: c.red }}>−15</span> if any commits are blocked
                </div>
                <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid, lineHeight: 1.5 }}>
                  <span style={{ color: c.orange }}>−10</span> if the project is older than 60 days (<span style={{ color: c.orange }}>−5</span> if older than 30 days)
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: space[2], marginTop: space[1], display: "flex", gap: space[4], fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size }}>
                <span><span style={{ color: c.green }}>80+</span> <span style={{ color: c.textDim }}>= On Track</span></span>
                <span><span style={{ color: c.orange }}>50–79</span> <span style={{ color: c.textDim }}>= At Risk</span></span>
                <span><span style={{ color: c.red }}>&lt;50</span> <span style={{ color: c.textDim }}>= Critical</span></span>
              </div>
            </ExampleCard>
          </div>
        </Surface>

        {/* PEOPLE */}
        <Surface id="guide-people" variant="panel" style={{ padding: `${space[4] + 2}px ${space[5]}px`, display: "flex", flexDirection: "column", gap: space[3], marginLeft: space[4] + 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
            <div style={{ width: 32, height: 32, borderRadius: layout.radiusSm, background: `${c.cyan}12`, border: `1px solid ${c.cyan}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: c.cyan }}>3</span>
            </div>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>People</div>
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Explore your team member by member. Each person has a <strong style={{ color: c.green, fontWeight: 600 }}>momentum score</strong> — a weighted measure of how consistently they lock commits and complete their tasks.
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Click into any person for commit history, projects touched, and a weekly activity timeline. Useful for 1:1 prep and workload reviews.
          </div>
          {/* Momentum explainer */}
          <div style={{ marginTop: space[3], padding: `${space[4]}px ${space[5]}px`, background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: layout.radiusMd }}>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text, marginBottom: space[2] }}>How Momentum works</div>
            <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
              Momentum measures follow-through — are you committing to work <em>and</em> finishing it? It's calculated per week, then averaged across all weeks since a person's first activity.
            </div>
            <div style={{ marginTop: space[3], display: "flex", flexDirection: "column", gap: space[2] }}>
              <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textMid, letterSpacing: "0.02em" }}>
                <strong style={{ color: c.accent }}>Current week</strong>
              </div>
              <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textMid, paddingLeft: space[3], lineHeight: 1.8 }}>
                <span style={{ color: c.green }}>35%</span> — locking your commit (declaring what you'll do)<br />
                <span style={{ color: c.green }}>65%</span> — completing your items (proportional: 2 of 3 done = 43%)
              </div>
              <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textMid, letterSpacing: "0.02em", marginTop: space[1] }}>
                <strong style={{ color: c.accent }}>Past weeks</strong>
              </div>
              <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textMid, paddingLeft: space[3], lineHeight: 1.8 }}>
                <span style={{ color: c.green }}>100%</span> — based on completion rate (items marked done / total items)
              </div>
            </div>
            <div style={{ marginTop: space[3], fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
              Weeks before a person's first activity are excluded — new joiners aren't penalized. If there's no data yet, a <strong style={{ color: c.textDim }}>—</strong> is shown instead of 0%.
            </div>
            <div style={{ marginTop: space[3], display: "flex", gap: space[4], fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size }}>
              <span><span style={{ color: c.green }}>80%+</span> <span style={{ color: c.textDim }}>= strong</span></span>
              <span><span style={{ color: c.orange }}>50–79%</span> <span style={{ color: c.textDim }}>= needs attention</span></span>
              <span><span style={{ color: c.red }}>&lt;50%</span> <span style={{ color: c.textDim }}>= at risk</span></span>
            </div>
          </div>
          {/* Mini visual: person card */}
          <ExampleCard style={{ display: "flex", alignItems: "center", gap: space[3] }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: c.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: typo.monoSm.font, fontSize: 13, fontWeight: 700, color: c.textCrit,
            }}>T</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text }}>Tariq A.</span>
              <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textDim, marginLeft: space[2] }}>Head of Product · Ads</span>
            </div>
            <span style={{ fontFamily: typo.displayHero.font, fontSize: typo.displaySm.size, fontWeight: 700, color: c.green, fontVariantNumeric: "tabular-nums" }}>100%</span>
          </ExampleCard>
        </Surface>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 3: SUMMARY
          ══════════════════════════════════════════════════════════════ */}
      <div id="guide-summary" style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <div style={{ width: 4, height: 28, borderRadius: 2, background: c.green }} />
          <div>
            <div style={{ fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size, fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking, color: c.text, lineHeight: 1 }}>Summary</div>
            <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.green, textTransform: "uppercase", marginTop: 4 }}>The big picture</div>
          </div>
        </div>

        <Surface variant="panel" style={{ padding: `${space[4] + 2}px ${space[5]}px`, display: "flex", flexDirection: "column", gap: space[3], marginLeft: space[4] + 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
            <div style={{ width: 32, height: 32, borderRadius: layout.radiusSm, background: `${c.green}12`, border: `1px solid ${c.green}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: c.green }}>1</span>
            </div>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>Summary</div>
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Your executive dashboard — designed to answer <em>"How is the team doing?"</em> in under 10 seconds.
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Shows a rolling 6-week history with week-over-week deltas. Three sections: <strong style={{ color: c.text, fontWeight: 600 }}>Projects</strong> (active, no-action, shipped), <strong style={{ color: c.text, fontWeight: 600 }}>Commits</strong> (completion rate, blocked %, carried %), and <strong style={{ color: c.text, fontWeight: 600 }}>People</strong> (active, committed).
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Each section includes trend charts across weeks. A squad breakdown table shows per-squad metrics. Click any historical week tab to compare.
          </div>
          {/* Mini visual: delta indicators */}
          <ExampleCard style={{ display: "flex", gap: space[5], justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { label: "Active", value: "78", delta: "+3", color: c.green },
              { label: "No Action", value: "22", delta: "-2", color: c.orange },
              { label: "Delivery", value: "63%", delta: "+5", color: c.cyan },
            ].map((m, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: typo.displayHero.font, fontSize: 20, fontWeight: 700, color: c.text, fontVariantNumeric: "tabular-nums" }}>
                  {m.value}
                  {m.delta && <span style={{ fontSize: 12, fontWeight: 600, color: m.color, marginLeft: 3 }}>{m.delta}</span>}
                </div>
                <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim, marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </ExampleCard>
        </Surface>
      </div>

      <Divider label="Power features" />

      {/* ══════════════════════════════════════════════════════════════
          POWER FEATURES
          ══════════════════════════════════════════════════════════════ */}

      {/* COMMAND PALETTE */}
      <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <div style={{ width: 4, height: 28, borderRadius: 2, background: c.purple }} />
          <div>
            <div style={{ fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size, fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking, color: c.text, lineHeight: 1 }}>Command Palette & Search</div>
            <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.purple, textTransform: "uppercase", marginTop: 4 }}>Universal navigation</div>
          </div>
        </div>

        <p style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid, margin: 0, paddingLeft: space[4] + 4 }}>
          Press <Kbd>⌘K</Kbd> (or <Kbd>Ctrl+K</Kbd>) to open the command palette. Search across projects (by name or ID), people, tabs, and actions — all from one place.
        </p>

        <Surface variant="panel" style={{ padding: `${space[4] + 2}px ${space[5]}px`, display: "flex", flexDirection: "column", gap: space[3], marginLeft: space[4] + 4 }}>
          <ExampleCard style={{ display: "flex", alignItems: "center", gap: space[2] }}>
            <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim }}>{'>'}</span>
            <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.text, fontWeight: 500 }}>checkout</span>
            <span style={{ marginLeft: "auto", fontFamily: typo.monoSm.font, fontSize: 11, color: c.textDim, letterSpacing: "0.05em" }}>ESC TO CLOSE</span>
          </ExampleCard>
          <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, lineHeight: 1.6, color: c.textDim }}>
            Finds <ProjectId id="X03" /> Checkout Flow, <ProjectId id="X31" /> Checkout V3, and any related people or navigation options.
          </div>
        </Surface>
      </div>

      {/* WEEK NAVIGATION & GLOBAL FILTERS */}
      <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <div style={{ width: 4, height: 28, borderRadius: 2, background: c.orange }} />
          <div>
            <div style={{ fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size, fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking, color: c.text, lineHeight: 1 }}>Week Navigation & Filters</div>
            <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.orange, textTransform: "uppercase", marginTop: 4 }}>Time travel & focus</div>
          </div>
        </div>

        <p style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid, margin: 0, paddingLeft: space[4] + 4 }}>
          Use the <strong style={{ color: c.text, fontWeight: 600 }}>week selector</strong> in the header bar to browse historical weeks. All views update to show that week's data — commits, project activity, and metrics. Past weeks are read-only.
        </p>
        <p style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid, margin: 0, paddingLeft: space[4] + 4 }}>
          The <strong style={{ color: c.text, fontWeight: 600 }}>global filter</strong> bar lets you filter by owner, squad, or person across all views. Filters support multi-select — you can select multiple squads, owners, or people at once. Applied filters show as chips and persist as you navigate between tabs.
        </p>
      </div>

      {/* TERMINAL */}
      <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <div style={{ width: 4, height: 28, borderRadius: 2, background: c.green }} />
          <div>
            <div style={{ fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size, fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking, color: c.text, lineHeight: 1 }}>Terminal</div>
            <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.green, textTransform: "uppercase", marginTop: 4 }}>Behind the gate</div>
          </div>
        </div>

        <p style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid, margin: 0, paddingLeft: space[4] + 4 }}>
          Press <Kbd>T</Kbd> to enter the terminal. It's the gateway to four tools: <strong style={{ color: c.text, fontWeight: 600 }}>Settings</strong> (squads, roles, and people — now with rename support), <strong style={{ color: c.text, fontWeight: 600 }}>Logs</strong> (a live activity ledger of every change), <strong style={{ color: c.text, fontWeight: 600 }}>Rant</strong> (submit feature requests and feedback), and <strong style={{ color: c.text, fontWeight: 600 }}>Admin</strong> (app-wide paperwork and admin controls). The terminal boots once per session — after that, all four are one click away.
        </p>
      </div>

      <Divider label="Weekly rhythm" />

      {/* ══════════════════════════════════════════════════════════════
          SECTION: WEEKLY RHYTHM
          ══════════════════════════════════════════════════════════════ */}
      <div id="weekly-rhythm" style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <div style={{ width: 4, height: 28, borderRadius: 2, background: c.orange }} />
          <div>
            <div style={{ fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size, fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking, color: c.text, lineHeight: 1 }}>Weekly Rhythm</div>
            <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.orange, textTransform: "uppercase", marginTop: 4 }}>Structured cadence for the week</div>
          </div>
        </div>

        <p style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid, margin: 0, paddingLeft: space[4] + 4 }}>
          Each day of the week has a purpose. The rhythm pill in the context bar shows today's mode — click it anytime for a quick reference.
        </p>

        <Surface variant="panel" style={{ padding: `${space[4] + 2}px ${space[5]}px`, display: "flex", flexDirection: "column", gap: space[3], marginLeft: space[4] + 4 }}>
          {[
            { day: "Sunday",    icon: "\u25CE",  label: "Focus day",   desc: "Deep work and planning. Prepare for the week ahead.", color: c.purple },
            { day: "Monday",    icon: "\u25CE",  label: "Focus day",   desc: "Kick off the week with focused execution on top priorities.", color: c.purple },
            { day: "Tuesday",   icon: "\u26A1", label: "Sprint day",  desc: "Heads-down building. Maximize output on active commits.", color: c.green },
            { day: "Wednesday", icon: "\u26A1", label: "Sprint day",  desc: "Continue the sprint momentum. Unblock and push through.", color: c.green },
            { day: "Thursday",  icon: "\uD83D\uDE80", label: "Release day", desc: "Ship what's ready. Move work from Dev to QA to Done.", color: c.orange },
            { day: "Friday",    icon: "\u2713",  label: "Review day",  desc: "Close the week. Update each project's activity feed and flag anything stale.", color: c.cyan },
            { day: "Saturday",  icon: "\uD83D\uDCA4", label: "Rest day",    desc: "Recharge. The system rests so you can come back stronger.", color: c.textDim },
          ].map((r, i) => {
            const isToday = new Date().getDay() === i;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: space[3],
                padding: `${space[2]}px ${space[3]}px`,
                borderRadius: layout.radiusSm,
                background: isToday ? `${r.color}10` : "transparent",
                border: isToday ? `1px solid ${r.color}25` : "1px solid transparent",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: layout.radiusTag,
                  background: `${r.color}15`, border: `1px solid ${r.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, flexShrink: 0, lineHeight: 1,
                }}>{r.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                    <span style={{
                      fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                      fontWeight: 600, color: isToday ? r.color : c.text,
                    }}>{r.day}</span>
                    <span style={{
                      fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                      fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking,
                      color: r.color, textTransform: "uppercase",
                    }}>{r.label}</span>
                    {isToday && (
                      <span style={{
                        fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700,
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        color: r.color, background: `${r.color}18`,
                        padding: "1px 5px", borderRadius: layout.radiusTag,
                      }}>today</span>
                    )}
                  </div>
                  <div style={{
                    fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                    color: c.textMid, lineHeight: 1.5, marginTop: 2,
                  }}>{r.desc}</div>
                </div>
              </div>
            );
          })}
        </Surface>
      </div>

      <Divider label="Keyboard shortcuts" />

      {/* ═══ KEYBOARD SHORTCUTS ═══ */}
      <Surface variant="panel" style={{ padding: `${space[4] + 2}px ${space[5]}px`, display: "flex", flexDirection: "column", gap: space[3] }}>
        <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>Quick Reference</div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: `${space[2]}px ${space[4]}px`, fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size }}>
          {[
            ["1 – 4", "Navigate tabs: Summary, Projects, People, Guide"],
            ["T", "Open Terminal (gate to Settings, Logs, Rant, Admin)"],
            ["⌘K / Ctrl+K", "Open command palette / universal search"],
            ["/", "Focus in-tab search bar"],
            ["↑ ↓", "Move focus up / down through rows; Enter to open"],
            ["?", "Toggle keyboard shortcut hints"],
            ["Esc", "Go back / close palette / exit detail"],
          ].map(([key, desc], i) => (
            <React.Fragment key={i}>
              <div style={{ textAlign: "right" }}><Kbd>{key}</Kbd></div>
              <div style={{ color: c.textMid, lineHeight: 1.6 }}>{desc}</div>
            </React.Fragment>
          ))}
        </div>
      </Surface>

      <Divider label="Getting started" />

      {/* ═══ GETTING STARTED ═══ */}
      <div style={{ textAlign: "center" }}>
        <p style={{
          fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
          lineHeight: 1.7, color: c.textMid, maxWidth: 580, margin: "0 auto",
        }}>
          Open <strong style={{ color: c.accent, fontWeight: 600 }}>Projects</strong> to
          see every active workstream, who owns it, and whether it's stalling.
          Click in to read the activity feed or post your own update. Use number keys
          <Kbd>1</Kbd> through <Kbd>4</Kbd> to navigate instantly, or press <Kbd>?</Kbd> to
          see all keyboard shortcuts.
        </p>
        <p style={{
          fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
          color: c.textDim, marginTop: space[4],
        }}>
          Search anything with <Kbd>⌘K</Kbd> or <Kbd>Ctrl+K</Kbd> — project IDs, names, squads, people. It works everywhere.
        </p>
        <div style={{ marginTop: space[5], display: "flex", gap: space[3], justifyContent: "center" }}>
          <Btn variant="secondary" onClick={() => onNavigate("summary")}>Start with Summary</Btn>
          <Btn variant="primary" onClick={() => onNavigate("projects")}>Jump to Projects →</Btn>
        </div>
      </div>

      {/* ═══ FOOTER — CREDITS ═══ */}
      <div style={{
        marginTop: space[8], paddingTop: space[7], paddingBottom: space[4],
        borderTop: `1px solid ${c.border}`,
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: space[4], textAlign: "center",
      }}>
        <div style={{
          fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 600,
          lineHeight: 1.8, letterSpacing: "0.06em",
          color: c.textDim, textTransform: "uppercase",
        }}>
          vibe coded by{" "}
          <span style={{ color: c.accent }}>AJ</span>,{" "}
          <span style={{ color: c.cyan }}>Opus</span>,{" "}
          <span style={{ color: c.green }}>Codex</span>,{" "}
          <span style={{ color: c.purple }}>Wispr</span>,{" "}
          <span style={{ color: c.orange }}>Vosk</span>{" "}
          and{" "}
          <span style={{ color: c.red }}>Red Bull</span>
        </div>
        <div style={{
          fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 600,
          letterSpacing: "0.06em", lineHeight: 1.6, color: c.textDim,
          textTransform: "uppercase",
        }}>
          thoughts? feedback?{" "}
          <span
            onClick={() => onNavigate && onNavigate("rant")}
            style={{ color: c.textMid, cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: 3 }}
          >Rant</span>
        </div>
      </div>
    </div>
  );
};

export default GuideView;
