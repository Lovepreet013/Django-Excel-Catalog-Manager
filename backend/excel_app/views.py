import pandas as pd
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from django.db import transaction

from excel_app.serializers import (
    CategorySerializer,
    ProductSerializer,
)
from .models import Category, Product
from .utils import resolve_category_path
from rest_framework import viewsets, permissions


# Create your views here.
class UploadPreviewView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided."}, status=400)

        try:
            df = pd.read_excel(file)
        except Exception as e:
            return Response(
                {"error": f"Failed to read Excel file: {str(e)}"}, status=400
            )

        df = df.dropna(how="all")
        rows = []
        for i, row in df.iterrows():
            errors = []

            name = str(row.get("name", "")).strip()
            if not name or name.lower() == "nan":
                name = ""
                errors.append("Missing product name.")
            category_path = str(row.get("category", "")).strip()
            if not category_path or category_path.lower() == "nan":
                category_path = ""
                errors.append("Missing category path")

            description = str(row.get("description", "")).strip()
            if description.lower() == "nan":
                description = ""

            raw_quantity = row.get("quantity")
            quantity = None
            try:
                if pd.isna(raw_quantity):
                    raise ValueError("empty")
                # handle strings like " 5 " or "5.0"
                if isinstance(raw_quantity, str):
                    raw_quantity = raw_quantity.strip()
                    if raw_quantity == "":
                        raise ValueError("empty")
                val = float(raw_quantity)  # type: ignore[arg-type]
                if not val.is_integer():
                    raise ValueError("not integer")
                quantity = int(val)
                if quantity < 0:
                    errors.append("Quantity cannot be negative.")
            except (ValueError, TypeError):
                quantity = None
                errors.append("Invalid quantity")

            rows.append(
                {
                    "row_index": i,
                    "name": name,
                    "description": description,
                    "category_path": category_path,
                    "quantity": quantity,
                    "errors": errors,
                }
            )

        return Response({"rows": rows}, status=200)


class UploadCommitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        selected_rows = request.data.get("selected_rows", [])

        if not selected_rows:
            return Response({"error": "No rows provided."}, status=400)

        created_products = []
        row_errors = []

        try:
            with transaction.atomic():
                for row in selected_rows:
                    name = str(row.get("name", "")).strip()
                    description = str(row.get("description", "")).strip()
                    category_path = str(row.get("category_path", "")).strip()
                    raw_quantity = row.get("quantity")

                    if not name:
                        row_errors.append(
                            {"row_index": row.get("row_index"), "error": "Missing name"}
                        )
                        continue
                    if not category_path:
                        row_errors.append(
                            {
                                "row_index": row.get("row_index"),
                                "error": "Missing category",
                            }
                        )
                        continue
                    # (handles NaN, float, string)
                    try:
                        if raw_quantity is None or pd.isna(raw_quantity):  # type: ignore[arg-type]
                            raise ValueError()
                        if isinstance(raw_quantity, str):
                            raw_quantity = raw_quantity.strip()
                            if raw_quantity == "":
                                raise ValueError()
                        val = float(raw_quantity)  # type: ignore[arg-type]
                        if not val.is_integer():
                            raise ValueError()
                        quantity = int(val)
                        if quantity < 0:
                            raise ValueError()
                    except (ValueError, TypeError):
                        row_errors.append(
                            {
                                "row_index": row.get("row_index"),
                                "error": "Invalid quantity",
                            }
                        )
                        continue

                    category = resolve_category_path(category_path, request.user)

                    product = Product.objects.create(
                        name=name,
                        description=description,
                        quantity=quantity,
                        category=category,
                        owner=request.user,
                    )
                    created_products.append(product.id)  # type: ignore

                if row_errors:
                    raise ValueError("Some rows failed validation")
        except ValueError:
            return Response(
                {
                    "error": "Import cancelled due to invalid rows",
                    "row_errors": row_errors,
                },
                status=400,
            )

        return Response({"created": created_products}, status=201)


class ProductView(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Product.objects.filter(owner=self.request.user)
            .select_related(
                "category",
                "category__parent",
                "category__parent__parent",
                "category__parent__parent__parent",
            )
            .order_by("id")
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class CategoryView(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Category.objects.filter(owner=self.request.user).order_by("id")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
