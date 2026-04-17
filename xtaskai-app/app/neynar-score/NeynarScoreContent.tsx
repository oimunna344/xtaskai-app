"use client";

import { useState, useEffect } from "react";
import sdk from "@farcaster/frame-sdk";

const NEYNAR_API_KEY = "ECBFF4DF-F26E-4BA4-AD94-4170E28B4F69";

interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  experimental?: {
    neynar_user_score?: number;
  };
  follower_count: number;
  following_count: number;
}

interface DailyTask {
  id: string;
  icon: string;
  title: string;
  description: string;
  impact: number;
  actionUrl: string;
  actionLabel: string;
}

const DAILY_TASKS: DailyTask[] = [
  {
    id: "cast",
    icon: "🗣️",
    title: "Cast Something Today",
    description: "Post at least 1 cast on Farcaster",
    impact: 3,
    actionUrl: "https://warpcast.com/~/compose",
    actionLabel: "Cast Now",
  },
  {
    id: "reply",
    icon: "💬",
    title: "Reply to 3 Casts",
    description: "Engage with others by replying to 3 casts",
    impact: 3,
    actionUrl: "https://warpcast.com/",
    actionLabel: "Open Warpcast",
  },
  {
    id: "like",
    icon: "❤️",
    title: "Like 5 Casts",
    description: "React to casts you find interesting",
    impact: 2,
    actionUrl: "https://warpcast.com/",
    actionLabel: "Browse Feed",
  },
  {
    id: "recast",
    icon: "🔁",
    title: "Recast 1 Post",
    description: "Share a cast you like with your followers",
    impact: 2,
    actionUrl: "https://warpcast.com/",
    actionLabel: "Find & Recast",
  },
  {
    id: "follow",
    icon: "👥",
    title: "Follow 2 New Users",
    description: "Grow your network by following new people",
    impact: 2,
    actionUrl: "https://warpcast.com/~/explore",
    actionLabel: "Explore Users",
  },
  {
    id: "channel",
    icon: "📺",
    title: "Post in a Channel",
    description: "Be active in a relevant Farcaster channel",
    impact: 3,
    actionUrl: "https://warpcast.com/~/channel/farcaster",
    actionLabel: "Open Channel",
  },
  {
    id: "miniapp",
    icon: "🎯",
    title: "Use a Mini App",
    description: "Open and interact with any mini app today",
    impact: 2,
    actionUrl: "https://warpcast.com/~/frames",
    actionLabel: "Browse Apps",
  },
];

function getScoreLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 0.8) return { label: "Elite", color: "#4ade80", bg: "rgba(74,222,128,0.15)" };
  if (score >= 0.6) return { label: "High", color: "#a78bfa", bg: "rgba(167,139,250,0.15)" };
  if (score >= 0.4) return { label: "Medium", color: "#fbbf24", bg: "rgba(251,191,36,0.15)" };
  if (score >= 0.2) return { label: "Low", color: "#f87171", bg: "rgba(248,113,113,0.15)" };
  return { label: "Starter", color: "#6b7280", bg: "rgba(107,114,128,0.15)" };
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadCompletedTasks(): Set<string> {
  try {
    const saved = localStorage.getItem("xtaskai_tasks");
    if (!saved) return new Set();
    const { date, tasks } = JSON.parse(saved);
    if (date !== getTodayKey()) return new Set();
    return new Set(tasks);
  } catch {
    return new Set();
  }
}

function saveCompletedTasks(tasks: Set<string>) {
  localStorage.setItem("xtaskai_tasks", JSON.stringify({
    date: getTodayKey(),
    tasks: Array.from(tasks),
  }));
}

export default function NeynarScoreContent() {
  const [fid, setFid] = useState<number | null>(null);
  const [user, setUser] = useState<NeynarUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [showTasks, setShowTasks] = useState(false);

  useEffect(() => {
    setCompletedTasks(loadCompletedTasks());
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await sdk.actions.ready();
        const context = await sdk.context;
        if (context?.user?.fid) {
          setFid(context.user.fid);
          await fetchScore(context.user.fid);
        } else {
          setError("Could not get your Farcaster identity.");
        }
      } catch (e) {
        setError("Open inside Farcaster app.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchScore = async (userFid: number) => {
    setChecking(true);
    setError("");
    try {
      const res = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${userFid}`,
        {
          headers: {
            "accept": "application/json",
            "x-api-key": NEYNAR_API_KEY,
          },
        }
      );
      const data = await res.json();
      if (data?.users?.[0]) {
        setUser(data.users[0]);
      } else {
        setError("Could not fetch score. Try again.");
      }
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const toggleTask = (taskId: string) => {
    const updated = new Set(completedTasks);
    if (updated.has(taskId)) {
      updated.delete(taskId);
    } else {
      updated.add(taskId);
    }
    setCompletedTasks(updated);
    saveCompletedTasks(updated);
  };

  const openUrl = (url: string) => {
    sdk.actions.openUrl(url);
  };

  const score = user?.experimental?.neynar_user_score ?? null;
  const scoreInfo = score !== null ? getScoreLabel(score) : null;
  const completedCount = completedTasks.size;
  const totalTasks = DAILY_TASKS.length;
  const progressPct = Math.round((completedCount / totalTasks) * 100);

  if (loading) {
    return (
      <div style={s.bg}>
        <div style={s.blob1} />
        <div style={s.blob2} />
        <div style={{ ...s.card, textAlign: "center" }}>
          <div style={{ fontSize: 52, color: "#7c3aed", marginBottom: 12 }}>⬡</div>
          <p style={{ color: "#a78bfa", margin: 0, fontSize: 15 }}>Connecting to Farcaster...</p>
          <div style={s.spinner} />
        </div>
      </div>
    );
  }

  if (!fid && error) {
    return (
      <div style={s.bg}>
        <div style={s.blob1} />
        <div style={s.blob2} />
        <div style={{ ...s.card, textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ color: "#fff", margin: 0, fontSize: 20 }}>Not Connected</h2>
          <p style={{ color: "#f87171", marginTop: 8, fontSize: 14 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.bg}>
      <div style={s.blob1} />
      <div style={s.blob2} />

      <div style={{ ...s.card, textAlign: "left" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0 }}>Neynar Score</h1>
            <p style={{ fontSize: 12, color: "#7c3aed", margin: 0, marginTop: 2 }}>Farcaster Activity Score</p>
          </div>
          <div style={s.badge}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", display: "inline-block", marginRight: 6 }} />
            Connected
          </div>
        </div>

        {/* Score Card */}
        {user && score !== null && scoreInfo ? (
          <div style={{ ...s.scoreCard, borderColor: scoreInfo.color + "44" }}>
            {/* User info */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              {user.pfp_url && (
                <img
                  src={user.pfp_url}
                  alt="pfp"
                  style={{ width: 48, height: 48, borderRadius: "50%", border: `2px solid ${scoreInfo.color}44` }}
                />
              )}
              <div>
                <p style={{ color: "#fff", fontWeight: 700, margin: 0, fontSize: 15 }}>{user.display_name}</p>
                <p style={{ color: "#7c3aed", margin: 0, fontSize: 12 }}>@{user.username} · FID {user.fid}</p>
              </div>
            </div>

            {/* Score display */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <p style={{ color: "#a78bfa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Your Score</p>
                <p style={{ color: scoreInfo.color, fontSize: 48, fontWeight: 900, margin: 0, lineHeight: 1.1 }}>
                  {score.toFixed(3)}
                </p>
              </div>
              <div style={{ ...s.scoreBadge, background: scoreInfo.bg, color: scoreInfo.color, borderColor: scoreInfo.color + "44" }}>
                {scoreInfo.label}
              </div>
            </div>

            {/* Score bar */}
            <div style={s.barBg}>
              <div style={{ ...s.barFill, width: `${score * 100}%`, background: `linear-gradient(90deg, ${scoreInfo.color}88, ${scoreInfo.color})` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ color: "#6b7280", fontSize: 10 }}>0.0</span>
              <span style={{ color: "#6b7280", fontSize: 10 }}>1.0 (Max)</span>
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
              <div style={s.statBox}>
                <p style={{ color: "#7c3aed", fontSize: 10, fontWeight: 600, textTransform: "uppercase", margin: 0 }}>Followers</p>
                <p style={{ color: "#e2d9f3", fontSize: 18, fontWeight: 800, margin: 0 }}>{user.follower_count.toLocaleString()}</p>
              </div>
              <div style={s.statBox}>
                <p style={{ color: "#7c3aed", fontSize: 10, fontWeight: 600, textTransform: "uppercase", margin: 0 }}>Following</p>
                <p style={{ color: "#e2d9f3", fontSize: 18, fontWeight: 800, margin: 0 }}>{user.following_count.toLocaleString()}</p>
              </div>
            </div>

            {/* Refresh */}
            <button
              onClick={() => fid && fetchScore(fid)}
              disabled={checking}
              style={{ ...s.refreshBtn, opacity: checking ? 0.6 : 1 }}
            >
              {checking ? "⏳ Checking..." : "🔄 Refresh Score"}
            </button>
          </div>
        ) : (
          <div style={{ ...s.scoreCard, textAlign: "center" as const }}>
            {checking ? (
              <>
                <div style={s.spinner} />
                <p style={{ color: "#a78bfa", marginTop: 16, fontSize: 14 }}>Fetching your Neynar score...</p>
              </>
            ) : (
              <>
                <p style={{ color: "#f87171", fontSize: 14, margin: 0 }}>{error}</p>
                <button onClick={() => fid && fetchScore(fid)} style={{ ...s.refreshBtn, marginTop: 12 }}>
                  🔄 Try Again
                </button>
              </>
            )}
          </div>
        )}

        {/* Daily Tasks Section */}
        <div style={{ marginTop: 20 }}>
          <button onClick={() => setShowTasks(!showTasks)} style={s.taskHeader}>
            <div>
              <p style={{ color: "#fff", fontWeight: 700, margin: 0, fontSize: 15 }}>
                Daily Score Boost Tasks
              </p>
              <p style={{ color: "#7c3aed", fontSize: 12, margin: 0, marginTop: 2 }}>
                {completedCount}/{totalTasks} completed today
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ ...s.scoreBadge, background: "rgba(124,58,237,0.15)", color: "#a78bfa", borderColor: "rgba(124,58,237,0.3)" }}>
                {progressPct}%
              </div>
              <span style={{ color: "#7c3aed", fontSize: 18 }}>{showTasks ? "▲" : "▼"}</span>
            </div>
          </button>

          {/* Progress bar */}
          <div style={{ ...s.barBg, marginTop: 8, marginBottom: showTasks ? 12 : 0 }}>
            <div style={{
              ...s.barFill,
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, #7c3aed, #4f46e5)",
              transition: "width 0.4s ease",
            }} />
          </div>

          {/* Task list */}
          {showTasks && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DAILY_TASKS.map((task) => {
                const done = completedTasks.has(task.id);
                return (
                  <div
                    key={task.id}
                    style={{
                      ...s.taskCard,
                      borderColor: done ? "rgba(74,222,128,0.3)" : "rgba(124,58,237,0.15)",
                      background: done ? "rgba(74,222,128,0.06)" : "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <button
                        onClick={() => toggleTask(task.id)}
                        style={{
                          ...s.checkbox,
                          background: done ? "#4ade80" : "transparent",
                          borderColor: done ? "#4ade80" : "rgba(124,58,237,0.4)",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        {done && <span style={{ color: "#000", fontSize: 11, fontWeight: 900 }}>✓</span>}
                      </button>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 16 }}>{task.icon}</span>
                          <p style={{
                            color: done ? "#4ade80" : "#fff",
                            fontWeight: 700,
                            fontSize: 13,
                            margin: 0,
                            textDecoration: done ? "line-through" : "none",
                            opacity: done ? 0.7 : 1,
                          }}>
                            {task.title}
                          </p>
                        </div>
                        <p style={{ color: "#6b7280", fontSize: 11, margin: 0, marginBottom: 8 }}>
                          {task.description}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ color: "#6b7280", fontSize: 10 }}>Boost:</span>
                            {[1, 2, 3].map((i) => (
                              <span key={i} style={{ fontSize: 10, color: i <= task.impact ? "#fbbf24" : "#374151" }}>★</span>
                            ))}
                          </div>
                          {!done && (
                            <button onClick={() => openUrl(task.actionUrl)} style={s.actionBtn}>
                              {task.actionLabel} →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {completedCount === totalTasks && (
                <div style={s.allDoneBox}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>🎉 All tasks done for today!</p>
                  <p style={{ margin: 0, fontSize: 12, marginTop: 4, opacity: 0.8 }}>
                    Come back tomorrow for a new set of tasks
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Back button */}
        <button
          onClick={() => openUrl("https://xtaskai.com/base-mini-app/dashboard.php")}
          style={s.backBtn}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  bg: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0f0a1e 0%, #1a0a2e 50%, #0d0d1a 100%)",
    padding: "16px 16px 32px",
    position: "relative",
    overflow: "hidden",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  blob1: {
    position: "absolute", top: -100, right: -100,
    width: 300, height: 300, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  blob2: {
    position: "absolute", bottom: -100, left: -100,
    width: 300, height: 300, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(20px)",
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 390,
    border: "1px solid rgba(124,58,237,0.2)",
    boxShadow: "0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
    position: "relative",
    zIndex: 1,
    marginTop: 8,
  },
  badge: {
    background: "rgba(74,222,128,0.1)",
    border: "1px solid rgba(74,222,128,0.2)",
    borderRadius: 20,
    padding: "4px 12px",
    color: "#4ade80",
    fontSize: 12,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
  },
  scoreCard: {
    background: "rgba(124,58,237,0.08)",
    border: "1px solid rgba(124,58,237,0.2)",
    borderRadius: 18,
    padding: 16,
  },
  scoreBadge: {
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid",
  },
  barBg: {
    height: 6,
    background: "rgba(255,255,255,0.06)",
    borderRadius: 99,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 99,
    transition: "width 0.6s ease",
  },
  statBox: {
    background: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: "10px 12px",
    border: "1px solid rgba(124,58,237,0.15)",
  },
  refreshBtn: {
    width: "100%",
    marginTop: 14,
    padding: "10px",
    borderRadius: 12,
    border: "1px solid rgba(124,58,237,0.3)",
    background: "rgba(124,58,237,0.1)",
    color: "#a78bfa",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  taskHeader: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(124,58,237,0.08)",
    border: "1px solid rgba(124,58,237,0.2)",
    borderRadius: 14,
    padding: "12px 14px",
    cursor: "pointer",
    textAlign: "left" as const,
  },
  taskCard: {
    border: "1px solid",
    borderRadius: 14,
    padding: "12px 14px",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    border: "2px solid",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtn: {
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    border: "none",
    borderRadius: 8,
    padding: "5px 10px",
    color: "#fff",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },
  allDoneBox: {
    background: "rgba(74,222,128,0.08)",
    border: "1px solid rgba(74,222,128,0.25)",
    borderRadius: 14,
    padding: "14px 16px",
    color: "#4ade80",
    textAlign: "center" as const,
  },
  backBtn: {
    width: "100%",
    marginTop: 16,
    padding: "12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "transparent",
    color: "#6b7280",
    fontSize: 14,
    cursor: "pointer",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid rgba(124,58,237,0.2)",
    borderTop: "3px solid #7c3aed",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "16px auto 0",
  },
};