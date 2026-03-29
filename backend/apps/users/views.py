from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .models import UserProfile, UserAddress
from .serializers import UserSerializer, UserProfileSerializer, UserAddressSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        if request.method == 'PATCH':
            user = request.user
            user_updated = False
            if 'name' in request.data:
                user.username = request.data['name']
                user_updated = True
            if 'email' in request.data:
                user.email = request.data['email']
                user_updated = True
            if user_updated:
                user.save()
            if 'app_rating' in request.data:
                incoming_rating = int(request.data['app_rating'])
                if profile.app_rating == 0 and incoming_rating > 0:
                    profile.points += 1.0
                profile.app_rating = incoming_rating 
                profile.save()

            if 'rated_station_id' in request.data:
                station_id = int(request.data['rated_station_id'])
                if profile.rated_stations is None:
                    profile.rated_stations = []
                if station_id not in profile.rated_stations:
                    profile.rated_stations.append(station_id) 
                    profile.points += 0.2                    
                profile.save()

            if 'points' in request.data:
                request.data.pop('points')

            serializer = UserProfileSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer = UserProfileSerializer(profile)
        data = serializer.data

        from apps.orders.models import Order 
        delivered_orders = Order.objects.filter(
            user=request.user, 
            status__in=['delivered', 'completed', 'Delivered', 'Completed']
        )
        
        order_points = 0
        for order in delivered_orders:
            gallons = getattr(order, 'gallons', 0)
            order_points += (float(gallons) * 0.1) + 0.1
            
        data['points'] = float(profile.points) + order_points
        return Response(data)

    @action(detail=False, methods=['post'])
    def add_address(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserAddressSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(profile=profile)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['delete'], url_path='remove_address/(?P<address_id>[0-9]+)')
    def remove_address(self, request, address_id=None):
        try:
            address = UserAddress.objects.get(id=address_id, profile__user=request.user)
            address.delete()
            return Response({"success": "Address removed"}, status=status.HTTP_200_OK)
        except UserAddress.DoesNotExist:
            return Response({"error": "Address not found"}, status=status.HTTP_404_NOT_FOUND)
        
    @action(detail=False, methods=['patch'], url_path='set_default_address/(?P<address_id>[0-9]+)')
    def set_default_address(self, request, address_id=None):
        try:
            address = UserAddress.objects.get(id=address_id, profile__user=request.user)
            address.is_default = True
            address.save() 
            return Response({"success": "Default address updated"}, status=status.HTTP_200_OK)
        except UserAddress.DoesNotExist:
            return Response({"error": "Address not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def deactivate(self, request):
        user = request.user
        user.is_active = False 
        user.save()
        return Response({"success": "Account deactivated"}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    if not username or not password:
        return Response({'error': 'Username and password required'}, status=400)
    user = authenticate(username=username, password=password)
    if user:
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'auth_token': token.key,
            'username': user.username,
            'email': user.email,
            'is_staff': user.is_staff,
        })
    return Response({'error': 'Invalid credentials'}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    return Response({'success': True})