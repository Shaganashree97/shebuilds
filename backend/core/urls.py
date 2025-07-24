from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyDriveViewSet

router = DefaultRouter()
router.register(r'companies', CompanyDriveViewSet) # This will create routes like /api/companies/

urlpatterns = [
    path('', include(router.urls)),
]