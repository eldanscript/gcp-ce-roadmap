import weekly_nutrition_refresh as wnr


def _fake_estimate(note):
    return {"kcal": 100.0, "protein": 5.0, "fat": 3.0, "carb": 10.0, "matchedItems": [], "unmatchedItems": []}


def test_compute_weekly_nutrition_averages_across_days_with_data():
    rows = [
        {"date": "2026-08-01", "slot": "아침", "note": "밥 한공기"},
        {"date": "2026-08-01", "slot": "점심", "note": "된장찌개"},
        {"date": "2026-08-02", "slot": "아침", "note": "빵"},
    ]
    result = wnr.compute_weekly_nutrition(rows, estimate_fn=_fake_estimate)
    assert result["weeklyAverage"] == {"kcal": 150.0, "protein": 7.5, "fat": 4.5, "carb": 15.0}
    assert result["unmatchedFoodItems"] == []


def test_compute_weekly_nutrition_ignores_empty_notes():
    rows = [
        {"date": "2026-08-01", "slot": "아침", "note": ""},
        {"date": "2026-08-01", "slot": "점심", "note": "   "},
    ]
    result = wnr.compute_weekly_nutrition(rows, estimate_fn=_fake_estimate)
    assert result["weeklyAverage"] == {"kcal": 0.0, "protein": 0.0, "fat": 0.0, "carb": 0.0}


def test_compute_weekly_nutrition_collects_unmatched_items():
    def estimate_with_unmatched(note):
        return {"kcal": 0.0, "protein": 0.0, "fat": 0.0, "carb": 0.0, "matchedItems": [], "unmatchedItems": ["희귀채소"]}
    rows = [{"date": "2026-08-01", "slot": "아침", "note": "희귀채소 100g"}]
    result = wnr.compute_weekly_nutrition(rows, estimate_fn=estimate_with_unmatched)
    assert result["unmatchedFoodItems"] == ["희귀채소"]


def test_compute_weekly_nutrition_no_data_returns_zeros():
    result = wnr.compute_weekly_nutrition([], estimate_fn=_fake_estimate)
    assert result["weeklyAverage"] == {"kcal": 0.0, "protein": 0.0, "fat": 0.0, "carb": 0.0}
    assert result["unmatchedFoodItems"] == []
