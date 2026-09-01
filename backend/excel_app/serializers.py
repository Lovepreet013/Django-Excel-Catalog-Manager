from rest_framework import serializers
from .models import Product, Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "parent"]
        read_only_fields = ["owner"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_path = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "description", "quantity", "category", "category_name", "category_path"]
        read_only_fields = ["owner"]

    def get_category_path(self, obj):
        try:
            return obj.category.get_full_path() if obj.category else ""
        except Exception:
            return ""
