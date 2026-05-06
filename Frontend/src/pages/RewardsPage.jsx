import { useEffect, useMemo, useState } from "react";
import { getLoyalty, redeemPoints } from "../services/api";
import { LoadingSpinner, ErrorMessage } from "../components/StatusMessages";
import { useAuth } from "../context/AuthContext";

const BENEFIT_ICONS = {
  voucher: "Voucher",
  baggage: "Bag",
  upgrade: "Upgrade",
  lounge: "Lounge",
};

const TIER_THRESHOLDS = [
  { name: "Bronze", threshold: 0, accent: "#b87333" },
  { name: "Silver", threshold: 2000, accent: "#94a3b8" },
  { name: "Gold", threshold: 5000, accent: "#f0a500" },
];

function formatDate(value) {
  if (!value) return "No expiry";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-GB");
}

export function RewardsPage({ onNavigate }) {
  const { user, authLoading } = useAuth();
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [redeeming, setRedeeming] = useState(null);
  const [redeemSuccess, setRedeemSuccess] = useState(null);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setLoyalty(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchLoyalty() {
      try {
        const data = await getLoyalty();
        if (!cancelled) {
          setLoyalty(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLoyalty();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  async function handleRedeem(reward) {
    setRedeeming(reward.id);
    setRedeemSuccess(null);
    setError(null);

    try {
      const response = await redeemPoints({ rewardId: reward.id, pointsCost: reward.pointsCost });
      setRedeemSuccess(`${response.rewardName} redeemed. Code: ${response.benefit.redemptionCode}`);
      const refreshed = await getLoyalty();
      setLoyalty(refreshed);
    } catch (err) {
      setError(err.message);
    } finally {
      setRedeeming(null);
    }
  }

  const points = loyalty?.points ?? user?.loyaltyPoints ?? 0;
  const lifetimePoints = loyalty?.lifetimePoints ?? 0;
  const tier = loyalty?.tier ?? (points >= 5000 ? "Gold" : points >= 2000 ? "Silver" : "Bronze");
  const tierMeta = TIER_THRESHOLDS.find((entry) => entry.name === tier) || TIER_THRESHOLDS[0];
  const rewards = loyalty?.rewards ?? [];
  const benefits = loyalty?.benefits ?? [];

  const nextAffordableReward = useMemo(() => {
    return rewards
      .filter((reward) => reward.unlocked && !reward.affordable)
      .sort((a, b) => a.pointsCost - b.pointsCost)[0] || null;
  }, [rewards]);

  const progressToCurrentTopTier = Math.min(100, (lifetimePoints / 5000) * 100);

  return (
    <div className="page rewards-page">
      <div className="page-header">
        <h1>Loyalty & Rewards</h1>
        <p>Track your progress, unlock better benefits, and turn points into future travel value.</p>
      </div>

      <div className="rewards-body">
        {authLoading && <LoadingSpinner message="Restoring your rewards..." />}
        {!authLoading && !user && !loading && (
          <div className="empty-state">
            <span className="empty-icon">★</span>
            <p>Sign in to view your points balance, available rewards, and redeemed benefits.</p>
            <button className="search-btn" onClick={() => onNavigate("login")}>Sign In</button>
          </div>
        )}
        {!authLoading && loading && <LoadingSpinner message="Loading your rewards..." />}
        {error && <ErrorMessage message={error} />}

        {!authLoading && user && !loading && !error && (
          <>
            <div className="points-card">
              <div className="rewards-hero-top">
                <div>
                  <div className="points-tier" style={{ color: tierMeta.accent }}>{tier} Member</div>
                  <div className="points-value">{points.toLocaleString()}</div>
                  <div className="points-label">Available Points</div>
                </div>
                <div className="rewards-next-card">
                  <span className="booking-card-eyebrow">Next tier</span>
                  <strong>{loyalty?.nextTier || "Top tier reached"}</strong>
                  <p>
                    {loyalty?.nextTier
                      ? `${loyalty?.pointsToNextTier ?? 0} more lifetime points to reach ${loyalty.nextTier}.`
                      : "You already have the highest tier in the programme."}
                  </p>
                </div>
              </div>

              <div className="rewards-stat-grid">
                <div className="rewards-stat-card">
                  <span className="booking-card-eyebrow">Lifetime points</span>
                  <strong>{lifetimePoints.toLocaleString()}</strong>
                  <p>Total earned across all member bookings</p>
                </div>
                <div className="rewards-stat-card">
                  <span className="booking-card-eyebrow">Redeemed benefits</span>
                  <strong>{benefits.length}</strong>
                  <p>Active and past reward redemptions</p>
                </div>
                <div className="rewards-stat-card">
                  <span className="booking-card-eyebrow">Next reward goal</span>
                  <strong>{nextAffordableReward ? `${nextAffordableReward.pointsCost - points} pts` : "Ready to redeem"}</strong>
                  <p>
                    {nextAffordableReward
                      ? `Needed for ${nextAffordableReward.name}`
                      : "You can already redeem from unlocked rewards"}
                  </p>
                </div>
              </div>

              <div className="tier-progress">
                <div className="tier-track">
                  <div className="tier-fill" style={{ width: `${progressToCurrentTopTier}%`, background: tierMeta.accent }} />
                </div>
                <span className="tier-next">
                  {loyalty?.nextTier
                    ? `${loyalty.pointsToNextTier} pts to ${loyalty.nextTier}`
                    : "Maximum tier reached"}
                </span>
              </div>

              <div className="tier-milestones">
                {TIER_THRESHOLDS.map((entry) => (
                  <div key={entry.name} className={`tier-milestone ${lifetimePoints >= entry.threshold ? "tier-milestone--reached" : ""}`}>
                    <strong>{entry.name}</strong>
                    <span>{entry.threshold.toLocaleString()} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {redeemSuccess && (
              <div className="confirmation-banner" style={{ marginBottom: "1.5rem" }}>
                <span className="confirm-icon">OK</span>
                <p>{redeemSuccess}</p>
                <button className="dismiss-btn" onClick={() => setRedeemSuccess(null)}>x</button>
              </div>
            )}

            <div className="rewards-duo-grid">
              <div className="rewards-info">
                <h2>Tier Snapshot</h2>
                <div className="earning-rules">
                  <div className="earning-rule">
                    <span>Tier</span>
                    <div>
                      <strong>{tier}</strong>
                      <p>Your current loyalty status and benefit access level.</p>
                    </div>
                  </div>
                  <div className="earning-rule">
                    <span>Next</span>
                    <div>
                      <strong>{loyalty?.nextTier || "Top tier"}</strong>
                      <p>
                        {loyalty?.nextTier
                          ? `Keep booking to unlock ${loyalty.pointsToNextTier} more lifetime points.`
                          : "You have already unlocked every tier available."}
                      </p>
                    </div>
                  </div>
                  <div className="earning-rule">
                    <span>Value</span>
                    <div>
                      <strong>{rewards.filter((reward) => reward.affordable && reward.unlocked).length} rewards ready</strong>
                      <p>These are currently available for you to redeem right away.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rewards-info">
                <h2>How to earn points</h2>
                <div className="earning-rules">
                  <div className="earning-rule">
                    <span>1x</span>
                    <div>
                      <strong>Economy flights</strong>
                      <p>Earn 1 point per GBP1 spent.</p>
                    </div>
                  </div>
                  <div className="earning-rule">
                    <span>2x</span>
                    <div>
                      <strong>Business class</strong>
                      <p>Earn 2 points per GBP1 spent.</p>
                    </div>
                  </div>
                  <div className="earning-rule">
                    <span>+500</span>
                    <div>
                      <strong>First booking bonus</strong>
                      <p>Your first completed member booking adds a 500 point welcome bonus.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="rewards-section-title">Redeem Points</h2>
            <div className="rewards-grid">
              {rewards.map((reward) => {
                const canRedeem = reward.active && reward.affordable && reward.unlocked;
                const buttonLabel = !reward.unlocked
                  ? `${reward.tierRequired} tier required`
                  : !reward.affordable
                    ? `${Math.max(0, reward.pointsCost - points)} pts short`
                    : redeeming === reward.id
                      ? "Redeeming..."
                      : "Redeem";

                return (
                  <div key={reward.id} className={`reward-card ${!canRedeem ? "reward-card--locked" : ""}`}>
                    <div className="reward-card-top">
                      <span className="reward-icon">{BENEFIT_ICONS[reward.benefitType] || "Reward"}</span>
                      <span className="reward-tier-tag">{reward.tierRequired}</span>
                    </div>
                    <h3 className="reward-name">{reward.name}</h3>
                    <div className="reward-points">{reward.pointsCost.toLocaleString()} pts</div>
                    <p>{reward.description}</p>
                    <div className="reward-value-line">
                      {reward.affordable && reward.unlocked ? "Ready to redeem now" : "Keep earning to unlock this value"}
                    </div>
                    <button
                      className="redeem-btn"
                      disabled={!canRedeem || redeeming === reward.id}
                      onClick={() => handleRedeem(reward)}
                    >
                      {buttonLabel}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="rewards-info" style={{ marginTop: "1.5rem" }}>
              <h2>Your Redeemed Benefits</h2>
              {benefits.length === 0 ? (
                <p>No benefits redeemed yet. Once you redeem a reward, your code and usage details will appear here.</p>
              ) : (
                <div className="benefits-grid">
                  {benefits.map((benefit) => (
                    <div key={benefit.id} className="benefit-card">
                      <div className="reward-card-top">
                        <span className="reward-icon">{BENEFIT_ICONS[benefit.benefitType] || "Benefit"}</span>
                        <span className={`status-badge status-${benefit.status?.toLowerCase() || "completed"}`}>
                          {benefit.status}
                        </span>
                      </div>
                      <strong>{benefit.rewardName}</strong>
                      <p>{benefit.message}</p>
                      <div className="benefit-meta">Code: {benefit.redemptionCode}</div>
                      <div className="benefit-meta">Expires: {formatDate(benefit.expiresAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
