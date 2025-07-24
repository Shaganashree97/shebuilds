from rest_framework import viewsets
from rest_framework import filters
from .models import Skill, LearningTopic, LearningResource, CompanyDrive, MockInterviewQuestion
from .serializers import CompanyDriveSerializer, PrepPlanInputSerializer, SkillSerializer, LearningTopicSerializer, LearningResourceSerializer, MockInterviewQuestionSerializer

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q # Used for complex lookups

class CompanyDriveViewSet(viewsets.ModelViewSet):
    queryset = CompanyDrive.objects.all()
    serializer_class = CompanyDriveSerializer
    # Filters: Order by drive_date, search by role or domain
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ['drive_date'] # Allows ?ordering=drive_date or ?ordering=-drive_date
    search_fields = ['role', 'domain', 'company_name'] # Allows ?search=Software+Engineer


class PersonalizedPrepPlanView(APIView):
    def post(self, request, *args, **kwargs):
        # Use the input serializer to validate request data
        input_serializer = PrepPlanInputSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        preferred_role = input_serializer.validated_data.get('preferred_role', '').lower()
        academic_details = input_serializer.validated_data.get('academic_course_details', '').lower()

        # --- Hackathon Logic for Plan Generation ---
        # This is a simplified, rule-based approach for the hackathon.
        # In a real application, this would involve NLP, more sophisticated
        # skill mapping, and potentially user performance data.

        plan_details = {
            "summary": f"Personalized plan for aspiring {preferred_role} based on your academic background.",
            "sections": []
        }

        # 1. Infer Core Skills based on Preferred Role (Dummy Data Mapping)
        # This should map preferred roles to a list of core skill names
        role_to_skills_map = {
            "software engineer": ["Data Structures & Algorithms", "Object-Oriented Programming", "Web Development Basics", "Database Management Systems", "Version Control (Git)"],
            "data analyst": ["Statistics", "Python for Data Analysis", "SQL", "Data Visualization", "Excel"],
            "machine learning engineer": ["Machine Learning Basics", "Deep Learning", "Python for Data Science", "Calculus & Linear Algebra"],
            "front end developer": ["HTML/CSS", "JavaScript", "React.js Basics", "Responsive Design"],
            "backend developer": ["Python (Django)", "Node.js (Express)", "APIs & Microservices", "Database Management Systems"],
            # Add more specific roles as needed for your dummy data
        }
        
        # Get relevant skills from the map, default to general if role not found
        relevant_skill_names = role_to_skills_map.get(preferred_role, ["General Aptitude", "Basic Coding", "Communication"])

        # 2. Adjust Skills based on Academic Details (Simple Keyword Matching)
        # This is very basic; in a real app, use more robust NLP.
        if "data structures" in academic_details or "algorithms" in academic_details or "dsa" in academic_details:
            if "Data Structures & Algorithms" not in relevant_skill_names:
                relevant_skill_names.append("Data Structures & Algorithms")
        if "database" in academic_details or "sql" in academic_details or "dbms" in academic_details:
            if "Database Management Systems" not in relevant_skill_names:
                relevant_skill_names.append("Database Management Systems")
        if "python" in academic_details and "data" in academic_details:
             if "Python for Data Analysis" not in relevant_skill_names:
                relevant_skill_names.append("Python for Data Analysis")
        if "web" in academic_details and ("frontend" in academic_details or "react" in academic_details):
             if "Web Development Basics" not in relevant_skill_names:
                relevant_skill_names.append("Web Development Basics")
        # Ensure unique skills and maintain order for a consistent plan
        relevant_skill_names = list(dict.fromkeys(relevant_skill_names)) # Remove duplicates while preserving order

        # 3. Fetch Learning Topics and Resources for inferred skills
        sections = []
        for skill_name in relevant_skill_names:
            skill_obj = Skill.objects.filter(name=skill_name).first() # .first() to get an instance or None

            topic_details = []
            if skill_obj:
                # Get topics related to this skill
                topics = LearningTopic.objects.filter(related_skills=skill_obj).distinct()
                for topic in topics:
                    # Get resources associated with each topic
                    resources_queryset = LearningResource.objects.filter(associated_topics=topic).distinct()
                    resource_data = LearningResourceSerializer(resources_queryset, many=True).data
                    topic_details.append({
                        "name": topic.name,
                        "description": topic.description,
                        "resources": resource_data
                    })
            
            # Add the skill and its topics/resources to the plan sections
            sections.append({
                "skill": skill_name,
                "topics": topic_details
            })

        # 4. Basic Time Estimation (Hackathon Simplification)
        # You could fetch the earliest upcoming drive date from CompanyDrive for more realistic remaining time.
        # For simplicity, let's assume a general prep period.
        total_weeks = 12 # Default total preparation period
        time_breakdown = "Allocate time based on your current proficiency: prioritize weaker areas. Roughly 60% technical skills, 20% aptitude, 20% soft skills/behavioral."

        plan_details["time_estimation"] = {
            "total_weeks": total_weeks,
            "breakdown": time_breakdown
        }
        plan_details["sections"] = sections

        return Response(plan_details, status=status.HTTP_200_OK)

class GenerateMockInterviewView(APIView):
    def post(self, request, *args, **kwargs):
        company_id = request.data.get('company_id')
        role = request.data.get('role')
        num_questions = request.data.get('num_questions', 5) # Default to 5 questions

        if not company_id or not role:
            return Response({"error": "Company ID and Role are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            company = get_object_or_404(CompanyDrive, id=company_id)
        except Exception:
            return Response({"error": f"Company with ID {company_id} not found."}, status=status.HTTP_404_NOT_FOUND)

        # Build query to get relevant questions
        # Prioritize questions specifically for this company and role
        questions_query = MockInterviewQuestion.objects.filter(
            company=company,
            role__iexact=role # Case-insensitive match for role
        )

        # If not enough specific questions, broaden the search (Hackathon logic)
        if questions_query.count() < num_questions:
            # Try to get general questions for the role (not company specific)
            general_role_questions = MockInterviewQuestion.objects.filter(
                Q(company__isnull=True) | Q(company=None), # Questions not tied to specific companies
                role__iexact=role
            )
            # Or questions specific to company but general role (if such data existed)
            # Or just any questions for that role from any company

            # For hackathon simplicity, just take random ones for the role if company specific are few
            questions_query = (questions_query | general_role_questions).distinct()


        # Get a random selection of questions
        selected_questions = questions_query.order_by('?')[:num_questions]

        if not selected_questions.exists():
            return Response({"error": f"No mock interview questions found for '{company.company_name}' as '{role}'. Please try another combination or add more data."}, status=status.HTTP_404_NOT_FOUND)


        serializer = MockInterviewQuestionSerializer(selected_questions, many=True)
        return Response({
            "company_name": company.company_name,
            "role": role,
            "questions": serializer.data
        }, status=status.HTTP_200_OK)