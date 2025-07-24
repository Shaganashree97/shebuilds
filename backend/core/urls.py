from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyDriveViewSet, PersonalizedPrepPlanView, GenerateMockInterviewView, ResumeCheckerAPIView

router = DefaultRouter()
router.register(r'companies', CompanyDriveViewSet) # This will create routes like /api/companies/

urlpatterns = [
    path('', include(router.urls)),
    path('generate_prep_plan/', PersonalizedPrepPlanView.as_view(), name='generate-prep-plan'),
    path('generate_mock_interview/', GenerateMockInterviewView.as_view(), name='generate-mock-interview'),
    path('resume_checker/', ResumeCheckerAPIView.as_view(), name='resume-checker'),
]