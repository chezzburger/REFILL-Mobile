from django.contrib import admin
from .models import UserProfile, UserAddress

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):

    list_display = ('user', 'phone', 'payment_method', 'created_at')
    list_filter = ('payment_method',) 
    search_fields = ('user__username', 'phone')

@admin.register(UserAddress)
class UserAddressAdmin(admin.ModelAdmin):
    list_display = ('profile', 'address_text', 'is_default')