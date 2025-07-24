import datetime
from django.core.management.base import BaseCommand
from core.models import CompanyDrive, Skill, LearningTopic, LearningResource, MockInterviewQuestion

class Command(BaseCommand):
    help = 'Populates the database with dummy data for Connect & Conquer.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Deleting existing data...'))
        # Clear existing data to prevent duplicates on rerun
        CompanyDrive.objects.all().delete()
        Skill.objects.all().delete()
        LearningTopic.objects.all().delete()
        LearningResource.objects.all().delete()
        MockInterviewQuestion.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('Existing data deleted.'))

        self.stdout.write(self.style.SUCCESS('Populating dummy CompanyDrive data...'))
        companies_data = [
            # Dummy Company 1: Tech Giant
            {'company_name': 'TechSolutions Inc.', 'role': 'Software Engineer', 'domain': 'Software Development',
             'salary_range': '15-20 LPA', 'hiring_timeline': 'Oct-Nov 2025', 'drive_date': datetime.date(2025, 10, 15),
             'location': 'Bangalore', 'interview_process_description': '4 rounds: OA, Technical (DSA), System Design, HR.'},
            {'company_name': 'TechSolutions Inc.', 'role': 'Data Analyst', 'domain': 'Data Science',
             'salary_range': '10-14 LPA', 'hiring_timeline': 'Oct-Nov 2025', 'drive_date': datetime.date(2025, 10, 20),
             'location': 'Hyderabad', 'interview_process_description': '3 rounds: Aptitude, SQL/Python, Case Study.'},

            # Dummy Company 2: FinTech Startup
            {'company_name': 'FinSense Corp.', 'role': 'Backend Developer', 'domain': 'FinTech',
             'salary_range': '12-18 LPA', 'hiring_timeline': 'Nov-Dec 2025', 'drive_date': datetime.date(2025, 11, 10),
             'location': 'Mumbai', 'interview_process_description': '3 rounds: Coding, Architecture, Managerial.'},

            # Dummy Company 3: Consulting Firm
            {'company_name': 'StratGen Consulting', 'role': 'Associate Consultant', 'domain': 'Consulting',
             'salary_range': '8-12 LPA', 'hiring_timeline': 'Jan-Feb 2026', 'drive_date': datetime.date(2026, 1, 5),
             'location': 'Delhi', 'interview_process_description': '2 rounds: Case Interview, Behavioral.'},

            # Dummy Company 4: E-commerce Leader
            {'company_name': 'ShopMart Global', 'role': 'Full Stack Developer', 'domain': 'E-commerce',
             'salary_range': '14-19 LPA', 'hiring_timeline': 'Sep-Oct 2025', 'drive_date': datetime.date(2025, 9, 25),
             'location': 'Pune', 'interview_process_description': '4 rounds: Coding (DS/Algo), LLD, HLD, Bar Raiser.'},
        ]
        companies = {}
        for data in companies_data:
            company = CompanyDrive.objects.create(**data)
            companies[data['company_name'] + '-' + data['role']] = company
        self.stdout.write(self.style.SUCCESS(f'Populated {len(companies_data)} CompanyDrive entries.'))

        self.stdout.write(self.style.SUCCESS('Populating dummy Skill data...'))
        skills_data = [
            "Data Structures & Algorithms", "Object-Oriented Programming", "Web Development Basics",
            "Database Management Systems", "Version Control (Git)", "Statistics", "Python for Data Analysis",
            "SQL", "Data Visualization", "Excel", "Machine Learning Basics", "Deep Learning",
            "Calculus & Linear Algebra", "HTML/CSS", "JavaScript", "React.js Basics", "Responsive Design",
            "Python (Django)", "Node.js (Express)", "APIs & Microservices", "Problem Solving",
            "Case Study Analysis", "Communication", "General Aptitude", "Low-Level Design", "High-Level Design"
        ]
        skills = {}
        for skill_name in skills_data:
            skill, created = Skill.objects.get_or_create(name=skill_name, defaults={'description': f'Core concepts of {skill_name}'})
            skills[skill_name] = skill
        self.stdout.write(self.style.SUCCESS(f'Populated {len(skills_data)} Skill entries.'))

        self.stdout.write(self.style.SUCCESS('Populating dummy LearningTopic data...'))
        # Mapping topics to skills (many-to-many)
        topics_data = [
            {"name": "Arrays & Strings", "desc": "Fundamental data structures and string manipulation.", "skills": ["Data Structures & Algorithms"]},
            {"name": "Linked Lists", "desc": "Dynamic data structure for sequential access.", "skills": ["Data Structures & Algorithms"]},
            {"name": "Trees & Graphs", "desc": "Non-linear data structures for hierarchical and network data.", "skills": ["Data Structures & Algorithms"]},
            {"name": "Sorting Algorithms", "desc": "Techniques to order data efficiently.", "skills": ["Data Structures & Algorithms"]},
            {"name": "OOP Principles", "desc": "Encapsulation, Inheritance, Polymorphism, Abstraction.", "skills": ["Object-Oriented Programming"]},
            {"name": "HTML & CSS Basics", "desc": "Structuring web content and styling.", "skills": ["HTML/CSS", "Web Development Basics"]},
            {"name": "JavaScript Fundamentals", "desc": "Core concepts of JavaScript for web interactivity.", "skills": ["JavaScript", "Web Development Basics"]},
            {"name": "React Component Lifecycle", "desc": "Understanding component rendering and updates in React.", "skills": ["React.js Basics", "Web Development Basics"]},
            {"name": "SQL Queries (CRUD)", "desc": "Basic SQL commands for Create, Read, Update, Delete.", "skills": ["SQL", "Database Management Systems"]},
            {"name": "Database Normalization", "desc": "Organizing data to reduce redundancy and improve integrity.", "skills": ["Database Management Systems"]},
            {"name": "Git Commands", "desc": "Basic operations like commit, push, pull, branch.", "skills": ["Version Control (Git)"]},
            {"name": "Pandas for Data Manipulation", "desc": "Using Pandas library for data cleaning and transformation.", "skills": ["Python for Data Analysis"]},
            {"name": "Regression Analysis", "desc": "Predictive modeling technique in statistics.", "skills": ["Statistics", "Machine Learning Basics"]},
            {"name": "System Design Basics", "desc": "Concepts for designing scalable and reliable systems.", "skills": ["System Design"]},
            {"name": "Behavioral Questions", "desc": "STAR method for answering behavioral questions.", "skills": ["Communication"]},
            {"name": "Analytical Reasoning", "desc": "Solving logical puzzles and data interpretation.", "skills": ["General Aptitude"]},
            {"name": "Time & Space Complexity", "desc": "Analyzing algorithm efficiency.", "skills": ["Data Structures & Algorithms"]},
        ]
        topics = {}
        for data in topics_data:
            topic, created = LearningTopic.objects.get_or_create(name=data["name"], defaults={'description': data["desc"]})
            for skill_name in data["skills"]:
                if skill_name in skills:
                    topic.related_skills.add(skills[skill_name])
            topics[data["name"]] = topic
        self.stdout.write(self.style.SUCCESS(f'Populated {len(topics_data)} LearningTopic entries.'))


        self.stdout.write(self.style.SUCCESS('Populating dummy LearningResource data...'))
        # Mapping resources to topics (many-to-many)
        resources_data = [
            {"title": "GFG: Arrays Introduction", "url": "https://www.geeksforgeeks.org/arrays-in-java/", "type": "Article", "topics": ["Arrays & Strings"]},
            {"title": "Love Babbar DSA Series (Video)", "url": "https://www.youtube.com/playlist?list=PLDzeHZWIZsTp7EJt_4C6I-jB_a12gM92P", "type": "Video", "topics": ["Data Structures & Algorithms"]}, # Generic DS+Algo
            {"title": "LeetCode Easy Array Problems", "url": "https://leetcode.com/tag/array/", "type": "Problem Set", "topics": ["Arrays & Strings"]},
            {"title": "SQL Tutorial - W3Schools", "url": "https://www.w3schools.com/sql/", "type": "Course", "topics": ["SQL Queries (CRUD)", "Database Management Systems"]},
            {"title": "Introduction to HTML & CSS (MDN)", "url": "https://developer.mozilla.org/en-US/docs/Learn/HTML", "type": "Article", "topics": ["HTML & CSS Basics"]},
            {"title": "JavaScript.info Modern JS Tutorial", "url": "https://javascript.info/", "type": "Course", "topics": ["JavaScript Fundamentals"]},
            {"title": "System Design Primer (GitHub)", "url": "https://github.com/donnemartin/system-design-primer", "type": "Article", "topics": ["System Design Basics"]},
            {"title": "Cracking the Coding Interview (Book)", "url": "https://www.amazon.in/Cracking-Coding-Interview-Programming-Questions/dp/0984782850", "type": "Course", "topics": ["Data Structures & Algorithms", "Object-Oriented Programming"]},
        ]
        for data in resources_data:
            resource, created = LearningResource.objects.get_or_create(title=data["title"], defaults={'url': data["url"], 'type': data["type"]})
            for topic_name in data["topics"]:
                if topic_name in topics:
                    resource.associated_topics.add(topics[topic_name])
        self.stdout.write(self.style.SUCCESS(f'Populated {len(resources_data)} LearningResource entries.'))


        self.stdout.write(self.style.SUCCESS('Populating dummy MockInterviewQuestion data...'))
        # Ensure companies are fetched correctly from the dict
        mock_questions_data = [
            # TechSolutions Inc. - Software Engineer
            {"company": companies.get('TechSolutions Inc.-Software Engineer'), "role": "Software Engineer", "difficulty": "Medium", "text": "Implement a function to reverse a linked list."},
            {"company": companies.get('TechSolutions Inc.-Software Engineer'), "role": "Software Engineer", "difficulty": "Hard", "text": "Design a URL shortener system like Bitly. Discuss trade-offs."},
            {"company": companies.get('TechSolutions Inc.-Software Engineer'), "role": "Software Engineer", "difficulty": "Easy", "text": "What are the four pillars of OOP? Explain with an example."},

            # TechSolutions Inc. - Data Analyst
            {"company": companies.get('TechSolutions Inc.-Data Analyst'), "role": "Data Analyst", "difficulty": "Medium", "text": "Write an SQL query to find the second highest salary from an employee table."},
            {"company": companies.get('TechSolutions Inc.-Data Analyst'), "role": "Data Analyst", "difficulty": "Medium", "text": "Explain the difference between JOIN and UNION in SQL."},
            {"company": companies.get('TechSolutions Inc.-Data Analyst'), "role": "Data Analyst", "difficulty": "Easy", "text": "Describe a time you had to deal with incomplete data. How did you handle it?"},

            # FinSense Corp. - Backend Developer
            {"company": companies.get('FinSense Corp.-Backend Developer'), "role": "Backend Developer", "difficulty": "Hard", "text": "Design a high-throughput payment processing system."},
            {"company": companies.get('FinSense Corp.-Backend Developer'), "role": "Backend Developer", "difficulty": "Medium", "text": "Explain REST principles and idempotency in APIs."},

            # StratGen Consulting - Associate Consultant
            {"company": companies.get('StratGen Consulting-Associate Consultant'), "role": "Associate Consultant", "difficulty": "Medium", "text": "Estimate the number of cars sold in Delhi last year."},
            {"company": companies.get('StratGen Consulting-Associate Consultant'), "role": "Associate Consultant", "difficulty": "Easy", "text": "Why consulting? What are your strengths and weaknesses?"},

            # ShopMart Global - Full Stack Developer
            {"company": companies.get('ShopMart Global-Full Stack Developer'), "role": "Full Stack Developer", "difficulty": "Hard", "text": "You are designing a notification system for an e-commerce platform. What components would you include and why?"},
            {"company": companies.get('ShopMart Global-Full Stack Developer'), "role": "Full Stack Developer", "difficulty": "Medium", "text": "Explain the difference between SQL and NoSQL databases, and when to use each."},
        ]

        for data in mock_questions_data:
            if data['company']: # Only create if the company object was found
                MockInterviewQuestion.objects.create(
                    company=data['company'],
                    role=data['role'],
                    difficulty_level=data['difficulty'],
                    question_text=data['text']
                )
            else:
                self.stdout.write(self.style.WARNING(f"Skipping mock question: Company '{data['company']}' not found for role '{data['role']}'"))

        self.stdout.write(self.style.SUCCESS(f'Populated {MockInterviewQuestion.objects.count()} MockInterviewQuestion entries.'))

        self.stdout.write(self.style.SUCCESS('Dummy data population complete!'))