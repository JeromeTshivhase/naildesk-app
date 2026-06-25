import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, AlertCircle, Clock, Sparkles, Star } from "lucide-react";

const API_BASE = "https://naildesk-api-prod.up.railway.app";

interface ServiceItem {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    price: number;
    durationMinutes: number;
    imageUrl: string | null;
}

interface PortfolioItem {
    id: string;
    imageUrl: string;
    caption: string | null;
    serviceType: string | null;
}

interface ReviewItem {
    id: string;
    clientName: string;
    rating: number;
    comment: string | null;
    createdAt: string;
}

interface Portfolio {
    techId: string;
    techName: string;
    businessName: string | null;
    services: ServiceItem[];
    portfolioImages: PortfolioItem[];
    reviews: ReviewItem[];
    averageRating: number | null;
    reviewCount: number;
}

type State =
    | { phase: "loading" }
    | { phase: "ready"; data: Portfolio }
    | { phase: "error"; message: string };

type ReviewState = "idle" | "submitting" | "done";

function formatPrice(price: number) {
    return `R${Number(price).toFixed(2)}`;
}

function StarRow({ rating, size = 16, interactive = false, onChange }: {
    rating: number;
    size?: number;
    interactive?: boolean;
    onChange?: (r: number) => void;
}) {
    const [hover, setHover] = useState(0);
    return (
        <div style={{ display: "flex", gap: 2 }}>
            {[1, 2, 3, 4, 5].map((s) => (
                <Star
                    key={s}
                    size={size}
                    fill={(interactive ? (hover || rating) : rating) >= s ? "#f59e0b" : "none"}
                    color={(interactive ? (hover || rating) : rating) >= s ? "#f59e0b" : "#d1d5db"}
                    style={{ cursor: interactive ? "pointer" : "default", transition: "color 0.1s" }}
                    onMouseEnter={() => interactive && setHover(s)}
                    onMouseLeave={() => interactive && setHover(0)}
                    onClick={() => interactive && onChange?.(s)}
                />
            ))}
        </div>
    );
}

function ServiceCard({ service }: { service: ServiceItem }) {
    const [imgError, setImgError] = useState(false);
    return (
        <div style={{
            background: "white", borderRadius: 16, overflow: "hidden",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #f3e8ee",
            display: "flex", flexDirection: "column",
        }}>
            {service.imageUrl && !imgError ? (
                <div style={{ aspectRatio: "4/3", overflow: "hidden", background: "#fdf2f7" }}>
                    <img src={service.imageUrl} alt={service.name} onError={() => setImgError(true)}
                         style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
            ) : (
                <div style={{ aspectRatio: "4/3", background: "linear-gradient(135deg, #fdf2f7 0%, #fce7f3 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Sparkles size={32} color="#e879a0" style={{ opacity: 0.4 }} />
                </div>
            )}
            <div style={{ padding: "14px 16px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#1a1a2e", lineHeight: 1.3 }}>{service.name}</div>
                {service.description && (
                    <div style={{ fontSize: 13, color: "#6b6b80", lineHeight: 1.5 }}>{service.description}</div>
                )}
                <div style={{ marginTop: "auto", paddingTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#c2185b" }}>{formatPrice(service.price)}</span>
                    <span style={{ fontSize: 12, color: "#6b6b80", display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={12} />{service.durationMinutes} min
          </span>
                </div>
            </div>
        </div>
    );
}

function ReviewForm({ techId, onDone }: { techId: string; onDone: () => void }) {
    const [name, setName] = useState("");
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [state, setState] = useState<ReviewState>("idle");
    const [error, setError] = useState("");

    async function submit() {
        if (!name.trim()) { setError("Please enter your name."); return; }
        if (rating === 0) { setError("Please select a star rating."); return; }
        setError("");
        setState("submitting");
        try {
            const res = await fetch(`${API_BASE}/api/public/reviews/${techId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientName: name.trim(), rating, comment: comment.trim() || undefined }),
            });
            if (!res.ok) throw new Error();
            setState("done");
            onDone();
        } catch {
            setError("Something went wrong. Please try again.");
            setState("idle");
        }
    }

    if (state === "done") {
        return (
            <div style={{ textAlign: "center", padding: "24px 16px", background: "#f0fdf4", borderRadius: 16, border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🙏</div>
                <p style={{ fontWeight: 600, color: "#166534", fontSize: 15 }}>Thank you for your review!</p>
                <p style={{ color: "#4ade80", fontSize: 13, marginTop: 4 }}>It means a lot.</p>
            </div>
        );
    }

    return (
        <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #f3e8ee", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <p style={{ fontWeight: 600, fontSize: 15, color: "#1a1a2e", marginBottom: 16 }}>Leave a review 💅</p>

            <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: "#6b6b80", marginBottom: 6 }}>Your name</p>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lerato"
                       style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 14, background: "#fafafa", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: "#6b6b80", marginBottom: 8 }}>Rating</p>
                <StarRow rating={rating} size={28} interactive onChange={setRating} />
            </div>

            <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: "#6b6b80", marginBottom: 6 }}>Comment (optional)</p>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                          placeholder="Tell others about your experience…" rows={3}
                          style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 14, background: "#fafafa", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>

            {error && <p style={{ fontSize: 13, color: "#c2185b", marginBottom: 12 }}>{error}</p>}

            <button onClick={submit} disabled={state === "submitting"}
                    style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg, #c2185b 0%, #e91e8c 100%)", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: state === "submitting" ? "wait" : "pointer" }}>
                {state === "submitting" ? "Submitting…" : "Submit Review"}
            </button>
        </div>
    );
}

function ReviewCard({ review }: { review: ReviewItem }) {
    return (
        <div style={{ background: "white", borderRadius: 14, padding: "14px 16px", border: "1px solid #f3e8ee", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e" }}>{review.clientName}</p>
                    <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{review.createdAt}</p>
                </div>
                <StarRow rating={review.rating} size={13} />
            </div>
            {review.comment && (
                <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.6 }}>{review.comment}</p>
            )}
        </div>
    );
}

export default function PortfolioPage() {
    const { techId } = useParams<{ techId: string }>();
    const [state, setState] = useState<State>({ phase: "loading" });
    const [showReviewForm, setShowReviewForm] = useState(false);

    function load() {
        if (!techId) { setState({ phase: "error", message: "Invalid portfolio link." }); return; }
        setState({ phase: "loading" });
        fetch(`${API_BASE}/api/public/portfolio/${techId}`)
            .then(async (r) => {
                if (r.status === 404) throw new Error("not_found");
                if (!r.ok) throw new Error("server_error");
                return r.json() as Promise<Portfolio>;
            })
            .then((data) => setState({ phase: "ready", data }))
            .catch((e: Error) => {
                setState({ phase: "error", message: e.message === "not_found" ? "This portfolio doesn't exist." : "Something went wrong. Please try again." });
            });
    }

    useEffect(() => { load(); }, [techId]);

    if (state.phase === "loading") {
        return (
            <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fdf8fb" }}>
                <Loader2 size={28} style={{ color: "#c2185b", animation: "spin 0.8s linear infinite" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (state.phase === "error") {
        return (
            <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "#fdf8fb", padding: 24, textAlign: "center" }}>
                <AlertCircle size={40} color="#c2185b" style={{ opacity: 0.7 }} />
                <p style={{ fontSize: 16, color: "#6b6b80", maxWidth: 280 }}>{state.message}</p>
            </div>
        );
    }

    const { data } = state;
    const displayName = data.businessName || data.techName;

    return (
        <div style={{ minHeight: "100dvh", background: "#fdf8fb" }}>
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg, #c2185b 0%, #e91e8c 100%)", padding: "32px 20px 28px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ position: "absolute", bottom: -30, left: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: 16 }}>
                    Powered by NailDesk
                </div>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "3px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, fontWeight: 700, color: "white" }}>
                    {displayName.charAt(0).toUpperCase()}
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: "white", margin: 0, letterSpacing: "-0.02em" }}>{displayName}</h1>
                {data.businessName && data.techName !== data.businessName && (
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4, marginBottom: 0 }}>by {data.techName}</p>
                )}
                {/* Rating summary */}
                {data.averageRating !== null && data.reviewCount > 0 && (
                    <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <StarRow rating={Math.round(data.averageRating)} size={14} />
                        <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 600 }}>
              {data.averageRating.toFixed(1)} ({data.reviewCount} review{data.reviewCount !== 1 ? "s" : ""})
            </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px 48px" }}>

                {/* Services */}
                {data.services.length > 0 && (
                    <section style={{ marginBottom: 32 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 16, paddingBottom: 10, borderBottom: "2px solid #fce7f3" }}>Services</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                            {data.services.map((s) => <ServiceCard key={s.id} service={s} />)}
                        </div>
                    </section>
                )}

                {/* Portfolio images */}
                {data.portfolioImages.length > 0 && (
                    <section style={{ marginBottom: 32 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 16, paddingBottom: 10, borderBottom: "2px solid #fce7f3" }}>Portfolio</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, borderRadius: 12, overflow: "hidden" }}>
                            {data.portfolioImages.map((img) => (
                                <div key={img.id} style={{ position: "relative", aspectRatio: "1", overflow: "hidden" }}>
                                    <img src={img.imageUrl} alt={img.caption || "Nail design"}
                                         style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Reviews */}
                <section style={{ marginBottom: 32 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 10, borderBottom: "2px solid #fce7f3" }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>
                            Reviews {data.reviewCount > 0 && <span style={{ fontSize: 14, color: "#9ca3af", fontWeight: 400 }}>({data.reviewCount})</span>}
                        </h2>
                        {!showReviewForm && (
                            <button onClick={() => setShowReviewForm(true)}
                                    style={{ padding: "6px 14px", background: "linear-gradient(135deg, #c2185b 0%, #e91e8c 100%)", color: "white", border: "none", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                + Review
                            </button>
                        )}
                    </div>

                    {showReviewForm && (
                        <div style={{ marginBottom: 16 }}>
                            <ReviewForm techId={data.techId} onDone={() => { setShowReviewForm(false); load(); }} />
                        </div>
                    )}

                    {data.reviews.length === 0 && !showReviewForm ? (
                        <div style={{ textAlign: "center", padding: "28px 16px", background: "white", borderRadius: 16, border: "1px solid #f3e8ee" }}>
                            <p style={{ fontSize: 15, color: "#9ca3af" }}>No reviews yet — be the first!</p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {data.reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
                        </div>
                    )}
                </section>

                {/* Footer */}
                <div style={{ textAlign: "center", marginTop: 40, paddingTop: 20, borderTop: "1px solid #f3e8ee" }}>
                    <p style={{ fontSize: 12, color: "#aaaabb" }}>
                        Managed by <span style={{ color: "#c2185b", fontWeight: 600 }}>NailDesk</span>
                    </p>
                </div>
            </div>
        </div>
    );
}