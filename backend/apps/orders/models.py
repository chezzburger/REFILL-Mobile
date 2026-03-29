from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import User
from apps.products.models import Product

class Order(models.Model):

    STATUS_CHOICES = [
        ('pending',    'Pending'),
        ('processing', 'Processing'),
        ('shipped',    'Shipped'),
        ('delivered',  'Delivered'),
        ('cancelled',  'Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_address = models.TextField()
    notes = models.TextField(blank=True)
    is_hidden_by_user = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_hidden_by_user = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.id} — {self.user.username} [{self.status}]"

    def compute_total(self):
        total = sum(item.price * item.quantity for item in self.items.all())
        self.total_price = total
        self.save(update_fields=['total_price'])

class OrderItem(models.Model):

    order   = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, related_name='order_items')

    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(999)]
    )

    price    = models.DecimalField(max_digits=10, decimal_places=2,
                                   validators=[MinValueValidator(0)])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        name = self.product.name if self.product else 'Deleted Product'
        return f"{name} x{self.quantity} @ ₱{self.price}"

    @property
    def subtotal(self):
        return self.price * self.quantity

class OrderNote(models.Model):

    NOTE_TYPE_CHOICES = [
        ('customer', 'Customer Note'),
        ('staff',    'Staff Note'),
        ('system',   'System Note'),
    ]

    order     = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_notes')
    author    = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='order_notes')
    note_type = models.CharField(max_length=20, choices=NOTE_TYPE_CHOICES, default='customer')
    content   = models.TextField()  
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        author_name = self.author.username if self.author else 'Unknown'
        return f"Note on Order #{self.order_id} by {author_name}"


class Notification(models.Model):
    NOTIF_TYPES = [
        ('order_placed',     'Order Placed'),
        ('order_processing', 'Order Processing'),
        ('order_shipped',    'Order Shipped'),
        ('order_delivered',  'Order Delivered'),
        ('order_cancelled',  'Order Cancelled'),
    ]
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    order      = models.ForeignKey('Order', on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    notif_type = models.CharField(max_length=30, choices=NOTIF_TYPES)
    message    = models.TextField()
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
 
    class Meta:
        ordering = ['-created_at']
 
    def __str__(self):
        return f"{self.user.username} — {self.notif_type} ({'read' if self.is_read else 'unread'})"