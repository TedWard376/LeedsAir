import { useState, useEffect } from "react";
import { getLoyalty, redeemPoints } from "../services/api";
import { LoadingSpinner, ErrorMessage } from "../components/StatusMessages";
import { useAuth } from "../context/AuthContext";

const REWARDS = [
  { id: "voucher_10", label: "£10 Discount Voucher", points: 500, icon: "🏷️" },
  { id: "voucher_25", label: "£25 Discount Voucher", points: 1200, icon: "🏷️" },
  { id: "luggage",    label: "Free Extra Luggage",   points: 800,  icon: "🧳" },
  { id: "upgrade",    label: "Seat Upgrade",          points: 1500, icon: "💺" },
  { id: "lounge",     label: "Airport Lounge Pass",   points: 2000, icon: "🛋️" },
];

export function RewardsPage({ onNavigate }) {
  const { user } = useAuth();
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [redeeming, setRedeeming] = useState(null);
  const [redeemSuccess, setRedeemSuccess] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const data = await getLoyalty();
        if (!cancelled) setLoyalty(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, []);

  async function handleRedeem(reward) {
    setRedeeming(reward.id);
    setRedeemSuccess(null);
    try {
      await redeemPoints({ rewardId: reward.id, pointsCost: reward.points });
      setLoyalty((prev) => ({ ...prev, points: prev.points - reward.points }));
      setRedeemSuccess(`${reward.label} redeemed! Check your email.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setRedeeming(null);
    }
  }

  const points = loyalty?.points ?? user?.loyaltyPoints ?? 0;
  const tier = points >= 5000 ? "Gold" : points >= 2000 ? "Silver" : "Bronze";
  const tierColor = { Gold: "#f0a500", Silver: "#94a3b8", Bronze: "#b87333" }[tier];

  return (
    <div className="page rewards-page">
      <div className="page-header">
        <h1>Loyalty & Rewards</h1>
        <p>Earn points every time you fly and redeem for great rewards.</p>
      </div>

      <div className="rewards-body">
        {loading && <LoadingSpinner message="Loading your rewards..." />}
        {error && <ErrorMessage message={error} />}

        {!loading && !error && (
          <>
            <div className="points-card">
              <div className="points-tier" style={{ color: tierColor }}>
                ★ {tier} Member
              </div>
              <div className="points-value">{points.toLocaleString()}</div>
              <div className="points-label">Available Points</div>
              {loyalty?.lifetimePoints && (
                <div className="points-lifetime">
                  {loyalty.lifetimePoints.toLocaleString()} lifetime points earned
                </div>
              )}
              <div className="tier-progress">
                <div className="tier-track">
                  <div
                    className="tier-fill"
                    style={{
                      width: `${Math.min(100, (points / 5000) * 100)}%`,
                      background: tierColor,
                    }}
                  />
                </div>
                <span className="tier-next">
                  {tier !== "Gold" && `${(tier === "Bronze" ? 2000 : 5000) - points} pts to ${tier === "Bronze" ? "Silver" : "Gold"}`}
                  {tier === "Gold" && "Maximum tier reached!"}
                </span>
              </div>
            </div>

            {redeemSuccess && (
              <div className="confirmation-banner" style={{ marginBottom: "1.5rem" }}>
                <span className="confirm-icon">✓</span>
                <p>{redeemSuccess}</p>
                <button className="dismiss-btn" onClick={() => setRedeemSuccess(null)}>×</button>
              </div>
            )}

            <h2 className="rewards-section-title">Redeem Points</h2>
            <div className="rewards-grid">
              {REWARDS.map((reward) => {
                const canAfford = points >= reward.points;
                return (
                  <div key={reward.id} className={`reward-card ${!canAfford ? "reward-card--locked" : ""}`}>
                    <span className="reward-icon">{reward.icon}</span>
                    <h3 className="reward-name">{reward.label}</h3>
                    <div className="reward-points">{reward.points.toLocaleString()} pts</div>
                    <button
                      className="redeem-btn"
                      disabled={!canAfford || redeeming === reward.id}
                      onClick={() => handleRedeem(reward)}
                    >
                      {redeeming === reward.id ? "Redeeming..." : canAfford ? "Redeem" : "Not enough points"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="rewards-info">
              <h2>How to earn points</h2>
              <div className="earning-rules">
                <div className="earning-rule">
                  <span>✈</span>
                  <div>
                    <strong>Economy flights</strong>
                    <p>Earn 1 point per £1 spent</p>
                  </div>
                </div>
                <div className="earning-rule">
                  <span>💺</span>
                  <div>
                    <strong>Business class</strong>
                    <p>Earn 2 points per £1 spent (double bonus)</p>
                  </div>
                </div>
                <div className="earning-rule">
                  <span>🎁</span>
                  <div>
                    <strong>First booking bonus</strong>
                    <p>500 bonus points on your first flight</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}