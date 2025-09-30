'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardStats {
  totalTeams: number;
  totalMatches: number;
  totalUsers: number;
  totalApplications: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTeams: 0,
    totalMatches: 0,
    totalUsers: 0,
    totalApplications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      const [teamsRes, matchesRes, usersRes, applicationsRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/matches'),
        fetch('/api/users'),
        fetch('/api/league-applications'),
      ]);

      const [teams, matches, users, applications] = await Promise.all([
        teamsRes.json(),
        matchesRes.json(),
        matchesRes.json(),
        applicationsRes.json(),
      ]);

      setStats({
        totalTeams: Array.isArray(teams) ? teams.length : 0,
        totalMatches: Array.isArray(matches) ? matches.length : 0,
        totalUsers: Array.isArray(users) ? users.length : 0,
        totalApplications: Array.isArray(applications) ? applications.length : 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">HFL Boshqaruv</h1>
          <p className="text-gray-600 mt-2">Havas Football League boshqaruv tizimi</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jamoalar</CardTitle>
              <div className="h-4 w-4 text-blue-600">⚽</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTeams}</div>
              <p className="text-xs text-muted-foreground">
                Jami jamoa soni
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">O'yinlar</CardTitle>
              <div className="h-4 w-4 text-green-600">🏆</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMatches}</div>
              <p className="text-xs text-muted-foreground">
                Jami o'yin soni
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Foydalanuvchilar</CardTitle>
              <div className="h-4 w-4 text-purple-600">👥</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Jami foydalanuvchi soni
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Arizalar</CardTitle>
              <div className="h-4 w-4 text-orange-600">📝</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalApplications}</div>
              <p className="text-xs text-muted-foreground">
                Jami ariza soni
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Tezkor Harakatlar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <a 
                  href="/teams" 
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-medium">Jamoalar</h3>
                  <p className="text-sm text-gray-600">Jamoalarni boshqarish</p>
                </a>
                <a 
                  href="/matches" 
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-medium">O'yinlar</h3>
                  <p className="text-sm text-gray-600">O'yinlarni boshqarish</p>
                </a>
                <a 
                  href="/players" 
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-medium">O'yinchilar</h3>
                  <p className="text-sm text-gray-600">O'yinchilarni boshqarish</p>
                </a>
                <a 
                  href="/applications" 
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-medium">Arizalar</h3>
                  <p className="text-sm text-gray-600">Ligaga arizalarni ko'rish</p>
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistika</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Faol jamoalar</span>
                  <span className="font-medium">{stats.totalTeams}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Rejalashtirilgan o'yinlar</span>
                  <span className="font-medium">{stats.totalMatches}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Ro'yxatdan o'tgan foydalanuvchilar</span>
                  <span className="font-medium">{stats.totalUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Kutilayotgan arizalar</span>
                  <span className="font-medium">{stats.totalApplications}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}