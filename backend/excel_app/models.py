from django.db import models
from django.conf import settings


# Create your models here.
class Category(models.Model):
    name = models.CharField(max_length=255)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="children"
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="categories"
    )

    class Meta:
        unique_together = ("name", "parent", "owner")

    def get_full_path(self):
        parts = []
        cur = self
        while cur is not None:
            parts.append(cur.name)
            cur = cur.parent
        return " | ".join(reversed(parts))

    def __str__(self):
        return self.get_full_path()


class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    quantity = models.PositiveIntegerField(default=0)
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="products"
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="products"
    )

    def __str__(self):
        return self.name
