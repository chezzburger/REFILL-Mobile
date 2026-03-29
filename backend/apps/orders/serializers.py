from rest_framework import serializers
from .models import Order, OrderItem, OrderNote, Notification
from apps.products.serializers import ProductSerializer

class OrderItemSerializer(serializers.ModelSerializer):

    product    = ProductSerializer(read_only=True)        
    product_id = serializers.IntegerField(write_only=True) 
    subtotal   = serializers.DecimalField(                 
                     max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model  = OrderItem
        fields = ['id', 'product', 'product_id', 'quantity', 'price', 'subtotal', 'created_at']
        read_only_fields = ['id', 'subtotal', 'created_at']

   
    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1.")
        if value > 999:
            raise serializers.ValidationError("Quantity cannot exceed 999.")
        return value

    
    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

   
    def validate_product_id(self, value):
        from apps.products.models import Product
        try:
            product = Product.objects.get(id=value)
        except Product.DoesNotExist:
            raise serializers.ValidationError(f"Product with id={value} does not exist.")
        if not product.is_active:
            raise serializers.ValidationError(f"Product '{product.name}' is no longer available.")
        return value

class OrderNoteSerializer(serializers.ModelSerializer):

    author_username = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model  = OrderNote
        fields = ['id', 'author_username', 'note_type', 'content', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author_username', 'created_at', 'updated_at']

    def validate_content(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Note content cannot be empty.")
        if len(value) > 1000:
            raise serializers.ValidationError("Note content cannot exceed 1000 characters.")
        return value

    def validate_note_type(self, value):
        allowed = [c[0] for c in OrderNote.NOTE_TYPE_CHOICES]
        if value not in allowed:
            raise serializers.ValidationError(
                f"note_type must be one of: {', '.join(allowed)}."
            )
        return value

class OrderSerializer(serializers.ModelSerializer):

    items          = OrderItemSerializer(many=True, read_only=True)      # nested TABLE 2
    order_notes    = OrderNoteSerializer(many=True, read_only=True)      # nested TABLE 3
    user_email     = serializers.EmailField(source='user.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = Order
        fields = [
            'id', 'user', 'user_email',
            'status', 'status_display',
            'total_price', 'shipping_address', 'notes',
            'items', 'order_notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'user_email', 'total_price',
                            'status_display', 'created_at', 'updated_at']

    def validate_shipping_address(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Shipping address is required.")
        if len(value) < 10:
            raise serializers.ValidationError(
                "Please provide a complete shipping address (at least 10 characters)."
            )
        return value

    def validate_status(self, value):
        if self.instance:
            current = self.instance.status
            allowed_next = {
                'pending':    ['processing', 'cancelled'],
                'processing': ['shipped',    'cancelled'],
                'shipped':    ['delivered',  'cancelled'],
                'delivered':  [],   
                'cancelled':  [],  
            }
            allowed = allowed_next.get(current, [])
            if value != current and value not in allowed:
                raise serializers.ValidationError(
                    f"Cannot change status from '{current}' to '{value}'. "
                    f"Allowed: {allowed or ['none — this order is closed']}."
                )
        return value

    
    def validate_notes(self, value):
        if len(value) > 500:
            raise serializers.ValidationError("Notes cannot exceed 500 characters.")
        return value

    def validate(self, data):
        if self.instance and self.instance.status in ['delivered', 'cancelled']:
            mutable = {k for k in data if k not in ('status',)}
            if mutable:
                raise serializers.ValidationError(
                    "This order is closed and can no longer be edited."
                )
        return data

class NotificationSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source='order.id', read_only=True, allow_null=True)
 
    class Meta:
        model  = Notification
        fields = ['id', 'order_id', 'notif_type', 'message', 'is_read', 'created_at']
        read_only_fields = ['id', 'order_id', 'notif_type', 'message', 'created_at']