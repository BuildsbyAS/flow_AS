// Flow — Guide View
// Onboarding page: explains the three pillars of Flow with inline visual examples
import React from "react";
import { c, typo, space, layout, motion, entityColors, phaseColors, typeConfig } from "../styles/theme";
import { Surface, Badge } from "../components/shared";
import FlowLogo from "../components/FlowLogo";

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
    fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 600,
    color: c.accent, background: c.accentDim,
    padding: "1px 5px", borderRadius: layout.radiusTag + 1,
    border: `1px solid ${c.accent}25`, marginLeft: 2, marginRight: 2,
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

// Dot visual for the Focus planning dots
const Dot = ({ filled, label }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
    <div style={{
      width: 18, height: 18, borderRadius: "50%",
      background: filled ? c.accent : "transparent",
      border: `2px solid ${filled ? c.accent : c.textDim}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 9, fontWeight: 700, color: filled ? "#fff" : c.textDim,
      fontFamily: typo.monoSm.font,
    }}>{label}</div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   GUIDE VIEW
   ══════════════════════════════════════════════════════════════════ */
const GuideView = () => {
  const pc = phaseColors();
  const tc = typeConfig();

  return (
    <div style={{
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

      <p style={{
        fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
        lineHeight: 1.7, color: c.textMid, textAlign: "center",
        maxWidth: 620, margin: "0 auto",
      }}>
        Flow is built around three layers — from daily execution to the big picture.
      </p>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1: WEEKLY COMMITS & FOCUS
          ══════════════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <div style={{ width: 4, height: 28, borderRadius: 2, background: c.accent }} />
          <div>
            <div style={{ fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size, fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking, color: c.text, lineHeight: 1 }}>Weekly Commits & Focus</div>
            <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.accent, textTransform: "uppercase", marginTop: 4 }}>The execution layer</div>
          </div>
        </div>

        <p style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid, margin: 0, paddingLeft: space[4] + 4 }}>
          This is where work gets planned and tracked every week. Toggle between <strong style={{ color: c.text, fontWeight: 600 }}>Pulse</strong> and <strong style={{ color: c.text, fontWeight: 600 }}>Focus</strong> for active management of what your team is shipping right now.
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
            Your real-time command center. See every commitment across squads in a matrix view.
            Filter by project, stage, person, or squad to spot blocked work early.
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Every project has a unique <strong style={{ color: entityColors().project, fontWeight: 600 }}>project ID</strong> like <ProjectId id="X43" /> or <ProjectId id="X16" /> — searchable across every tab.
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

        {/* FOCUS */}
        <Surface variant="panel" style={{ padding: `${space[4] + 2}px ${space[5]}px`, display: "flex", flexDirection: "column", gap: space[3], marginLeft: space[4] + 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
            <div style={{ width: 32, height: 32, borderRadius: layout.radiusSm, background: `${c.accent}12`, border: `1px solid ${c.accent}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: c.accent }}>3</span>
            </div>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>Focus</div>
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Where each person declares what they're shipping this week. Assign up to <strong style={{ color: c.text, fontWeight: 600 }}>3 commitments + 1 buffer</strong>, lock the week, and close with outcomes.
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Each commitment has a few key attributes:
          </div>

          {/* Stage & Type explainer */}
          <div style={{ display: "flex", gap: space[4], flexWrap: "wrap" }}>
            <ExampleCard style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.textDim, textTransform: "uppercase", marginBottom: space[2] }}>Stage</div>
              <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid, lineHeight: 1.6, marginBottom: space[2] }}>Where the work sits in the product lifecycle.</div>
              <MiniRow items={[
                { label: "PRD", color: pc.PRD, bg: `${pc.PRD}15` },
                { label: "Design", color: pc.Design, bg: `${pc.Design}15` },
                { label: "Dev", color: pc.Dev, bg: `${pc.Dev}15` },
                { label: "QA", color: pc.QA, bg: `${pc.QA}15` },
              ]} />
            </ExampleCard>
            <ExampleCard style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.textDim, textTransform: "uppercase", marginBottom: space[2] }}>Type</div>
              <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid, lineHeight: 1.6, marginBottom: space[2] }}>What kind of work this commitment represents.</div>
              <MiniRow items={[
                { label: "Build", color: tc.BUILD.color, bg: tc.BUILD.bg },
                { label: "Jam", color: tc.JAM.color, bg: tc.JAM.bg },
                { label: "Commit", color: tc.COMMIT.color, bg: tc.COMMIT.bg },
              ]} />
            </ExampleCard>
          </div>

          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            You also set a <strong style={{ color: c.text, fontWeight: 600 }}>timeline</strong> (1–4 weeks) for each commitment. The planning flow uses dot navigation — one commitment at a time.
          </div>

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
            3 commitment slots + 1 optional buffer. Fill them, lock the week, deliver.
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
        <Surface variant="panel" style={{ padding: `${space[4] + 2}px ${space[5]}px`, display: "flex", flexDirection: "column", gap: space[3], marginLeft: space[4] + 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
            <div style={{ width: 32, height: 32, borderRadius: layout.radiusSm, background: `${c.cyan}12`, border: `1px solid ${c.cyan}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: c.cyan }}>4</span>
            </div>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>Projects</div>
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Registry of every project — <strong style={{ color: c.green, fontWeight: 600 }}>active</strong>, <strong style={{ color: c.textMid, fontWeight: 600 }}>completed</strong>, or <strong style={{ color: c.red, fontWeight: 600 }}>deprioritized</strong>. See owner, phase, health, and headcount at a glance.
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Click into any project for a <strong style={{ color: c.text, fontWeight: 600 }}>deep-dive</strong>: week-by-week activity, who worked on it, phase changes, and total investment.
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
              <span style={{ fontFamily: typo.monoSm.font, fontSize: 10, color: c.textDim }}>Feb 3</span>
              <span style={{ fontFamily: typo.monoSm.font, fontSize: 10, color: c.textDim }}>7 weeks</span>
              <span style={{ fontFamily: typo.monoSm.font, fontSize: 10, color: c.textDim }}>Now</span>
            </div>
          </ExampleCard>
        </Surface>

        {/* PEOPLE */}
        <Surface variant="panel" style={{ padding: `${space[4] + 2}px ${space[5]}px`, display: "flex", flexDirection: "column", gap: space[3], marginLeft: space[4] + 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
            <div style={{ width: 32, height: 32, borderRadius: layout.radiusSm, background: `${c.cyan}12`, border: `1px solid ${c.cyan}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: c.cyan }}>5</span>
            </div>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>People</div>
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Explore your team member by member. Each person has a <strong style={{ color: c.green, fontWeight: 600 }}>reliability score</strong> — the percentage of weeks they actively committed work.
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Click into any person for commitment history, projects touched, and a weekly activity timeline. Useful for 1:1 prep and workload reviews.
          </div>
          {/* Mini visual: person card */}
          <ExampleCard style={{ display: "flex", alignItems: "center", gap: space[3] }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: c.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: typo.monoSm.font, fontSize: 13, fontWeight: 700, color: "#fff",
            }}>T</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text }}>Tariq A.</span>
              <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textDim, marginLeft: space[2] }}>Head of Product · Ads</span>
            </div>
            <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: 700, color: c.green }}>100%</span>
          </ExampleCard>
        </Surface>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 3: SUMMARY
          ══════════════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <div style={{ width: 4, height: 28, borderRadius: 2, background: c.green }} />
          <div>
            <div style={{ fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size, fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking, color: c.text, lineHeight: 1 }}>Summary</div>
            <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.green, textTransform: "uppercase", marginTop: 4 }}>The big picture</div>
          </div>
        </div>

        <p style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid, margin: 0, paddingLeft: space[4] + 4 }}>
          Start here to understand what's happening week over week. This is your executive dashboard — designed to answer <em>"How is the team doing?"</em> in under 10 seconds.
        </p>

        <Surface variant="panel" style={{ padding: `${space[4] + 2}px ${space[5]}px`, display: "flex", flexDirection: "column", gap: space[3], marginLeft: space[4] + 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
            <div style={{ width: 32, height: 32, borderRadius: layout.radiusSm, background: `${c.green}12`, border: `1px solid ${c.green}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: c.green }}>1</span>
            </div>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>Summary</div>
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            A single-screen snapshot of your team's operating health — project counts, delivery rates, blocked work, and headcount with <strong style={{ color: c.green, fontWeight: 600 }}>week-over-week deltas</strong>.
          </div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, lineHeight: 1.7, color: c.textMid }}>
            Use the week selector to compare any week against the previous one. Bar charts show project and focus trends over time.
          </div>
          {/* Mini visual: delta indicators */}
          <ExampleCard style={{ display: "flex", gap: space[5], justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { label: "Active", value: "78", delta: "+3", color: c.green },
              { label: "No Action", value: "22", delta: "-2", color: c.orange },
              { label: "Delivery", value: "63%", delta: "+5", color: c.cyan },
            ].map((m, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: typo.displaySm.font, fontSize: 20, fontWeight: 700, color: c.text }}>
                  {m.value}
                  {m.delta && <span style={{ fontSize: 12, fontWeight: 600, color: m.color, marginLeft: 3 }}>{m.delta}</span>}
                </div>
                <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim, marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </ExampleCard>
        </Surface>
      </div>

      {/* ═══ SETTINGS ═══ */}
      <div style={{ display: "flex", alignItems: "center", gap: space[3], padding: `${space[3]}px ${space[4] + 4}px` }}>
        <div style={{ width: 4, height: 20, borderRadius: 2, background: c.textDim }} />
        <div>
          <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>Settings </span>
          <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid }}>
            — manage squads, roles, and people. Press <Kbd>6</Kbd> to jump there.
          </span>
        </div>
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
            { day: "Sunday",    icon: "◎",  label: "Focus day",   desc: "Deep work and planning. Prepare for the week ahead.", color: c.purple },
            { day: "Monday",    icon: "◎",  label: "Focus day",   desc: "Kick off the week with focused execution on top priorities.", color: c.purple },
            { day: "Tuesday",   icon: "⚡", label: "Sprint day",  desc: "Heads-down building. Maximize output on active commitments.", color: c.green },
            { day: "Wednesday", icon: "⚡", label: "Sprint day",  desc: "Continue the sprint momentum. Unblock and push through.", color: c.green },
            { day: "Thursday",  icon: "🚀", label: "Release day", desc: "Ship what's ready. Move work from Dev → QA → Done.", color: c.orange },
            { day: "Friday",    icon: "✓",  label: "Review day",  desc: "Close the week. Review outcomes, update statuses, prep for next week.", color: c.cyan },
            { day: "Saturday",  icon: "💤", label: "Rest day",    desc: "Recharge. The system rests so you can come back stronger.", color: c.textDim },
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
                        fontFamily: typo.monoSm.font, fontSize: 9, fontWeight: 700,
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

      <Divider label="Getting started" />

      {/* ═══ GETTING STARTED ═══ */}
      <div style={{ textAlign: "center" }}>
        <p style={{
          fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
          lineHeight: 1.7, color: c.textMid, maxWidth: 580, margin: "0 auto",
        }}>
          Start with <strong style={{ color: c.green, fontWeight: 600 }}>Summary</strong> to
          see the overall health of your team. Then jump
          to <strong style={{ color: c.accent, fontWeight: 600 }}>Pulse</strong> or <strong style={{ color: c.accent, fontWeight: 600 }}>Focus</strong> to
          manage this week's commitments. Use number keys <Kbd>1</Kbd> through <Kbd>7</Kbd> to
          navigate instantly, or press <Kbd>?</Kbd> to see all keyboard shortcuts.
        </p>
        <p style={{
          fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
          color: c.textDim, marginTop: space[4],
        }}>
          Search anything with <Kbd>F</Kbd> — project IDs, names, squads, people. It works everywhere.
        </p>
      </div>

      {/* ═══ FOOTER — CREDITS ═══ */}
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <div style={{
        marginTop: space[8], paddingTop: space[7], paddingBottom: space[4],
        borderTop: `1px solid ${c.border}`,
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: space[4], textAlign: "center",
      }}>
        <div style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 11,
          lineHeight: 2.2, letterSpacing: "0.04em",
          color: c.textDim,
        }}>
          vibe coded by{" "}
          <span style={{ color: c.accent }}>AJ</span>,{" "}
          <span style={{ color: c.cyan }}>Opus</span>,{" "}
          <span style={{ color: c.green }}>Codex</span>,{" "}
          <span style={{ color: c.orange }}>Vosk</span>{" "}
          and{" "}
          <span style={{ color: c.red }}>Red Bull</span>!
        </div>
        <div style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 9,
          lineHeight: 2, color: c.textDim, opacity: 0.7,
        }}>
          thoughts? feedback? reach out at{" "}
          <span style={{ color: c.textMid }}>aj@noon.com</span>
        </div>
      </div>
    </div>
  );
};

export default GuideView;
