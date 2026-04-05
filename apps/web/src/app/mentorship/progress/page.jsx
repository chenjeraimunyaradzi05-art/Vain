'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    TrendingUp, 
    Calendar, 
    Clock, 
    Target,
    CheckCircle2,
    Star,
    Award,
    ChevronRight,
    BarChart3,
    Users,
    BookOpen,
    Lightbulb
} from 'lucide-react';

export default function MentorshipProgressPage() {
    const [stats, setStats] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newGoal, setNewGoal] = useState('');
    const [addingGoal, setAddingGoal] = useState(false);

    useEffect(() => {
        fetchProgress();
    }, []);

    async function fetchProgress() {
        try {
            const res = await api('/mentorship/progress');

            if (res.ok) {
                const data = res.data;
                setStats(data?.stats || generateDemoStats());
                setSessions(data?.recentSessions || []);
                setGoals(data?.goals || generateDemoGoals());
            } else {
                // Use demo data
                setStats(generateDemoStats());
                setGoals(generateDemoGoals());
            }
        } catch (err) {
            console.error('Failed to fetch progress:', err);
            setStats(generateDemoStats());
            setGoals(generateDemoGoals());
        } finally {
            setLoading(false);
        }
    }

    function generateDemoStats() {
        return {
            totalSessions: 8,
            totalHours: 12,
            currentStreak: 3,
            goalsCompleted: 4,
            averageRating: 4.8,
            mentorsWorkedWith: 2,
            skillsGained: ['Resume Writing', 'Interview Skills', 'Networking'],
            monthlyProgress: [
                { month: 'Jan', sessions: 1, hours: 1.5 },
                { month: 'Feb', sessions: 2, hours: 3 },
                { month: 'Mar', sessions: 3, hours: 4.5 },
                { month: 'Apr', sessions: 2, hours: 3 },
            ]
        };
    }

    function generateDemoGoals() {
        return [
            { id: 1, title: 'Complete resume review', status: 'completed', dueDate: '2024-02-15' },
            { id: 2, title: 'Practice interview questions', status: 'completed', dueDate: '2024-02-28' },
            { id: 3, title: 'Build professional network', status: 'in-progress', dueDate: '2024-03-31' },
            { id: 4, title: 'Apply to 5 target companies', status: 'not-started', dueDate: '2024-04-15' },
        ];
    }

    async function addGoal() {
        if (!newGoal.trim()) return;
        
        setAddingGoal(true);
        try {
            const res = await api('/mentorship/goals', {
                method: 'POST',
                body: { title: newGoal },
            });
            
            if (res.ok) {
                const data = res.data;
                setGoals([...goals, data?.goal || { id: Date.now(), title: newGoal, status: 'not-started' }]);
            } else {
                // Add locally
                setGoals([...goals, { id: Date.now(), title: newGoal, status: 'not-started' }]);
            }
            setNewGoal('');
        } catch (err) {
            setGoals([...goals, { id: Date.now(), title: newGoal, status: 'not-started' }]);
            setNewGoal('');
        } finally {
            setAddingGoal(false);
        }
    }

    async function toggleGoalStatus(goalId) {
        const goal = goals.find(g => g.id === goalId);
        const newStatus = goal.status === 'completed' ? 'not-started' : 'completed';
        
        setGoals(goals.map(g => g.id === goalId ? { ...g, status: newStatus } : g));
        
        try {
            await api(`/mentorship/goals/${goalId}`, {
                method: 'PATCH',
                body: { status: newStatus },
            });
        } catch (err) {
            // Keep the optimistic update
        }
    }

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-20">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-500" />
                    <p className="text-slate-400">Loading your progress…</p>
                </div>
            </div>
        );
    }

    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const goalProgress = goals.length > 0 ? (completedGoals / goals.length) * 100 : 0;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><a href="/member" className="hover:text-blue-400">Dashboard</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li><a href="/mentorship/browse" className="hover:text-blue-400">Mentorship</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Progress</li>
                </ol>
            </nav>

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Your Mentorship Journey</h1>
                    <p className="text-slate-400">Track your growth and celebrate your achievements</p>
                </div>
                <Link
                    href="/mentorship/browse"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                    Book Session
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-900/50 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{stats?.totalSessions || 0}</p>
                    <p className="text-sm text-slate-400">Total Sessions</p>
                </div>
                
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-purple-900/50 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-purple-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{stats?.totalHours || 0}h</p>
                    <p className="text-sm text-slate-400">Hours of Mentoring</p>
                </div>
                
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-amber-900/50 rounded-lg flex items-center justify-center">
                            <Target className="w-5 h-5 text-amber-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{completedGoals}/{goals.length}</p>
                    <p className="text-sm text-slate-400">Goals Completed</p>
                </div>
                
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-900/50 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-green-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{stats?.mentorsWorkedWith || 0}</p>
                    <p className="text-sm text-slate-400">Mentors Worked With</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Goals Section */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold">Your Goals</h2>
                        <div className="text-sm text-slate-400">
                            {Math.round(goalProgress)}% complete
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-2 mb-6">
                        <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${goalProgress}%` }}
                        />
                    </div>
                    
                    {/* Goals List */}
                    <div className="space-y-3 mb-6">
                        {goals.map((goal) => (
                            <div 
                                key={goal.id}
                                className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg"
                            >
                                <button
                                    onClick={() => toggleGoalStatus(goal.id)}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                        goal.status === 'completed'
                                            ? 'border-green-500 bg-green-500'
                                            : 'border-slate-600 hover:border-blue-500'
                                    }`}
                                >
                                    {goal.status === 'completed' && (
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                    )}
                                </button>
                                <span className={goal.status === 'completed' ? 'text-slate-500 line-through' : ''}>
                                    {goal.title}
                                </span>
                                {goal.status === 'in-progress' && (
                                    <span className="ml-auto px-2 py-0.5 text-xs bg-blue-900/50 text-blue-300 rounded-full">
                                        In Progress
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    {/* Add Goal */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newGoal}
                            onChange={(e) => setNewGoal(e.target.value)}
                            placeholder="Add a new goal..."
                            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                            onKeyDown={(e) => e.key === 'Enter' && addGoal()}
                        />
                        <button
                            onClick={addGoal}
                            disabled={addingGoal || !newGoal.trim()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm font-medium transition-colors"
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* Skills & Achievements */}
                <div className="space-y-6">
                    {/* Skills Gained */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Lightbulb className="w-5 h-5 text-amber-400" />
                            <h3 className="font-semibold">Skills Developed</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {stats?.skillsGained?.map((skill, i) => (
                                <span 
                                    key={i}
                                    className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-sm"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Achievements */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Award className="w-5 h-5 text-amber-400" />
                            <h3 className="font-semibold">Achievements</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-900/30 rounded-lg flex items-center justify-center">
                                    <Star className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">First Session</p>
                                    <p className="text-xs text-slate-500">Started your journey</p>
                                </div>
                            </div>
                            {stats?.totalSessions >= 5 && (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Rising Star</p>
                                        <p className="text-xs text-slate-500">5+ sessions completed</p>
                                    </div>
                                </div>
                            )}
                            {stats?.currentStreak >= 3 && (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Consistent Learner</p>
                                        <p className="text-xs text-slate-500">3 week streak</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h3 className="font-semibold mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            <Link
                                href="/member/mentorship"
                                className="block w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-center transition-colors"
                            >
                                View My Sessions
                            </Link>
                            <Link
                                href="/mentorship/circles"
                                className="block w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-center transition-colors"
                            >
                                Join a Circle
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
