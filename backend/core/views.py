from rest_framework import viewsets
from rest_framework import filters
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from .models import Skill, LearningTopic, LearningResource, CompanyDrive, MockInterviewQuestion, DiscussionTopic, DiscussionPost, UserPreparationPlan, PlanProgress, ForumCategory
from .serializers import CompanyDriveSerializer, PrepPlanInputSerializer, LearningResourceSerializer, MockInterviewQuestionSerializer, MockInterviewInputSerializer, MockInterviewResponseSerializer, AnswerEvaluationInputSerializer, AnswerFeedbackSerializer, DiscussionTopicSerializer, DiscussionTopicListSerializer, DiscussionPostSerializer, PlanProgressSerializer, UserPreparationPlanSerializer, PlanProgressDetailSerializer, UserRegistrationSerializer, UserLoginSerializer, UserSerializer, ForumCategorySerializer

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q # Used for complex lookups
from django.conf import settings
from django.utils import timezone

import re
import io # To handle file in-memory
import json
import os
import base64
import requests

# Import libraries for file parsing
from PyPDF2 import PdfReader # For PDF
from docx import Document # For DOCX
import google.generativeai as genai

# Import ElevenLabs SDK
from elevenlabs import ElevenLabs

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from PyPDF2 import PdfReader
from docx import Document
import io
import os



# Authentication Views
class UserRegistrationView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'message': 'User registered successfully',
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserLoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            return Response({
                'message': 'Login successful',
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserLogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({
                'message': 'Logout successful'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': 'Invalid token'
            }, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Profile updated successfully',
                'user': serializer.data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CompanyDriveViewSet(viewsets.ModelViewSet):
    queryset = CompanyDrive.objects.all()
    serializer_class = CompanyDriveSerializer
    # Filters: Order by drive_date, search by role or domain
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ['drive_date'] # Allows ?ordering=drive_date or ?ordering=-drive_date
    search_fields = ['role', 'domain', 'company_name'] # Allows ?search=Software+Engineer


class PersonalizedPrepPlanView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        # Use the input serializer to validate request data
        input_serializer = PrepPlanInputSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        preferred_role = input_serializer.validated_data.get('preferred_role', '').strip()
        job_description = input_serializer.validated_data.get('job_description', '').strip()
        academic_details = input_serializer.validated_data.get('academic_course_details', '').strip()
        plan_name = input_serializer.validated_data.get('plan_name', '').strip()

        # Generate plan name if not provided
        if not plan_name:
            target = preferred_role if preferred_role else "Job Application"
            plan_name = f"Plan for {target} - {timezone.now().strftime('%Y-%m-%d %H:%M')}"

        # Check if Gemini API is available and configured
        gemini_api_key = os.environ.get('GEMINI_API_KEY')
        print("this is gemini api key", gemini_api_key)
        
        if gemini_api_key:
            try:
                return self._generate_with_gemini(preferred_role, job_description, academic_details, plan_name, request.user)
            except Exception as e:
                print(f"Gemini API error: {e}")
                # Fall back to rule-based approach
                return self._generate_fallback(preferred_role, job_description, academic_details, plan_name, request.user)
        else:
            # Use fallback rule-based approach
            return self._generate_fallback(preferred_role, job_description, academic_details, plan_name, request.user)

    def _generate_with_gemini(self, preferred_role, job_description, academic_details, plan_name=None, user=None):
        """Generate preparation plan using Gemini API"""
        genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Create prompt for Gemini
        prompt = self._create_gemini_prompt(preferred_role, job_description, academic_details)
        
        response = model.generate_content(prompt)
        gemini_response = response.text
        
        # Parse the Gemini response and structure it
        plan_details = self._parse_gemini_response(gemini_response, preferred_role, job_description)
        
        # Save plan to database
        saved_plan = self._save_plan_to_database(
            plan_details, preferred_role, job_description, academic_details, 
            plan_name, user
        )
        
        # Add plan_id to response
        plan_details['plan_id'] = saved_plan.id
        
        return Response(plan_details, status=status.HTTP_200_OK)

    def _create_gemini_prompt(self, preferred_role, job_description, academic_details):
        """Create a structured prompt for Gemini API"""
        target_role = preferred_role if preferred_role else "the role described in the job description"
        
        prompt = f"""
        Create a comprehensive, personalized study plan for someone preparing for {target_role}.

        INPUTS:
        - Academic Details: {academic_details}
        - Preferred Role: {preferred_role if preferred_role else 'Not specified'}
        - Job Description: {job_description if job_description else 'Not provided'}

        Please provide a response in the following JSON format:
        {{
            "summary": "A brief overview of the preparation plan (2-3 sentences)",
            "time_estimation": {{
                "total_weeks": number,
                "breakdown": "Brief explanation of time allocation"
            }},
            "roadmap": [
                {{
                    "phase": "Phase name (e.g., Foundation, Intermediate, Advanced)",
                    "duration_weeks": number,
                    "skills": [
                        {{
                            "name": "Skill name",
                            "description": "Brief description",
                            "priority": "high/medium/low",
                            "topics": [
                                {{
                                    "name": "Topic name",
                                    "description": "What to learn",
                                    "estimated_hours": number
                                }}
                            ]
                        }}
                    ]
                }}
            ]
        }}

        Focus on:
        1. Skills most relevant to the target role
        2. Building upon the user's academic background
        3. Practical, actionable learning topics
        4. Realistic time estimates
        5. Progressive skill building (foundation to advanced)
        
        Ensure the JSON is valid and complete.
        """
        
        return prompt

    def _parse_gemini_response(self, gemini_response, preferred_role, job_description):
        """Parse Gemini's response and format it for frontend"""
        try:
            # Try to extract JSON from the response
            import json
            import re
            
            # Find JSON in the response
            json_match = re.search(r'\{.*\}', gemini_response, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                parsed_data = json.loads(json_str)
                
                # Transform to our expected format
                plan_details = {
                    "summary": parsed_data.get("summary", "Personalized preparation plan generated by AI"),
                    "time_estimation": parsed_data.get("time_estimation", {
                        "total_weeks": 12,
                        "breakdown": "AI-generated time estimation"
                    }),
                    "sections": [],
                    "roadmap": parsed_data.get("roadmap", [])
                }
                
                # Convert roadmap to sections format for compatibility
                for phase in parsed_data.get("roadmap", []):
                    for skill in phase.get("skills", []):
                        plan_details["sections"].append({
                            "skill": skill.get("name", ""),
                            "phase": phase.get("phase", ""),
                            "priority": skill.get("priority", "medium"),
                            "topics": [
                                {
                                    "name": topic.get("name", ""),
                                    "description": topic.get("description", ""),
                                    "estimated_hours": topic.get("estimated_hours", 0),
                                    "resources": self._get_matching_resources(topic.get("name", ""))
                                }
                                for topic in skill.get("topics", [])
                            ]
                        })
                
                return plan_details
                
        except Exception as e:
            print(f"Error parsing Gemini response: {e}")
            
        # Fallback if parsing fails
        return self._generate_fallback(preferred_role, job_description, "")

    def _get_matching_resources(self, topic_name):
        """Get learning resources that match a topic name"""
        # Simple keyword matching with existing resources
        resources = LearningResource.objects.filter(
            title__icontains=topic_name
        ) or LearningResource.objects.filter(
            associated_topics__name__icontains=topic_name
        )
        
        return LearningResourceSerializer(resources[:3], many=True).data

    def _generate_fallback(self, preferred_role, job_description, academic_details, plan_name=None, user=None):
        """Fallback rule-based approach when Gemini API is not available"""
        target_role = preferred_role if preferred_role else "Software Engineer"
        
        # Enhanced rule-based mapping
        role_to_skills_map = {
            "software engineer": ["Data Structures & Algorithms", "Object-Oriented Programming", "Web Development Basics", "Database Management Systems", "Version Control (Git)"],
            "data analyst": ["Statistics", "Python for Data Analysis", "SQL", "Data Visualization", "Excel"],
            "machine learning engineer": ["Machine Learning Basics", "Deep Learning", "Python for Data Science", "Calculus & Linear Algebra"],
            "frontend developer": ["HTML/CSS", "JavaScript", "React.js Basics", "Responsive Design"],
            "backend developer": ["Python (Django)", "Node.js (Express)", "APIs & Microservices", "Database Management Systems"],
            "full stack developer": ["Web Development Basics", "Database Management Systems", "APIs & Microservices", "JavaScript", "React.js Basics"],
            "devops engineer": ["Version Control (Git)", "APIs & Microservices", "Database Management Systems", "System Administration"],
        }
        
        # If job description is provided, extract skills from it
        if job_description:
            relevant_skill_names = self._extract_skills_from_job_description(job_description)
        else:
            relevant_skill_names = role_to_skills_map.get(target_role.lower(), ["General Aptitude", "Basic Coding", "Communication"])

        # Adjust based on academic details
        relevant_skill_names = self._adjust_skills_based_on_academics(relevant_skill_names, academic_details)

        # Generate sections
        sections = []
        for i, skill_name in enumerate(relevant_skill_names):
            skill_obj = Skill.objects.filter(name=skill_name).first()
            
            topic_details = []
            if skill_obj:
                topics = LearningTopic.objects.filter(related_skills=skill_obj).distinct()
                for topic in topics:
                    resources_queryset = LearningResource.objects.filter(associated_topics=topic).distinct()
                    resource_data = LearningResourceSerializer(resources_queryset, many=True).data
                    topic_details.append({
                        "name": topic.name,
                        "description": topic.description,
                        "estimated_hours": 10 + (i * 5),  # Estimated hours
                        "resources": resource_data
                    })
            
            sections.append({
                "skill": skill_name,
                "priority": "high" if i < 3 else "medium",
                "topics": topic_details
            })

        plan_details = {
            "summary": f"Personalized preparation plan for {target_role} based on your academic background.",
            "time_estimation": {
                "total_weeks": 12,
                "breakdown": "Foundation (4 weeks), Intermediate (5 weeks), Advanced (3 weeks)"
            },
            "sections": sections,
            "roadmap": [
                {
                    "phase": "Foundation",
                    "duration_weeks": 4,
                    "skills": sections[:2]
                },
                {
                    "phase": "Intermediate", 
                    "duration_weeks": 5,
                    "skills": sections[2:4]
                },
                {
                    "phase": "Advanced",
                    "duration_weeks": 3,
                    "skills": sections[4:]
                }
            ]
        }

        # Save plan to database
        saved_plan = self._save_plan_to_database(
            plan_details, preferred_role, job_description, academic_details, 
            plan_name, user
        )
        
        # Add plan_id to response
        plan_details['plan_id'] = saved_plan.id

        return Response(plan_details, status=status.HTTP_200_OK)

    def _extract_skills_from_job_description(self, job_description):
        """Extract skills from job description using keyword matching"""
        jd_lower = job_description.lower()
        
        skill_keywords = {
            "Data Structures & Algorithms": ["data structures", "algorithms", "dsa", "leetcode", "coding"],
            "Python for Data Analysis": ["python", "pandas", "numpy", "data analysis"],
            "Machine Learning Basics": ["machine learning", "ml", "ai", "artificial intelligence"],
            "Web Development Basics": ["web development", "html", "css", "frontend", "backend"],
            "JavaScript": ["javascript", "js", "node", "react", "angular", "vue"],
            "Database Management Systems": ["sql", "database", "mysql", "postgresql", "mongodb"],
            "Version Control (Git)": ["git", "github", "version control", "gitlab"],
            "APIs & Microservices": ["api", "rest", "microservices", "web services"],
            "Statistics": ["statistics", "statistical analysis", "data science"],
        }
        
        relevant_skills = []
        for skill, keywords in skill_keywords.items():
            if any(keyword in jd_lower for keyword in keywords):
                relevant_skills.append(skill)
        
        return relevant_skills or ["General Aptitude", "Basic Coding", "Communication"]

    def _adjust_skills_based_on_academics(self, skills, academic_details):
        """Adjust skills based on academic background"""
        if not academic_details:
            return skills
            
        academic_lower = academic_details.lower()
        
        # Add skills based on academic mentions
        if "data structures" in academic_lower or "algorithms" in academic_lower:
            if "Data Structures & Algorithms" not in skills:
                skills.append("Data Structures & Algorithms")
        
        if ("database" in academic_lower or "sql" in academic_lower) and "Database Management Systems" not in skills:
            skills.append("Database Management Systems")
            
        if "python" in academic_lower and "data" in academic_lower:
            if "Python for Data Analysis" not in skills:
                skills.append("Python for Data Analysis")
        
        return list(dict.fromkeys(skills))  # Remove duplicates

    def _save_plan_to_database(self, plan_details, preferred_role, job_description, academic_details, plan_name, user):
        """Save the generated plan to database"""
        # Determine input type
        input_type = 'role' if preferred_role else 'job_description'
        
        # Count total topics for progress tracking
        total_topics = sum(len(section.get('topics', [])) for section in plan_details.get('sections', []))
        
        # Create the preparation plan
        plan = UserPreparationPlan.objects.create(
            user=user,
            plan_name=plan_name,
            academic_details=academic_details,
            input_type=input_type,
            preferred_role=preferred_role if preferred_role else None,
            job_description=job_description if job_description else None,
            plan_data=plan_details,
            total_topics=total_topics,
            completed_topics=0,
            progress_percentage=0.0
        )
        
        # Create progress entries for each topic
        for section in plan_details.get('sections', []):
            skill_name = section.get('skill', '')
            for topic in section.get('topics', []):
                topic_name = topic.get('name', '')
                topic_description = topic.get('description', '')
                estimated_hours = topic.get('estimated_hours', 0)
                
                # Create or get the progress record
                PlanProgress.objects.create(
                    plan=plan,
                    section_name=skill_name,
                    topic_name=topic_name,
                    topic_description=topic_description,
                    is_completed=False,
                    estimated_hours=float(estimated_hours) if estimated_hours else None
                )
        
        return plan


class GenerateMockInterviewView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        # Validate input using serializer
        input_serializer = MockInterviewInputSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        company_name = input_serializer.validated_data['company_name']
        job_description = input_serializer.validated_data['job_description']
        num_questions = input_serializer.validated_data['num_questions']

        # Check if Gemini API is available
        gemini_api_key = os.environ.get('GEMINI_API_KEY')
        
        if gemini_api_key:
            try:
                return self._generate_with_gemini(company_name, job_description, num_questions)
            except Exception as e:
                print(f"Gemini API error: {e}")
                # Fall back to basic generation
                return self._generate_fallback(company_name, job_description, num_questions)
        else:
            # Use fallback generation
            return self._generate_fallback(company_name, job_description, num_questions)

    def _generate_with_gemini(self, company_name, job_description, num_questions):
        """Generate interview questions using Gemini AI and convert to speech using ElevenLabs"""
        # Configure Gemini
        genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
        model = genai.GenerativeModel('gemini-2.0-flash')

        # Create prompt for interview question generation
        prompt = f"""
        You are an experienced technical interviewer. Generate {num_questions} realistic mock interview questions for the following job posting at {company_name}.

        Job Description:
        {job_description}

        Requirements:
        1. Generate questions that are relevant to the specific role and company
        2. Include a mix of technical, behavioral, and company-specific questions
        3. Vary the difficulty levels (easy, medium, hard)
        4. Make questions realistic and commonly asked in actual interviews
        5. Consider the company culture and values if mentioned in the job description

        Return the response in this exact JSON format:
        {{
            "questions": [
                {{
                    "question_text": "Your interview question here",
                    "difficulty_level": "easy|medium|hard"
                }},
                ...
            ]
        }}

        Make sure each question is:
        - Clear and specific
        - Relevant to the job requirements
        - Professional and realistic
        - Appropriate for the difficulty level
        """

        try:
            # Generate questions using Gemini
            response = model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Clean and parse JSON response
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            response_data = json.loads(response_text.strip())
            questions = response_data.get('questions', [])
            
            if not questions:
                raise ValueError("No questions generated")

            # Generate TTS audio for each question
            questions_with_audio = []
            for question in questions:
                question_with_audio = question.copy()
                
                # Generate audio using ElevenLabs
                audio_data = self._generate_tts_audio(question['question_text'])
                if audio_data:
                    question_with_audio['audio_data'] = audio_data
                
                questions_with_audio.append(question_with_audio)
            
            return Response({
                "company_name": company_name,
                "questions": questions_with_audio
            }, status=status.HTTP_200_OK)

        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Response text: {response_text}")
            return self._generate_fallback(company_name, job_description, num_questions)
        except Exception as e:
            print(f"Error in Gemini generation: {e}")
            return self._generate_fallback(company_name, job_description, num_questions)

    def _generate_tts_audio(self, text):
        """Generate audio using ElevenLabs TTS API with official SDK"""
        try:
            elevenlabs_api_key = os.environ.get('ELEVENLABS_API_KEY')
            if not elevenlabs_api_key:
                print("ElevenLabs API key not found")
                return None

            # Initialize ElevenLabs client
            client = ElevenLabs(api_key=elevenlabs_api_key)
            
            # Generate audio using the official SDK
            audio = client.text_to_speech.convert(
                text=text,
                voice_id="JBFqnCBsd6RMkjVDRZzb",  # George - Professional male voice
                model_id="eleven_multilingual_v2",  # Better quality model
                output_format="mp3_44100_128",
                voice_settings={
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.2,
                    "use_speaker_boost": True
                }
            )
            
            # Convert the audio generator to bytes
            audio_bytes = b"".join(audio)
            
            # Return base64 encoded audio data for frontend
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            return audio_base64
                
        except Exception as e:
            print(f"TTS generation error: {e}")
            return None

    def _generate_fallback(self, company_name, job_description, num_questions):
        """Fallback method to generate questions when Gemini is not available"""
        # Extract key skills/technologies from job description
        common_keywords = ['python', 'java', 'javascript', 'react', 'node', 'sql', 'aws', 'docker', 'kubernetes', 'git']
        found_skills = [skill for skill in common_keywords if skill.lower() in job_description.lower()]
        
        # Generic questions based on job description analysis
        fallback_questions = [
            {
                "question_text": f"Tell me about your experience and why you're interested in working at {company_name}.",
                "difficulty_level": "easy"
            },
            {
                "question_text": "Describe a challenging project you've worked on and how you overcame the difficulties.",
                "difficulty_level": "medium"
            },
            {
                "question_text": "How do you stay updated with the latest industry trends and technologies?",
                "difficulty_level": "easy"
            },
            {
                "question_text": "Describe a time when you had to work with a difficult team member. How did you handle it?",
                "difficulty_level": "medium"
            },
            {
                "question_text": "What do you consider your greatest strength and weakness?",
                "difficulty_level": "easy"
            }
        ]
        
        # Add skill-specific questions if skills are found
        if found_skills:
            skill_questions = [
                {
                    "question_text": f"How would you approach solving a complex problem using {found_skills[0]}?",
                    "difficulty_level": "hard"
                },
                {
                    "question_text": f"What are the best practices you follow when working with {found_skills[0] if found_skills else 'your preferred technology'}?",
                    "difficulty_level": "medium"
                }
            ]
            fallback_questions.extend(skill_questions)
        
        # Select the requested number of questions
        selected_questions = fallback_questions[:num_questions]
        
        return Response({
            "company_name": company_name,
            "questions": selected_questions,
            "note": "Generated using fallback method. For AI-powered questions, please configure Gemini API."
        }, status=status.HTTP_200_OK)


class EvaluateInterviewAnswersView(APIView):
    def post(self, request, *args, **kwargs):
        # Debug logging
        print("=== EVALUATION REQUEST DEBUG ===")
        print(f"Request data type: {type(request.data)}")
        print(f"Request data: {request.data}")
        
        # Validate input using serializer
        input_serializer = AnswerEvaluationInputSerializer(data=request.data)
        if not input_serializer.is_valid():
            print(f"Serializer validation errors: {input_serializer.errors}")
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        company_name = input_serializer.validated_data['company_name']
        job_description = input_serializer.validated_data['job_description']
        question_answers = input_serializer.validated_data['question_answers']
        
        print(f"Successfully parsed - Company: {company_name}")
        print(f"Successfully parsed - Job description length: {len(job_description)}")
        print(f"Successfully parsed - Question answers count: {len(question_answers)}")
        print("=== END EVALUATION DEBUG ===\n")

        # Check if Gemini API is available
        gemini_api_key = os.environ.get('GEMINI_API_KEY')
        
        if gemini_api_key:
            try:
                return self._evaluate_with_gemini(company_name, job_description, question_answers)
            except Exception as e:
                print(f"Gemini API error: {e}")
                # Fall back to basic evaluation
                return self._evaluate_fallback(company_name, job_description, question_answers)
        else:
            # Use fallback evaluation
            return self._evaluate_fallback(company_name, job_description, question_answers)

    def _evaluate_with_gemini(self, company_name, job_description, question_answers):
        """Evaluate interview answers using Gemini AI"""
        # Configure Gemini
        genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
        model = genai.GenerativeModel('gemini-2.0-flash')

        evaluations = []
        
        for qa in question_answers:
            question_text = qa.get('question_text', '')
            user_answer = qa.get('user_answer', '')
            difficulty_level = qa.get('difficulty_level', 'medium')
            
            if not user_answer.strip():
                # Handle empty answers
                evaluations.append({
                    "question_text": question_text,
                    "user_answer": "No answer provided",
                    "score": 0,
                    "strengths": [],
                    "improvements": [
                        "An answer was not provided for this question",
                        "In a real interview, it's important to provide some response even if you're unsure"
                    ],
                    "suggestions": [
                        "Practice thinking out loud and structuring your thoughts",
                        "Even if unsure, explain your thought process",
                        "Ask clarifying questions if needed"
                    ],
                    "overall_comment": "No response was provided. In interviews, it's better to give a thoughtful partial answer than no answer at all."
                })
                continue

            # Create detailed evaluation prompt
            prompt = f"""
            You are an experienced technical interviewer evaluating a candidate's answer for a position at {company_name}.

            Job Description Context:
            {job_description}

            Interview Question: {question_text}
            Difficulty Level: {difficulty_level}
            
            Candidate's Answer: {user_answer}

            Please evaluate this answer and provide detailed feedback in the following JSON format:
            {{
                "score": 8,
                "strengths": [
                    "Specific strength point 1",
                    "Specific strength point 2"
                ],
                "improvements": [
                    "Specific area for improvement 1",
                    "Specific area for improvement 2"
                ],
                "suggestions": [
                    "Actionable suggestion 1",
                    "Actionable suggestion 2"
                ],
                "overall_comment": "A comprehensive comment about the answer quality, relevance, and interview performance"
            }}

            Evaluation Criteria:
            1. Relevance to the question and job requirements
            2. Technical accuracy (if applicable)
            3. Communication clarity and structure
            4. Use of specific examples or experiences
            5. Demonstration of problem-solving skills
            6. Cultural fit and soft skills demonstration
            7. Overall professionalism and confidence

            Score Range:
            - 9-10: Exceptional answer, would strongly impress interviewers
            - 7-8: Good answer with minor areas for improvement
            - 5-6: Average answer, meets basic expectations
            - 3-4: Below average, significant improvements needed
            - 1-2: Poor answer, major concerns

            Focus on constructive feedback that helps the candidate improve for future interviews.
            """

            try:
                # Generate evaluation using Gemini
                response = model.generate_content(prompt)
                response_text = response.text.strip()
                
                # Clean and parse JSON response
                if response_text.startswith('```json'):
                    response_text = response_text[7:]
                if response_text.endswith('```'):
                    response_text = response_text[:-3]
                
                evaluation_data = json.loads(response_text.strip())
                
                # Add question and answer text to the evaluation
                evaluation_data['question_text'] = question_text
                evaluation_data['user_answer'] = user_answer
                
                evaluations.append(evaluation_data)
                
            except (json.JSONDecodeError, Exception) as e:
                print(f"Error evaluating answer: {e}")
                # Fallback evaluation for this specific answer
                fallback_eval = self._create_fallback_evaluation(question_text, user_answer, difficulty_level)
                evaluations.append(fallback_eval)

        return Response({
            "company_name": company_name,
            "evaluations": evaluations,
            "overall_summary": self._generate_overall_summary(evaluations)
        }, status=status.HTTP_200_OK)

    def _evaluate_fallback(self, company_name, job_description, question_answers):
        """Fallback evaluation when Gemini is not available"""
        evaluations = []
        
        for qa in question_answers:
            question_text = qa.get('question_text', '')
            user_answer = qa.get('user_answer', '')
            difficulty_level = qa.get('difficulty_level', 'medium')
            
            evaluation = self._create_fallback_evaluation(question_text, user_answer, difficulty_level)
            evaluations.append(evaluation)

        return Response({
            "company_name": company_name,
            "evaluations": evaluations,
            "overall_summary": self._generate_overall_summary(evaluations),
            "note": "Generated using fallback method. For AI-powered evaluation, please configure Gemini API."
        }, status=status.HTTP_200_OK)

    def _create_fallback_evaluation(self, question_text, user_answer, difficulty_level):
        """Create a basic evaluation when AI is not available"""
        if not user_answer.strip():
            return {
                "question_text": question_text,
                "user_answer": "No answer provided",
                "score": 0,
                "strengths": [],
                "improvements": ["Answer not provided", "Practice thinking out loud"],
                "suggestions": ["Prepare examples using STAR method", "Practice mock interviews"],
                "overall_comment": "No response provided. Consider practicing your interview skills."
            }
        
        # Basic scoring based on answer length and content
        answer_length = len(user_answer.strip())
        
        if answer_length < 50:
            score = 4
            improvements = ["Answer could be more detailed", "Provide specific examples"]
        elif answer_length < 150:
            score = 6
            improvements = ["Good start, could add more depth", "Consider using the STAR method"]
        else:
            score = 7
            improvements = ["Well-detailed answer", "Minor refinements could help"]

        return {
            "question_text": question_text,
            "user_answer": user_answer,
            "score": score,
            "strengths": [
                "Provided a response to the question",
                "Shows engagement with the interview process"
            ],
            "improvements": improvements,
            "suggestions": [
                "Practice with more specific examples",
                "Structure answers using STAR method (Situation, Task, Action, Result)",
                "Research the company culture and values"
            ],
            "overall_comment": f"This is a {difficulty_level} level question. Your answer shows good foundation, with room for improvement in detail and structure."
        }

    def _generate_overall_summary(self, evaluations):
        """Generate an overall summary of the interview performance"""
        if not evaluations:
            return "No answers to evaluate."
        
        total_score = sum(eval.get('score', 0) for eval in evaluations)
        avg_score = total_score / len(evaluations)
        
        if avg_score >= 8:
            performance = "Excellent"
            comment = "Strong interview performance with well-structured answers."
        elif avg_score >= 6:
            performance = "Good"
            comment = "Solid interview performance with room for minor improvements."
        elif avg_score >= 4:
            performance = "Average"
            comment = "Average performance. Focus on providing more detailed and structured answers."
        else:
            performance = "Needs Improvement"
            comment = "Consider more practice with mock interviews and answer preparation."

        return {
            "average_score": round(avg_score, 1),
            "performance_level": performance,
            "total_questions": len(evaluations),
            "summary_comment": comment
        }


class ResumeCheckerAPIView(APIView):
    # Explicitly set parsers to handle multipart and form data
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def post(self, request, *args, **kwargs):
        # Handle both multipart form data and JSON
        if request.content_type and 'multipart' in request.content_type:
            # Multipart form data (file upload)
            job_description_text = request.data.get('job_description_text', '')
            resume_file = request.FILES.get('resume_file')
        else:
            # JSON data (if job description is sent as JSON)
            job_description_text = request.data.get('job_description_text', '')
            resume_file = request.FILES.get('resume_file') if hasattr(request, 'FILES') else None

        if not resume_file or not job_description_text:
            return Response(
                {"error": "Both resume file and job description text are required."},
                status=status.HTTP_400_BAD_REQUEST  
            )

        # Extract text from resume file
        resume_text = self._extract_text_from_file(resume_file)
        
        if isinstance(resume_text, Response):  # Error response
            return resume_text

        # Check if Gemini API is available
        gemini_api_key = os.environ.get('GEMINI_API_KEY')
        
        if gemini_api_key:
            try:
                return self._analyze_with_gemini(resume_text, job_description_text)
            except Exception as e:
                print(f"Gemini API error: {e}")
                # Fall back to basic analysis
                return self._analyze_with_fallback(resume_text, job_description_text)
        else:
            # Use fallback analysis
            return self._analyze_with_fallback(resume_text, job_description_text)

    def _extract_text_from_file(self, resume_file):
        """Extract text from uploaded resume file"""
        resume_text = ""
        file_extension = resume_file.name.split('.')[-1].lower()

        try:
            if file_extension == 'pdf':
                try:
                    # Reset file pointer to beginning
                    resume_file.seek(0)
                    
                    # Read file content into BytesIO
                    file_content = resume_file.read()
                    if not file_content:
                        return Response(
                            {"error": "PDF file is empty."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    reader = PdfReader(io.BytesIO(file_content))
                    
                    # Check if PDF is encrypted
                    if reader.is_encrypted:
                        return Response(
                            {"error": "PDF is password protected. Please upload an unencrypted PDF file."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Extract text from all pages
                    for page_num, page in enumerate(reader.pages):
                        try:
                            page_text = page.extract_text()
                            if page_text:
                                resume_text += page_text + '\n'
                        except Exception as page_error:
                            print(f"Warning: Could not extract text from page {page_num + 1}: {page_error}")
                            continue
                    
                except Exception as pdf_error:
                    print(f"PDF parsing error: {pdf_error}")
                    return Response(
                        {"error": f"Could not parse PDF file. The file may be corrupted, encrypted, or not a valid PDF. Please try re-saving your resume as a new PDF or use a different format. Error details: {str(pdf_error)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
            elif file_extension == 'docx':
                try:
                    resume_file.seek(0)
                    file_content = resume_file.read()
                    if not file_content:
                        return Response(
                            {"error": "DOCX file is empty."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    document = Document(io.BytesIO(file_content))
                    for para in document.paragraphs:
                        resume_text += para.text + '\n'
                except Exception as docx_error:
                    print(f"DOCX parsing error: {docx_error}")
                    return Response(
                        {"error": f"Could not parse DOCX file. The file may be corrupted or not a valid DOCX file. Error details: {str(docx_error)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
            elif file_extension == 'txt':
                try:
                    resume_file.seek(0)
                    file_content = resume_file.read()
                    
                    if not file_content:
                        return Response(
                            {"error": "Text file is empty."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Try different encodings if UTF-8 fails
                    encodings_to_try = ['utf-8', 'utf-16', 'latin-1', 'cp1252', 'iso-8859-1']
                    for encoding in encodings_to_try:
                        try:
                            resume_text = file_content.decode(encoding)
                            break
                        except UnicodeDecodeError:
                            continue
                    else:
                        # If all encodings fail
                        return Response(
                            {"error": "Could not decode text file. Please ensure the file is saved in UTF-8 encoding or try converting to PDF/DOCX."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                        
                except Exception as txt_error:
                    print(f"TXT parsing error: {txt_error}")
                    return Response(
                        {"error": f"Could not parse text file. Error details: {str(txt_error)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                return Response(
                    {"error": "Unsupported file format. Please upload a PDF, DOCX, or TXT file."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            print(f"General error processing resume file: {e}")
            return Response(
                {"error": f"Unexpected error processing resume file. Please try a different file or format. Error details: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if we extracted any text
        if not resume_text.strip():
            return Response(
                {"error": "Could not extract readable text from the resume file. The file may be empty, corrupted, or contain only images/graphics. Please try a different file or ensure your resume contains selectable text."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return resume_text

    def _analyze_with_gemini(self, resume_text, job_description_text):
        """Analyze resume using Gemini AI"""
        genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = self._create_resume_analysis_prompt(resume_text, job_description_text)
        
        response = model.generate_content(prompt)
        gemini_response = response.text
        
        # Parse the Gemini response
        analysis_result = self._parse_gemini_analysis_response(gemini_response, resume_text)
        
        return Response(analysis_result, status=status.HTTP_200_OK)

    def _create_resume_analysis_prompt(self, resume_text, job_description_text):
        """Create a structured prompt for Gemini AI resume analysis"""
        prompt = f"""
        You are an expert ATS (Applicant Tracking System) and career coach. Analyze the following resume against the job description and provide comprehensive feedback.

        RESUME TEXT:
        {resume_text}

        JOB DESCRIPTION:
        {job_description_text}

        Please provide your analysis in the following JSON format:
        {{
            "overall_match_score": "X/10 - Brief explanation",
            "ats_compatibility_score": "X/10 - Brief explanation",
            "matched_keywords": [
                "keyword1", "keyword2", "keyword3"
            ],
            "missing_important_keywords": [
                "missing_keyword1", "missing_keyword2"
            ],
            "resume_strengths": [
                "Strength 1 with specific example from resume",
                "Strength 2 with specific example from resume"
            ],
            "improvement_suggestions": [
                {{
                    "category": "Keywords & Skills",
                    "suggestions": [
                        "Specific suggestion 1",
                        "Specific suggestion 2"
                    ]
                }},
                {{
                    "category": "Experience & Achievements",
                    "suggestions": [
                        "Specific suggestion 1",
                        "Specific suggestion 2"
                    ]
                }},
                {{
                    "category": "Formatting & Structure",
                    "suggestions": [
                        "Specific suggestion 1",
                        "Specific suggestion 2"
                    ]
                }}
            ],
            "action_items": [
                "Immediate action 1",
                "Immediate action 2",
                "Immediate action 3"
            ],
            "recommended_additions": [
                "Section/skill to add 1",
                "Section/skill to add 2"
            ]
        }}

        Focus on:
        1. ATS optimization and keyword matching
        2. Relevance to the specific job requirements
        3. Quantifiable achievements and impact statements
        4. Technical skills alignment
        5. Experience relevance and presentation
        6. Resume structure and formatting for ATS compatibility
        7. Missing critical information that employers expect
        8. Specific, actionable recommendations

        Ensure your response contains valid JSON only.
        """
        
        return prompt

    def _parse_gemini_analysis_response(self, gemini_response, resume_text):
        """Parse Gemini's analysis response and format it"""
        try:
            # Extract JSON from the response
            json_match = re.search(r'\{.*\}', gemini_response, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                parsed_data = json.loads(json_str)
                
                # Add extracted resume text sample for reference
                parsed_data["extracted_resume_text_sample"] = resume_text[:500] + "..." if len(resume_text) > 500 else resume_text
                parsed_data["disclaimer"] = "This analysis is AI-powered and provides comprehensive resume optimization suggestions. Always review recommendations in context of your specific situation."
                
                return parsed_data
                
        except Exception as e:
            print(f"Error parsing Gemini analysis response: {e}")
            
        # Fallback if parsing fails
        return self._analyze_with_fallback(resume_text, job_description_text).data

    def _analyze_with_fallback(self, resume_text, job_description_text):
        """Fallback analysis using basic keyword matching"""
        def tokenize_text(text):
            text = text.lower()
            text = re.sub(r'[^a-z0-9\s]', ' ', text)
            return set(text.split())

        resume_words = tokenize_text(resume_text)
        job_words = tokenize_text(job_description_text)

        stopwords = {"a", "an", "the", "and", "or", "is", "are", "of", "to", "in", "for", "with", "on", "at", "as", "by",
                     "be", "has", "have", "had", "will", "can", "may", "do", "does", "did", "not", "but", "if", "then",
                     "such", "this", "that", "these", "those", "we", "you", "he", "she", "it", "they", "them", "us", "our",
                     "their", "from", "into", "through", "during", "before", "after", "above", "below", "up", "down", "out",
                     "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why",
                     "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "only",
                     "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"}

        job_keywords = {word for word in job_words if len(word) > 2 and word not in stopwords}
        matching_keywords = list(resume_words.intersection(job_keywords))
        missing_keywords = list(job_keywords.difference(resume_words))

        # Basic suggestions
        suggestions = []
        if len(missing_keywords) > (len(job_keywords) * 0.3):
            suggestions.append("Consider incorporating more keywords from the job description.")
        
        action_verbs = {"managed", "developed", "led", "created", "implemented", "designed", "optimized", "achieved", "reduced", "increased"}
        if not any(verb in resume_text.lower() for verb in action_verbs):
            suggestions.append("Use strong action verbs to describe your accomplishments.")

        response_data = {
            "overall_match_score": f"{len(matching_keywords)}/{len(job_keywords)} keywords matched",
            "ats_compatibility_score": "Basic analysis - upgrade to AI analysis for detailed score",
            "matched_keywords": matching_keywords[:10],  # Limit to first 10
            "missing_important_keywords": missing_keywords[:10],  # Limit to first 10
            "resume_strengths": ["Resume submitted successfully", "Text extraction completed"],
            "improvement_suggestions": [
                {
                    "category": "Keywords & Skills",
                    "suggestions": suggestions
                }
            ],
            "action_items": [
                "Review missing keywords",
                "Add quantifiable achievements",
                "Use stronger action verbs"
            ],
            "recommended_additions": ["Technical skills section", "Quantified achievements"],
            "extracted_resume_text_sample": resume_text[:500] + "..." if len(resume_text) > 500 else resume_text,
            "disclaimer": "This is an AI-powered basic ATS keyword and heuristic checker. For best results, always manually review your resume and tailor it specifically for each job. File parsing can sometimes be imperfect."
        }

        return Response(response_data, status=status.HTTP_200_OK)


# --- Preparation Plan Management Views ---

class UserPreparationPlansView(APIView):
    """View to list all preparation plans for a user"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        plans = UserPreparationPlan.objects.filter(
            user=request.user,
            is_active=True
        )
        
        plans_data = []
        for plan in plans:
            plan_data = {
                'id': plan.id,
                'plan_name': plan.plan_name,
                'academic_details': plan.academic_details,
                'input_type': plan.input_type,
                'preferred_role': plan.preferred_role,
                'job_description': plan.job_description,
                'total_topics': plan.total_topics,
                'completed_topics': plan.completed_topics,
                'progress_percentage': plan.progress_percentage,
                'created_at': plan.created_at,
                'updated_at': plan.updated_at,
                'last_accessed': plan.last_accessed,
                'is_active': plan.is_active,
                'summary': plan.plan_data.get('summary', '') if plan.plan_data else ''
            }
            plans_data.append(plan_data)
        
        return Response({
            'plans': plans_data,
            'total_plans': len(plans_data)
        }, status=status.HTTP_200_OK)

class PreparationPlanDetailView(APIView):
    """View to get detailed information about a specific preparation plan"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, plan_id, *args, **kwargs):
        try:
            plan = UserPreparationPlan.objects.get(id=plan_id, user=request.user, is_active=True)
            
            # Update last accessed time
            plan.last_accessed = timezone.now()
            plan.save()
            
            # Get progress details
            progress_items = PlanProgress.objects.filter(plan=plan).order_by('section_name', 'topic_name')
            progress_data = []
            
            for progress in progress_items:
                progress_data.append({
                    'id': progress.id,
                    'section_name': progress.section_name,
                    'topic_name': progress.topic_name,
                    'topic_description': progress.topic_description,
                    'is_completed': progress.is_completed,
                    'completion_date': progress.completion_date,
                    'estimated_hours': progress.estimated_hours,
                    'actual_hours_spent': progress.actual_hours_spent,
                    'user_notes': progress.user_notes,
                    'difficulty_rating': progress.difficulty_rating,
                    'created_at': progress.created_at,
                    'updated_at': progress.updated_at
                })
            
            plan_details = plan.plan_data.copy() if plan.plan_data else {}
            plan_details.update({
                'plan_id': plan.id,
                'plan_name': plan.plan_name,
                'academic_details': plan.academic_details,
                'input_type': plan.input_type,
                'preferred_role': plan.preferred_role,
                'job_description': plan.job_description,
                'total_topics': plan.total_topics,
                'completed_topics': plan.completed_topics,
                'progress_percentage': plan.progress_percentage,
                'created_at': plan.created_at,
                'updated_at': plan.updated_at,
                'last_accessed': plan.last_accessed,
                'is_active': plan.is_active,
                'progress_details': progress_data
            })
            
            return Response(plan_details, status=status.HTTP_200_OK)
            
        except UserPreparationPlan.DoesNotExist:
            return Response({'error': 'Plan not found'}, status=status.HTTP_404_NOT_FOUND)

class UpdateTopicProgressView(APIView):
    """View to update progress on a specific topic"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        serializer = PlanProgressSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        plan_id = serializer.validated_data['plan_id']
        section_name = serializer.validated_data['section_name']
        topic_name = serializer.validated_data['topic_name']
        is_completed = serializer.validated_data['is_completed']
        user_notes = serializer.validated_data.get('user_notes', '')
        difficulty_rating = serializer.validated_data.get('difficulty_rating')
        
        try:
            progress = PlanProgress.objects.get(
                plan_id=plan_id,
                section_name=section_name,
                topic_name=topic_name
            )
            
            # Ensure the plan belongs to the authenticated user
            if progress.plan.user != request.user:
                return Response({'error': 'You can only update your own plans'}, status=status.HTTP_403_FORBIDDEN)
            
            # Update progress
            progress.is_completed = is_completed
            progress.user_notes = user_notes
            progress.difficulty_rating = difficulty_rating
            
            if is_completed and not progress.completion_date:
                progress.completion_date = timezone.now()
            elif not is_completed:
                progress.completion_date = None
            
            progress.save()
            
            # Get updated plan data
            plan = progress.plan
            return Response({
                'success': True,
                'message': 'Progress updated successfully',
                'plan_id': plan.id,
                'total_topics': plan.total_topics,
                'completed_topics': plan.completed_topics,
                'progress_percentage': plan.progress_percentage
            }, status=status.HTTP_200_OK)
            
        except PlanProgress.DoesNotExist:
            return Response({'error': 'Progress record not found'}, status=status.HTTP_404_NOT_FOUND)

class DeletePreparationPlanView(APIView):
    """View to delete (deactivate) a preparation plan"""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, plan_id, *args, **kwargs):
        try:
            plan = UserPreparationPlan.objects.get(id=plan_id, user=request.user)
            plan.is_active = False
            plan.save()
            
            return Response({
                'success': True,
                'message': 'Plan deleted successfully'
            }, status=status.HTTP_200_OK)
            
        except UserPreparationPlan.DoesNotExist:
            return Response({'error': 'Plan not found'}, status=status.HTTP_404_NOT_FOUND)


# --- Collaborative Learning ---

class ForumCategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing forum categories.
    Supports CRUD operations for forum categories and provides category statistics.
    """
    queryset = ForumCategory.objects.filter(is_active=True)
    serializer_class = ForumCategorySerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['order', 'name', 'created_at']
    ordering = ['order', 'name']
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        Allow public read access, but require authentication for write operations.
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

class DiscussionTopicViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows discussion topics to be viewed or edited.
    Supports listing all topics, creating new topics, and retrieving a single topic with its posts.
    """
    queryset = DiscussionTopic.objects.filter(is_active=True)
    # Use different serializers for list and detail views for performance
    def get_serializer_class(self):
        if self.action == 'list':
            return DiscussionTopicListSerializer # Use simpler serializer for list view
        return DiscussionTopicSerializer # Use detailed serializer for retrieve, create, update

    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ['created_at', 'last_activity', 'title', 'view_count']
    ordering = ['-is_pinned', '-last_activity']  # Pinned topics first, then by activity
    search_fields = ['title', 'content', 'author_name', 'related_skill__name', 'related_company__company_name', 'category__name']
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        Allow public read access, but require authentication for write operations.
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        category_id = self.request.query_params.get('category', None)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset
    
    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to increment view count"""
        instance = self.get_object()
        # Increment view count
        instance.view_count += 1
        instance.save(update_fields=['view_count'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        """Set author information when creating topic"""
        if self.request.user.is_authenticated:
            serializer.save(
                author=self.request.user,
                author_name=self.request.user.first_name or self.request.user.username
            )
        else:
            serializer.save()


class DiscussionPostViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows discussion posts (replies) to be viewed or edited.
    Posts are nested under topics.
    """
    serializer_class = DiscussionPostSerializer

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        Allow public read access, but require authentication for write operations.
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        # Retrieve posts only for the specific topic provided in the URL
        topic_id = self.kwargs.get('topic_pk') # Get topic_pk from URL
        if topic_id:
            return DiscussionPost.objects.filter(topic_id=topic_id).order_by('created_at')
        return DiscussionPost.objects.all().order_by('created_at') # Fallback if no topic_pk (shouldn't happen with nested routing)

    def perform_create(self, serializer):
        # Automatically link the post to its parent topic
        topic_id = self.kwargs.get('topic_pk')
        topic = get_object_or_404(DiscussionTopic, pk=topic_id)
        
        # Check if topic is locked
        if topic.is_locked:
            raise serializers.ValidationError("Cannot post to a locked topic.")
        
        # Set author information
        if self.request.user.is_authenticated:
            serializer.save(
                topic=topic,
                author=self.request.user,
                author_name=self.request.user.first_name or self.request.user.username
            )
        else:
            serializer.save(topic=topic) # Save the post with the correct topic


class AIChatbotView(APIView):
    """
    AI Chatbot endpoint that uses Gemini to answer user questions with platform context
    """
    permission_classes = [AllowAny]  # Allow both authenticated and anonymous users
    
    def post(self, request, *args, **kwargs):
        user_message = request.data.get('message', '').strip()
        user_id = request.data.get('user_id')  # Optional user context
        
        if not user_message:
            return Response({
                'error': 'Message is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if Gemini API is available
        gemini_api_key = os.environ.get('GEMINI_API_KEY')
        
        if not gemini_api_key:
            return Response({
                'response': "I'm currently unavailable. Please try again later or contact support.",
                'error': 'AI service not configured'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        try:
            return self._generate_response_with_gemini(user_message, user_id)
        except Exception as e:
            print(f"Gemini API error in chatbot: {e}")
            return Response({
                'response': "I'm having trouble processing your request right now. Please try again in a moment.",
                'error': 'AI service temporarily unavailable'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generate_response_with_gemini(self, user_message, user_id=None):
        """Generate AI response using Gemini with platform context"""
        genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Platform context
        platform_context = self._get_platform_context()
        
        # User context (if available)
        user_context = ""
        if user_id:
            user_context = self._get_user_context(user_id)
        
        # Create comprehensive prompt
        prompt = f"""
        You are an AI assistant for "Connect & Conquer", a comprehensive career preparation platform. 
        
        PLATFORM CONTEXT:
        {platform_context}
        
        USER CONTEXT:
        {user_context}
        
        USER QUESTION: {user_message}
        
        INSTRUCTIONS:
        - Provide helpful, accurate, and relevant answers about the platform and career preparation
        - Use the platform context to give specific guidance about available features
        - If the user asks about features not mentioned in the context, acknowledge that and suggest they explore the platform
        - Be friendly, professional, and encouraging
        - Keep responses concise but informative (aim for 2-4 sentences)
        - If asked about technical issues, guide them to relevant sections or suggest contacting support
        - Always relate your answers back to career preparation and professional development when possible
        
        Respond as the platform's AI assistant:
        """
        
        response = model.generate_content(prompt)
        ai_response = response.text
        
        return Response({
            'response': ai_response,
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)
    
    def _get_platform_context(self):
        """Generate comprehensive platform context for the AI"""
        return """
        Connect & Conquer is a career preparation platform with the following features:
        
        1. PERSONALIZED PREPARATION PLANS:
        - AI-generated study plans based on target roles or job descriptions
        - Tracks progress with topics, skills, and time estimates
        - Adaptive learning paths for different career goals
        
        2. MOCK INTERVIEWS:
        - AI-generated interview questions based on job descriptions and companies
        - Text-to-speech functionality for realistic practice
        - Detailed answer evaluation and feedback
        - Performance scoring and improvement suggestions
        
        3. RESUME OPTIMIZATION:
        - ATS compatibility analysis
        - Keyword matching against job descriptions
        - Detailed improvement suggestions
        - Formatting and structure recommendations
        
        4. DISCUSSION FORUMS:
        - Real-time chat functionality
        - Category-based discussions (Technical, Behavioral, Company-specific, etc.)
        - Community-driven knowledge sharing
        - Topic-based conversation threads
        
        5. COMPANY & JOB INFORMATION:
        - Company drive listings and details
        - Job search integration
        - Industry-specific preparation guidance
        
        6. LEARNING RESOURCES:
        - Curated educational content
        - Skill-based learning materials
        - Progress tracking and achievements
        
        The platform is designed to provide end-to-end career preparation support, from skill development to interview success.
        """
    
    def _get_user_context(self, user_id):
        """Get user-specific context if available"""
        try:
            from django.contrib.auth.models import User
            user = User.objects.get(id=user_id)
            
            # Get user's recent activity
            plans_count = UserPreparationPlan.objects.filter(user=user, is_active=True).count()
            
            context = f"""
            User Information:
            - Username: {user.username}
            - Active preparation plans: {plans_count}
            """
            
            # Add recent activity if available
            recent_plan = UserPreparationPlan.objects.filter(user=user, is_active=True).first()
            if recent_plan:
                context += f"\n- Current focus: {recent_plan.preferred_role or 'General career preparation'}"
                context += f"\n- Progress: {recent_plan.progress_percentage:.1f}% complete"
            
            return context
            
        except Exception as e:
            print(f"Error getting user context: {e}")
            return "User context not available"