from rest_framework import viewsets
from rest_framework import filters
from .models import Skill, LearningTopic, LearningResource, CompanyDrive, MockInterviewQuestion
from .serializers import CompanyDriveSerializer, PrepPlanInputSerializer, SkillSerializer, LearningTopicSerializer, LearningResourceSerializer, MockInterviewQuestionSerializer

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q # Used for complex lookups

import re
import io # To handle file in-memory

# Import libraries for file parsing
from PyPDF2 import PdfReader # For PDF
from docx import Document # For DOCX

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


class ResumeCheckerAPIView(APIView):
    def post(self, request, *args, **kwargs):
        job_description_text = request.data.get('job_description_text', '')
        resume_file = request.FILES.get('resume_file') # Get the uploaded file

        if not resume_file or not job_description_text:
            return Response(
                {"error": "Both resume file and job description text are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        resume_text = ""
        file_extension = resume_file.name.split('.')[-1].lower()

        try:
            if file_extension == 'pdf':
                # For PDF, use PyPDF2
                reader = PdfReader(io.BytesIO(resume_file.read()))
                for page in reader.pages:
                    resume_text += page.extract_text() or '' # Use .extract_text()
            elif file_extension == 'docx':
                # For DOCX, use python-docx
                document = Document(io.BytesIO(resume_file.read()))
                for para in document.paragraphs:
                    resume_text += para.text + '\n'
            elif file_extension == 'txt':
                # For plain text files
                resume_text = resume_file.read().decode('utf-8')
            else:
                return Response(
                    {"error": "Unsupported file format. Please upload a PDF, DOCX, or TXT file."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            # Catch errors during file processing (e.g., corrupted file, malformed PDF)
            print(f"Error processing resume file: {e}")
            return Response(
                {"error": "Could not process resume file. Please ensure it's a valid and readable PDF/DOCX/TXT file.", "details": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not resume_text.strip():
            return Response(
                {"error": "Could not extract readable text from the resume file. Please try a different file or format."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- Keyword Matching Logic (Reused and slightly refined) ---

        def tokenize_text(text):
            text = text.lower()
            # Replace common non-alphanumeric characters with space to help split words better
            text = re.sub(r'[^a-z0-9\s]', ' ', text)
            return set(text.split())

        resume_words = tokenize_text(resume_text)
        job_words = tokenize_text(job_description_text)

        # Common stopwords (can be expanded)
        stopwords = {"a", "an", "the", "and", "or", "is", "are", "of", "to", "in", "for", "with", "on", "at", "as", "by",
                     "be", "has", "have", "had", "will", "can", "may", "do", "does", "did", "not", "but", "if", "then",
                     "such", "this", "that", "these", "those", "we", "you", "he", "she", "it", "they", "them", "us", "our",
                     "their", "from", "into", "through", "during", "before", "after", "above", "below", "up", "down", "out",
                     "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why",
                     "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "only",
                     "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"}

        # Filter job description words to create keywords (longer than 2 chars, not stopwords)
        job_keywords = {word for word in job_words if len(word) > 2 and word not in stopwords}

        matching_keywords = list(resume_words.intersection(job_keywords))
        missing_keywords = list(job_keywords.difference(resume_words))

        # --- Suggestions for Improvement (Enhanced for Hackathon) ---
        suggestions = []

        # 1. Keyword Density/Completeness
        if not job_keywords: # Edge case: empty JD
            suggestions.append("The job description provided seems to be very short or lack clear keywords. Please provide a more detailed job description for better analysis.")
        elif not matching_keywords:
            suggestions.append("Your resume currently has very few direct keyword matches with the job description. Focus on integrating relevant terms.")
        elif len(missing_keywords) > (len(job_keywords) * 0.3): # More than 30% missing
            suggestions.append("A significant number of key terms from the job description are missing. Review the 'Missing Keywords' section and try to incorporate them naturally.")
        else:
            suggestions.append("Good job on including many relevant keywords! Review any 'Missing Keywords' for further optimization.")

        # 2. Action Verbs (Basic check, could be more sophisticated with NLP)
        action_verbs = {"managed", "developed", "led", "created", "implemented", "designed", "optimized", "achieved", "reduced", "increased"}
        if not any(verb in resume_text.lower() for verb in action_verbs):
            suggestions.append("Consider starting bullet points with strong action verbs to highlight your contributions (e.g., 'Developed X', 'Managed Y').")

        # 3. Quantifiable Achievements (Heuristic)
        # Look for numbers or percentages near action verbs or skill mentions
        if not re.search(r'\d+\s*(%|million|thousand|lakh|crore|users|projects|dollars|revenue|sales)', resume_text, re.IGNORECASE):
            suggestions.append("Try to quantify your achievements with numbers (e.g., 'Increased efficiency by 15%', 'Managed 3 projects'). This makes your impact clearer.")

        # 4. Resume Length (Very basic heuristic)
        word_count = len(resume_text.split())
        if word_count < 200:
            suggestions.append("Your resume seems quite brief. Ensure you've provided enough detail about your experiences and skills.")
        elif word_count > 800: # Assuming typical 1-2 page for experienced, shorter for freshers
            suggestions.append("Your resume might be too long. Aim for conciseness and prioritize the most relevant information.")


        response_data = {
            "match_score": f"{len(matching_keywords)} / {len(job_keywords)}",
            "matching_keywords": matching_keywords,
            "missing_keywords": missing_keywords,
            "suggestions": suggestions,
            "extracted_resume_text_sample": resume_text[:500] + "..." if len(resume_text) > 500 else resume_text, # Show some extracted text
            "disclaimer": "This is an AI-powered basic ATS keyword and heuristic checker. For best results, always manually review your resume and tailor it specifically for each job. File parsing can sometimes be imperfect."
        }

        return Response(response_data, status=status.HTTP_200_OK)