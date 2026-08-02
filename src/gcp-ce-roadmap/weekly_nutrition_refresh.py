"""Weekly nutrition batch: reads the last 7 days of routine_meals from Supabase,
estimates macros via nutrition_lookup, and upserts the result into nutrition_stats
(single row, week_id='latest'). Invoked by a plain OS crontab entry (Sunday 18:00
Asia/Seoul) -- no Telegram/alerts, pure computation; the PWA reads nutrition_stats
directly via the Supabase JS client."""

import os
from collections import defaultdict
from datetime import date, timedelta

import requests

from nutrition_lookup import estimate_meal_nutrition, weekly_macro_recommendations

_MACROS = ["kcal", "protein", "fat", "carb"]


def _supabase_headers():
    key = os.environ["SUPABASE_ANON_KEY"]
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def fetch_recent_meals(supabase_url, start_date, end_date, headers=None, session=requests):
    """GET routine_meals rows with date in [start_date, end_date] (inclusive date
    objects). Returns a list of {"date": str, "slot": str, "note": str}."""
    headers = headers or _supabase_headers()
    response = session.get(
        f"{supabase_url}/rest/v1/routine_meals",
        params={
            "select": "date,slot,note",
            "date": f"gte.{start_date.isoformat()}",
            "and": f"(date.lte.{end_date.isoformat()})",
        },
        headers=headers,
        timeout=15,
    )
    response.raise_for_status()
    return response.json()


def compute_weekly_nutrition(meal_rows, estimate_fn=estimate_meal_nutrition):
    """Group meal_rows by date, estimate each non-empty note's macros, average
    across days that have at least one non-empty note. Returns
    {"weeklyAverage": {...}, "unmatchedFoodItems": [...]}."""
    by_date = defaultdict(list)
    for row in meal_rows:
        note = (row.get("note") or "").strip()
        if note:
            by_date[row["date"]].append(note)

    daily_totals = {}
    unmatched = []
    for day, notes in by_date.items():
        totals = {macro: 0.0 for macro in _MACROS}
        for note in notes:
            estimate = estimate_fn(note)
            for macro in _MACROS:
                totals[macro] += estimate[macro]
            unmatched.extend(estimate["unmatchedItems"])
        daily_totals[day] = totals

    days_with_data = len(daily_totals)
    if days_with_data == 0:
        weekly_average = {macro: 0.0 for macro in _MACROS}
    else:
        weekly_average = {
            macro: sum(t[macro] for t in daily_totals.values()) / days_with_data
            for macro in _MACROS
        }
    return {"weeklyAverage": weekly_average, "unmatchedFoodItems": sorted(set(unmatched))}


def upsert_nutrition_stats(supabase_url, weekly_average, unmatched_food_items, headers=None, session=requests):
    headers = dict(headers or _supabase_headers())
    headers["Prefer"] = "resolution=merge-duplicates"
    recommendations = weekly_macro_recommendations(weekly_average)
    body = {
        "week_id": "latest",
        "weekly_average": weekly_average,
        "recommendations": recommendations,
        "unmatched_food_items": unmatched_food_items,
    }
    response = session.post(
        f"{supabase_url}/rest/v1/nutrition_stats",
        json=body,
        headers=headers,
        timeout=15,
    )
    response.raise_for_status()
    return body


def main():
    supabase_url = os.environ["SUPABASE_URL"]
    today = date.today()
    start = today - timedelta(days=6)
    meal_rows = fetch_recent_meals(supabase_url, start, today)
    result = compute_weekly_nutrition(meal_rows)
    upsert_nutrition_stats(supabase_url, result["weeklyAverage"], result["unmatchedFoodItems"])
    print(f"nutrition_stats updated: {result['weeklyAverage']}")


if __name__ == "__main__":
    main()
