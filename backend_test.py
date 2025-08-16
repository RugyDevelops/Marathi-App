import requests
import sys
import json
from datetime import datetime, timedelta

class MarathiVidyaAPITester:
    def __init__(self, base_url="https://marathi-vidya.preview.emergentagent.com"):
        self.base_url = base_url
        self.student_token = None
        self.teacher_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.student_user = None
        self.teacher_user = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        # For file uploads, remove Content-Type header
        if files:
            headers.pop('Content-Type', None)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if 'access_token' in response_data:
                        print(f"   Token received: {response_data['access_token'][:20]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "api/health", 200)

    def test_student_login_valid(self):
        """Test valid student login"""
        success, response = self.run_test(
            "Student Login (Valid)",
            "POST",
            "api/auth/student-login",
            200,
            data={"student_code": "ST101"}
        )
        if success and 'access_token' in response:
            self.student_token = response['access_token']
            self.student_user = response['user']
            print(f"   Student: {self.student_user['name']} (Grade {self.student_user['grade']})")
            return True
        return False

    def test_student_login_invalid(self):
        """Test invalid student login"""
        return self.run_test(
            "Student Login (Invalid)",
            "POST",
            "api/auth/student-login",
            401,
            data={"student_code": "INVALID"}
        )[0]

    def test_teacher_login_valid(self):
        """Test valid teacher login"""
        success, response = self.run_test(
            "Teacher Login (Valid)",
            "POST",
            "api/auth/teacher-login",
            200,
            data={"username": "teacher1", "password": "password123"}
        )
        if success and 'access_token' in response:
            self.teacher_token = response['access_token']
            self.teacher_user = response['user']
            print(f"   Teacher: {self.teacher_user['name']} (Grade {self.teacher_user['grade']})")
            return True
        return False

    def test_teacher_login_invalid(self):
        """Test invalid teacher login"""
        return self.run_test(
            "Teacher Login (Invalid)",
            "POST",
            "api/auth/teacher-login",
            401,
            data={"username": "invalid", "password": "wrong"}
        )[0]

    def test_student_assignments(self):
        """Test getting student assignments"""
        if not self.student_token:
            print("❌ Skipping - No student token available")
            return False
        
        return self.run_test(
            "Get Student Assignments",
            "GET",
            "api/student/assignments",
            200,
            token=self.student_token
        )[0]

    def test_teacher_students(self):
        """Test getting teacher's students"""
        if not self.teacher_token:
            print("❌ Skipping - No teacher token available")
            return False
        
        success, response = self.run_test(
            "Get Teacher Students",
            "GET",
            "api/teacher/students",
            200,
            token=self.teacher_token
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} students")
            return True
        return False

    def test_teacher_lessons(self):
        """Test getting teacher's lessons"""
        if not self.teacher_token:
            print("❌ Skipping - No teacher token available")
            return False
        
        success, response = self.run_test(
            "Get Teacher Lessons",
            "GET",
            "api/teacher/lessons",
            200,
            token=self.teacher_token
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} lessons")
            return True
        return False

    def test_assign_homework(self):
        """Test homework assignment"""
        if not self.teacher_token:
            print("❌ Skipping - No teacher token available")
            return False

        # First get students and lessons
        students_success, students_data = self.run_test(
            "Get Students for Assignment",
            "GET",
            "api/teacher/students",
            200,
            token=self.teacher_token
        )
        
        lessons_success, lessons_data = self.run_test(
            "Get Lessons for Assignment",
            "GET",
            "api/teacher/lessons",
            200,
            token=self.teacher_token
        )

        if not (students_success and lessons_success):
            print("❌ Failed to get prerequisite data")
            return False

        if not students_data or not lessons_data:
            print("❌ No students or lessons available")
            return False

        # Assign homework to first student with first lesson
        student_id = students_data[0]['id']
        lesson_id = lessons_data[0]['id']
        due_date = (datetime.now() + timedelta(days=7)).isoformat()

        return self.run_test(
            "Assign Homework",
            "POST",
            "api/teacher/assign",
            200,
            data={
                "lesson_id": lesson_id,
                "student_ids": [student_id],
                "due_date": due_date
            },
            token=self.teacher_token
        )[0]

    def test_teacher_assignments(self):
        """Test getting teacher assignments"""
        if not self.teacher_token:
            print("❌ Skipping - No teacher token available")
            return False
        
        success, response = self.run_test(
            "Get Teacher Assignments",
            "GET",
            "api/teacher/assignments",
            200,
            token=self.teacher_token
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} assignments")
            return True
        return False

    def test_student_assignments_after_assignment(self):
        """Test student assignments after homework is assigned"""
        if not self.student_token:
            print("❌ Skipping - No student token available")
            return False
        
        success, response = self.run_test(
            "Get Student Assignments (After Assignment)",
            "GET",
            "api/student/assignments",
            200,
            token=self.student_token
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} assignments for student")
            return True
        return False

    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        success1 = self.run_test(
            "Unauthorized Student Assignments",
            "GET",
            "api/student/assignments",
            401
        )[0]
        
        success2 = self.run_test(
            "Unauthorized Teacher Students",
            "GET",
            "api/teacher/students",
            401
        )[0]
        
        return success1 and success2

def main():
    print("🚀 Starting Marathi Vidya API Tests")
    print("=" * 50)
    
    tester = MarathiVidyaAPITester()
    
    # Test sequence
    test_results = []
    
    # Basic health check
    test_results.append(tester.test_health_check())
    
    # Authentication tests
    test_results.append(tester.test_student_login_valid())
    test_results.append(tester.test_student_login_invalid())
    test_results.append(tester.test_teacher_login_valid())
    test_results.append(tester.test_teacher_login_invalid())
    
    # Unauthorized access tests
    test_results.append(tester.test_unauthorized_access())
    
    # Student endpoints (requires valid student login)
    test_results.append(tester.test_student_assignments())
    
    # Teacher endpoints (requires valid teacher login)
    test_results.append(tester.test_teacher_students())
    test_results.append(tester.test_teacher_lessons())
    
    # Homework assignment workflow
    test_results.append(tester.test_assign_homework())
    test_results.append(tester.test_teacher_assignments())
    
    # Check student assignments after homework assigned
    test_results.append(tester.test_student_assignments_after_assignment())
    
    # Print final results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    print(f"Total Tests: {tester.tests_run}")
    print(f"Passed: {tester.tests_passed}")
    print(f"Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("\n🎉 ALL TESTS PASSED! Backend API is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {tester.tests_run - tester.tests_passed} tests failed. Check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())