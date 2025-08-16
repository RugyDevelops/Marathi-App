from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
import os
import json
import hashlib
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
import jwt
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Marathi Vidya - Learning Platform")

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "marathi_vidya")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
users_collection = db.users
lessons_collection = db.lessons
assignments_collection = db.assignments
submissions_collection = db.submissions

# JWT settings
SECRET_KEY = "marathi_vidya_secret_key_2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()

# Pydantic models
class StudentLogin(BaseModel):
    student_code: str

class TeacherLogin(BaseModel):
    username: str
    password: str

class Question(BaseModel):
    id: str
    question: str
    type: str  # "multiple_choice" or "text"
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None

class Lesson(BaseModel):
    title: str
    description: str
    grade: int
    questions: List[Question]

class AssignHomework(BaseModel):
    lesson_id: str
    student_ids: List[str]
    due_date: str

# Utility functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable format"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        serialized = {}
        for key, value in doc.items():
            if key == '_id':
                continue  # Skip MongoDB _id field
            serialized[key] = serialize_doc(value)
        return serialized
    return doc

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await users_collection.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Sample data initialization
async def init_sample_data():
    # Check if data already exists
    if await users_collection.count_documents({}) > 0:
        return
    
    # Create sample teachers
    teachers = [
        {
            "id": str(uuid.uuid4()),
            "name": "Mrs. Priya Sharma",
            "username": "teacher1",
            "password": hash_password("password123"),
            "role": "teacher",
            "grade": 1,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Mr. Rajesh Patil",
            "username": "teacher2", 
            "password": hash_password("password123"),
            "role": "teacher",
            "grade": 2,
            "created_at": datetime.utcnow()
        }
    ]
    
    # Create sample students
    students = []
    for grade in range(1, 6):
        for i in range(1, 6):  # 5 students per grade
            student_code = f"ST{grade}{i:02d}"
            students.append({
                "id": str(uuid.uuid4()),
                "name": f"Student {i} Grade {grade}",
                "student_code": student_code,
                "role": "student",
                "grade": grade,
                "teacher_id": teachers[0]["id"] if grade <= 2 else teachers[1]["id"] if len(teachers) > 1 else teachers[0]["id"],
                "created_at": datetime.utcnow()
            })
    
    # Insert users
    await users_collection.insert_many(teachers + students)
    
    # Create sample lessons with Marathi content
    sample_lessons = []
    for grade in range(1, 6):
        for lesson_num in range(1, 11):  # 10 lessons per grade
            # Sample Marathi questions (mixing multiple choice and text)
            questions = []
            
            # Multiple choice questions
            for q in range(1, 6):
                questions.append({
                    "id": str(uuid.uuid4()),
                    "question": f"ग्रेड {grade} प्रश्न {q}: हे काय आहे? (Grade {grade} Question {q}: What is this?)",
                    "type": "multiple_choice",
                    "options": [
                        f"उत्तर १ (Answer 1)",
                        f"उत्तर २ (Answer 2)", 
                        f"उत्तर ३ (Answer 3)",
                        f"उत्तर ४ (Answer 4)"
                    ],
                    "correct_answer": f"उत्तर १ (Answer 1)"
                })
            
            # Text-based questions
            for q in range(6, 11):
                questions.append({
                    "id": str(uuid.uuid4()),
                    "question": f"ग्रेड {grade} मजकूर प्रश्न {q}: तुमचे आवडते रंग कोणते आहेत? (Grade {grade} Text Question {q}: What are your favorite colors?)",
                    "type": "text",
                    "options": None,
                    "correct_answer": None
                })
            
            lesson = {
                "id": str(uuid.uuid4()),
                "title": f"धडा {lesson_num} - ग्रेड {grade} (Lesson {lesson_num} - Grade {grade})",
                "description": f"ग्रेड {grade} साठी मराठी शिक्षणाचा धडा {lesson_num} (Marathi learning lesson {lesson_num} for Grade {grade})",
                "grade": grade,
                "questions": questions,
                "created_at": datetime.utcnow()
            }
            sample_lessons.append(lesson)
    
    await lessons_collection.insert_many(sample_lessons)
    print("Sample data initialized successfully!")

# Authentication endpoints
@app.post("/api/auth/student-login")
async def student_login(login_data: StudentLogin):
    user = await users_collection.find_one({
        "student_code": login_data.student_code,
        "role": "student"
    })
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid student code")
    
    access_token = create_access_token(data={"sub": user["id"], "role": "student"})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "student_code": user["student_code"],
            "grade": user["grade"],
            "role": user["role"]
        }
    }

@app.post("/api/auth/teacher-login")
async def teacher_login(login_data: TeacherLogin):
    user = await users_collection.find_one({
        "username": login_data.username,
        "role": "teacher"
    })
    
    if not user or user["password"] != hash_password(login_data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user["id"], "role": "teacher"})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "username": user["username"],
            "grade": user["grade"],
            "role": user["role"]
        }
    }

# Student endpoints
@app.get("/api/student/assignments")
async def get_student_assignments(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get assignments for this student
    assignments = await assignments_collection.find({
        "student_id": current_user["id"]
    }).to_list(None)
    
    # Get lesson details for each assignment
    for assignment in assignments:
        lesson = await lessons_collection.find_one({"id": assignment["lesson_id"]})
        assignment["lesson"] = lesson
        
        # Check if submitted
        submission = await submissions_collection.find_one({
            "assignment_id": assignment["id"]
        })
        assignment["status"] = "completed" if submission else "pending"
        if submission:
            assignment["submitted_at"] = submission["submitted_at"]
    
    return assignments

@app.post("/api/student/submit")
async def submit_assignment(
    assignment_id: str = Form(...),
    answers: str = Form(...),
    screenshot: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify assignment belongs to student
    assignment = await assignments_collection.find_one({
        "id": assignment_id,
        "student_id": current_user["id"]
    })
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Check if already submitted
    existing_submission = await submissions_collection.find_one({
        "assignment_id": assignment_id
    })
    
    if existing_submission:
        raise HTTPException(status_code=400, detail="Assignment already submitted")
    
    # Handle screenshot upload
    screenshot_path = None
    if screenshot:
        # Create uploads directory if it doesn't exist
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_extension = screenshot.filename.split('.')[-1]
        screenshot_filename = f"{assignment_id}_{uuid.uuid4()}.{file_extension}"
        screenshot_path = os.path.join(upload_dir, screenshot_filename)
        
        with open(screenshot_path, "wb") as buffer:
            content = await screenshot.read()
            buffer.write(content)
    
    # Create submission
    submission = {
        "id": str(uuid.uuid4()),
        "assignment_id": assignment_id,
        "student_id": current_user["id"],
        "answers": json.loads(answers),
        "screenshot_path": screenshot_path,
        "submitted_at": datetime.utcnow(),
        "created_at": datetime.utcnow()
    }
    
    await submissions_collection.insert_one(submission)
    
    return {"message": "Assignment submitted successfully"}

# Teacher endpoints
@app.get("/api/teacher/students")
async def get_teacher_students(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Access denied")
    
    students = await users_collection.find({
        "role": "student",
        "grade": current_user["grade"]
    }).to_list(None)
    
    return serialize_doc(students)

@app.get("/api/teacher/lessons")
async def get_teacher_lessons(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Access denied")
    
    lessons = await lessons_collection.find({
        "grade": current_user["grade"]
    }).to_list(None)
    
    return lessons

@app.post("/api/teacher/assign")
async def assign_homework(
    homework_data: AssignHomework,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify lesson exists and is for teacher's grade
    lesson = await lessons_collection.find_one({
        "id": homework_data.lesson_id,
        "grade": current_user["grade"]
    })
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Create assignments for each student
    assignments = []
    for student_id in homework_data.student_ids:
        # Verify student is in teacher's grade
        student = await users_collection.find_one({
            "id": student_id,
            "role": "student",
            "grade": current_user["grade"]
        })
        
        if not student:
            continue
        
        assignment = {
            "id": str(uuid.uuid4()),
            "teacher_id": current_user["id"],
            "student_id": student_id,
            "lesson_id": homework_data.lesson_id,
            "due_date": datetime.fromisoformat(homework_data.due_date),
            "assigned_at": datetime.utcnow(),
            "created_at": datetime.utcnow()
        }
        assignments.append(assignment)
    
    if assignments:
        await assignments_collection.insert_many(assignments)
    
    return {"message": f"Homework assigned to {len(assignments)} students"}

@app.get("/api/teacher/assignments")
async def get_teacher_assignments(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Access denied")
    
    assignments = await assignments_collection.find({
        "teacher_id": current_user["id"]
    }).to_list(None)
    
    # Get additional details
    for assignment in assignments:
        # Get student details
        student = await users_collection.find_one({"id": assignment["student_id"]})
        assignment["student"] = student
        
        # Get lesson details
        lesson = await lessons_collection.find_one({"id": assignment["lesson_id"]})
        assignment["lesson"] = lesson
        
        # Check if submitted
        submission = await submissions_collection.find_one({
            "assignment_id": assignment["id"]
        })
        assignment["status"] = "completed" if submission else "pending"
        if submission:
            assignment["submitted_at"] = submission["submitted_at"]
    
    return assignments

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Initialize sample data on startup
@app.on_event("startup")
async def startup_event():
    await init_sample_data()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)