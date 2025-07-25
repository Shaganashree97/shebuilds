from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from rest_framework_simplejwt.views import TokenRefreshView
from .views import CompanyDriveViewSet, PersonalizedPrepPlanView, GenerateMockInterviewView, EvaluateInterviewAnswersView, ResumeCheckerAPIView, DiscussionTopicViewSet, DiscussionPostViewSet, ForumCategoryViewSet, UserPreparationPlansView, PreparationPlanDetailView, UpdateTopicProgressView, DeletePreparationPlanView, UserRegistrationView, UserLoginView, UserLogoutView, UserProfileView, AIChatbotView, AITopicExplainerView

router = DefaultRouter()
router.register(r'companies', CompanyDriveViewSet) # This will create routes like /api/companies/
router.register(r'forum_categories', ForumCategoryViewSet) # Register ForumCategoryViewSet
router.register(r'discussion_topics', DiscussionTopicViewSet) # Register DiscussionTopicViewSet

# Nested router for DiscussionPosts under DiscussionTopics
# This will create URLs like /api/discussion_topics/{topic_id}/posts/
topics_router = routers.NestedDefaultRouter(router, r'discussion_topics', lookup='topic')
topics_router.register(r'posts', DiscussionPostViewSet, basename='discussion-topic-posts')

urlpatterns = [
    path('', include(router.urls)),
    # Authentication URLs
    path('auth/register/', UserRegistrationView.as_view(), name='user-register'),
    path('auth/login/', UserLoginView.as_view(), name='user-login'),
    path('auth/logout/', UserLogoutView.as_view(), name='user-logout'),
    path('auth/profile/', UserProfileView.as_view(), name='user-profile'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    # App Feature URLs
    path('generate_prep_plan/', PersonalizedPrepPlanView.as_view(), name='generate-prep-plan'),
    path('generate_mock_interview/', GenerateMockInterviewView.as_view(), name='generate-mock-interview'),
    path('evaluate_interview_answers/', EvaluateInterviewAnswersView.as_view(), name='evaluate-interview-answers'),
    path('resume_checker/', ResumeCheckerAPIView.as_view(), name='resume-checker'),
    # Preparation Plan Management URLs
    path('user_plans/', UserPreparationPlansView.as_view(), name='user-preparation-plans'),
    path('plan/<int:plan_id>/', PreparationPlanDetailView.as_view(), name='preparation-plan-detail'),
    path('update_progress/', UpdateTopicProgressView.as_view(), name='update-topic-progress'),
    path('delete_plan/<int:plan_id>/', DeletePreparationPlanView.as_view(), name='delete-preparation-plan'),
    # AI Chatbot
    path('ai_chatbot/', AIChatbotView.as_view(), name='ai-chatbot'),
    path('ai_topic_explainer/', AITopicExplainerView.as_view(), name='ai-topic-explainer'),
    path('', include(topics_router.urls)), # Include nested URLs
]