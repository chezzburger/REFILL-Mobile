from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
import requests as req

def activate_account(request, uid, token):
    try:
        r = req.post(
            request.build_absolute_uri('/api/auth/users/activation/'),
            json={'uid': uid, 'token': token},
            timeout=5,
        )
        if r.status_code == 204:
            return HttpResponse(
                "<h2 style='font-family:sans-serif;text-align:center;margin-top:80px'>"
                "Account activated! You can now log in on the app.</h2>",
                content_type='text/html'
            )
        return HttpResponse(
            "<h2 style='font-family:sans-serif;text-align:center;margin-top:80px'>"
            "Activation failed. The link may have already been used or expired.</h2>",
            content_type='text/html', status=400
        )
    except Exception:
        return HttpResponse(
            "<h2 style='font-family:sans-serif;text-align:center;margin-top:80px'>"
            "Something went wrong. Please try again.</h2>",
            content_type='text/html', status=500
        )

urlpatterns = [
    path('admin/', admin.site.urls),
    path('activate/<str:uid>/<str:token>', activate_account),
    path('api/auth/', include('djoser.urls')),
    path('api/auth/', include('djoser.urls.authtoken')),
    path('api/products/', include('apps.products.urls')),
    path('api/orders/', include('apps.orders.urls')),
    path('api/notifications/', include('apps.orders.notification_urls')),
    path('api/users/', include('apps.users.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
