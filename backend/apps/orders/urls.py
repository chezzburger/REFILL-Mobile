from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from .views import OrderViewSet, OrderItemViewSet, OrderNoteViewSet

orders_router = routers.DefaultRouter()
orders_router.register(r'', OrderViewSet, basename='order')

nested_router = routers.NestedDefaultRouter(orders_router, r'', lookup='order')
nested_router.register(r'items', OrderItemViewSet, basename='order-items')
nested_router.register(r'notes', OrderNoteViewSet, basename='order-notes')

urlpatterns = [
    path('', include(orders_router.urls)),
    path('', include(nested_router.urls)),
]