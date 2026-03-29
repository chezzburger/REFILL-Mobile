from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound
from .models import Category, Product, StationReview
from .serializers import CategorySerializer, ProductSerializer, StationReviewSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for Category model"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet for Product model"""
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at']
    ordering = ['-created_at']


class StationReviewViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for StationReview, nested under a Product (station).

    GET    /api/products/{station_pk}/reviews/         list all reviews for station
    POST   /api/products/{station_pk}/reviews/         create a review (auth required)
    GET    /api/products/{station_pk}/reviews/{id}/    single review
    PATCH  /api/products/{station_pk}/reviews/{id}/    edit own review
    DELETE /api/products/{station_pk}/reviews/{id}/    delete own review
    """
    serializer_class   = StationReviewSerializer
    permission_classes = [IsAuthenticated]

    def _get_station(self):
        try:
            return Product.objects.get(pk=self.kwargs['station_pk'])
        except Product.DoesNotExist:
            raise NotFound("Station not found.")

    def get_queryset(self):
        return StationReview.objects.filter(station=self._get_station())

    def perform_create(self, serializer):
        station = self._get_station()
        if StationReview.objects.filter(station=station, author=self.request.user).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                "You have already reviewed this station. Edit your existing review instead."
            )
        serializer.save(station=station, author=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        review = self.get_object()
        if review.author != request.user:
            raise PermissionDenied("You can only edit your own reviews.")
        serializer = self.get_serializer(review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        review = self.get_object()
        if review.author != request.user and not request.user.is_staff:
            raise PermissionDenied("You can only delete your own reviews.")
        review.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)