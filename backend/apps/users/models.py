from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=20, blank=True)
    
    payment_method = models.CharField(max_length=20, default='COD')
    avatar_seed = models.CharField(max_length=50, default='', blank=True)
    avatar_type = models.CharField(max_length=20, default='initials')
    sms_notifications = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    
    points = models.FloatField(default=0.0)
    app_rating = models.IntegerField(default=0)
    rated_stations = models.JSONField(default=list, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "User Profiles"

    def __str__(self):
        return f"{self.user.username}'s Profile"

class UserAddress(models.Model):
    profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='addresses')
    address_text = models.TextField()
    is_default = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.is_default:
            UserAddress.objects.filter(profile=self.profile, is_default=True).update(is_default=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.address_text[:30]}... ({self.profile.user.username})"