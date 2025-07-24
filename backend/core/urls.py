from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyDriveViewSet, PersonalizedPrepPlanView

router = DefaultRouter()
router.register(r'companies', CompanyDriveViewSet) # This will create routes like /api/companies/

urlpatterns = [
    path('', include(router.urls)),
    path('generate_prep_plan/', PersonalizedPrepPlanView.as_view(), name='generate-prep-plan'),
]