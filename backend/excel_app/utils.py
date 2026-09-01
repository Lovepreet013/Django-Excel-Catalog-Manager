from .models import Category


def resolve_category_path(path_string, owner):
    """
    Takes 'Men Wear | Top | T-shirt' and returns the deepest Category object,
    creating any missing levels along the way.
    """
    names = [part.strip() for part in path_string.split("|") if part.strip()]
    if not names:
        raise ValueError("Empty category path provided.")

    parent = None
    category = None
    for name in names:
        category, _created = Category.objects.get_or_create(
            name=name, parent=parent, owner=owner
        )
        parent = category

    return category
