from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Feedback
from collections import defaultdict

router = APIRouter(prefix="/api/sentiment", tags=["Sentiment Intelligence"])


@router.get("/analysis")
def sentiment_analysis(db: Session = Depends(get_db)):
    """NLP-based sentiment analysis with department ranking."""
    feedbacks = db.query(Feedback).all()

    dept_stats = defaultdict(lambda: {
        "total": 0, "positive": 0, "neutral": 0, "negative": 0,
        "sum_score": 0, "sum_rating": 0, "texts": []
    })

    for f in feedbacks:
        d = dept_stats[f.department]
        d["total"] += 1
        d["sum_score"] += f.sentiment_score
        d["sum_rating"] += f.rating
        if f.sentiment_score > 0.2:
            d["positive"] += 1
        elif f.sentiment_score < -0.1:
            d["negative"] += 1
        else:
            d["neutral"] += 1
        if f.sentiment_score < -0.1:
            d["texts"].append({"text": f.feedback_text, "score": f.sentiment_score, "rating": f.rating})

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

    # Overall sentiment
    all_scores = [f.sentiment_score for f in feedbacks]
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
