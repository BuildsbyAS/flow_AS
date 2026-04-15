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
        }}>Team productivity, finally visible.</p>
        <p style={{
          fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size,
          lineHeight: 1.7, color: c.textMid, maxWidth: 580, margin: 0,
        }}>
          Flow gives engineering leaders a real-time operating view of their team.
          Each person commits to deliverables weekly, locks them in, and reports outcomes.
        </p>
      </div>

      <Divider label="How Flow is organized" />

      {/* ═══ OVERVIEW — visual layer diagram ═══ */}
      <div style={{ maxWidth: 620, margin: "0 auto", display: "flex", flexDirection: "column", gap: space[4] }}>

        <p style={{
          fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
          lineHeight: 1.7, color: c.textMid, textAlign: "center", margin: 0,
        }}>
          Flow is built around two layers. Navigate with <Kbd>1</Kbd>–<Kbd>6</Kbd>, or press <Kbd>F</Kbd> to search anything.
        </p>

        {/* Layer cards */}
        <div style={{ display: "flex", gap: space[3] }}>
          {/* Execution layer */}
          <div style={{
            flex: 1, padding: `${space[4]}px`, borderRadius: layout.radiusMd,
            background: `${c.accent}06`, border: `1px solid ${c.accent}20`,
            display: "flex", flexDirection: "column", gap: space[2],
          }}>
            <div style={{
              fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
              fontWeight: typo.monoSm.weight, letterSpacing: "0.06em",
              color: c.accent, textTransform: "uppercase",
            }}>The execution layer</div>
            <div style={{
              fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size,
              fontWeight: typo.displaySm.weight, color: c.text, lineHeight: 1.3,
            }}>What's happening this week</div>
            <div style={{
              fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
              color: c.textMid, lineHeight: 1.5,
            }}>
              Manage the team's weekly commits in real time.
            </div>
            <div style={{ display: "flex", gap: space[2], marginTop: space[1] }}>
              {[{ label: "Pulse", num: "2" }, { label: "Commit", num: "3" }].map(t => (
                <span key={t.num} style={{
                  fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                  fontWeight: 600, color: c.accent, background: c.accentDim,
                  padding: `2px ${space[2]}px`, borderRadius: layout.radiusTag,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span style={{ fontSize: 11, opacity: 0.6 }}>{t.num}</span> {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Deep-dive layer */}
          <div style={{
            flex: 1, padding: `${space[4]}px`, borderRadius: layout.radiusMd,
            background: `${c.cyan}06`, border: `1px solid ${c.cyan}20`,
            display: "flex", flexDirection: "column", gap: space[2],
          }}>
            <div style={{
              fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
              fontWeight: typo.monoSm.weight, letterSpacing: "0.06em",
              color: c.cyan, textTransform: "uppercase",
            }}>The deep-dive layer</div>
            <div style={{
              fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size,
              fontWeight: typo.displaySm.weight, color: c.text, lineHeight: 1.3,
            }}>The full picture across weeks</div>
            <div style={{
              fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
              color: c.textMid, lineHeight: 1.5,
            }}>
              Timelines, trends, momentum, and history.
            </div>
            <div style={{ display: "flex", gap: space[2], marginTop: space[1], flexWrap: "wrap" }}>
              {[{ label: "Summary", num: "1", color: c.green }, { label: "Projects", num: "4", color: c.cyan }, { label: "People", num: "5", color: c.cyan }].map(t => (
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
          SECTION 1: WEEKLY COMMITS
          ══════════════════════════════════════════════════════════════ */}
      <div id="guide-pulse" style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <div style={{ width: 4, height: 28, borderRadius: 2, background: c.accent }} />
          <div>
            <div style={{ fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size, fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking, color: c.text, lineHeight: 1 }}>Weekly Commits</div>
            <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.accent, textTransform: "uppercase", marginTop: 4 }}>The execution layer</div>
          </div>
        </div>

        <p style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid, margin: 0, paddingLeft: space[4] + 4 }}>
          Pulse and Commit are your weekly operating tools. Toggle between them to see what your team is shipping right now.
        </p>

        {/* PULSE */}
        <Surface variant="panel" style={{ padding: `${space[4] + 2}px ${space[5]}px`, display: "flex", flexDirection: "column", gap: space[3], marginLeft: space[4] + 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
            <div style={{ width: 32, height: 32, borderRadius: layout.radiusSm, background: `${c.accent}12`, border: `1px solid ${c.accent}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: c.accent }}>2</span>
            </div>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>Pulse</div>
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Your real-time command center. See every project across all squads — what's active, who's working on it, and the health of each project for the current week.
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Switch between the project matrix and the people view. Filter by phase, squad, or status to spot blocked work early. Hover over any project to see a detail panel with commits, owner, and risk indicators.
          </div>
          {/* Mini visual: project ID example */}
          <ExampleCard>
            <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
              <ProjectId id="X43" />
              <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text }}>Customer Segmentation</span>
              <span style={{ marginLeft: "auto", fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim }}>Ads</span>
            </div>
            <MiniRow items={[
              { label: "Dev", color: pc.Dev, bg: `${pc.Dev}15` },
              { label: "Build", color: tc.BUILD.color, bg: tc.BUILD.bg },
            ]} />
          </ExampleCard>
        </Surface>

        {/* COMMIT */}
        <Surface id="guide-commit" variant="panel" style={{ padding: `${space[4] + 2}px ${space[5]}px`, display: "flex", flexDirection: "column", gap: space[3], marginLeft: space[4] + 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
            <div style={{ width: 32, height: 32, borderRadius: layout.radiusSm, background: `${c.accent}12`, border: `1px solid ${c.accent}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: c.accent }}>3</span>
            </div>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>Commit</div>
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Where each person declares what they're shipping this week. Each person gets <strong style={{ color: c.text, fontWeight: 600 }}>3 commit slots</strong> plus <strong style={{ color: c.text, fontWeight: 600 }}>1 optional buffer</strong>.
          </div>

          {/* ── Planning ── */}
          <div style={{ marginTop: space[2] }}>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text, marginBottom: space[2] }}>Planning (Sunday–Monday)</div>
            <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
              Fill in your 3 commits — each one needs a <strong style={{ color: c.text, fontWeight: 600 }}>project</strong>, a <strong style={{ color: c.text, fontWeight: 600 }}>deliverable description</strong>, a <strong style={{ color: c.text, fontWeight: 600 }}>stage</strong>, and a <strong style={{ color: c.text, fontWeight: 600 }}>type</strong>.
            </div>
            <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid, marginTop: space[2] }}>
              You also set a <strong style={{ color: c.text, fontWeight: 600 }}>timeline</strong> (1–4 weeks) for each commit. The planning flow uses dot navigation — one commit at a time.
            </div>
          </div>

          {/* ── Stage explainer ── */}
          <ExampleCard style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size - 1, fontWeight: typo.displaySm.weight, color: c.text, letterSpacing: typo.displaySm.tracking }}>Stage</div>
            <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, lineHeight: 1.5, color: c.textMid }}>
              What phase of the development lifecycle is this work in?
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[2] }}>
              {[
                { stage: "PRD", desc: "Requirements & spec writing" },
                { stage: "Design", desc: "UI/UX design & prototyping" },
                { stage: "Dev", desc: "Building & implementation" },
                { stage: "QA", desc: "Testing & quality assurance" },
              ].map(s => (
                <div key={s.stage} style={{ display: "flex", alignItems: "center", gap: space[2], padding: `${space[1] + 2}px ${space[2] + 2}px`, background: `${pc[s.stage] || c.textDim}08`, borderRadius: layout.radiusSm, border: `1px solid ${pc[s.stage] || c.textDim}20` }}>
                  <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: pc[s.stage] || c.textDim, minWidth: 48 }}>{s.stage}</span>
                  <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid }}>{s.desc}</span>
                </div>
              ))}
            </div>
          </ExampleCard>

          {/* ── Type explainer ── */}
          <ExampleCard style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size - 1, fontWeight: typo.displaySm.weight, color: c.text, letterSpacing: typo.displaySm.tracking }}>Type</div>
            <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, lineHeight: 1.5, color: c.textMid }}>
              What kind of work is this commit?
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[2] }}>
              <div style={{ display: "flex", flexDirection: "column", gap: space[1], padding: `${space[2] + 2}px ${space[3]}px`, background: `${tc.BUILD.color}08`, borderRadius: layout.radiusSm, border: `1px solid ${tc.BUILD.color}20` }}>
                <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                  <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: tc.BUILD.color }}>BUILD</span>
                </div>
                <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid, lineHeight: 1.4 }}>Structured project work with a clear deliverable — features, fixes, infrastructure.</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: space[1], padding: `${space[2] + 2}px ${space[3]}px`, background: `${tc.JAM.color}08`, borderRadius: layout.radiusSm, border: `1px solid ${tc.JAM.color}20` }}>
                <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                  <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: tc.JAM.color }}>JAM</span>
                </div>
                <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid, lineHeight: 1.4 }}>Exploratory or support work — spikes, reviews, planning, cross-team coordination.</span>
              </div>
            </div>
          </ExampleCard>

          {/* Mini dot navigation visual */}
          <ExampleCard style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: space[3], padding: `${space[3]}px ${space[5]}px` }}>
            <Dot filled label="1" />
            <div style={{ width: 20, height: 2, background: c.accent, borderRadius: 1 }} />
            <Dot filled label="2" />
            <div style={{ width: 20, height: 2, background: c.border, borderRadius: 1 }} />
            <Dot filled={false} label="3" />
            <div style={{ width: 20, height: 2, background: c.border, borderRadius: 1, borderTop: `2px dashed ${c.textDim}` }} />
            <Dot filled={false} label="B" />
          </ExampleCard>

          <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, lineHeight: 1.6, color: c.textDim, textAlign: "center" }}>
            3 commit slots + 1 optional buffer. Fill them, lock the week, deliver.
          </div>

          {/* ── Locking ── */}
          <div style={{ marginTop: space[2] }}>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text, marginBottom: space[2] }}>Locking</div>
            <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
              Once your 3 commits are filled, lock the week. This signals that you've committed to your plan. Expect to lock by Sunday evening or Monday morning at the latest.
            </div>
            <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid, marginTop: space[2] }}>
              After locking, you can still <strong style={{ color: c.orange, fontWeight: 600 }}>deprioritize</strong> one commit if priorities shift. When you deprioritize, the slot is struck through and a buffer slot opens up for a replacement task.
            </div>
          </div>

          {/* ── Closing the week ── */}
          <div style={{ marginTop: space[2] }}>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text, marginBottom: space[2] }}>Closing the week (Thursday–Friday)</div>
            <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
              Come back at the end of the week to close your commits. For each item, declare an outcome:
            </div>
          </div>

          {/* Outcomes mini card */}
          <ExampleCard style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
            <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
              <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700, color: c.green }}>{"✓"}</span>
              <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.green }}>Completed</span>
              <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid }}>— Done, shipped.</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
              <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700, color: c.cyan }}>{"→"}</span>
              <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.cyan }}>Carry</span>
              <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid }}>— Not finished, carrying to next week. Select which week to carry to.</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
              <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700, color: c.orange }}>{"◐"}</span>
              <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.orange }}>Completed + Carry</span>
              <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid }}>— This piece is done but the work continues next week.</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
              <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700, color: c.red }}>{"!"}</span>
              <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.red }}>Blocked</span>
              <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid }}>— Could not complete. You'll be asked to explain why.</span>
            </div>
          </ExampleCard>

          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Once all commits are resolved, close the week. Carried items automatically appear in the target week.
          </div>

          {/* ── Buffer ── */}
          <div style={{ marginTop: space[2] }}>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text, marginBottom: space[2] }}>Buffer</div>
            <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
              The buffer is a 4th slot that only activates when you deprioritize one of your 3 main commits. It lets you replace the dropped task with something else without losing the record of what was deprioritized and why.
            </div>
          </div>
        </Surface>
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
              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: c.cyan }}>4</span>
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
            We also have a <strong style={{ color: c.text, fontWeight: 600 }}>Gantt chart</strong> view — switch to it for a visual timeline of all projects with filterable squad and phase views.
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
              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: c.cyan }}>5</span>
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
          Press <Kbd>F</Kbd> to open the command palette. Search across projects (by name or ID), people, tabs, and actions — all from one place.
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
          Press <Kbd>T</Kbd> to enter the terminal. It has four modules: <strong style={{ color: c.text, fontWeight: 600 }}>Settings</strong> (manage squads, roles, and people), <strong style={{ color: c.text, fontWeight: 600 }}>Logs</strong> (a live activity ledger), <strong style={{ color: c.text, fontWeight: 600 }}>Rant</strong> (submit feature requests and feedback), and <strong style={{ color: c.text, fontWeight: 600 }}>Admin</strong> (paperwork and admin tools). Settings, Logs, and Admin are password-gated — Rant is always open.
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
            { day: "Friday",    icon: "\u2713",  label: "Review day",  desc: "Close the week. Review outcomes, update statuses, prep for next week.", color: c.cyan },
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
            ["1 – 6", "Navigate tabs: Summary, Pulse, Commit, Projects, People, Guide"],
            ["T", "Open Terminal (Settings, Logs, Rant, Admin)"],
            ["F", "Open command palette / universal search"],
            ["⌘K", "Open command palette (also Ctrl+K)"],
            ["/", "Focus in-tab search bar"],
            ["?", "Toggle keyboard shortcut hints"],
            ["Esc", "Go back / close palette"],
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
          Start with <strong style={{ color: c.green, fontWeight: 600 }}>Summary</strong> to
          see the overall health of your team. Then jump
          to <strong style={{ color: c.accent, fontWeight: 600 }}>Pulse</strong> or <strong style={{ color: c.accent, fontWeight: 600 }}>Commit</strong> to
          manage this week's commits. Use number keys <Kbd>1</Kbd> through <Kbd>5</Kbd> to
          navigate instantly, or press <Kbd>?</Kbd> to see all keyboard shortcuts.
        </p>
        <p style={{
          fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
          color: c.textDim, marginTop: space[4],
        }}>
          Search anything with <Kbd>F</Kbd> or <Kbd>⌘K</Kbd> — project IDs, names, squads, people. It works everywhere.
        </p>
        <div style={{ marginTop: space[5], display: "flex", gap: space[3], justifyContent: "center" }}>
          <Btn variant="secondary" onClick={() => onNavigate("summary")}>Start with Summary</Btn>
          <Btn variant="primary" onClick={() => onNavigate("pulse")}>Jump to Pulse →</Btn>
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
