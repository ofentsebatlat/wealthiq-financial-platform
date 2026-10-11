from django.urls import path
from . import views

urlpatterns = [
    path('guidance/', views.guidance_view, name='guidance'),
    path('api/guidance/', views.api_guidance, name='api_guidance'),
]
