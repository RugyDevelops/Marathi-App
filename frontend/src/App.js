import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { BookOpen, Upload, CheckCircle, Star, GraduationCap, Users, Home, FileText } from 'lucide-react';
import { Alert, AlertDescription } from './components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Textarea } from './components/ui/textarea';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

// Login Component
function Login({ onLogin }) {
  const [activeTab, setActiveTab] = useState('student');
  const [studentCode, setStudentCode] = useState('');
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE}/api/auth/student-login`, {
        student_code: studentCode
      });
      onLogin(response.data, 'student');
    } catch (err) {
      setError('Invalid student code. Please check with your teacher.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE}/api/auth/teacher-login`, {
        username: teacherUsername,
        password: teacherPassword
      });
      onLogin(response.data, 'teacher');
    } catch (err) {
      setError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mb-4">
            <GraduationCap className="w-16 h-16 mx-auto text-orange-500" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 font-playful">मराठी विद्या</h1>
          <p className="text-orange-100 text-lg">Marathi Society of British Columbia</p>
        </div>

        <Card className="backdrop-blur-md bg-white/20 border-white/30 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-2xl">Welcome Back!</CardTitle>
            <CardDescription className="text-orange-100">
              Login to continue your Marathi learning journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-white/20">
                <TabsTrigger value="student" className="text-white data-[state=active]:bg-orange-500">
                  Student
                </TabsTrigger>
                <TabsTrigger value="teacher" className="text-white data-[state=active]:bg-blue-500">
                  Teacher
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="student" className="mt-6">
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="studentCode" className="text-white text-sm font-medium">
                      Student Code
                    </Label>
                    <Input
                      id="studentCode"
                      type="text"
                      placeholder="Enter your student code"
                      value={studentCode}
                      onChange={(e) => setStudentCode(e.target.value)}
                      className="mt-1 bg-white/20 border-white/30 text-white placeholder:text-white/60"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    {loading ? 'Logging in...' : 'Login as Student'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="teacher" className="mt-6">
                <form onSubmit={handleTeacherLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="teacherUsername" className="text-white text-sm font-medium">
                      Username
                    </Label>
                    <Input
                      id="teacherUsername"
                      type="text"
                      placeholder="Enter your username"
                      value={teacherUsername}
                      onChange={(e) => setTeacherUsername(e.target.value)}
                      className="mt-1 bg-white/20 border-white/30 text-white placeholder:text-white/60"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="teacherPassword" className="text-white text-sm font-medium">
                      Password
                    </Label>
                    <Input
                      id="teacherPassword"
                      type="password"
                      placeholder="Enter your password"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      className="mt-1 bg-white/20 border-white/30 text-white placeholder:text-white/60"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    {loading ? 'Logging in...' : 'Login as Teacher'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            {error && (
              <Alert className="mt-4 bg-red-500/20 border-red-500/30">
                <AlertDescription className="text-white">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Student Dashboard Component
function StudentDashboard({ user, onLogout }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [screenshot, setScreenshot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/student/assignments`, {
        headers: { Authorization: `Bearer ${user.access_token}` }
      });
      setAssignments(response.data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleScreenshotUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshot(file);
    }
  };

  const submitAssignment = async (assignmentId) => {
    try {
      const formData = new FormData();
      formData.append('assignment_id', assignmentId);
      formData.append('answers', JSON.stringify(answers));
      if (screenshot) {
        formData.append('screenshot', screenshot);
      }

      await axios.post(`${API_BASE}/api/student/submit`, formData, {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      alert('Assignment submitted successfully!');
      fetchAssignments();
      setSelectedLesson(null);
      setAnswers({});
      setScreenshot(null);
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('Failed to submit assignment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading your lessons...</p>
        </div>
      </div>
    );
  }

  if (selectedLesson) {
    const lesson = selectedLesson;
    const question = lesson.questions[currentQuestion];
    
    return (
      <div className="min-h-screen colorful-bg">
        <header className="bg-white/20 backdrop-blur-md border-b border-white/30 p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <BookOpen className="w-8 h-8 text-orange-500" />
              <div>
                <h1 className="text-xl font-bold text-white">{lesson.title}</h1>
                <p className="text-orange-100 text-sm">Grade {user.grade}</p>
              </div>
            </div>
            <Button
              onClick={() => setSelectedLesson(null)}
              variant="outline"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              Back to Dashboard
            </Button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <Progress value={(currentQuestion + 1) / lesson.questions.length * 100} className="h-3" />
            <p className="text-center text-white mt-2 font-medium">
              Question {currentQuestion + 1} of {lesson.questions.length}
            </p>
          </div>

          <Card className="bg-white/95 backdrop-blur-md shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-800">{question.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {question.type === 'multiple_choice' ? (
                <div className="space-y-3">
                  {question.options.map((option, index) => (
                    <Button
                      key={index}
                      variant={answers[question.id] === option ? "default" : "outline"}
                      className={`w-full text-left justify-start p-4 h-auto ${
                        answers[question.id] === option 
                          ? 'bg-green-500 hover:bg-green-600 text-white' 
                          : 'bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => handleAnswerChange(question.id, option)}
                    >
                      <span className="mr-3 font-semibold">{String.fromCharCode(65 + index)}.</span>
                      {option}
                    </Button>
                  ))}
                </div>
              ) : (
                <Textarea
                  placeholder="Type your answer in Marathi here..."
                  value={answers[question.id] || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="min-h-32 text-lg"
                />
              )}

              <div className="flex justify-between pt-4">
                <Button
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                  variant="outline"
                >
                  Previous
                </Button>
                
                {currentQuestion === lesson.questions.length - 1 ? (
                  <div className="space-x-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="hidden"
                      id="screenshot-upload"
                    />
                    <Button
                      onClick={() => document.getElementById('screenshot-upload').click()}
                      variant="outline"
                      className="space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Screenshot</span>
                    </Button>
                    <Button
                      onClick={() => submitAssignment(lesson.assignment_id)}
                      className="bg-green-500 hover:bg-green-600 space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Submit Assignment</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setCurrentQuestion(currentQuestion + 1)}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    Next
                  </Button>
                )}
              </div>
              
              {screenshot && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-700 text-sm">Screenshot uploaded: {screenshot.name}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen colorful-bg">
      <header className="bg-white/20 backdrop-blur-md border-b border-white/30 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <GraduationCap className="w-8 h-8 text-orange-500" />
            <div>
              <h1 className="text-2xl font-bold text-white">Welcome, {user.name}!</h1>
              <p className="text-orange-100">Grade {user.grade} • Student Code: {user.student_code}</p>
            </div>
          </div>
          <Button
            onClick={onLogout}
            variant="outline"
            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto text-white/60 mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">No assignments yet</h2>
              <p className="text-orange-100">Your teacher will assign lessons soon!</p>
            </div>
          ) : (
            assignments.map((assignment) => (
              <Card key={assignment.id} className="bg-white/95 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl text-gray-800">{assignment.lesson.title}</CardTitle>
                    <Badge variant={assignment.status === 'completed' ? 'default' : 'secondary'}>
                      {assignment.status === 'completed' ? 'Completed' : 'Pending'}
                    </Badge>
                  </div>
                  <CardDescription>
                    Grade {assignment.lesson.grade} • {assignment.lesson.questions.length} Questions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{assignment.lesson.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-gray-600">Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                    </div>
                    <Button
                      onClick={() => setSelectedLesson({...assignment.lesson, assignment_id: assignment.id})}
                      disabled={assignment.status === 'completed'}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      {assignment.status === 'completed' ? 'Completed' : 'Start Lesson'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

// Teacher Dashboard Component
function TeacherDashboard({ user, onLogout }) {
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [activeTab, setActiveTab] = useState('students');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    try {
      const [studentsRes, lessonsRes, assignmentsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/teacher/students`, {
          headers: { Authorization: `Bearer ${user.access_token}` }
        }),
        axios.get(`${API_BASE}/api/teacher/lessons`, {
          headers: { Authorization: `Bearer ${user.access_token}` }
        }),
        axios.get(`${API_BASE}/api/teacher/assignments`, {
          headers: { Authorization: `Bearer ${user.access_token}` }
        })
      ]);
      
      setStudents(studentsRes.data);
      setLessons(lessonsRes.data);
      setAssignments(assignmentsRes.data);
    } catch (error) {
      console.error('Error fetching teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignHomework = async () => {
    if (!selectedLesson || selectedStudents.length === 0 || !dueDate) {
      alert('Please select lesson, students, and due date');
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/teacher/assign`, {
        lesson_id: selectedLesson,
        student_ids: selectedStudents,
        due_date: dueDate
      }, {
        headers: { Authorization: `Bearer ${user.access_token}` }
      });
      
      alert('Homework assigned successfully!');
      setSelectedStudents([]);
      setSelectedLesson('');
      setDueDate('');
      fetchTeacherData();
    } catch (error) {
      console.error('Error assigning homework:', error);
      alert('Failed to assign homework. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-blue-500 to-indigo-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading teacher dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-blue-500 to-indigo-600">
      <header className="bg-white/20 backdrop-blur-md border-b border-white/30 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-blue-300" />
            <div>
              <h1 className="text-2xl font-bold text-white">Teacher Dashboard</h1>
              <p className="text-blue-100">Welcome, {user.name} • Class: Grade {user.grade}</p>
            </div>
          </div>
          <Button
            onClick={onLogout}
            variant="outline"
            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-white/20 backdrop-blur-md">
            <TabsTrigger value="students" className="text-white data-[state=active]:bg-blue-500">
              <Users className="w-4 h-4 mr-2" />
              Students
            </TabsTrigger>
            <TabsTrigger value="assign" className="text-white data-[state=active]:bg-green-500">
              <FileText className="w-4 h-4 mr-2" />
              Assign Homework
            </TabsTrigger>
            <TabsTrigger value="review" className="text-white data-[state=active]:bg-purple-500">
              <CheckCircle className="w-4 h-4 mr-2" />
              Review Submissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-6">
            <Card className="bg-white/95 backdrop-blur-md">
              <CardHeader>
                <CardTitle>Your Students</CardTitle>
                <CardDescription>Grade {user.grade} students in your class</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students.map((student) => (
                    <Card key={student.id} className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{student.name}</h3>
                          <p className="text-sm text-gray-600">Code: {student.student_code}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assign" className="mt-6">
            <Card className="bg-white/95 backdrop-blur-md">
              <CardHeader>
                <CardTitle>Assign Homework</CardTitle>
                <CardDescription>Select lesson and students to assign homework</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="lesson-select">Select Lesson</Label>
                  <Select value={selectedLesson} onValueChange={setSelectedLesson}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a lesson" />
                    </SelectTrigger>
                    <SelectContent>
                      {lessons.map((lesson) => (
                        <SelectItem key={lesson.id} value={lesson.id}>
                          {lesson.title} - Grade {lesson.grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Select Students</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {students.map((student) => (
                      <label key={student.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents([...selectedStudents, student.id]);
                            } else {
                              setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{student.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="due-date">Due Date</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={assignHomework}
                  className="w-full bg-green-500 hover:bg-green-600"
                >
                  Assign Homework
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="review" className="mt-6">
            <Card className="bg-white/95 backdrop-blur-md">
              <CardHeader>
                <CardTitle>Review Submissions</CardTitle>
                <CardDescription>Check student homework submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <Card key={assignment.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{assignment.lesson.title}</h3>
                          <p className="text-sm text-gray-600">
                            Student: {assignment.student.name} • Due: {new Date(assignment.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={assignment.status === 'completed' ? 'default' : 'secondary'}>
                          {assignment.status === 'completed' ? 'Submitted' : 'Pending'}
                        </Badge>
                      </div>
                      {assignment.status === 'completed' && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-sm text-green-600">Submitted on: {new Date(assignment.submitted_at).toLocaleDateString()}</p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);

  useEffect(() => {
    // Check for stored authentication
    const storedUser = localStorage.getItem('user');
    const storedUserType = localStorage.getItem('userType');
    if (storedUser && storedUserType) {
      setUser(JSON.parse(storedUser));
      setUserType(storedUserType);
    }
  }, []);

  const handleLogin = (userData, type) => {
    setUser(userData);
    setUserType(type);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('userType', type);
  };

  const handleLogout = () => {
    setUser(null);
    setUserType(null);
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="App">
        {userType === 'student' ? (
          <StudentDashboard user={user} onLogout={handleLogout} />
        ) : (
          <TeacherDashboard user={user} onLogout={handleLogout} />
        )}
      </div>
    </Router>
  );
}

export default App;