"""
Sentiment Intelligence — NLP-based patient feedback analysis.
Uses MongoDB only — no SQLite mock data.
"""
from fastapi import APIRouter
from pymongo import MongoClient
from collections import defaultdict
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/sentiment", tags=["Sentiment Intelligence"])

# MongoDB
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("mongo_db") or ""
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
mdb = client["zero_intercept"] if client is not None else None
feedback_col = mdb["patient_feedback"] if mdb is not None else None


@router.get("/analysis")
def sentiment_analysis():
    """NLP-based sentiment analysis with department ranking."""
    if feedback_col is None:
        return {"departments": [], "overall": {"avg_score": 0, "total_feedback": 0, "sentiment_distribution": {"positive": 0, "neutral": 0, "negative": 0}}}

    feedbacks = list(feedback_col.find())

    dept_stats = defaultdict(lambda: {
        "total": 0, "positive": 0, "neutral": 0, "negative": 0,
        "sum_score": 0, "sum_rating": 0, "texts": []
    })

    for f in feedbacks:
        score = f.get("sentiment_score", 0)
        d = dept_stats[f.get("department", "Unknown")]
        d["total"] += 1
        d["sum_score"] += score
        d["sum_rating"] += f.get("rating", 0)
        if score > 0.2:
            d["positive"] += 1
        elif score < -0.1:
            d["negative"] += 1
        else:
            d["neutral"] += 1
        if score < -0.1:
            d["texts"].append({"text": f.get("feedback_text", ""), "score": score, "rating": f.get("rating", 0)})

    results = []
    for dept, stats in dept_stats.items():
        avg_score = round(stats["sum_score"] / stats["total"], 3) if stats["total"] else 0
        avg_rating = round(stats["sum_rating"] / stats["total"], 1) if stats["total"] else 0
        dissatisfaction = round(stats["negative"] / stats["total"] * 100, 1) if stats["total"] else 0
        results.append({
            "department": dept,
            "avg_sentiment_score": avg_score,
            "avg_rating": avg_rating,
            "total_feedback": stats["total"],
            "positive_count": stats["positive"],
            "neutral_count": stats["neutral"],
            "negative_count": stats["negative"],
            "dissatisfaction_pct": dissatisfaction,
            "negative_samples": sorted(stats["texts"], key=lambda x: x["score"])[:5],
        })

    results.sort(key=lambda x: x["dissatisfaction_pct"], reverse=True)

    all_scores = [f.get("sentiment_score", 0) for f in feedbacks]
    overall = {
        "avg_score": round(sum(all_scores) / len(all_scores), 3) if all_scores else 0,
        "total_feedback": len(feedbacks),
        "sentiment_distribution": {
            "positive": sum(1 for s in all_scores if s > 0.2),
            "neutral": sum(1 for s in all_scores if -0.1 <= s <= 0.2),
            "negative": sum(1 for s in all_scores if s < -0.1),
        }
    }

    return {"departments": results, "overall": overall}
