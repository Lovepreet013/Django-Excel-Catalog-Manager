from django.contrib import admin
from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "parent", "owner")
    list_display_links = ("id", "name")
    list_filter = ("owner", "parent")
    search_fields = ("name",)
    ordering = ("id",)
    list_per_page = 25


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "description", "quantity", "category", "owner")
    list_display_links = ("id", "name")
    list_filter = ("owner", "category")
    search_fields = ("name", "description")
    ordering = ("id",)
    list_per_page = 25
