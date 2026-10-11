from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', lambda request: redirect('dashboard') if request.user.is_authenticated else redirect('login')),
    path('', include('core.urls')),
    path('', include('transactions.urls')),
    path('', include('investments.urls')),
    path('', include('guidance.urls')),
    path('api/auth/', include('rest_framework.urls')),
]
