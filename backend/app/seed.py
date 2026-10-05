from sqlalchemy.orm import Session

from app.models import Category

DEFAULT_CATEGORIES = [
    ("Food", "Restaurants, groceries, snacks and beverages"),
    ("Transport", "Fuel, public transport, taxi and ride sharing"),
    ("Shopping", "Clothes, electronics and general shopping"),
    ("Bills & Utilities", "Electricity, water, internet, phone and subscriptions"),
    ("Entertainment", "Movies, games, events and hobbies"),
    ("Health", "Medicine, pharmacy, fitness and healthcare"),
    ("Education", "Courses, books, certifications and learning"),
    ("Travel", "Flights, hotels and travel expenses"),
    ("Rent", "House or apartment rent"),
    ("Other", "Expenses that do not fit another category"),
]


def seed_categories(db: Session) -> None:
    existing = {name for (name,) in db.query(Category.name).all()}
    added = False
    for name, description in DEFAULT_CATEGORIES:
        if name not in existing:
            db.add(Category(name=name, description=description))
            added = True
    if added:
        db.commit()
