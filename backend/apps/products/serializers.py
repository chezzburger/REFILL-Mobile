from rest_framework import serializers
from .models import Category, Product, StationReview


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'category', 'category_name', 'price', 'stock', 'image', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class StationReviewSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)
    is_own = serializers.SerializerMethodField()

    class Meta:
        model  = StationReview
        fields = [
            'id', 'author_username', 'is_own',
            'rating', 'comment',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'author_username', 'is_own', 'created_at', 'updated_at']

    def get_is_own(self, obj):
        request = self.context.get('request')
        return bool(request and obj.author == request.user)

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate_comment(self, value):
        if len(value) > 500:
            raise serializers.ValidationError("Comment cannot exceed 500 characters.")
        return value