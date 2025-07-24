from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from .views import CompanyDriveViewSet, PersonalizedPrepPlanView, GenerateMockInterviewView, EvaluateInterviewAnswersView, ResumeCheckerAPIView, DiscussionTopicViewSet, DiscussionPostViewSet

router = DefaultRouter()
router.register(r'companies', CompanyDriveViewSet) # This will create routes like /api/companies/
router.register(r'discussion_topics', DiscussionTopicViewSet) # Register DiscussionTopicViewSet

# Nested router for DiscussionPosts under DiscussionTopics
# This will create URLs like /api/discussion_topics/{topic_id}/posts/
topics_router = routers.NestedDefaultRouter(router, r'discussion_topics', lookup='topic')
topics_router.register(r'posts', DiscussionPostViewSet, basename='discussion-topic-posts')

urlpatterns = [
    path('', include(router.urls)),
    path('generate_prep_plan/', PersonalizedPrepPlanView.as_view(), name='generate-prep-plan'),
    path('generate_mock_interview/', GenerateMockInterviewView.as_view(), name='generate-mock-interview'),
    path('evaluate_interview_answers/', EvaluateInterviewAnswersView.as_view(), name='evaluate-interview-answers'),
    path('resume_checker/', ResumeCheckerAPIView.as_view(), name='resume-checker'),
    path('', include(topics_router.urls)), # Include nested URLs
]